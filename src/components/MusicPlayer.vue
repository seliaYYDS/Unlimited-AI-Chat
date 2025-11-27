<template>
  <div class="music-player-modal-overlay" v-if="visible" @click="closePlayer">
    <div class="music-player-modal-content" @click.stop>
      <div class="music-player-header">
        <h3>音乐播放器</h3>
        <button class="close-btn" @click="closePlayer">×</button>
      </div>
      
      <div class="music-player-body">
        <!-- 搜索栏 -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="搜索歌曲、歌手或专辑..." 
              @keyup.enter="searchMusic"
              class="search-input"
            />
            <button @click="searchMusic" class="search-btn">搜索</button>
          </div>
        </div>
        
        <!-- 播放列表 -->
        <div class="playlist-section">
          <div class="playlist-header">
            <h4>播放列表</h4>
            <div class="playlist-controls">
              <button @click="togglePlaylistView" class="view-toggle-btn">
                {{ showSearchResults ? '返回播放列表' : '显示搜索结果' }}
              </button>
            </div>
          </div>
          
          <div class="playlist-container">
            <div 
              v-for="(song, index) in currentPlaylist" 
              :key="song.id || index"
              :class="['playlist-item', { 'playing': currentSong && currentSong.id === song.id }]"
            >
              <div class="song-info" @click="selectSong(getSongIndex(song, currentPlaylist))">
                <div class="song-title">{{ song.name || song.title || '未知歌曲' }}</div>
                <div class="song-artist">{{ (song.ar && Array.isArray(song.ar) ? song.ar.map(a => a.name).join(', ') : (song.artists && Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : song.artist || '未知艺术家')) }}</div>
              </div>
              <div class="song-actions">
                <button v-if="showSearchResults && !isSongInPlaylist(song)" class="add-to-playlist-btn" @click.stop="addToPlaylist(song)" title="添加到播放列表">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
                <button v-if="!showSearchResults" class="play-song-btn" @click.stop="selectSong(getSongIndex(song, currentPlaylist))" title="播放歌曲">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                <div class="song-duration">{{ formatDuration((song.dt !== undefined ? song.dt : (song.duration !== undefined ? song.duration : 0)) || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 播放控制区域 -->
        <div class="player-controls">
          <div class="current-song-info">
            <div class="song-image" v-if="currentSong">
              <img :src="(currentSong.al && currentSong.al.picUrl) || currentSong.picUrl || (currentSong.album && currentSong.album.picUrl) || defaultAlbumArt" :alt="currentSong.name" />
            </div>
            <div class="song-details">
              <div class="song-name">{{ currentSong ? currentSong.name : '未播放' }}</div>
              <div class="song-artist">{{ currentSong ? ((currentSong.ar && Array.isArray(currentSong.ar) ? currentSong.ar.map(a => a.name).join(', ') : (currentSong.artists && Array.isArray(currentSong.artists) ? currentSong.artists.map(a => a.name).join(', ') : currentSong.artist || '未知艺术家'))) : '选择一首歌曲开始播放' }}</div>
            </div>
          </div>
          
          <div class="progress-container">
            <span class="time-display">{{ formatTime(currentTime) }}</span>
            <input 
              type="range" 
              class="progress-slider" 
              :value="progress" 
              @input="seekMusic" 
              :max="100" 
              :disabled="!currentSong"
            />
            <span class="time-display">{{ formatTime(duration) }}</span>
          </div>
          
          <div class="control-buttons">
            <button @click="skipPrevious" class="control-btn" :disabled="!currentSong">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            <button @click="togglePlayPause" class="control-btn large" :disabled="!currentSong">
              <svg v-if="isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button @click="skipNext" class="control-btn" :disabled="!currentSong">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>
          
          <div class="volume-control">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input 
              type="range" 
              class="volume-slider" 
              v-model="volume" 
              @input="changeVolume"
              min="0" 
              max="100" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MusicPlayer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    apiUrl: {
      type: String,
      default: 'https://zm.i9mr.com'
    }
  },
  data() {
    return {
      searchQuery: '',
      playlist: [],
      searchResults: [],
      currentPlaylist: [],
      showSearchResults: false,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      progress: 0,
      volume: 70,
      audio: null,
      defaultAlbumArt: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e0e0e0"/><text x="50" y="55" font-family="Arial" font-size="12" fill="%23666" text-anchor="middle">专辑封面</text></svg>'
    }
  },
  computed: {
    progress() {
      if (this.duration === 0) return 0;
      return (this.currentTime / this.duration) * 100;
    }
  },
  watch: {
    isPlaying(newVal) {
      if (this.audio) {
        if (newVal) {
          this.audio.play().catch(e => console.error('播放失败:', e));
        } else {
          this.audio.pause();
        }
      }
      // 发送播放状态变化事件
      this.$emit('playback-status-changed', {
        isPlaying: newVal,
        currentSong: this.currentSong,
        currentTime: this.currentTime,
        duration: this.duration
      });
    },
    volume(newVal) {
      if (this.audio) {
        this.audio.volume = newVal / 100;
      }
    },
    currentSong(newVal) {
      // 发送当前歌曲变化事件
      this.$emit('current-song-changed', newVal);
    }
  },
  mounted() {
    // 加载保存的音量设置
    this.loadSavedVolume();
    this.initAudio();
    this.loadDefaultPlaylist();
  },
  methods: {
    initAudio() {
      this.audio = new Audio();
      this.audio.volume = this.volume / 100;
      
      this.audio.addEventListener('loadedmetadata', () => {
        this.duration = this.audio.duration;
      });
      
      this.audio.addEventListener('timeupdate', () => {
        this.currentTime = this.audio.currentTime;
        // 发送播放状态变化事件，包含实时进度
        this.$emit('playback-status-changed', {
          isPlaying: this.isPlaying,
          currentSong: this.currentSong,
          currentTime: this.currentTime,
          duration: this.duration
        });
      });
      
      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.playNext();
      });
      
      this.audio.addEventListener('error', (e) => {
        console.error('音频播放错误:', e);
        this.isPlaying = false;
      });
    },
    
      async loadDefaultPlaylist() {
      // 取消自动加载个性化推荐，初始化为空播放列表
      this.useDefaultPlaylist();
    },
    
    useDefaultPlaylist() {
      // 使用空播放列表作为备选
      this.playlist = [];
    },
    
    async searchMusic() {
      if (!this.searchQuery.trim()) return;
      
      try {
        // 调用API搜索音乐
        const response = await fetch(`${this.apiUrl}/search?keywords=${encodeURIComponent(this.searchQuery)}&type=1&limit=20`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.result && data.result.songs) {
            this.searchResults = data.result.songs.map(song => ({
              id: song.id,
              name: song.name,
              artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
              duration: song.duration || (song.dt ? song.dt : 0),
              album: song.album ? song.album.name : (song.al ? song.al.name : '未知专辑'),
              url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
            }));
          } else {
            this.searchResults = [];
          }
        } else {
          this.searchResults = [];
        }
        
        this.showSearchResults = true;
        this.currentPlaylist = this.searchResults;
      } catch (error) {
        console.error('搜索音乐失败:', error);
        this.$emit('notify', `搜索失败: ${error.message}`, 'danger');
      }
    },
    
    selectSong(index) {
      const song = this.currentPlaylist[index];
      this.currentSong = song;
      this.loadSong(song);
      this.isPlaying = true;
      // 确保播放状态正确更新
      this.$nextTick(() => {
        if (this.audio) {
          this.audio.play().catch(e => console.error('播放失败:', e));
        }
      });
    },
    
    async loadSong(song) {
      try {
        // 调用API获取真实歌曲URL
        const response = await fetch(`${this.apiUrl}/song/url?id=${song.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.data && data.data[0] && data.data[0].url) {
            const songUrl = data.data[0].url;
            if (songUrl) {
              this.audio.src = songUrl;
              // 尝试获取歌曲详细信息
              await this.loadSongDetail(song.id);
            } else {
              // 如果API返回的URL为空，使用备用URL
              this.audio.src = song.url || `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
            }
          } else {
            this.audio.src = song.url || `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
          }
        } else {
          this.audio.src = song.url || `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
        }
        this.audio.load();
        // 加载完成后自动播放
        this.audio.oncanplay = () => {
          if (this.isPlaying) {
            this.audio.play().catch(e => console.error('自动播放失败:', e));
          }
        };
      } catch (error) {
        console.error('加载歌曲失败:', error);
        // 使用备用URL
        this.audio.src = song.url || `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
        this.audio.load();
        this.audio.oncanplay = () => {
          if (this.isPlaying) {
            this.audio.play().catch(e => console.error('自动播放失败:', e));
          }
        };
        this.$emit('notify', `加载歌曲失败: ${error.message}`, 'danger');
      }
    },
    
    async loadSongDetail(songId) {
      try {
        // 获取歌曲详细信息以更新当前歌曲数据
        const response = await fetch(`${this.apiUrl}/song/detail?ids=${songId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.songs && data.songs[0]) {
            const songDetail = data.songs[0];
            // 更新当前歌曲信息以显示更准确的数据
            this.currentSong = {
              ...this.currentSong,
              name: songDetail.name || this.currentSong.name,
              artist: (songDetail.ar && Array.isArray(songDetail.ar)) ? 
                       songDetail.ar.map(a => a.name).join(', ') : 
                       this.currentSong.artist,
              album: (songDetail.al && songDetail.al.name) ? 
                     songDetail.al.name : 
                     this.currentSong.album,
              duration: songDetail.dt || songDetail.duration || this.currentSong.duration,
              picUrl: (songDetail.al && songDetail.al.picUrl) ? 
                      songDetail.al.picUrl : 
                      this.currentSong.picUrl
            };
          }
        }
      } catch (error) {
        console.error('获取歌曲详细信息失败:', error);
      }
    },
    
    togglePlayPause() {
      if (!this.currentSong) return;
      
      this.isPlaying = !this.isPlaying;
      
      if (this.audio) {
        if (this.isPlaying) {
          this.audio.play().catch(e => {
            console.error('播放失败:', e);
            this.isPlaying = false;
          });
        } else {
          this.audio.pause();
        }
      }
    },
    
    skipNext() {
      if (!this.currentSong || this.currentPlaylist.length === 0) return;
      
      const currentIndex = this.currentPlaylist.findIndex(song => song.id === this.currentSong.id);
      const nextIndex = (currentIndex + 1) % this.currentPlaylist.length;
      this.selectSong(nextIndex);
    },
    
    skipPrevious() {
      if (!this.currentSong || this.currentPlaylist.length === 0) return;
      
      const currentIndex = this.currentPlaylist.findIndex(song => song.id === this.currentSong.id);
      const prevIndex = currentIndex === 0 ? this.currentPlaylist.length - 1 : currentIndex - 1;
      this.selectSong(prevIndex);
    },
    
    playNext() {
      if (this.currentPlaylist.length === 0) return;
      
      const currentIndex = this.currentPlaylist.findIndex(song => song.id === this.currentSong.id);
      if (currentIndex !== -1 && currentIndex < this.currentPlaylist.length - 1) {
        this.selectSong(currentIndex + 1);
      } else {
        // 循环播放
        this.selectSong(0);
      }
    },
    
    seekMusic(event) {
      if (!this.audio) return;
      
      const newTime = (event.target.value / 100) * this.duration;
      this.audio.currentTime = newTime;
    },
    
    changeVolume() {
      if (this.audio) {
        this.audio.volume = this.volume / 100;
      }
      // 保存音量设置到localStorage
      this.saveVolume();
    },

    // 加载保存的音量设置
    loadSavedVolume() {
      try {
        const savedVolume = localStorage.getItem('musicPlayerVolume');
        if (savedVolume !== null) {
          this.volume = parseInt(savedVolume, 10);
        }
      } catch (error) {
        console.error('加载音量设置失败:', error);
      }
    },

    // 保存音量设置到localStorage
    saveVolume() {
      try {
        localStorage.setItem('musicPlayerVolume', this.volume.toString());
      } catch (error) {
        console.error('保存音量设置失败:', error);
      }
    },
    
    togglePlaylistView() {
      this.showSearchResults = !this.showSearchResults;
      this.currentPlaylist = this.showSearchResults ? this.searchResults : this.playlist;
    },
    
    formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },
    
    formatDuration(milliseconds) {
      if (!milliseconds) return '0:00';
      
      const seconds = Math.floor(milliseconds / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },
    
    closePlayer() {
      this.$emit('close');
      // 不停止音频播放，只关闭界面
      // 如果需要停止播放，可以取消注释下面的代码
      // this.isPlaying = false;
      // if (this.audio) {
      //   this.audio.pause();
      // }
    },

    // 添加歌曲到播放列表
    addToPlaylist(song) {
      // 检查歌曲是否已经在播放列表中
      const exists = this.playlist.some(s => s.id === song.id);
      if (!exists) {
        // 添加歌曲到播放列表
        this.playlist = [...this.playlist, { ...song }];
        // 如果当前显示的是播放列表，也更新当前播放列表
        if (!this.showSearchResults) {
          this.currentPlaylist = this.playlist;
        }
        this.$emit('notify', '歌曲已添加到播放列表', 'success');
      } else {
        this.$emit('notify', '歌曲已在播放列表中', 'warning');
      }
    },

    // 检查歌曲是否已在播放列表中
    isSongInPlaylist(song) {
      return this.playlist.some(s => s.id === song.id);
    },

    // 获取歌曲在当前播放列表中的索引
    getSongIndex(song, playlist) {
      return playlist.findIndex(s => s.id === song.id);
    }
  }
}
</script>

