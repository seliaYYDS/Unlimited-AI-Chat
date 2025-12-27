/**
 * 音乐API请求管理器
 * 提供批量请求、并发控制、缓存管理和请求重试机制
 */
class MusicApiRequestManager {
  constructor(baseUrl, defaultOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      concurrentLimit: 6,
      cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
      ...defaultOptions
    };

    // 请求缓存
    this.cache = new Map();

    // 批量请求队列
    this.batchQueue = {
      songDetails: [],
      songUrls: [],
      playlistDetails: [],
      artistDetails: []
    };

    // 批量请求定时器
    this.batchTimers = {};

    // 并发控制器
    this.concurrentCount = 0;
    this.pendingQueue = [];

    // 请求去重
    this.pendingRequests = new Map();
  }

  // 更新基础URL
  updateBaseUrl(newUrl) {
    if (this.baseUrl !== newUrl) {
      console.log('更新MusicApiRequestManager baseUrl:', this.baseUrl, '->', newUrl);
      this.baseUrl = newUrl;
      // 清理缓存，因为API地址变了
      if (this.cache && typeof this.cache.clear === 'function') {
        this.cache.clear();
      }
    }
  }

  /**
   * 生成缓存键
   * @param {string} endpoint - API端点
   * @param {Object} params - 请求参数
   * @returns {string} 缓存键
   */
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * 检查缓存
   * @param {string} cacheKey - 缓存键
   * @returns {Object|null} 缓存数据或null
   */
  checkCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.defaultOptions.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  /**
   * 设置缓存
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 要缓存的数据
   */
  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 基础请求方法
   * @param {string} endpoint - API端点
   * @param {Object} params - 请求参数
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求Promise
   */
  async request(endpoint, params = {}, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // 检查缓存
    const cached = this.checkCache(cacheKey);
    if (cached && !options.skipCache) {
      return cached;
    }

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // 创建请求Promise
    const requestPromise = this.executeRequest(endpoint, params, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCache(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * 执行HTTP请求
   * @param {string} endpoint - API端点
   * @param {Object} params - 请求参数
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求Promise
   */
  async executeRequest(endpoint, params = {}, options = {}) {
    // 处理cookie参数
    let updatedParams = { ...params };
    let fetchOptions = { ...options.fetchOptions };
    
    // 如果请求头中有Cookie，将其移到URL参数中
    if (fetchOptions.headers && fetchOptions.headers.Cookie) {
      // 对cookie进行编码，避免特殊字符问题
      const cookieValue = fetchOptions.headers.Cookie;
      updatedParams.cookie = encodeURIComponent(cookieValue);
      // 从请求头中移除Cookie，避免重复
      delete fetchOptions.headers.Cookie;
    }
    
    const queryString = new URLSearchParams(updatedParams).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultOptions.timeout);

    // 并发控制
    const concurrentLimit = options.concurrentLimit || this.defaultOptions.concurrentLimit;
    if (this.concurrentCount >= concurrentLimit) {
      await new Promise(resolve => this.pendingQueue.push(resolve));
    }
    
    this.concurrentCount++;

    try {
      let lastError;
      for (let attempt = 0; attempt <= this.defaultOptions.maxRetries; attempt++) {
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            ...fetchOptions
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          // 检查API返回状态
          if (data.code !== 200) {
            throw new Error(`API error! code: ${data.code}, message: ${data.message || 'Unknown error'}`);
          }

          return data;
        } catch (error) {
          lastError = error;
          if (attempt < this.defaultOptions.maxRetries) {
            await new Promise(resolve => 
              setTimeout(resolve, this.defaultOptions.retryDelay * Math.pow(2, attempt))
            );
          }
        }
      }
      throw lastError;
    } finally {
      clearTimeout(timeoutId);
      this.concurrentCount--;
      
      // 处理等待队列
      if (this.pendingQueue.length > 0) {
        const next = this.pendingQueue.shift();
        next();
      }
    }
  }

  /**
   * 执行并发请求（限制并发数）
   * @param {Array} requests - 请求数组，每个元素包含 {endpoint, params, options}
   * @param {number} limit - 并发限制，默认为3
   * @returns {Promise<Array>} 所有请求的结果数组
   */
  async executeConcurrentRequests(requests, limit = 3) {
    if (!requests || requests.length === 0) return [];
    
    const results = [];
    const executing = new Set();
    
    // 创建请求Promise
    for (const request of requests) {
      const promise = this.executeRequest(
        request.endpoint, 
        request.params, 
        request.options
      ).then(result => {
        return { success: true, data: result, index: request.index || 0 };
      }).catch(error => {
        console.error(`请求失败 ${request.endpoint}:`, error);
        return { success: false, error, index: request.index || 0 };
      });
      
      results.push(promise);
      
      // 如果达到并发限制，等待其中一个完成
      if (executing.size >= limit) {
        await Promise.race(executing);
      }
      
      // 添加到执行队列
      executing.add(promise);
      promise.finally(() => executing.delete(promise));
    }
    
    return Promise.all(results);
  }

  /**
   * 批量获取歌曲详情
   * @param {Array<string>} songIds - 歌曲ID数组
   * @param {Object} options - 请求选项
   * @returns {Promise<Array>} 歌曲详情数组
   */
  async getSongDetails(songIds, options = {}) {
    if (!songIds || songIds.length === 0) return [];

    // 去重
    const uniqueIds = [...new Set(songIds)];
    
    // 检查缓存（除非明确跳过缓存）
    const cachedResults = [];
    const uncachedIds = [];
    
    if (!options.skipCache) {
      for (const id of uniqueIds) {
        const cacheKey = this.generateCacheKey('/song/detail', { ids: id });
        const cached = this.checkCache(cacheKey);
        if (cached && cached.songs && cached.songs[0]) {
          cachedResults.push(cached.songs[0]);
        } else {
          uncachedIds.push(id);
        }
      }

      if (uncachedIds.length === 0) {
        return cachedResults;
      }
    } else {
      // 跳过缓存，所有ID都需要重新请求
      uncachedIds.push(...uniqueIds);
      console.log('跳过缓存，重新请求歌曲详情:', uncachedIds);
    }

    // 批量请求，每次最多50个ID
    const batchSize = 50;
    const promises = [];
    
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      const idsString = batch.join(',');
      
      // 添加请求前日志
      console.log(`准备批量请求歌曲详情:`, {
        ids: idsString,
        hasCookie: !!(options.fetchOptions && options.fetchOptions.headers && options.fetchOptions.headers.Cookie),
        skipCache: options.skipCache
      });
      
      promises.push(
        this.request('/song/detail', { ids: idsString }, options)
          .then(data => {
            console.log(`批量获取歌曲详情响应:`, {
              requestIds: idsString,
              responseCount: data.songs?.length || 0,
              data: data.songs
            });
            return data.songs || [];
          })
          .catch(error => {
            console.error(`批量获取歌曲详情失败 (IDs: ${idsString}):`, error);
            // 返回空数组而不是抛出错误，允许部分失败
            return [];
          })
      );
    }

    try {
      const results = await Promise.all(promises);
      const newResults = results.flat();
      
      // 缓存单个歌曲结果
      for (const song of newResults) {
        if (song && song.id) {
          const cacheKey = this.generateCacheKey('/song/detail', { ids: song.id });
          this.setCache(cacheKey, { songs: [song] });
        }
      }
      
      console.log(`获取歌曲详情完成: 缓存${cachedResults.length}个, 新请求${newResults.length}个`);
      
      return [...cachedResults, ...newResults];
    } catch (error) {
      console.error('批量获取歌曲详情失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取歌曲URL
   * @param {Array<string>} songIds - 歌曲ID数组
   * @param {Object} options - 请求选项
   * @returns {Promise<Array>} 歌曲URL数组
   */
  async getSongUrls(songIds, options = {}) {
    if (!songIds || songIds.length === 0) return [];

    // 去重
    const uniqueIds = [...new Set(songIds)];
    
    // 检查缓存（除非明确跳过缓存）
    const cachedResults = [];
    const uncachedIds = [];
    
    if (!options.skipCache) {
      for (const id of uniqueIds) {
        const cacheKey = this.generateCacheKey('/song/url', { id: id });
        const cached = this.checkCache(cacheKey);
        if (cached && cached.data && cached.data[0]) {
          cachedResults.push(cached.data[0]);
        } else {
          uncachedIds.push(id);
        }
      }

      if (uncachedIds.length === 0) {
        return cachedResults;
      }
    } else {
      // 跳过缓存，所有ID都需要重新请求
      uncachedIds.push(...uniqueIds);
      console.log('跳过缓存，重新请求歌曲URL:', uncachedIds);
    }

    // 先尝试批量请求普通歌曲
    const batchSize = 20; // 减小批量大小，提高成功率
    const batchPromises = [];
    const batchResults = [];
    
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      const idsString = batch.join(',');
      
      console.log(`准备批量请求歌曲URL:`, {
        ids: idsString,
        hasCookie: !!(options.fetchOptions && options.fetchOptions.headers && options.fetchOptions.headers.Cookie),
        skipCache: options.skipCache
      });
      
      batchPromises.push(
        this.request('/song/url', { id: idsString }, options)
          .then(data => {
            console.log(`批量获取歌曲URL响应:`, {
              requestIds: idsString,
              responseCount: data.data?.length || 0,
              data: data.data,
              hasValidUrls: data.data?.some(item => item.url) || false
            });
            return data.data || [];
          })
          .catch(error => {
            console.error(`批量获取歌曲URL失败 (IDs: ${idsString}):`, error);
            return [];
          })
      );
    }

    // 等待所有批量请求完成
    const batchData = await Promise.all(batchPromises);
    const batchResultsFlat = batchData.flat();
    
    // 分析结果，标记无效URL的歌曲但不立即重新请求
    const validResults = [];
    const markedResults = [];
    
    for (const item of batchResultsFlat) {
      if (item && item.url && !item.url.includes('null') && item.code === 200) {
        validResults.push(item);
      } else if (item && item.id) {
        // 标记为需要单独请求，但保留原始信息
        const markedItem = {
          ...item,
          url: null,
          needsRefresh: true,
          reason: !item.url ? 'no_url' : item.url.includes('null') ? 'null_url' : `code_${item.code}`
        };
        markedResults.push(markedItem);
        console.log(`歌曲 ${item.id} 标记为需要单独请求:`, markedItem.reason);
      }
    }
    
    // 合并所有结果（包括标记为需要刷新的）
    const allResults = [...validResults, ...markedResults];
    
    // 缓存单个歌曲URL结果
    for (const songUrl of allResults) {
      if (songUrl && songUrl.id) {
        const cacheKey = this.generateCacheKey('/song/url', { id: songUrl.id });
        this.setCache(cacheKey, { data: [songUrl] });
      }
    }
    
    console.log(`获取歌曲URL完成: 缓存${cachedResults.length}个, 批量${validResults.length}个, 单独${individualResults.length}个`);
    
    return [...cachedResults, ...allResults];
  }

  /**
   * 验证歌曲缓存数据的完整性
   * @param {Object} song - 歌曲对象
   * @returns {boolean} 数据是否完整
   */
  validateSongCacheData(song) {
    // 检查必要字段是否存在
    const requiredFields = ['id', 'name', 'artist'];
    const hasRequiredFields = requiredFields.every(field => song[field]);
    
    // 检查URL是否有效
    const hasValidUrl = song.url && !song.url.includes('null');
    
    return hasRequiredFields && hasValidUrl;
  }

  /**
   * 刷新单个歌曲的URL（在播放时调用）
   * @param {string} songId - 歌曲ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌曲URL信息
   */
  async refreshSingleSongUrl(songId, options = {}) {
    console.log(`刷新单个歌曲URL: ${songId}`);
    
    try {
      // 第一步：尝试普通API
      const data = await this.request('/song/url', { 
        id: songId,
        br: 320000 // 使用320k码率
      }, options);
      
      if (data.data && data.data.length > 0) {
        const result = data.data[0];
        if (result.url && !result.url.includes('null')) {
          // 更新缓存
          const cacheKey = this.generateCacheKey('/song/url', { id: songId });
          this.setCache(cacheKey, { data: [result] });
          
          return result;
        }
      }
      
      // 第二步：尝试新版API
      const v1Data = await this.request('/song/url/v1', { 
        id: songId,
        level: 'exhigh' // 极高音质
      }, options);
      
      if (v1Data.data && v1Data.data.length > 0) {
        const v1Result = v1Data.data[0];
        if (v1Result.url && !v1Result.url.includes('null')) {
          // 更新缓存
          const cacheKey = this.generateCacheKey('/song/url', { id: songId });
          this.setCache(cacheKey, { data: [v1Result] });
          
          return v1Result;
        }
      }
      
      // 第三步：使用备用URL
      const fallbackUrl = {
        id: songId,
        url: `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
        code: 200,
        br: 128000,
        size: 0,
        md5: '',
        type: 'mp3',
        gain: 0,
        fee: 0,
        uf: null,
        payed: 0,
        flag: 0,
        canExtend: false,
        isFallback: true
      };
      
      // 更新缓存
      const cacheKey = this.generateCacheKey('/song/url', { id: songId });
      this.setCache(cacheKey, { data: [fallbackUrl] });
      
      return fallbackUrl;
    } catch (error) {
      console.error(`刷新歌曲 ${songId} URL失败:`, error);
      
      // 即使失败也返回备用URL
      const fallbackUrl = {
        id: songId,
        url: `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
        code: 200,
        br: 128000,
        size: 0,
        md5: '',
        type: 'mp3',
        gain: 0,
        fee: 0,
        uf: null,
        payed: 0,
        flag: 0,
        canExtend: false,
        isFallback: true,
        error: error.message
      };
      
      return fallbackUrl;
    }
  }

  /**
   * 批量加载歌曲信息（仅详情），智能缓存检测
   * @param {Array<Object>} songs - 歌曲对象数组
   * @param {Object} options - 请求选项
   * @returns {Promise<Array>} 歌曲详情数组（不包含URL）
   */
  async loadSongsComplete(songs, options = {}) {
    if (!songs || songs.length === 0) return [];

    const songIds = songs.map(song => song.id).filter(Boolean);
    if (songIds.length === 0) return songs;

    try {
      // 检查缓存中的歌曲数据完整性
      const cachedSongs = [];
      const uncachedSongs = [];
      const incompleteSongs = [];
      
      for (const song of songs) {
        const detailCacheKey = this.generateCacheKey('/song/detail', { ids: song.id });
        const detailCache = this.checkCache(detailCacheKey);
        
        if (detailCache && detailCache.songs && detailCache.songs[0]) {
          const cachedSong = {
            ...song,
            ...detailCache.songs[0],
            // 不包含URL，播放时再获取
            url: null,
            needsUrlRefresh: true
          };
          
          // 验证缓存数据完整性（不需要URL）
          if (cachedSong.name && cachedSong.artist) {
            cachedSongs.push(cachedSong);
          } else {
            console.log(`歌曲 ${song.name} 缓存数据不完整，需要重新请求`);
            incompleteSongs.push(song);
          }
        } else {
          uncachedSongs.push(song);
        }
      }
      
      console.log(`缓存状态: 完整缓存 ${cachedSongs.length}, 无缓存 ${uncachedSongs.length}, 不完整缓存 ${incompleteSongs.length}`);
      
      // 如果有需要重新请求的歌曲
      const songsToRequest = [...uncachedSongs, ...incompleteSongs];
      let newResults = [];
      
      if (songsToRequest.length > 0) {
        const songIdsToRequest = songsToRequest.map(song => song.id);
        
        // 仅请求歌曲详情
        const details = await this.getSongDetails(songIdsToRequest, options);
        
        // 合并新请求的结果
        const detailsMap = new Map(details.map(song => [song.id, song]));
        
        newResults = songsToRequest.map(song => {
          const detail = detailsMap.get(song.id);
          
          return {
            ...song,
            ...(detail || {}),
            // 不包含URL，播放时再获取
            url: null,
            needsUrlRefresh: true
          };
        });
      }
      
      // 合并缓存和新请求的结果，保持原始顺序
      const resultMap = new Map();
      
      // 先添加新请求的结果
      newResults.forEach(song => resultMap.set(song.id, song));
      
      // 再添加缓存的结果（如果新请求中没有）
      cachedSongs.forEach(song => {
        if (!resultMap.has(song.id)) {
          resultMap.set(song.id, song);
        }
      });
      
      // 按原始顺序返回结果
      return songs.map(song => resultMap.get(song.id) || song);
      
    } catch (error) {
      console.error('批量加载歌曲信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌单详情
   * @param {string} playlistId - 歌单ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌单详情
   */
  async getPlaylistDetail(playlistId, options = {}) {
    return this.request('/playlist/detail', { id: playlistId }, options);
  }

  /**
   * 获取歌单所有歌曲
   * @param {string} playlistId - 歌单ID
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌单歌曲
   */
  async getPlaylistTracks(playlistId, limit = 1000, offset = 0, options = {}) {
    return this.request('/playlist/track/all', { 
      id: playlistId, 
      limit, 
      offset 
    }, options);
  }

  /**
   * 获取歌手详情
   * @param {string} artistId - 歌手ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌手详情
   */
  async getArtistDetail(artistId, options = {}) {
    return this.request('/artist/detail', { id: artistId }, options);
  }

  /**
   * 获取歌手热门歌曲
   * @param {string} artistId - 歌手ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Array>} 歌手热门歌曲
   */
  async getArtistHotSongs(artistId, options = {}) {
    return this.request('/artist/top/song', { id: artistId }, options)
      .then(data => data.songs || []);
  }

  /**
   * 搜索
   * @param {string} keywords - 关键词
   * @param {number} type - 搜索类型 (1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单)
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 搜索结果
   */
  async search(keywords, type = 1, limit = 30, offset = 0, options = {}) {
    return this.request('/cloudsearch', { 
      keywords, 
      type, 
      limit, 
      offset 
    }, options);
  }

  /**
   * 获取歌手完整详情（基本信息+热门歌曲+专辑）
   * @param {string} artistId - 歌手ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌手完整信息
   */
  async getArtistCompleteDetail(artistId, options = {}) {
    const requests = [
      {
        endpoint: '/artist/detail',
        params: { id: artistId },
        options,
        index: 0
      },
      {
        endpoint: '/artist/top/song',
        params: { id: artistId },
        options,
        index: 1
      },
      {
        endpoint: '/artist/album',
        params: { id: artistId, limit: 50 },
        options,
        index: 2
      }
    ];

    try {
      const results = await this.executeConcurrentRequests(requests, 3);
      const [detailResult, hotSongsResult, albumsResult] = results.sort((a, b) => a.index - b.index);
      
      if (!detailResult.success) {
        throw new Error('获取歌手基本信息失败');
      }
      
      return {
        detail: detailResult.data,
        hotSongs: hotSongsResult.success ? (hotSongsResult.data.songs || []) : [],
        albums: albumsResult.success ? (albumsResult.data.hotAlbums || []) : [],
        errors: [
          !detailResult.success && '歌手详情',
          !hotSongsResult.success && '热门歌曲',
          !albumsResult.success && '专辑列表'
        ].filter(Boolean)
      };
    } catch (error) {
      console.error('获取歌手完整详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌单完整详情（基本信息+所有歌曲）
   * @param {string} playlistId - 歌单ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 歌单完整信息
   */
  async getPlaylistCompleteDetail(playlistId, options = {}) {
    const requests = [
      {
        endpoint: '/playlist/detail',
        params: { id: playlistId },
        options,
        index: 0
      },
      {
        endpoint: '/playlist/track/all',
        params: { id: playlistId, limit: 1000 },
        options,
        index: 1
      }
    ];

    try {
      const results = await this.executeConcurrentRequests(requests, 3);
      const [detailResult, tracksResult] = results.sort((a, b) => a.index - b.index);
      
      if (!detailResult.success) {
        throw new Error('获取歌单基本信息失败');
      }
      
      return {
        detail: detailResult.data,
        tracks: tracksResult.success ? (tracksResult.data.songs || []) : [],
        errors: [
          !detailResult.success && '歌单详情',
          !tracksResult.success && '歌曲列表'
        ].filter(Boolean)
      };
    } catch (error) {
      console.error('获取歌单完整详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取专辑完整详情（基本信息+歌曲列表）
   * @param {string} albumId - 专辑ID
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 专辑完整信息
   */
  async getAlbumCompleteDetail(albumId, options = {}) {
    const requests = [
      {
        endpoint: '/album',
        params: { id: albumId },
        options,
        index: 0
      }
    ];

    try {
      const results = await this.executeConcurrentRequests(requests, 3);
      const albumResult = results[0];
      
      if (!albumResult.success) {
        throw new Error('获取专辑详情失败');
      }
      
      return {
        detail: albumResult.data,
        errors: albumResult.success ? [] : ['专辑详情']
      };
    } catch (error) {
      console.error('获取专辑完整详情失败:', error);
      throw error;
    }
  }

  /**
   * 清除缓存
   * @param {string} pattern - 可选，清除匹配模式的缓存
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * 估算内存使用量
   * @returns {number} 估算的内存使用量（字节）
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // 字符串大小
      totalSize += JSON.stringify(value).length * 2;
    }
    return totalSize;
  }
}

export default MusicApiRequestManager;