<style scoped>
.music-player-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 更流畅的缓动 */
}

.music-player-modal-overlay[style*="display: block"], 
.music-player-modal-overlay:not([style*="display: none"]) {
  opacity: 1;
  transform: scale(1);
}

.music-player-modal-content {
  width: 90%;
  max-width: 900px; /* 增加最大宽度 */
  height: 85%; /* 增加高度 */
  max-height: 800px; /* 增加最大高度 */
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transform: translateY(-50px); /* 初始位置向上偏移 */
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 更流畅的缓动 */
}

.music-player-modal-overlay[style*="display: block"] .music-player-modal-content,
.music-player-modal-overlay:not([style*="display: none"]) .music-player-modal-content {
  transform: translateY(0); /* 恢复正常位置 */
}

/* 添加弹跳效果 */
.music-player-modal-content {
  animation: modalPopIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes modalPopIn {
  0% {
    transform: scale(0.8) translateY(-60px);
    opacity: 0;
  }
  60% {
    transform: scale(1.05) translateY(10px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

.theme-dark .music-player-modal-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.music-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.theme-dark .music-player-header {
  border-bottom: 1px solid var(--border-color);
}

.music-player-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: white;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.music-player-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.theme-dark .music-player-body {
  background: var(--bg-tertiary);
}

.search-section {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.search-input-wrapper {
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 1em;
  outline: none;
  transition: all 0.2s;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.2);
}

.search-btn {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.search-btn:hover {
  background: var(--primary-hover);
}

.playlist-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.playlist-header h4 {
  margin: 0;
  font-size: 1em;
  color: var(--text-primary);
}

.playlist-controls {
  display: flex;
  gap: 10px;
}

.view-toggle-btn {
  padding: 5px 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.playlist-container {
  flex: 1;
  overflow-y: auto;
  max-height: none;
  height: 300px;
  min-height: 200px;
}

.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-tertiary);
}

.playlist-item:hover {
  background: var(--bg-hover);
}

.playlist-item.playing {
  background: var(--primary-color);
  color: white;
}

.song-info {
  flex: 1;
  overflow: hidden;
  margin-right: 10px;
}

.song-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 0.8em;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-duration {
  font-size: 0.9em;
  opacity: 0.7;
  min-width: 50px;
  text-align: right;
}

.player-controls {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 10px; /* 减少间距 */
  min-height: 180px; /* 设置最小高度，但比之前小一些 */
}

.current-song-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.song-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.song-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-details {
  flex: 1;
  overflow: hidden;
}

.song-name {
  font-weight: 600;
  font-size: 1.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 0.9em;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-display {
  font-size: 0.8em;
  min-width: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.progress-slider {
  flex: 1;
  height: 5px;
  border-radius: 5px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  transition: all 0.3s ease;
}

.progress-slider:hover {
  height: 7px; /* 悬停时增高 */
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 5px rgba(var(--primary-color-rgb), 0.5);
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3); /* 悬停时放大 */
  background: var(--primary-hover);
}

.progress-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 0 5px rgba(var(--primary-color-rgb), 0.5);
}

.progress-slider::-moz-range-thumb:hover {
  transform: scale(1.3); /* 悬停时放大 */
  background: var(--primary-hover);
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.large {
  width: 50px;
  height: 50px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.volume-slider {
  flex: 1;
  height: 5px;
  border-radius: 5px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: none;
}

/* 滚动条样式 */
.playlist-container::-webkit-scrollbar {
  width: 6px;
}

.playlist-container::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.playlist-container::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 3px;
}

.playlist-container::-webkit-scrollbar-thumb:hover {
  background: var(--primary-hover);
}

.theme-dark .playlist-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .music-player-modal-content {
    width: 95%;
    height: 90%;
  }
  
  .current-song-info {
    flex-direction: column;
    text-align: center;
  }
  
  .song-image {
    width: 60px;
    height: 60px;
  }
  
  .control-buttons {
    gap: 40px;
  }
}

/* 歌曲操作按钮样式 */
.song-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-to-playlist-btn, .play-song-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 更流畅的过渡 */
}

.add-to-playlist-btn:hover, .play-song-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.2); /* 增大缩放效果 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-to-playlist-btn:disabled, .play-song-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 播放列表项动画 */
.playlist-item {
  animation: fadeInUp 0.4s ease-out;
  animation-fill-mode: both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 按钮悬停效果动画 */
.control-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.control-btn:hover:not(:disabled) {
  transform: scale(1.1) !important; /* 增大悬停缩放效果 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.search-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.search-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.6s;
}

.search-btn:hover::before {
  left: 100%;
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>