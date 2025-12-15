<template>
  <div class="music-player-modal-overlay" v-if="visible && !isMinimized" @click="closePlayer">
    <div class="music-player-modal-content" @click.stop>
      <!-- 沉浸式播放页面 -->
      <div v-if="showImmersivePlayer" class="immersive-player" @click.stop @mousemove="handleImmersiveMouseMove">
        <!-- Canvas 背景 -->
        <canvas ref="immersiveCanvas" class="immersive-background"></canvas>
        
        <!-- 右上角关闭按钮 -->
        <button class="immersive-close-btn" @click="closeImmersivePlayer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        
        <!-- 沉浸式播放内容 -->
        <div class="immersive-content">
          <!-- 左侧：歌曲封面和信息 -->
          <div class="immersive-left">
            <div class="immersive-cover-container">
              <img 
                :src="currentSong?.picUrl || defaultAlbumArt" 
                :alt="currentSong?.name || '歌曲封面'"
                class="immersive-cover"
                @error="handleImageError"
              />
              <!-- 歌曲信息移动到封面左下角 -->
              <div class="immersive-song-info">
                <h2 class="immersive-song-name">{{ currentSong?.name || '未知歌曲' }}</h2>
                <p class="immersive-artist-name">{{ currentSong?.artist || '未知歌手' }}</p>
                <p class="immersive-album-name">{{ currentSong?.album || '未知专辑' }}</p>
              </div>
            </div>
            
            <!-- 垂直排列的播放控件 -->
            <div class="immersive-controls-vertical">
              <!-- 操控按钮 -->
              <div class="control-buttons">
                <button class="control-btn" @click="skipPrevious">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>
                <button class="control-btn play-pause" @click="togglePlayPause">
                  <svg v-if="!isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                </button>
                <button class="control-btn" @click="skipNext">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>
              
              <!-- 进度条 -->
              <div class="progress-section">
                <div class="progress-time progress-time-current">{{ formatTime(currentTime) }}</div>
                <div class="progress-track" @click="seekTo" @touchstart="seekTo">
                  <div class="progress-buffer" :style="{ width: bufferedProgress + '%' }"></div>
                  <div class="progress-current" :style="{ width: progress + '%' }"></div>
                  <div class="progress-thumb" :style="{ left: progress + '%' }"></div>
                </div>
                <div class="progress-time progress-time-total">{{ formatTime(duration) }}</div>
              </div>
              
              <!-- 显示译文/罗马音按钮 -->
              <div class="translation-control">
                <button v-if="translationLyrics.length > 0" class="translation-btn" @click="toggleTranslation">
                  {{ showTranslation ? '隐藏译文' : '显示译文' }}
                </button>
                <button v-if="romaLyrics.length > 0" class="translation-btn" @click="toggleRoma">
                  {{ showRoma ? '隐藏罗马音' : '显示罗马音' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- 右侧：滚动歌词 -->
          <div class="immersive-right">
            <div class="lyrics-container" ref="lyricsContainer" @wheel="handleLyricsWheel">
              <div class="lyrics-scroll" ref="lyricsScroll">
                <div 
                  v-for="(lyric, index) in lyrics" 
                  :key="index"
                  :class="['lyric-line', { 
                    'active': index === currentLyricIndex,
                    'prev': index === currentLyricIndex - 1,
                    'next': index === currentLyricIndex + 1,
                    'has-translation': (showTranslation && translationLyrics[index]) || (showRoma && romaLyrics[index]),
                    'empty-line': lyric.isEmpty
                  }]"
                  @click="seekToLyric(lyric.time)"
                >
                  <div class="lyric-text">{{ lyric.text }}</div>
                  <!-- 翻译歌词 -->
                  <div v-if="showTranslation && !showRoma && translationLyrics[index]" 
                       :class="['lyric-translation', { 'approximate': translationLyrics[index].isApproximate }]">
                    {{ translationLyrics[index].text }}
                  </div>
                  <!-- 罗马音歌词 -->
                  <div v-if="showRoma && !showTranslation && romaLyrics[index]" 
                       :class="['lyric-translation lyric-roma', { 'approximate': romaLyrics[index].isApproximate }]">
                    {{ romaLyrics[index].text }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
      
      </div>
      <div class="music-player-header">
        <div class="header-left">
          <h3 @click="goToHomePage" class="header-title">音乐播放器</h3>
        </div>
        <div class="header-center">
          <!-- 搜索类型下拉菜单 -->
          <div class="search-type-dropdown" @click="toggleSearchTypeDropdown">
            <button class="dropdown-trigger">
              {{ getCurrentSearchTypeLabel() }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" :class="{ 'dropdown-open': showSearchTypeDropdown }">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            <div v-if="showSearchTypeDropdown" class="dropdown-menu">
              <div 
                v-for="type in searchTypes" 
                :key="type.value"
                :class="['dropdown-item', { active: searchType === type.value }]"
                @click.stop="selectSearchType(type.value)"
              >
                {{ type.label }}
              </div>
            </div>
          </div>
          
          <div class="search-input-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              :placeholder="getSearchPlaceholder()" 
              @keyup.enter="searchMusic"
              class="search-input"
              :disabled="isSearching"
            />
            <button @click="searchMusic" class="search-btn" :disabled="isSearching || !searchQuery.trim()">
              <span v-if="!isSearching">搜索</span>
              <div v-else class="search-loader">
                <div class="loader-circle"></div>
              </div>
            </button>
          </div>
        </div>
        <div class="header-right">
          <!-- 用户头像和登录状态 -->
          <div class="user-info-container" @click="handleUserContainerClick">
            <div class="user-avatar" @click.stop="handleUserContainerClick">
              <img v-if="isLoggedIn && userInfo" :src="userInfo.avatarUrl || defaultAlbumArt" :alt="userInfo.nickname" />
              <div v-else class="default-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
            </div>
            <div class="user-name" @click.stop="handleUserContainerClick">
              {{ isLoggedIn && userInfo ? userInfo.nickname : '未登录' }}
            </div>
            
            <!-- 用户菜单 -->
            <div v-if="showUserDropdown" class="user-dropdown" @click.stop>
              <div v-if="isLoggedIn && userInfo" class="user-menu">
                <div class="user-info">
                  <div class="user-avatar-large">
                    <img :src="userInfo.avatarUrl || defaultAlbumArt" :alt="userInfo.nickname" />
                  </div>
                  <div class="user-details">
                    <div class="user-name">{{ userInfo.nickname }}</div>
                    <div class="user-level" v-if="userLevel">Lv.{{ userLevel.level }}</div>
                  </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="refreshUserInfo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  刷新用户信息
                </div>
                <div class="menu-item logout" @click="showLogoutConfirm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                  退出登录
                </div>
              </div>
            </div>
          </div>
          
          <button class="minimize-btn" @click="minimizePlayer" title="最小化">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <button class="close-btn" @click="closePlayer">×</button>
        </div>
      </div>
      
      <div class="music-player-body">
        
        <!-- 主页内容 -->
        <div v-if="!showSearchResults" class="home-page">
          <!-- 左侧边栏 -->
          <div class="sidebar" v-if="isLoggedIn">
            <div class="sidebar-section">
              <div class="sidebar-header">
                <h4 class="sidebar-title">我的歌单</h4>
                <button v-if="isLoggedIn" class="create-playlist-btn" @click="openCreatePlaylistModal" title="创建新歌单">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
              </div>
              <div class="user-playlists">
                <div v-if="isLoadingUserPlaylists" class="loading-placeholder">加载中...</div>
                <div v-else-if="userPlaylists.length === 0" class="empty-placeholder">暂无创建的歌单</div>
                <div v-else class="user-playlists-list">
                  <div v-for="playlist in userPlaylists.slice(0, 10)" :key="playlist.id" class="playlist-item">
                    <div class="playlist-content" 
                         @click="openPlaylist(playlist)"
                         @contextmenu="showContextMenu($event, 'playlist', playlist)">
                      <img :src="playlist.coverImgUrl || defaultAlbumArt" :alt="playlist.name" class="playlist-cover">
                      <div class="playlist-info">
                        <div class="playlist-name">{{ playlist.name }}</div>
                        <div class="playlist-count">{{ playlist.trackCount }} 首</div>
                      </div>
                    </div>
                    <div class="playlist-actions" v-if="isLoggedIn && playlist.creator && playlist.creator.userId === userInfo.userId">
                      <button class="playlist-action-btn edit" @click.stop="openEditPlaylistModal(playlist)" title="编辑歌单">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                      <button class="playlist-action-btn delete" @click.stop="deletePlaylist(playlist)" title="删除歌单">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 主内容区 -->
          <div class="main-content" :class="{ 'full-width': !isLoggedIn }">
            <!-- 未登录提示 -->
            <div v-if="!isLoggedIn" class="login-prompt-section">
              <div class="login-prompt-content">
                <div class="login-prompt-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
                <h3 class="login-prompt-title">登录以加载个性化内容</h3>
                <p class="login-prompt-description">登录网易云音乐账号后，可以查看您的个人歌单、推荐歌单和推荐歌曲</p>
                <button class="login-prompt-btn" @click="openLoginModal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                  立即登录
                </button>
              </div>
            </div>
            
            <!-- 已登录内容 -->
            <template v-else>
              <!-- 推荐歌单 -->
              <div class="recommend-section">
                <h3 class="section-title">推荐歌单</h3>
                <div v-if="isLoadingRecommendPlaylists" class="loading-placeholder">加载中...</div>
                <div v-else class="recommend-playlists">
                  <div v-for="playlist in recommendPlaylists" :key="playlist.id" class="recommend-playlist-item">
                    <div class="recommend-playlist-content" @click="openPlaylist(playlist)">
                      <img :src="playlist.picUrl || defaultAlbumArt" :alt="playlist.name" class="recommend-playlist-cover">
                      <div class="recommend-playlist-info">
                        <div class="recommend-playlist-name">{{ playlist.name }}</div>
                        <div class="recommend-playlist-count">{{ playlist.playCount }} 次播放</div>
                      </div>
                    </div>
                    <button 
                      v-if="isLoggedIn" 
                      class="recommend-playlist-subscribe-btn" 
                      @click.stop="toggleSubscribePlaylist(playlist)"
                      :title="userPlaylists.some(p => p.id === playlist.id) ? '取消收藏' : '收藏歌单'"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" :fill="userPlaylists.some(p => p.id === playlist.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 推荐歌曲 -->
              <div class="recommend-section">
                <h3 class="section-title">推荐歌曲</h3>
                <div v-if="isLoadingRecommendSongs" class="loading-placeholder">加载中...</div>
                <div v-else class="recommend-songs">
                  <div v-for="song in recommendSongs" :key="song.id" class="recommend-song-item" @contextmenu="showContextMenu($event, 'song', song)">
                    <img :src="song.picUrl || (song.al && song.al.picUrl) || defaultAlbumArt" :alt="song.name" class="recommend-song-cover" @click="playRecommendSong(song)">
                    <div class="recommend-song-info" @click="playRecommendSong(song)">
                      <div class="recommend-song-name">{{ song.name }}</div>
                      <div class="recommend-song-artist">{{ song.artist }}</div>
                    </div>
                    <div class="recommend-song-actions">
                      <button 
                        v-if="isLoggedIn" 
                        :class="['recommend-like-btn', { 'liked': isSongLiked(song.id) }]" 
                        @click.stop="handleLikeButtonClick(song)" 
                        :title="isSongLiked(song.id) ? '取消收藏' : '收藏歌曲'"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" :fill="isSongLiked(song.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      <button v-if="!isSongInPlaylist(song)" class="recommend-add-btn" @click.stop="addToPlaylist(song)" title="添加到播放列表">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
          
          <!-- 底部播放控件面板 -->
          <div v-if="!showPlaylistDetail" class="bottom-player">
            <div class="bottom-player-content">
              <!-- 歌曲信息 -->
              <div class="bottom-song-info">
                <div class="bottom-song-cover" @click="openImmersivePlayer">
                  <img v-if="currentSong" :src="(currentSong.al && currentSong.al.picUrl) || currentSong.picUrl || (currentSong.album && currentSong.album.picUrl) || defaultAlbumArt" :alt="currentSong.name" />
                  <div v-else class="empty-song-cover">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                </div>
                <div class="bottom-song-details">
                  <div class="bottom-song-name" v-if="currentSong">{{ currentSong.name }}</div>
                  <div class="bottom-song-name" v-else>未播放歌曲</div>
                  <div class="bottom-song-artist" v-if="currentSong">
                    <template v-if="currentSong.ar && Array.isArray(currentSong.ar)">
                      <span 
                        v-for="(artist, index) in currentSong.ar" 
                        :key="artist.id"
                        class="artist-name clickable"
                        @click.stop="getArtistDetail(artist.id)"
                      >
                        {{ artist.name }}
                        <span v-if="index < currentSong.ar.length - 1" class="artist-separator">, </span>
                      </span>
                    </template>
                    <template v-else-if="currentSong.artists && Array.isArray(currentSong.artists)">
                      <span 
                        v-for="(artist, index) in currentSong.artists" 
                        :key="artist.id"
                        class="artist-name clickable"
                        @click.stop="getArtistDetail(artist.id)"
                      >
                        {{ artist.name }}
                        <span v-if="index < currentSong.artists.length - 1" class="artist-separator">, </span>
                      </span>
                    </template>
                    <span v-else class="artist-name clickable" @click.stop="handleArtistClick(currentSong)">{{ currentSong.artist || '未知艺术家' }}</span>
                  </div>
                  <div class="bottom-song-artist" v-else>选择一首歌曲开始播放</div>
                </div>
              </div>
              
              <!-- 播放控制 -->
              <div class="bottom-controls">
                <button @click="previousSong" class="bottom-control-btn" title="上一首" :disabled="!currentSong">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>
                <button @click="togglePlay" class="bottom-play-btn" :title="isPlaying ? '暂停' : '播放'" :disabled="!currentSong">
                  <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                </button>
                <button @click="nextSong" class="bottom-control-btn" title="下一首" :disabled="!currentSong">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>
              
              <!-- 进度条 -->
              <div class="bottom-progress">
                <span class="bottom-time">{{ formatTime(currentTime) }}</span>
                <div class="bottom-progress-bar" @click="seekTo">
                  <div class="bottom-progress-fill" :style="{ width: progress + '%' }"></div>
                </div>
                <span class="bottom-time">{{ formatTime(duration) }}</span>
              </div>
              
              <!-- 播放列表按钮 -->
              <div class="bottom-right-controls">
                <button 
                  class="bottom-playlist-btn" 
                  @click="togglePlaylistMenu"
                  :class="{ active: showPlaylistMenu }"
                  title="播放列表"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                  </svg>
                  <span class="bottom-playlist-count" v-if="playlist.length > 0">{{ playlist.length }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 播放列表 -->
        <div v-else class="playlist-section">
          <div class="playlist-header">
            <h4>{{ showSearchResults ? '搜索结果' : '音乐列表' }}</h4>
            <div class="playlist-controls">
              <button @click="toggleGridView" class="grid-view-btn" v-if="showSearchResults && searchType === 'songs'" :class="{ active: isGridView }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
                </svg>
                {{ isGridView ? '列表视图' : '网格视图' }}
              </button>
            </div>
          </div>
          
          <div class="playlist-container expanded">
            <!-- 搜索加载状态 -->
            <div v-if="isSearching" class="loading-container">
              <div class="music-loader">
                <div class="loader-bar"></div>
                <div class="loader-bar"></div>
                <div class="loader-bar"></div>
                <div class="loader-bar"></div>
              </div>
              <p class="loading-text">正在搜索{{ searchType === 'songs' ? '音乐' : searchType === 'playlists' ? '歌单' : '歌手' }}...</p>
            </div>
            
            <!-- 歌曲搜索结果 -->
            <div v-else-if="showSearchResults && searchType === 'songs'">
              <!-- 列表视图 -->
              <div v-if="!isGridView">
                <div 
                  v-for="(song, index) in currentPlaylist" 
                  :key="song.id || index"
                  :class="['playlist-item song-search-item', { 'playing': currentSong && currentSong.id === song.id, 'loading': isLoadingSong && currentSong && currentSong.id === song.id }]"
                  @contextmenu="showContextMenu($event, 'song', song)"
                >
                  <div class="song-cover-container">
                    <div class="song-cover-rounded" v-if="song.picUrl">
                      <img :src="song.picUrl" :alt="song.name" />
                      <div class="play-overlay" @click="playFromSearchResults(song)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div class="song-cover-rounded default-cover" v-else>
                      <img :src="defaultAlbumArt" :alt="song.name" />
                      <div class="play-overlay" @click="playFromSearchResults(song)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div class="song-info-container">
                    <div class="song-title" @click="playFromSearchResults(song)">{{ song.name || song.title || '未知歌曲' }}</div>
                    <div class="song-artist">
                      <template v-if="song.artists && Array.isArray(song.artists)">
                        <span 
                          v-for="(artist, index) in song.artists" 
                          :key="artist.id"
                          class="artist-name"
                          @click.stop="getArtistDetail(artist.id)"
                        >
                          {{ artist.name }}
                          <span v-if="index < song.artists.length - 1" class="artist-separator">, </span>
                        </span>
                      </template>
                      <template v-else-if="song.ar && Array.isArray(song.ar)">
                        <span 
                          v-for="(artist, index) in song.ar" 
                          :key="artist.id"
                          class="artist-name"
                          @click.stop="getArtistDetail(artist.id)"
                        >
                          {{ artist.name }}
                          <span v-if="index < song.ar.length - 1" class="artist-separator">, </span>
                        </span>
                      </template>
                      <span v-else>{{ song.artist || '未知艺术家' }}</span>
                    </div>
                    <div class="song-album" v-if="song.albumName">{{ song.albumName }}</div>
                  </div>
                  <div class="song-actions-right">
                    <!-- 歌曲加载状态 -->
                    <div v-if="isLoadingSong && currentSong && currentSong.id === song.id" class="song-loader">
                      <div class="mini-loader"></div>
                    </div>
                    <template v-else>
                      <!-- 收藏按钮 -->
                      <button 
                        v-if="isLoggedIn" 
                        :class="['like-btn', { 'liked': isSongLiked(song.id) }]" 
                        @click.stop="handleLikeButtonClick(song)" 
                        :title="isSongLiked(song.id) ? '取消收藏' : '收藏歌曲'"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" :fill="isSongLiked(song.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      <!-- 添加到播放列表按钮 -->
                      <button v-if="showSearchResults && !isSongInPlaylist(song)" class="add-to-playlist-btn" @click.stop="addToPlaylist(song)" title="添加到播放列表">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </button>
                    </template>
                    <div class="song-duration">{{ formatDuration((song.dt !== undefined ? song.dt : (song.duration !== undefined ? song.duration : 0)) || 0) }}</div>
                  </div>
                </div>
              </div>
              
              <!-- 网格视图 -->
              <div v-else class="grid-view-container apple-watch-layout" @mousemove="trackMouseMove">
                <div 
                  v-for="(song, index) in currentPlaylist" 
                  :key="song.id || index"
                  :class="['grid-song-item', { 'playing': currentSong && currentSong.id === song.id, 'loading': isLoadingSong && currentSong && currentSong.id === song.id }]"
                  :ref="el => { if (el) gridItemRefs[index] = el }"
                  :style="getGridItemStyle(index)"
                  @click="playFromSearchResults(song)"
                  @contextmenu="showContextMenu($event, 'song', song)"
                  @mouseenter="handleBallHover(index, true)"
                  @mouseleave="handleBallHover(index, false)"
                >
                  <div class="grid-song-cover">
                    <img :src="song.picUrl || defaultAlbumArt" :alt="song.name" />
                    <div class="grid-play-overlay">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <!-- 播放状态指示器 -->
                    <div v-if="currentSong && currentSong.id === song.id" class="playing-indicator">
                      <div class="playing-bars">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                      </div>
                    </div>
                  </div>
                  <div class="grid-song-info" :style="getInfoCardStyle(index)">
                    <div class="grid-song-title">{{ song.name || song.title || '未知歌曲' }}</div>
                    <div class="grid-song-artist">
                      <template v-if="song.artists && Array.isArray(song.artists)">
                        <span 
                          v-for="(artist, index) in song.artists" 
                          :key="artist.id"
                          class="artist-name"
                          @click.stop="getArtistDetail(artist.id)"
                        >
                          {{ artist.name }}
                          <span v-if="index < song.artists.length - 1" class="artist-separator">, </span>
                        </span>
                      </template>
                      <template v-else-if="song.ar && Array.isArray(song.ar)">
                        <span 
                          v-for="(artist, index) in song.ar" 
                          :key="artist.id"
                          class="artist-name"
                          @click.stop="getArtistDetail(artist.id)"
                        >
                          {{ artist.name }}
                          <span v-if="index < song.ar.length - 1" class="artist-separator">, </span>
                        </span>
                      </template>
                      <span v-else>{{ song.artist || '未知艺术家' }}</span>
                    </div>
                    <div class="grid-song-album" v-if="song.albumName">{{ song.albumName }}</div>
                    <div class="grid-song-duration">{{ formatDuration((song.dt !== undefined ? song.dt : (song.duration !== undefined ? song.duration : 0)) || 0) }}</div>
                    <div class="grid-song-actions">
                      <button v-if="!isSongInPlaylist(song)" class="grid-add-btn" @click.stop="addToPlaylist(song)" title="添加到播放列表">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 歌单搜索结果 -->
            <div v-else-if="showSearchResults && searchType === 'playlists'">
              <div 
                v-for="playlist in playlistResults" 
                :key="playlist.id"
                class="playlist-item playlist-result-item"
                @click="getPlaylistDetail(playlist.id)"
              >
                <div class="playlist-cover">
                  <img :src="playlist.coverImgUrl || defaultAlbumArt" :alt="playlist.name" />
                </div>
                <div class="playlist-info">
                  <div class="playlist-name">{{ playlist.name }}</div>
                  <div class="playlist-description">{{ playlist.description || '暂无描述' }}</div>
                  <div class="playlist-meta">
                    <span class="playlist-creator">by {{ playlist.creator }}</span>
                    <span class="playlist-stats">{{ playlist.trackCount }}首 · 播放{{ formatPlayCount(playlist.playCount) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 歌手搜索结果 -->
            <div v-else-if="showSearchResults && searchType === 'artists'">
              <div 
                v-for="artist in artistSearchResults" 
                :key="artist.id"
                class="playlist-item artist-result-item"
                @click="getArtistDetail(artist.id)"
              >
                <div class="artist-avatar-small">
                  <img :src="artist.picUrl || defaultAlbumArt" :alt="artist.name" />
                </div>
                <div class="artist-info-small">
                  <div class="artist-name-small">{{ artist.name }}</div>
                  <div class="artist-stats-small">
                    <span>歌曲: {{ artist.musicSize }}</span>
                    <span>专辑: {{ artist.albumSize }}</span>
                    <span>MV: {{ artist.mvSize }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 专辑搜索结果 -->
            <div v-else-if="showSearchResults && searchType === 'albums'">
              <div 
                v-for="album in albumSearchResults" 
                :key="album.id"
                class="playlist-item album-result-item"
                @click="getAlbumDetail(album.id)"
              >
                <div class="album-cover-small">
                  <img :src="album.picUrl || defaultAlbumArt" :alt="album.name" />
                </div>
                <div class="album-info-small">
                  <div class="album-name-small">{{ album.name }}</div>
                  <div class="album-artist-small">{{ album.artist }}</div>
                  <div class="album-meta-small">
                    <span>{{ new Date(album.publishTime).getFullYear() }}年</span>
                    <span>{{ album.size }}首</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 默认空状态 -->
            <div v-else class="empty-search-state">
              <div class="empty-search-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <p>输入关键词搜索音乐、歌单、歌手或专辑</p>
              <p class="empty-search-hint">点击播放列表按钮查看已添加的歌曲</p>
            </div>
            
            <!-- 翻页组件 -->
            <div v-if="showSearchResults && totalResults > 0" class="pagination-container">
              <div class="pagination-info">
                共 {{ totalResults }} 个结果，第 {{ currentPage }} / {{ totalPages }} 页
              </div>
              <div class="pagination-controls">
                <button 
                  @click="goToPage(1)" 
                  :disabled="currentPage === 1 || isSearching"
                  class="pagination-btn"
                  title="首页"
                >
                  «
                </button>
                <button 
                  @click="goToPage(currentPage - 1)" 
                  :disabled="currentPage === 1 || isSearching"
                  class="pagination-btn"
                  title="上一页"
                >
                  ‹
                </button>
                
                <template v-for="page in getPageNumbers()" :key="page">
                  <button 
                    v-if="page !== '...'"
                    @click="goToPage(page)" 
                    :class="['pagination-btn', 'page-number', { active: currentPage === page }]"
                    :disabled="isSearching"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="pagination-ellipsis">...</span>
                </template>
                
                <button 
                  @click="goToPage(currentPage + 1)" 
                  :disabled="currentPage === totalPages || isSearching"
                  class="pagination-btn"
                  title="下一页"
                >
                  ›
                </button>
                <button 
                  @click="goToPage(totalPages)" 
                  :disabled="currentPage === totalPages || isSearching"
                  class="pagination-btn"
                  title="末页"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 播放控制区域 -->
        <div class="player-controls">
          <div class="current-song-info">
            <div class="song-image" v-if="currentSong" @click="openImmersivePlayer">
              <!-- 歌曲图片加载状态 -->
              <div v-if="isLoadingSong" class="image-loader-overlay">
                <div class="image-loader"></div>
              </div>
              <img :src="(currentSong.al && currentSong.al.picUrl) || currentSong.picUrl || (currentSong.album && currentSong.album.picUrl) || defaultAlbumArt" :alt="currentSong.name" />
            </div>
            <div class="song-details">
              <div class="song-name">{{ currentSong ? currentSong.name : '未播放' }}</div>
              <div class="song-artist">
                <template v-if="currentSong">
                  <template v-if="currentSong.ar && Array.isArray(currentSong.ar)">
                    <span 
                      v-for="(artist, index) in currentSong.ar" 
                      :key="artist.id"
                      class="artist-name clickable"
                      @click.stop="getArtistDetail(artist.id)"
                    >
                      {{ artist.name }}
                      <span v-if="index < currentSong.ar.length - 1" class="artist-separator">, </span>
                    </span>
                  </template>
                  <template v-else-if="currentSong.artists && Array.isArray(currentSong.artists)">
                    <span 
                      v-for="(artist, index) in currentSong.artists" 
                      :key="artist.id"
                      class="artist-name clickable"
                      @click.stop="getArtistDetail(artist.id)"
                    >
                      {{ artist.name }}
                      <span v-if="index < currentSong.artists.length - 1" class="artist-separator">, </span>
                    </span>
                  </template>
                  <span v-else-if="currentSong" class="artist-name clickable" @click.stop="handleArtistClick(currentSong)">{{ currentSong.artist || '未知艺术家' }}</span>
                </template>
                <template v-else>
                  选择一首歌曲开始播放
                </template>
              </div>
              <!-- 歌曲加载状态提示 -->
              <div v-if="isLoadingSong" class="loading-status">
                <div class="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="loading-message">正在加载歌曲...</span>
              </div>
            </div>
            <!-- 播放列表按钮 -->
            <div class="playlist-button-container">
              <button 
                class="playlist-button" 
                @click.stop="togglePlaylistMenu"
                :class="{ active: showPlaylistMenu }"
                title="播放列表"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
                <span class="playlist-count" v-if="playlist.length > 0">{{ playlist.length }}</span>
              </button>
              
              <!-- 播放列表菜单 -->
              <div v-if="showPlaylistMenu" class="playlist-menu">
                <div class="playlist-menu-header">
                  <h4>播放列表</h4>
                  <div class="playlist-menu-controls">
                    <button 
                      class="clear-playlist-btn" 
                      @click.stop="clearPlaylist"
                      :disabled="playlist.length === 0"
                      title="清空播放列表"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                    <button 
                      class="close-playlist-menu-btn" 
                      @click.stop="showPlaylistMenu = false"
                      title="关闭"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div class="playlist-menu-content">
                  <div v-if="playlist.length === 0" class="empty-playlist">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="empty-playlist-icon">
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                    </svg>
                    <p>播放列表为空</p>
                    <p class="empty-playlist-hint">点击搜索结果中的"+"按钮添加歌曲</p>
                  </div>
                  
                  <div v-else class="playlist-menu-items">
                    <div 
                      v-for="(song, index) in playlist" 
                      :key="song.id || index"
                      :class="['playlist-menu-item', { 
                        'playing': currentSong && currentSong.id === song.id, 
                        'loading': isLoadingSong && currentSong && currentSong.id === song.id 
                      }]"
                      @click="selectSongFromPlaylist(index)"
                      @contextmenu="showContextMenu($event, 'song', song)"
                    >
                      <div class="playlist-item-info">
                        <div class="playlist-item-index">{{ index + 1 }}</div>
                        <div class="playlist-item-cover">
                          <img :src="song.picUrl || defaultAlbumArt" :alt="song.name" />
                        </div>
                        <div class="playlist-item-details">
                          <div class="playlist-item-title">{{ song.name || '未知歌曲' }}</div>
                          <div class="playlist-item-artist">{{ song.artist || '未知艺术家' }}</div>
                        </div>
                      </div>
                      
                      <div class="playlist-item-actions">
                        <div v-if="isLoadingSong && currentSong && currentSong.id === song.id" class="playlist-item-loader">
                          <div class="mini-loader"></div>
                        </div>
                        
                        <button 
                          class="playlist-item-remove-btn" 
                          @click.stop="removeFromPlaylist(index)"
                          title="从播放列表中移除"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                        
                        <div class="playlist-item-duration">{{ formatDuration((song.dt !== undefined ? song.dt : (song.duration !== undefined ? song.duration : 0)) || 0) }}</div>
                      </div>
                      
                      <!-- 拖拽手柄 -->
                      <div class="playlist-item-drag-handle" draggable="true" @dragstart="dragStart(index, $event)" @dragover.prevent @dragenter.prevent @drop="drop(index, $event)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
          
          <div class="player-controls-main">
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
          </div>
          
          <div class="play-mode-wrapper">
            <button @click="togglePlayMode" class="control-btn play-mode-btn" :disabled="!currentSong" :title="getCurrentPlayModeLabel()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path :d="getCurrentPlayModeIcon()"/>
              </svg>
            </button>
            <div v-if="showPlayModeTooltipVisible" class="play-mode-tooltip">
              {{ getCurrentPlayModeLabel() }}
            </div>
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
    
    <!-- 歌手详情弹窗 -->
    <div class="artist-detail-modal-overlay" v-if="showArtistDetail" @click="closeArtistDetail">
      <div class="artist-detail-modal-content" @click.stop>
        <div class="artist-detail-header">
          <h3>歌手详情</h3>
          <button class="close-btn" @click="closeArtistDetail">×</button>
        </div>
        
        <div class="artist-detail-body">
          <!-- 歌手加载状态 -->
          <div v-if="isLoadingArtist" class="loading-container artist-loading">
            <div class="music-loader">
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
            </div>
            <p class="loading-text">正在加载歌手信息...</p>
            <div class="loading-progress">
              <div class="loading-progress-bar"></div>
            </div>
          </div>
          
          <!-- 歌手信息 -->
          <div v-else-if="artistDetail" class="artist-info">
            <div class="artist-basic-info">
              <div class="artist-avatar">
                <img :src="artistDetail.avatar || artistDetail.picUrl || defaultAlbumArt" :alt="artistDetail.name" />
              </div>
              <div class="artist-details">
                <h2 class="artist-name">{{ artistDetail.name }}</h2>
                <p class="artist-description" v-if="artistDetail.briefDesc">{{ artistDetail.briefDesc }}</p>
                <div class="artist-stats">
                  <span class="stat-item" data-label="歌曲">{{ artistDetail.musicSize || 0 }}</span>
                  <span class="stat-item" data-label="专辑">{{ artistDetail.albumSize || 0 }}</span>
                  <span class="stat-item" data-label="MV">{{ artistDetail.mvSize || 0 }}</span>
                </div>
                <div class="artist-meta" v-if="artistDetail.identify">
                  <span class="identify-tag">{{ artistDetail.identify }}</span>
                </div>
              </div>
            </div>
            
            <!-- 标签页 -->
            <div class="artist-tabs">
              <button 
                :class="['artist-tab', { active: artistActiveTab === 'hot' }]"
                @click="switchArtistTab('hot')"
              >
                热门歌曲
              </button>
              <button 
                :class="['artist-tab', { active: artistActiveTab === 'all' }]"
                @click="switchArtistTab('all')"
              >
                全部歌曲
              </button>
              <button 
                :class="['artist-tab', { active: artistActiveTab === 'albums' }]"
                @click="switchArtistTab('albums')"
              >
                专辑
              </button>
            </div>
            
            <!-- 热门歌曲 -->
            <div class="artist-section" v-if="artistActiveTab === 'hot' && artistSongs.length > 0">
              <div class="artist-songs-list">
                <div 
                  v-for="(song, index) in artistSongs" 
                  :key="song.id"
                  class="artist-song-item"
                  @click="selectArtistSong(index, 'hot')"
                  @contextmenu="showContextMenu($event, 'song', song)"
                >
                  <div class="song-index">{{ index + 1 }}</div>
                  <div class="song-cover">
                    <img :src="song.picUrl || defaultAlbumArt" :alt="song.name" />
                  </div>
                  <div class="song-info">
                    <div class="song-title">{{ song.name }}</div>
                    <div class="song-album">{{ song.albumName }}</div>
                  </div>
                  <div class="song-duration">{{ formatDuration(song.duration) }}</div>
                </div>
              </div>
            </div>
            
            <!-- 全部歌曲 -->
            <div class="artist-section" v-if="artistActiveTab === 'all'">
              <div class="artist-songs-list">
                <div 
                  v-for="(song, index) in artistAllSongs" 
                  :key="song.id"
                  class="artist-song-item no-cover"
                  @contextmenu="showContextMenu($event, 'song', song)"
                  @click="selectArtistSong(index, 'all')"
                >
                  <div class="song-index">{{ index + 1 }}</div>
                  <div class="song-info-full">
                    <div class="song-title">{{ song.name }}</div>
                    <div class="song-album">{{ song.albumName }}</div>
                  </div>
                  <div class="song-duration">{{ formatDuration(song.duration) }}</div>
                </div>
              </div>
              
              <!-- 翻页组件 -->
            <div v-if="artistAllSongsTotal > 0 && fullArtistAllSongs && fullArtistAllSongs.length > 0" class="pagination-container">
              <div class="pagination-info">
                共 {{ artistAllSongsTotal }} 首歌曲，第 {{ artistAllSongsPage }} / {{ artistAllSongsTotalPages }} 页
              </div>
              <div class="pagination-controls">
                <button 
                  @click="goToArtistAllSongsPage(1)" 
                  :disabled="artistAllSongsPage === 1"
                  class="pagination-btn"
                  title="首页"
                >
                  «
                </button>
                <button 
                  @click="goToArtistAllSongsPage(artistAllSongsPage - 1)" 
                  :disabled="artistAllSongsPage === 1"
                  class="pagination-btn"
                  title="上一页"
                >
                  ‹
                </button>
                
                <template v-for="page in getArtistAllSongsPageNumbers()" :key="page">
                  <button 
                    v-if="page !== '...'"
                    @click="goToArtistAllSongsPage(page)" 
                    :class="['pagination-btn', 'page-number', { active: artistAllSongsPage === page }]"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="pagination-ellipsis">...</span>
                </template>
                
                <button 
                  @click="goToArtistAllSongsPage(artistAllSongsPage + 1)" 
                  :disabled="artistAllSongsPage === artistAllSongsTotalPages"
                  class="pagination-btn"
                  title="下一页"
                >
                  ›
                </button>
                <button 
                  @click="goToArtistAllSongsPage(artistAllSongsTotalPages)" 
                  :disabled="artistAllSongsPage === artistAllSongsTotalPages"
                  class="pagination-btn"
                  title="末页"
                >
                  »
                </button>
              </div>
            </div>
            </div>
            
            <!-- 专辑列表 -->
            <div class="artist-section" v-if="artistActiveTab === 'albums' && artistAlbums.length > 0">
              <div class="artist-albums-list">
                <div 
                  v-for="album in artistAlbums" 
                  :key="album.id"
                  class="artist-album-item"
                  @click="getAlbumDetail(album.id)"
                >
                  <div class="album-cover">
                    <img :src="album.picUrl || defaultAlbumArt" :alt="album.name" />
                  </div>
                  <div class="album-info">
                    <div class="album-name">{{ album.name }}</div>
                    <div class="album-date">{{ new Date(album.publishTime).getFullYear() }}年</div>
                    <div class="album-size">{{ album.size }}首歌曲</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 歌单详情弹窗 -->
    <div class="playlist-detail-modal-overlay" v-if="showPlaylistDetail" @click="closePlaylistDetail">
      <div class="playlist-detail-modal-content" @click.stop>
        <div class="playlist-detail-header">
          <h3>歌单详情</h3>
          <button class="close-btn" @click="closePlaylistDetail">×</button>
        </div>
        
        <div class="playlist-detail-body">
          <!-- 歌单加载状态 -->
          <div v-if="isLoadingPlaylist || !playlistDetail" class="loading-container playlist-loading">
            <div class="music-loader">
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
            </div>
            <p class="loading-text">正在加载歌单信息...</p>
            <div class="loading-progress">
              <div class="loading-progress-bar"></div>
            </div>
          </div>
          
          <!-- 歌单信息 -->
          <div v-else class="playlist-info-section">
            <div class="playlist-basic-info">
              <div class="playlist-cover-large">
                <img :src="playlistDetail.coverImgUrl || defaultAlbumArt" :alt="playlistDetail.name" />
              </div>
              <div class="playlist-details">
                <h2 class="playlist-name">{{ playlistDetail.name }}</h2>
                <p class="playlist-creator">创建者: {{ playlistDetail.creator }}</p>
                <p class="playlist-description" v-if="playlistDetail.description">{{ playlistDetail.description }}</p>
                <div class="playlist-stats">
                  <span class="stat-item">{{ playlistDetail.trackCount }}首歌曲</span>
                  <span class="stat-item">播放{{ formatPlayCount(playlistDetail.playCount) }}</span>
                </div>
                <div class="playlist-tags" v-if="playlistDetail.tags && playlistDetail.tags.length > 0">
                  <span v-for="tag in playlistDetail.tags" :key="tag" class="tag-item">{{ tag }}</span>
                </div>
              </div>
            </div>
            
            <!-- 歌曲列表 -->
            <div class="playlist-songs-section">
              <h3>歌曲列表</h3>
              <div class="playlist-songs-list">
                <div 
                  v-for="(song, index) in playlistDetailSongs" 
                  :key="song.id"
                  class="playlist-song-item"
                  @click="selectPlaylistDetailSong(index)"
                  @contextmenu="showContextMenu($event, 'song', song)"
                >
                  <div class="song-index">{{ (playlistDetailPage - 1) * pageSize + index + 1 }}</div>
                  <div class="song-cover-small">
                    <img :src="song.picUrl || defaultAlbumArt" :alt="song.name" />
                  </div>
                  <div class="song-info-full">
                    <div class="song-title">{{ song.name }}</div>
                    <div class="song-artist">{{ song.artist }}</div>
                  </div>
                  <div class="song-album-name">{{ song.albumName }}</div>
                  <div class="song-duration">{{ formatDuration(song.duration) }}</div>
                </div>
              </div>
              
              <!-- 翻页组件 -->
              <div v-if="fullPlaylistSongs && fullPlaylistSongs.length > 0" class="pagination-container">
                <div class="pagination-info">
                  共 {{ fullPlaylistSongs.length }} 首歌曲，第 {{ playlistDetailPage }} / {{ playlistDetailTotalPages }} 页
                </div>
                <div class="pagination-controls">
                  <button 
                    @click="goToPlaylistDetailPage(1)" 
                    :disabled="playlistDetailPage === 1"
                    class="pagination-btn"
                    title="首页"
                  >
                    «
                  </button>
                  <button 
                    @click="goToPlaylistDetailPage(playlistDetailPage - 1)" 
                    :disabled="playlistDetailPage === 1"
                    class="pagination-btn"
                    title="上一页"
                  >
                    ‹
                  </button>
                  
                  <template v-for="page in getPlaylistDetailPageNumbers()" :key="page">
                    <button 
                      v-if="page !== '...'"
                      @click="goToPlaylistDetailPage(page)" 
                      :class="['pagination-btn', 'page-number', { active: playlistDetailPage === page }]"
                    >
                      {{ page }}
                    </button>
                    <span v-else class="pagination-ellipsis">...</span>
                  </template>
                  
                  <button 
                    @click="goToPlaylistDetailPage(playlistDetailPage + 1)" 
                    :disabled="playlistDetailPage === playlistDetailTotalPages"
                    class="pagination-btn"
                    title="下一页"
                  >
                    ›
                  </button>
                  <button 
                    @click="goToPlaylistDetailPage(playlistDetailTotalPages)" 
                    :disabled="playlistDetailPage === playlistDetailTotalPages"
                    class="pagination-btn"
                    title="末页"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 专辑详情弹窗 -->
    <div class="album-detail-modal-overlay" v-if="showAlbumDetail" @click="closeAlbumDetail">
      <div class="album-detail-modal-content" @click.stop>
        <div class="album-detail-header">
          <h3>专辑详情</h3>
          <button class="close-btn" @click="closeAlbumDetail">×</button>
        </div>
        
        <div class="album-detail-body">
          <!-- 专辑加载状态 -->
          <div v-if="isLoadingAlbum" class="loading-container album-loading">
            <div class="music-loader">
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
              <div class="loader-bar"></div>
            </div>
            <p class="loading-text">正在加载专辑信息...</p>
            <div class="loading-progress">
              <div class="loading-progress-bar"></div>
            </div>
          </div>
          
          <!-- 专辑信息 -->
          <div v-else-if="albumDetail" class="album-info">
            <div class="album-basic-info">
              <div class="album-cover-large">
                <div v-if="isLoadingAlbum" class="image-loading-overlay">
                  <div class="image-loader"></div>
                </div>
                <img :src="getAlbumCoverUrl(albumDetail)" :alt="albumDetail.name" />
              </div>
              <div class="album-details">
                <h2 class="album-name">{{ albumDetail.name }}</h2>
                <p class="album-artist">{{ getAlbumArtistName(albumDetail) }}</p>
                <p class="album-publish-date">发行时间: {{ new Date(albumDetail.publishTime).toLocaleDateString() }}</p>
                <p class="album-description" v-if="albumDetail.description">{{ albumDetail.description }}</p>
                <div class="album-stats">
                  <span class="stat-item" data-label="歌曲">{{ albumDetail.size || 0 }}</span>
                </div>
              </div>
            </div>
            
            <!-- 专辑歌曲列表 -->
            <div class="album-section" v-if="albumSongs.length > 0 || isLoadingAlbum">
              <h3>歌曲列表</h3>
              <div class="album-songs-list">
                <!-- 加载状态 -->
                <div v-if="isLoadingAlbum" class="loading-skeleton">
                  <div v-for="n in 5" :key="n" class="song-skeleton-item">
                    <div class="skeleton-index"></div>
                    <div class="skeleton-cover"></div>
                    <div class="skeleton-info">
                      <div class="skeleton-title"></div>
                      <div class="skeleton-artist"></div>
                    </div>
                    <div class="skeleton-duration"></div>
                  </div>
                </div>
                
                <!-- 实际歌曲列表 -->
                <template v-else>
                  <div 
                    v-for="(song, index) in albumSongs" 
                    :key="song.id"
                    class="album-song-item"
                    @click="selectAlbumSong(index)"
                    @contextmenu="showContextMenu($event, 'song', song)"
                  >
                    <div class="song-index">{{ index + 1 }}</div>
                    <div class="song-cover">
                      <img :src="song.picUrl || defaultAlbumArt" :alt="song.name" />
                    </div>
                    <div class="song-info">
                      <div class="song-title">{{ song.name }}</div>
                      <div class="song-artist">{{ song.artist }}</div>
                    </div>
                    <div class="song-duration">{{ formatDuration(song.duration) }}</div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 登录组件 -->
    <MusicLogin 
      :visible="showLoginModal" 
      :api-url="currentApiUrl"
      @close="hideLoginModal"
      @login-success="handleLoginSuccess"
      @user-info-updated="handleUserInfoUpdated"
    />
    
    <!-- 登出确认弹窗 -->
    <div class="logout-confirm-modal-overlay" v-if="showLogoutConfirmModal" @click="closeLogoutConfirm">
      <div class="logout-confirm-modal-content" @click.stop>
        <div class="logout-confirm-header">
          <h3>确认退出</h3>
          <button class="close-btn" @click="closeLogoutConfirm">×</button>
        </div>
        
        <div class="logout-confirm-body">
          <div class="logout-confirm-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </div>
          <p class="logout-confirm-text">确定要退出登录吗？</p>
          <p class="logout-confirm-user" v-if="userInfo">{{ userInfo.nickname }}</p>
        </div>
        
        <div class="logout-confirm-footer">
          <button class="cancel-btn" @click="closeLogoutConfirm">取消</button>
          <button class="confirm-btn" @click="confirmLogout">确认退出</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 删除歌单确认弹窗 -->
  <div class="delete-confirm-modal-overlay" v-if="showDeletePlaylistConfirmModal" @click="closeDeletePlaylistConfirm">
    <div class="delete-confirm-modal-content" @click.stop>
      <div class="delete-confirm-header">
        <h3>删除歌单</h3>
        <button class="close-btn" @click="closeDeletePlaylistConfirm">×</button>
      </div>
      
      <div class="delete-confirm-body">
        <div class="delete-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1H5v2h14V4z"/>
          </svg>
        </div>
        <p class="delete-confirm-text">确定要删除这个歌单吗？</p>
        <p class="delete-confirm-playlist-name" v-if="playlistToDelete">{{ playlistToDelete.name }}</p>
        <p class="delete-confirm-warning">此操作不可恢复</p>
      </div>
      
      <div class="delete-confirm-footer">
        <button class="cancel-btn" @click="closeDeletePlaylistConfirm">取消</button>
        <button class="confirm-btn danger" @click="confirmDeletePlaylist">确认删除</button>
      </div>
    </div>
  </div>
  
  <!-- 音乐播放器专属通知 -->
  <div 
    v-if="notification.show" 
    class="music-notification"
    :class="notification.type"
    :style="{ 
      left: notificationPosition.x + 'px', 
      top: notificationPosition.y + 'px' 
    }"
  >
    <div class="notification-content">
      <div class="notification-icon">
        <svg v-if="notification.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <svg v-else-if="notification.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <svg v-else-if="notification.type === 'danger'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      </div>
      <div class="notification-message">{{ notification.message }}</div>
    </div>
  </div>
  
  <!-- 最小化悬浮播放器 -->
  <div 
    v-if="visible && isMinimized" 
    class="mini-player"
    :style="{ left: displayPosition.x + 'px', top: displayPosition.y + 'px' }"
    @mousedown="startDragMiniPlayer"
    @touchstart="startDragMiniPlayer"
  >
    <div class="mini-player-header">
      <div class="mini-song-info">
        <div class="mini-cover">
          <img :src="(currentSong && ((currentSong.al && currentSong.al.picUrl) || currentSong.picUrl || (currentSong.album && currentSong.album.picUrl))) || defaultAlbumArt" :alt="currentSong ? currentSong.name : '未播放'" />
        </div>
        <div class="mini-details">
          <div class="mini-title">{{ currentSong ? currentSong.name : '未播放' }}</div>
          <div class="mini-artist">
            <template v-if="currentSong">
              <template v-if="currentSong.ar && Array.isArray(currentSong.ar)">
                <span 
                  v-for="(artist, index) in currentSong.ar" 
                  :key="artist.id"
                  class="mini-artist-name"
                >
                  {{ artist.name }}
                  <span v-if="index < currentSong.ar.length - 1">, </span>
                </span>
              </template>
              <template v-else-if="currentSong.artists && Array.isArray(currentSong.artists)">
                <span 
                  v-for="(artist, index) in currentSong.artists" 
                  :key="artist.id"
                  class="mini-artist-name"
                >
                  {{ artist.name }}
                  <span v-if="index < currentSong.artists.length - 1">, </span>
                </span>
              </template>
              <span v-else>{{ currentSong.artist || '未知艺术家' }}</span>
            </template>
            <template v-else>
              选择一首歌曲开始播放
            </template>
          </div>
        </div>
      </div>
      <div class="mini-controls">
        <button @click="restorePlayer" class="mini-restore-btn" title="恢复播放器">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
          </svg>
        </button>
        <button @click="closePlayer" class="mini-close-btn" title="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="mini-progress">
      <input 
        type="range" 
        class="mini-progress-slider" 
        :value="progress" 
        @input="seekMusic" 
        :max="100" 
        :disabled="!currentSong"
      />
      <div class="mini-time">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>
    
    <div class="mini-player-controls">
      <button @click="skipPrevious" class="mini-control-btn" :disabled="!currentSong">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>
      <button @click="togglePlayPause" class="mini-control-btn" :disabled="!currentSong">
        <svg v-if="isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <button @click="skipNext" class="mini-control-btn" :disabled="!currentSong">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
      
      <div class="mini-separator"></div>
      
      <button @click="togglePlayMode" class="mini-control-btn" :disabled="!currentSong" :title="getCurrentPlayModeLabel()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path :d="getCurrentPlayModeIcon()"/>
        </svg>
      </button>
      
      <button 
        class="mini-control-btn" 
        @click.stop="togglePlaylistMenu"
        :class="{ active: showPlaylistMenu }"
        title="播放列表"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
        </svg>
        <span class="mini-playlist-count" v-if="playlist.length > 0">{{ playlist.length }}</span>
      </button>
    </div>
    
    <!-- 播放列表菜单 -->
    <div v-if="showPlaylistMenu" 
         class="mini-playlist-menu" 
         :class="{ 'menu-down': playlistMenuDirection === 'down' }"
         @click.stop>
      <div class="mini-playlist-header">
        <h4>播放列表</h4>
        <button class="mini-close-playlist-btn" @click="showPlaylistMenu = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="mini-playlist-content">
        <div v-if="playlist.length === 0" class="mini-empty-playlist">
          <p>播放列表为空</p>
        </div>
        
        <div v-else class="mini-playlist-items">
          <div 
            v-for="(song, index) in playlist" 
            :key="song.id || index"
            :class="['mini-playlist-item', { 
              'playing': currentSong && currentSong.id === song.id
            }]"
            @click="selectSongFromPlaylist(index)"
          >
            <div class="mini-item-info">
              <div class="mini-item-index">{{ index + 1 }}</div>
              <div class="mini-item-title">{{ song.name }}</div>
              <div class="mini-item-artist">{{ song.artist }}</div>
            </div>
            <div class="mini-item-duration">{{ formatDuration((song.dt !== undefined ? song.dt : (song.duration !== undefined ? song.duration : 0)) || 0) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 创建歌单模态框 -->
  <div v-if="showCreatePlaylistModal" class="modal-overlay" @click="closeCreatePlaylistModal">
    <div class="create-playlist-modal" @click.stop>
      <!-- 头部区域 -->
      <div class="create-playlist-header">
        <div class="create-playlist-close" @click="closeCreatePlaylistModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
      
      <!-- 主要内容区 -->
      <div class="create-playlist-content">
        <!-- 左侧封面预览区 -->
        <div class="create-playlist-cover-section">
          <div class="playlist-cover-preview">
            <div class="cover-image">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect width="120" height="120" rx="12" fill="currentColor" opacity="0.1"/>
                <path d="M45 45L45 75L75 60L45 45Z" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            <div class="cover-overlay">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 右侧信息输入区 -->
        <div class="create-playlist-info-section">
          <h2 class="create-playlist-title">创建新歌单</h2>
          <p class="create-playlist-subtitle">创建属于你的音乐收藏</p>
          
          <!-- 歌单名称输入 -->
          <div class="form-section">
            <label class="form-label">歌单名称 <span class="required">*</span></label>
            <div class="input-container">
              <input 
                type="text" 
                v-model="newPlaylistName" 
                class="form-input" 
                placeholder="给你的歌单起个名字"
                maxlength="50"
                ref="playlistNameInput"
              />
              <div class="input-counter">{{ newPlaylistName.length }}/50</div>
            </div>
          </div>
          
          <!-- 歌单描述输入 -->
          <div class="form-section">
            <label class="form-label">歌单描述 <span class="optional">可选</span></label>
            <div class="textarea-container">
              <textarea 
                v-model="newPlaylistDescription" 
                class="form-textarea" 
                placeholder="描述一下这个歌单的风格或内容..."
                maxlength="200"
                rows="3"
              ></textarea>
              <div class="textarea-counter">{{ newPlaylistDescription.length }}/200</div>
            </div>
          </div>
          
          <!-- 隐私设置 -->
          <div class="form-section">
            <label class="form-label">隐私设置</label>
            <div class="privacy-options">
              <label class="privacy-option">
                <input type="radio" name="privacy" value="public" v-model="newPlaylistPrivacy" />
                <span class="privacy-label">公开歌单</span>
                <span class="privacy-desc">所有人可见</span>
              </label>
              <label class="privacy-option">
                <input type="radio" name="privacy" value="private" v-model="newPlaylistPrivacy" />
                <span class="privacy-label">私密歌单</span>
                <span class="privacy-desc">仅自己可见</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 创建按钮 - 固定在右下角 -->
      <div class="create-playlist-fixed-actions">
        <button class="action-btn secondary" @click="closeCreatePlaylistModal">
          取消
        </button>
        <button 
          class="action-btn primary" 
          @click="createPlaylist" 
          :disabled="isCreatingPlaylist || !newPlaylistName.trim()"
        >
          <span v-if="!isCreatingPlaylist">创建歌单</span>
          <span v-else>创建中...</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 编辑歌单模态框 -->
  <div v-if="showEditPlaylistModal" class="modal-overlay" @click="closeEditPlaylistModal">
    <div class="modal-content playlist-modal modern-modal" @click.stop>
      <div class="modern-modal-header">
        <div class="modal-icon edit-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="modal-title-section">
          <h3 class="modal-title">编辑歌单</h3>
          <p class="modal-subtitle">修改歌单信息</p>
        </div>
        <button class="modern-modal-close-btn" @click="closeEditPlaylistModal">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      
      <div class="modern-modal-body">
        <div class="form-group-modern">
          <div class="form-label-wrapper">
            <label class="form-label-modern">歌单名称</label>
            <span class="required-mark">*</span>
          </div>
          <div class="input-wrapper">
            <input 
              type="text" 
              v-model="newPlaylistName" 
              class="form-control-modern" 
              :class="{ 'has-content': newPlaylistName }"
              placeholder="给你的歌单起个名字"
              maxlength="50"
              ref="playlistNameInput"
            />
            <div class="input-counter">
              <span>{{ newPlaylistName.length }}/50</span>
            </div>
          </div>
        </div>
        
        <div class="form-group-modern">
          <div class="form-label-wrapper">
            <label class="form-label-modern">歌单描述</label>
            <span class="optional-mark">可选</span>
          </div>
          <div class="textarea-wrapper">
            <textarea 
              v-model="newPlaylistDescription" 
              class="form-control-modern textarea-modern" 
              :class="{ 'has-content': newPlaylistDescription }"
              placeholder="描述一下这个歌单的风格或内容..."
              maxlength="200"
              rows="3"
            ></textarea>
            <div class="textarea-counter">
              <span>{{ newPlaylistDescription.length }}/200</span>
            </div>
          </div>
        </div>

        <div class="playlist-preview" v-if="newPlaylistName">
          <div class="preview-header">
            <span class="preview-label">预览</span>
          </div>
          <div class="preview-content">
            <div class="preview-cover">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/>
                <path d="M12 12L12 20L20 16L12 12Z" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
            <div class="preview-info">
              <div class="preview-title">{{ newPlaylistName || '未命名歌单' }}</div>
              <div class="preview-desc">{{ newPlaylistDescription || '暂无描述' }}</div>
              <div class="preview-meta">{{ currentPlaylist?.songCount || 0 }} 首歌曲 · 已创建</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modern-modal-footer">
        <button class="modern-btn modern-btn-secondary" @click="closeEditPlaylistModal">
          <span>取消</span>
        </button>
        <button 
          class="modern-btn modern-btn-primary" 
          @click="updatePlaylist" 
          :disabled="isUpdatingPlaylist || !newPlaylistName.trim()"
          :class="{ 'loading': isUpdatingPlaylist }"
        >
          <span v-if="!isUpdatingPlaylist" class="btn-content">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="btn-icon">
              <path d="M11.5 2.5L4 10L2.5 13.5L6 12L13.5 4.5C14.3 3.7 14.3 2.3 13.5 1.5C12.7 0.7 11.3 0.7 10.5 1.5L11.5 2.5Z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9.5 4.5L12.5 7.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            保存修改
          </span>
          <span v-else class="btn-content">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="loading-icon">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="24" stroke-dashoffset="6" transform="rotate(-90 8 8)"/>
            </svg>
            更新中...
          </span>
        </button>
      </div>
    </div>
  </div>
<!-- 右键菜单 -->
  <div v-if="contextMenu.visible" 
       class="context-menu" 
       :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
       ref="contextMenu">
    
    <!-- 歌单右键菜单 -->
    <template v-if="contextMenu.type === 'playlist' && contextMenu.playlist">
      <div class="context-menu-item" @click="editPlaylistFromMenu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        <span>编辑歌单</span>
      </div>
      <div class="context-menu-item danger" @click="deletePlaylistFromMenu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>删除歌单</span>
      </div>
    </template>
    
    <!-- 歌曲右键菜单 -->
    <template v-if="contextMenu.type === 'song' && contextMenu.song">
      <div class="context-menu-item" @click="toggleLikeSong">
        <svg width="16" height="16" viewBox="0 0 24 24" :fill="isSongLiked(contextMenu.song) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>{{ isSongLiked(contextMenu.song) ? '取消收藏' : '收藏歌曲' }}</span>
      </div>
      <div class="context-menu-item" @click="addSongToCurrentPlaylist">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
        <span>添加到播放列表</span>
      </div>
      <div class="context-menu-divider" v-if="isLoggedIn && userPlaylists.length > 0"></div>
      <template v-if="isLoggedIn && userPlaylists.length > 0">
        <div class="context-menu-submenu">
          <div class="context-menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
            </svg>
            <span>添加到歌单</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="submenu-arrow">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </div>
          <div class="context-menu-submenu-content">
            <div v-for="playlist in userPlaylists" 
                 :key="playlist.id" 
                 class="context-menu-item"
                 @click="addSongToPlaylistDirectly(playlist)">
              <img :src="playlist.coverImgUrl || defaultAlbumArt" :alt="playlist.name" class="submenu-playlist-cover">
              <span>{{ playlist.name }}</span>
              <div class="playlist-item-count">{{ playlist.trackCount }} 首</div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>

  
</template>

<script>
import { MusicColorExtractor } from '../utils/musicColorExtractor.js'
import MusicLogin from './MusicLogin.vue'
import MusicApiRequestManager from '../utils/musicApiRequestManager.js'

export default {
  name: 'MusicPlayer',
  components: {
    MusicLogin
  },
  emits: [
    'close',
    'notify',
    'playback-status-changed',
    'current-song-changed',
    'toggleMusicPlay',
    'playNextMusic',
    'playPrevMusic',
    'user-info-updated'
  ],
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    apiUrl: {
      type: String,
      required: true
    },
    settings: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      // API请求管理器实例
      apiRequestManager: null,
      searchQuery: '',
      playlist: [],
      searchResults: [],
      searchType: 'songs', // 搜索类型：songs, playlists, artists
      currentPlaylist: [],
      showSearchResults: false,
      // 右键菜单
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        type: '', // playlist, song
        target: null, // 当前目标对象
        song: null, // 当前歌曲（当type为song时）
        playlist: null // 当前歌单（当type为playlist时）
      },
      
  
      // 完整的歌单歌曲列表（用于分页显示）
      fullPlaylistSongs: [],
      // 歌单详情界面
      showPlaylistDetail: false,
      playlistDetail: null,
      playlistDetailSongs: [],
      playlistDetailPage: 1,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 70,
      audio: null,
      isSearching: false,
      isLoadingSong: false,
      defaultAlbumArt: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e0e0e0"/><text x="50" y="55" font-family="Arial" font-size="12" fill="%23666" text-anchor="middle">专辑封面</text></svg>',
      // 音乐颜色提取器实例
      musicColorExtractor: null,
      // 歌手详情相关
      showArtistDetail: false,
      artistDetail: null,
      artistSongs: [],
      artistAllSongs: [],
      artistAlbums: [],
      artistActiveTab: 'hot', // hot, all, albums
      isLoadingArtist: false,
      // 歌手全部歌曲分页
      fullArtistAllSongs: [], // 完整的歌手全部歌曲列表
      
      // 沉浸式播放器
      showImmersivePlayer: false,
      immersiveColors: [],
      showImmersiveControls: false,
      immersiveControlsTimer: null,
      // 歌词相关
      lyrics: [],
      translationLyrics: [],
      romaLyrics: [],
      currentLyricIndex: -1,
      showTranslation: false,
      showRoma: false,
      currentScrollTop: 0,
      // 歌词滚轮滚动控制
      isUserScrolling: false,
      userScrollTimer: null,
      userScrollOffset: 0,
      artistAllSongsPage: 1,
      artistAllSongsTotal: 0,
      // 专辑详情相关
      showAlbumDetail: false,
      albumDetail: null,
      albumSongs: [],
      isLoadingAlbum: false,
      // 搜索类型选项
      searchTypes: [
        { value: 'songs', label: '歌曲' },
        { value: 'playlists', label: '歌单' },
        { value: 'artists', label: '歌手' },
        { value: 'albums', label: '专辑' }
      ],
      // 歌单搜索结果
      playlistResults: [],
      // 歌手搜索结果
      artistSearchResults: [],
      // 专辑搜索结果
      albumSearchResults: [],
      // 分页相关
      currentPage: 1,
      pageSize: 50,
      totalResults: 0,
      // 下拉菜单状态
      showSearchTypeDropdown: false,
      // 网格视图模式
      isGridView: false,
      // 鼠标位置跟踪
      mouseX: 0,
      mouseY: 0,
      // 网格项目引用
      gridItemRefs: [],
      // 网格项目位置信息
      gridItemPositions: [],
      // 网格项目速度信息（用于物理模拟）
      gridItemVelocities: [],
      // 网格项目原始位置
      gridItemOriginalPositions: [],
      // 网格项目hover状态
      gridItemHoverStates: [],
      // 动画帧ID
      animationFrameId: null,
      // 容器尺寸
      containerWidth: 800,
      containerHeight: 500,
      // 播放顺序相关
      playMode: 'list', // 播放模式: 'single' 单曲循环, 'list' 列表循环, 'order' 顺序, 'random' 随机
      playModes: [
        { value: 'single', label: '单曲循环', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' },
        { value: 'list', label: '列表循环', icon: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z' },
        { value: 'order', label: '顺序播放', icon: 'M3 5v14h2V5H3zm4 0v14h2V5H7zm4 0v14h2V5h-2zm4 0v14h2V5h-2z' },
        { value: 'random', label: '随机播放', icon: 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z' }
      ],
      // 随机播放历史记录
      randomPlayHistory: [],
      // 顺序播放的原始索引
      originalPlaylistOrder: [],
      // 播放模式提示相关
      showPlayModeTooltipVisible: false,
      playModeTooltipTimer: null,
      // 登录相关
      showLoginModal: false,
      showLogoutConfirmModal: false,
      showDeletePlaylistConfirmModal: false,
      playlistToDelete: null,
      showUserDropdown: false,
      isLoggedIn: false,
      userInfo: null,
      userLevel: null,
      loginCookie: '',
      // 主页相关数据
      userPlaylists: [],
      recommendPlaylists: [],
      recommendSongs: [],
      isLoadingUserPlaylists: false,
      isLoadingRecommendPlaylists: false,
      isLoadingRecommendSongs: false,
      // 播放列表菜单
      showPlaylistMenu: false,
      // 收藏相关
      likedSongs: new Set(), // 用户喜欢的歌曲ID列表
      isLoadingLikedSongs: false,
      // 歌单管理相关
      showCreatePlaylistModal: false,
      showEditPlaylistModal: false,
      editingPlaylist: null,
      newPlaylistName: '',
      newPlaylistDescription: '',
      newPlaylistPrivacy: 'public',
      newPlaylistTags: '',
      isCreatingPlaylist: false,
      isUpdatingPlaylist: false,
      // 拖拽相关
      draggedItemIndex: null,
      draggedOverIndex: null,
      // 搜索结果缓存
      searchCache: {
      },
      // 音乐播放器专属通知
      notification: {
        show: false,
        message: '',
        type: 'info', // success, warning, danger, info
        timer: null
      },
      notificationPosition: {
        x: 20,
        y: 20
      },
      // 当前搜索查询缓存
      searchQueryCache: '',
      // 歌单详情加载状态
      isLoadingPlaylist: false,
      // 重试机制相关
      retryCount: {
        playlist: 0,
        artist: 0,
        album: 0
      },
      maxRetries: 1,
      lastFailedRequest: {
        playlist: null,
        artist: null,
        album: null
      },
      // 最小化播放器相关
      isMinimized: false,
      miniPlayerPosition: { x: window.innerWidth - 320, y: 100 },
      displayPosition: { x: window.innerWidth - 320, y: 100 }, // 实际显示位置（用于滞后效果）
      isDraggingMiniPlayer: false,
      dragOffset: { x: 0, y: 0 },
      playlistMenuDirection: 'up', // 播放列表菜单方向：up或down
      dragAnimationId: null // 拖拽动画帧ID
    }
  },
  computed: {
    progress() {
      if (this.duration === 0) return 0;
      return (this.currentTime / this.duration) * 100;
    },
    // 缓冲进度
    bufferedProgress() {
      if (!this.audio || !this.audio.buffered.length || this.duration === 0) return 0;
      
      // 找到最大的缓冲时间点
      let bufferedEnd = 0;
      for (let i = 0; i < this.audio.buffered.length; i++) {
        if (this.audio.buffered.end(i) > bufferedEnd) {
          bufferedEnd = this.audio.buffered.end(i);
        }
      }
      
      return (bufferedEnd / this.duration) * 100;
    },
    // 进度百分比（用于底部播放控件）
    progressPercentage() {
      if (this.duration === 0) return 0;
      return (this.currentTime / this.duration) * 100;
    },
    // 计算总页数
    totalPages() {
      return Math.ceil(this.totalResults / this.pageSize);
    },
    // 计算歌手全部歌曲总页数
    artistAllSongsTotalPages() {
      return Math.ceil(this.artistAllSongsTotal / this.pageSize);
    },
    // 计算歌单详情总页数
    playlistDetailTotalPages() {
      return Math.ceil(this.fullPlaylistSongs.length / this.pageSize);
    },
    // 获取API地址，优先使用settings中的musicApiUrl
    currentApiUrl() {
      return this.settings.musicApiUrl || this.apiUrl;
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
    },
    // 监听搜索结果变化，自动重新生成布局
    currentPlaylist: {
      handler() {
        if (this.isGridView && this.showSearchResults && this.searchType === 'songs') {
          this.$nextTick(() => {
            this.generateAppleWatchLayout();
          });
        }
      },
      deep: true
    },
    // 监听apiUrl变化
    apiUrl(newVal) {
      console.log('MusicPlayer apiUrl prop changed:', newVal);
      this.updateApiRequestManager();
    },
    // 监听settings变化
    settings: {
      handler(newVal) {
        console.log('MusicPlayer settings changed, musicApiUrl:', newVal.musicApiUrl);
        this.updateApiRequestManager();
      },
      deep: true
    }
  },
mounted() {
    // 首先初始化API请求管理器，确保它在watch触发之前就准备好了
    this.initApiRequestManager();
    
    // 使用nextTick确保初始化完成后再进行其他操作
    this.$nextTick(() => {
      // 初始化
      this.initAudio();
      
      // 使用mousedown事件，更可靠地捕获点击
      document.addEventListener('mousedown', this.handleMouseDown, true);
      
      // 监听键盘事件，ESC键关闭右键菜单
      document.addEventListener('keydown', this.handleKeyDown);
      
      // 监听窗口大小变化
      window.addEventListener('resize', this.handleWindowResize);
      
      // 加载保存的音量
      this.loadSavedVolume();
      
      // 检查登录状态
      this.checkLoginStatus();
      
      // 初始化沉浸式播放器
      this.initImmersivePlayer();
    });
  },
  beforeUnmount() {
    // 移除事件监听
    document.removeEventListener('mousedown', this.handleMouseDown, true);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleWindowResize);
    // 停止物理模拟
    this.stopPhysicsSimulation();
    // 清理播放模式提示定时器
    if (this.playModeTooltipTimer) {
      clearTimeout(this.playModeTooltipTimer);
    }
  },
  methods: {
    // 初始化API请求管理器
    initApiRequestManager() {
      const apiUrl = this.settings.musicApiUrl || this.apiUrl;
      this.apiRequestManager = new MusicApiRequestManager(apiUrl, {
        timeout: 10000,
        maxRetries: 3,
        retryDelay: 1000,
        concurrentLimit: 6,
        cacheTimeout: 5 * 60 * 1000 // 5分钟缓存
      });
      console.log('API请求管理器已初始化，使用地址:', apiUrl);
    },
    
    // 更新API请求管理器
    updateApiRequestManager() {
      const newApiUrl = this.settings.musicApiUrl || this.apiUrl;
      if (this.apiRequestManager && typeof this.apiRequestManager.updateBaseUrl === 'function') {
        this.apiRequestManager.updateBaseUrl(newApiUrl);
      }
    },
    
    // 辅助请求方法，用于处理简单的fetch请求
    async request(url, options = {}) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
          throw new Error(`API error! code: ${data.code}, message: ${data.message || 'Unknown error'}`);
        }
        return data;
      } catch (error) {
        console.error('请求失败:', error);
        throw error;
      }
    },
    
    // 批量预加载歌曲信息（用于播放列表或搜索结果）
    async preloadSongsInfo(songs, options = {}) {
      if (!songs || songs.length === 0) return;
      
      try {
        const preloadOptions = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } }, ...options } : 
          options;
        
        // 使用API请求管理器批量加载歌曲信息
        const enhancedSongs = await this.apiRequestManager.loadSongsComplete(songs, preloadOptions);
        
        // 更新原始歌曲列表中的信息（不包含URL）
        for (let i = 0; i < songs.length; i++) {
          const enhancedSong = enhancedSongs.find(s => s.id === songs[i].id);
          if (enhancedSong) {
            // 合并增强信息到原始歌曲对象
            Object.assign(songs[i], {
              name: enhancedSong.name || songs[i].name,
              artist: enhancedSong.artist || songs[i].artist,
              album: enhancedSong.album || songs[i].album,
              albumName: enhancedSong.albumName || songs[i].albumName,
              duration: enhancedSong.duration || songs[i].duration,
              picUrl: enhancedSong.picUrl || songs[i].picUrl,
              // 不设置URL，播放时再获取
              url: null,
              needsUrlRefresh: true
            });
          }
        }
        
        console.log(`已预加载 ${songs.length} 首歌曲的详细信息`);
      } catch (error) {
        console.error('批量预加载歌曲信息失败:', error);
        // 不显示错误通知，因为这是预加载操作
      }
    },
    
    // 获取API性能统计信息
    getApiPerformanceStats() {
      if (!this.apiRequestManager) return null;
      
      const cacheStats = this.apiRequestManager.getCacheStats();
      return {
        cache: {
          size: cacheStats.size,
          memoryUsage: (cacheStats.memoryUsage / 1024 / 1024).toFixed(2) + ' MB'
        },
        concurrent: {
          limit: this.apiRequestManager.defaultOptions.concurrentLimit,
          current: this.apiRequestManager.concurrentCount,
          pending: this.apiRequestManager.pendingQueue.length
        },
        requests: {
          pending: this.apiRequestManager.pendingRequests.size
        }
      };
    },
    
    // 清理API缓存
    clearApiCache(pattern = null) {
      if (!this.apiRequestManager) return;
      this.apiRequestManager.clearCache(pattern);
      console.log(`已清理API缓存${pattern ? ` (模式: ${pattern})` : ''}`);
    },
    
    // 优化API性能
    optimizeApiPerformance() {
      if (!this.apiRequestManager) return;
      
      // 清理过期的缓存
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, value] of this.apiRequestManager.cache) {
        if (now - value.timestamp > this.apiRequestManager.defaultOptions.cacheTimeout) {
          this.apiRequestManager.cache.delete(key);
          cleanedCount++;
        }
      }
      
      console.log(`API性能优化完成，清理了 ${cleanedCount} 个过期缓存项`);
    },
    
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
        const errorDetails = {
          type: 'audio_error',
          songId: this.currentSong?.id,
          songName: this.currentSong?.name,
          src: this.audio.src,
          errorCode: this.audio.error?.code,
          errorMessage: this.audio.error?.message,
          networkState: this.audio.networkState,
          readyState: this.audio.readyState,
          currentTime: this.audio.currentTime,
          timestamp: new Date().toISOString(),
          // 保存当前播放状态，用于重试时恢复
          wasPlaying: this.isPlaying
        };
        
        console.error('音频播放错误:', errorDetails);
        // 不要立即设置isPlaying为false，让重试逻辑处理
        // this.isPlaying = false;
        
        // 尝试重新加载音频URL
        this.handleAudioError(errorDetails);
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
    
    async searchMusic(resetPage = true) {
      if (!this.searchQuery.trim()) return;
      
      this.isSearching = true;
      
      try {
        // 如果是新的搜索，重置分页并清空歌单数据
        if (resetPage) {
          this.currentPage = 1;
          this.fullPlaylistSongs = [];
        }
        
        if (this.searchType === 'songs') {
          await this.searchSongs();
        } else if (this.searchType === 'playlists') {
          await this.searchPlaylists();
        } else if (this.searchType === 'artists') {
          await this.searchArtists();
        } else if (this.searchType === 'albums') {
          await this.searchAlbums();
        }
        
        // 只有在真正进行搜索时才显示搜索结果
        this.showSearchResults = true;
      } catch (error) {
        console.error('搜索失败:', error);
        this.showNotification(`搜索失败: ${error.message}`, 'danger');
      } finally {
        this.isSearching = false;
      }
    },

    // 跳转到指定页
    goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage || this.isSearching) return;
      this.currentPage = page;
      
      // 如果是歌单分页，直接从完整列表中切片
      if (this.fullPlaylistSongs.length > 0) {
        const startIndex = (page - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.fullPlaylistSongs.length);
        this.searchResults = this.fullPlaylistSongs.slice(startIndex, endIndex);
        this.currentPlaylist = this.searchResults;
      } else {
        // 否则调用搜索接口
        this.searchMusic(false);
      }
    },

    // 获取页码数组（用于显示页码按钮）
    getPageNumbers() {
      const pages = [];
      const total = this.totalPages;
      const current = this.currentPage;
      
      if (total <= 7) {
        // 总页数小于等于7，显示所有页码
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // 总页数大于7，显示部分页码
        if (current <= 3) {
          // 当前页在前3页
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 2) {
          // 当前页在后3页
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          // 当前页在中间
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }
      
      return pages;
    },

    // 搜索歌曲
    async searchSongs() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const options = this.loginCookie ? 
        { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
        {};
      
      try {
        const data = await this.apiRequestManager.search(
          this.searchQuery, 
          1, // type=1 表示搜索歌曲
          this.pageSize,
          offset,
          options
        );
        
        if (data.result && data.result.songs) {
          const newResults = data.result.songs.map(song => ({
            id: song.id,
            name: song.name,
            artists: song.ar || song.artists || [],
            artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
            duration: song.duration || (song.dt ? song.dt : 0),
            album: song.album ? song.album : (song.al ? song.al : null),
            albumName: song.album ? song.album.name : (song.al ? song.al.name : '未知专辑'),
            picUrl: song.al ? song.al.picUrl : (song.album ? song.album.picUrl : null),
            url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
          }));
          
          // 缓存搜索结果
          this.searchCache.songs = newResults;
          
          // 只显示当前页的结果
          this.searchResults = newResults;
          this.currentPlaylist = this.searchResults;
          this.totalResults = data.result.songCount || 0;
          
          // 预加载歌曲详细信息（异步进行，不阻塞界面）
          this.preloadSongsInfo(newResults.slice(0, 20)); // 只预加载前20首
        } else {
          this.searchCache.songs = [];
          this.searchResults = [];
          this.currentPlaylist = [];
          this.totalResults = 0;
        }
      } catch (error) {
        console.error('搜索歌曲失败:', error);
        this.searchCache.songs = [];
        this.searchResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
        this.showNotification('搜索歌曲失败，请稍后重试', 'error');
      }
    },

    // 搜索歌单
    async searchPlaylists() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const options = this.loginCookie ? 
        { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
        {};
      
      try {
        const data = await this.apiRequestManager.search(
          this.searchQuery, 
          1000, // type=1000 表示搜索歌单
          this.pageSize,
          offset,
          options
        );
        
        if (data.result && data.result.playlists) {
          const newResults = data.result.playlists.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description || '',
            coverImgUrl: playlist.coverImgUrl,
            playCount: playlist.playCount,
            trackCount: playlist.trackCount,
            creator: playlist.creator ? playlist.creator.nickname : '未知创建者',
            creatorId: playlist.creator ? playlist.creator.userId : null
          }));
          
          // 缓存搜索结果
          this.searchCache.playlists = newResults;
          
          // 只显示当前页的结果
          this.playlistResults = newResults;
          this.currentPlaylist = [];
          this.totalResults = data.result.playlistCount || 0;
        } else {
          this.searchCache.playlists = [];
          this.playlistResults = [];
          this.currentPlaylist = [];
          this.totalResults = 0;
        }
      } catch (error) {
        console.error('搜索歌单失败:', error);
        this.searchCache.playlists = [];
        this.playlistResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
        this.showNotification('搜索歌单失败，请稍后重试', 'error');
      }
    },

    // 搜索歌手
    async searchArtists() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const options = this.loginCookie ? 
        { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
        {};
      
      try {
        const data = await this.apiRequestManager.search(
          this.searchQuery, 
          100, // type=100 表示搜索歌手
          this.pageSize,
          offset,
          options
        );
        
        if (data.result && data.result.artists) {
          const newResults = data.result.artists.map(artist => ({
            id: artist.id,
            name: artist.name,
            picUrl: artist.picUrl || artist.img1v1Url,
            albumSize: artist.albumSize || 0,
            musicSize: artist.musicSize || 0,
            mvSize: artist.mvSize || 0
          }));
          
          // 缓存搜索结果
          this.searchCache.artists = newResults;
          
          // 只显示当前页的结果
          this.artistSearchResults = newResults;
          this.currentPlaylist = [];
          this.totalResults = data.result.artistCount || 0;
        } else {
          this.searchCache.artists = [];
          this.artistSearchResults = [];
          this.currentPlaylist = [];
          this.totalResults = 0;
        }
      } catch (error) {
        console.error('搜索歌手失败:', error);
        this.searchCache.artists = [];
        this.artistSearchResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
        this.showNotification('搜索歌手失败，请稍后重试', 'error');
      }
    },

    // 切换搜索类型
    changeSearchType(type) {
      this.searchType = type;
      this.currentPage = 1;
      this.totalResults = 0;
      this.fullPlaylistSongs = [];
      
      // 从缓存中获取对应类型的搜索结果
      const cachedResults = this.searchCache[this.getSearchTypeKey(type)];
      
      if (cachedResults && cachedResults.length > 0) {
        // 使用缓存数据
        this.searchResults = cachedResults;
        this.currentPlaylist = this.searchResults;
        this.totalResults = cachedResults.length;
        this.showSearchResults = true;
      } else {
        // 清空搜索结果，不显示搜索界面
        this.searchResults = [];
        this.currentPlaylist = [];
        this.showSearchResults = false;
      }
    },

    // 获取搜索类型对应的缓存键
    getSearchTypeKey(type) {
      const typeMap = {
        'songs': 'songs',
        'playlists': 'playlists',
        'artists': 'artists',
        'albums': 'albums'
      };
      return typeMap[type] || 'songs';
    },

    // 获取搜索占位符
    getSearchPlaceholder() {
      switch (this.searchType) {
        case 'songs':
          return '搜索歌曲、歌手或专辑...';
        case 'playlists':
          return '搜索歌单...';
        case 'artists':
          return '搜索歌手...';
        case 'albums':
          return '搜索专辑...';
        default:
          return '搜索...';
      }
    },

    // 获取歌单详情
    async getPlaylistDetail(playlistId, isRetry = false) {
      try {
        // 立即显示加载动画
        this.isLoadingPlaylist = true;
        this.showPlaylistDetail = true;
        
        const options = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
          {};
        
        // 使用并发请求获取歌单完整详情
        const playlistCompleteData = await this.apiRequestManager.getPlaylistCompleteDetail(playlistId, options);
        const { detail: detailData, tracks: trackData, errors } = playlistCompleteData;
        
        // 如果有错误，显示通知
        if (errors.length > 0) {
          console.warn('部分数据加载失败:', errors.join(', '));
          this.showNotification(`部分数据加载失败: ${errors.join(', ')}`, 'warning');
        }
        
        // 保存歌单详情信息
        this.playlistDetail = {
          id: detailData.playlist.id,
          name: detailData.playlist.name,
          description: detailData.playlist.description || '',
          coverImgUrl: detailData.playlist.coverImgUrl,
          creator: detailData.playlist.creator ? detailData.playlist.creator.nickname : '未知',
          playCount: detailData.playlist.playCount,
          trackCount: detailData.playlist.trackCount,
          tags: detailData.playlist.tags || []
        };
        
        // 处理歌曲数据
        const songs = trackData.map(song => ({
          id: song.id,
          name: song.name,
          artists: song.ar || song.artists || [],
          artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
          duration: song.duration || (song.dt ? song.dt : 0),
          album: song.al || song.album || {},
          albumName: song.al ? song.al.name : (song.album ? song.album.name : '未知专辑'),
          picUrl: song.al ? song.al.picUrl : (song.album ? song.album.picUrl : null),
          url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
        }));
        
        // 保存完整的歌单歌曲列表
        this.fullPlaylistSongs = songs;
        
        // 重置分页并显示第一页
        this.playlistDetailPage = 1;
        const startIndex = 0;
        const endIndex = Math.min(this.pageSize, songs.length);
        this.playlistDetailSongs = songs.slice(startIndex, endIndex);
        
        // 显示歌单详情界面
        this.showPlaylistDetail = true;
        
        // 预加载歌曲详细信息（异步进行，不阻塞界面）
        this.preloadSongsInfo(songs.slice(0, 50)); // 预加载前50首
        
        // 重置重试计数
        this.retryCount.playlist = 0;
        this.lastFailedRequest.playlist = null;
        
        this.showNotification(`已加载歌单: ${detailData.playlist.name} (共${songs.length}首歌曲)`, 'success');
      } catch (error) {
        console.error('获取歌单详情失败:', error);
        
        // 重试逻辑
        if (!isRetry && this.retryCount.playlist < this.maxRetries) {
          this.retryCount.playlist++;
          this.lastFailedRequest.playlist = playlistId;
          this.showNotification(`加载失败，正在重试 (${this.retryCount.playlist}/${this.maxRetries})...`, 'warning');
          
          // 延迟1秒后重试
          setTimeout(() => {
            this.getPlaylistDetail(playlistId, true);
          }, 1000);
        } else {
          // 重试次数用完或已经是重试请求
          this.showNotification(`获取歌单详情失败: ${error.message}`, 'danger');
          this.retryCount.playlist = 0;
          this.lastFailedRequest.playlist = null;
        }
      } finally {
        // 重置歌单加载状态
        this.isLoadingPlaylist = false;
      }
    },

    // 搜索专辑
    async searchAlbums() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const url = `${this.currentApiUrl}/cloudsearch?keywords=${encodeURIComponent(this.searchQuery)}&type=10&limit=${this.pageSize}&offset=${offset}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.result && data.result.albums) {
          const newResults = data.result.albums.map(album => ({
            id: album.id,
            name: album.name,
            artist: album.artist ? album.artist.name : (album.artists && album.artists.length > 0 ? album.artists[0].name : '未知艺术家'),
            artistId: album.artist ? album.artist.id : (album.artists && album.artists.length > 0 ? album.artists[0].id : null),
            picUrl: album.picUrl || album.blurPicUrl,
            publishTime: album.publishTime,
            size: album.size || 0,
            description: album.description || ''
          }));
          
          // 缓存搜索结果
          this.searchCache.albums = newResults;
          
          // 只显示当前页的结果
          this.albumSearchResults = newResults;
          this.currentPlaylist = [];
          this.totalResults = data.result.albumCount || 0;
        } else {
          this.searchCache.albums = [];
          this.albumSearchResults = [];
          this.currentPlaylist = [];
          this.totalResults = 0;
        }
      } else {
        this.searchCache.albums = [];
        this.albumSearchResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
      }
    },

    // 获取专辑详情
    async getAlbumDetail(albumId, isRetry = false) {
      if (!albumId) return;
      
      // 立即显示加载动画
      this.isLoadingAlbum = true;
      this.showAlbumDetail = true;
      
      try {
        const options = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
          {};
        
        // 使用并发请求获取专辑完整详情
        const albumCompleteData = await this.apiRequestManager.getAlbumCompleteDetail(albumId, options);
        const { detail: data, errors } = albumCompleteData;
        
        // 如果有错误，显示通知
        if (errors.length > 0) {
          console.warn('部分数据加载失败:', errors.join(', '));
          this.showNotification(`部分数据加载失败: ${errors.join(', ')}`, 'warning');
        }
        
        if (data && data.album) {
          this.albumDetail = data.album;
          
          // 确保专辑封面正确
          if (!this.albumDetail.picUrl && this.albumDetail.blurPicUrl) {
            this.albumDetail.picUrl = this.albumDetail.blurPicUrl;
          }
          
          if (data.songs && data.songs.length > 0) {
            this.albumSongs = data.songs.map(song => ({
              id: song.id,
              name: song.name,
              artists: song.ar || song.artists || [],
              artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
              duration: song.duration || (song.dt ? song.dt : 0),
              album: song.al || song.album || {},
              albumName: song.al ? song.al.name : (song.album ? song.album.name : '未知专辑'),
              // 确保歌曲封面正确，优先使用专辑封面
              picUrl: (song.al && song.al.picUrl) || (song.album && song.album.picUrl) || (data.album && data.album.picUrl) || (data.album && data.album.blurPicUrl) || this.defaultAlbumArt,
              url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
            }));
            
            // 预加载专辑歌曲详细信息（异步进行，不阻塞界面）
            this.preloadSongsInfo(this.albumSongs.slice(0, 20));
          }
          
          this.showAlbumDetail = true;
          
          // 重置重试计数
          this.retryCount.album = 0;
          this.lastFailedRequest.album = null;
        }
      } catch (error) {
        console.error('获取专辑详情失败:', error);
        
        // 重试逻辑
        if (!isRetry && this.retryCount.album < this.maxRetries) {
          this.retryCount.album++;
          this.lastFailedRequest.album = albumId;
          this.showNotification(`加载失败，正在重试 (${this.retryCount.album}/${this.maxRetries})...`, 'warning');
          
          // 延迟1秒后重试
          setTimeout(() => {
            this.getAlbumDetail(albumId, true);
          }, 1000);
        } else {
          // 重试次数用完或已经是重试请求
          this.showNotification(`获取专辑详情失败: ${error.message}`, 'danger');
          this.retryCount.album = 0;
          this.lastFailedRequest.album = null;
        }
      } finally {
        this.isLoadingAlbum = false;
      }
    },

    // 关闭专辑详情
    closeAlbumDetail() {
      this.showAlbumDetail = false;
      this.albumDetail = null;
      this.albumSongs = [];
      this.isLoadingAlbum = false;
    },

    // 从专辑歌曲中选择歌曲播放
    selectAlbumSong(index) {
      const song = this.albumSongs[index];
      // 同步专辑歌曲到播放列表
      this.syncPlaylistToMain(this.albumSongs);
      this.selectSong(index);
      this.closeAlbumDetail();
    },

    // 获取专辑封面URL
    getAlbumCoverUrl(album) {
      return album.picUrl || album.blurPicUrl || this.defaultAlbumArt;
    },

    // 获取专辑艺术家名称
    getAlbumArtistName(album) {
      if (album.artist && album.artist.name) {
        return album.artist.name;
      }
      if (album.artists && album.artists.length > 0) {
        return album.artists[0].name;
      }
      return '未知艺术家';
    },

    // 获取歌曲封面URL
    getSongCoverUrl(song) {
      // 优先使用歌曲自身的封面
      if (song.al && song.al.picUrl) {
        return song.al.picUrl;
      }
      if (song.album && song.album.picUrl) {
        return song.album.picUrl;
      }
      // 检查是否有其他可能的封面字段
      if (song.picUrl) {
        return song.picUrl;
      }
      // 如果都没有，返回默认封面
      return this.defaultAlbumArt;
    },

    // 加载更多歌手全部歌曲
    // 跳转到歌手全部歌曲的指定页
    goToArtistAllSongsPage(page) {
      if (page < 1 || page > this.artistAllSongsTotalPages || page === this.artistAllSongsPage) return;
      
      this.artistAllSongsPage = page;
      const startIndex = (page - 1) * this.pageSize;
      const endIndex = Math.min(startIndex + this.pageSize, this.fullArtistAllSongs.length);
      this.artistAllSongs = this.fullArtistAllSongs.slice(startIndex, endIndex);
    },

    // 获取歌手全部歌曲页码数组
    getArtistAllSongsPageNumbers() {
      const pages = [];
      const total = this.artistAllSongsTotalPages;
      const current = this.artistAllSongsPage;
      
      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 3) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }
      
      return pages;
    },

    // 跳转到歌单详情的指定页
    goToPlaylistDetailPage(page) {
      if (page < 1 || page > this.playlistDetailTotalPages || page === this.playlistDetailPage) return;
      
      this.playlistDetailPage = page;
      const startIndex = (page - 1) * this.pageSize;
      const endIndex = Math.min(startIndex + this.pageSize, this.fullPlaylistSongs.length);
      this.playlistDetailSongs = this.fullPlaylistSongs.slice(startIndex, endIndex);
    },

    // 获取歌单详情页码数组
    getPlaylistDetailPageNumbers() {
      const pages = [];
      const total = this.playlistDetailTotalPages;
      const current = this.playlistDetailPage;
      
      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 3) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }
      
      return pages;
    },

    // 关闭歌单详情界面
    closePlaylistDetail() {
      this.showPlaylistDetail = false;
      this.playlistDetail = null;
      this.playlistDetailSongs = [];
      this.playlistDetailPage = 1;
      this.fullPlaylistSongs = [];
      this.isLoadingPlaylist = false;
    },

    // 从歌单详情中选择歌曲
    selectPlaylistDetailSong(index) {
      const song = this.playlistDetailSongs[index];
      if (!song) return;
      
      // 同步歌单歌曲到播放列表
      this.syncPlaylistToMain(this.fullPlaylistSongs);
      
      // 计算在完整列表中的实际索引
      const actualIndex = (this.playlistDetailPage - 1) * this.pageSize + index;
      
      // 播放歌曲
      this.selectSong(actualIndex);
    },

    // 切换歌手标签页
    switchArtistTab(tab) {
      this.artistActiveTab = tab;
    },
    
    selectSong(index) {
      // 验证索引
      if (typeof index !== 'number' || index < 0 || index >= this.currentPlaylist.length) {
        console.error('无效的歌曲索引:', index);
        return;
      }
      
      const song = this.currentPlaylist[index];
      if (!song || !song.id) {
        console.error('无效的歌曲数据:', song);
        return;
      }
      
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
      this.isLoadingSong = true;
      
      try {
        // 重置时长
        this.duration = 0;
        this.currentTime = 0;
        
        // 使用API请求管理器获取歌曲详情（不包含URL）
        const options = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
          {};
        
        const [songDetails] = await this.apiRequestManager.loadSongsComplete([song], options);
        
        if (!songDetails) {
          throw new Error('获取歌曲信息失败');
        }
        
        // 更新当前歌曲信息（不包含URL）
        this.currentSong = {
          ...this.currentSong,
          name: songDetails.name || this.currentSong.name,
          artist: (songDetails.ar && Array.isArray(songDetails.ar)) ? 
                   songDetails.ar.map(a => a.name).join(', ') : 
                   this.currentSong.artist,
          album: (songDetails.al && songDetails.al.name) ? 
                 songDetails.al.name : 
                 this.currentSong.album,
          duration: songDetails.dt || songDetails.duration || this.currentSong.duration,
          picUrl: (songDetails.al && songDetails.al.picUrl) ? 
                  songDetails.al.picUrl : 
                  this.currentSong.picUrl
        };
        
        // 播放时获取URL
        await this.loadSongUrl();
        
      } catch (error) {
        console.error('加载歌曲失败:', error);
        this.showNotification('加载歌曲失败', 'error');
      } finally {
        this.isLoadingSong = false;
      }
    },

    // 加载歌曲URL（仅在播放时调用）
    async loadSongUrl() {
      if (!this.currentSong) {
        console.error('没有当前歌曲');
        return;
      }
      
      try {
        // 获取歌曲URL
        const refreshOptions = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } }, skipCache: true } : 
          { skipCache: true };
        
        const urlResult = await this.apiRequestManager.refreshSingleSongUrl(this.currentSong.id, refreshOptions);
        
        if (urlResult && urlResult.url) {
          // 设置音频源
          this.audio.src = urlResult.url;
          this.audio.load();
          
          // 更新当前歌曲URL
          this.currentSong.url = urlResult.url;
          this.currentSong.isFallback = urlResult.isFallback;
          
          if (urlResult.isFallback) {
            this.showNotification('使用备用播放链接', 'warning');
          }
        } else {
          throw new Error('获取到的URL为空');
        }
      } catch (error) {
        console.error('加载歌曲URL失败:', error);
        
        // 使用备用URL
        const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${this.currentSong.id}.mp3`;
        this.audio.src = fallbackUrl;
        this.audio.load();
        this.currentSong.url = fallbackUrl;
        this.currentSong.isFallback = true;
        
        this.showNotification('使用备用播放链接', 'warning');
      }
        
        // 加载完成后自动播放
        this.audio.oncanplay = () => {
          if (this.isPlaying) {
            this.audio.play().catch(e => console.error('自动播放失败:', e));
          }
        };
    },
    
    async loadSongDetail(songId) {
      try {
        // 获取歌曲详细信息以更新当前歌曲数据
        const url = `${this.currentApiUrl}/song/detail?ids=${songId}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
      const response = await fetch(url);
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
      if (!this.currentSong || this.playlist.length === 0) return;
      
      if (this.playMode === 'random') {
        // 随机播放模式下，手动下一首应该随机选择一首歌
        this.playRandomNext();
      } else {
        // 始终使用播放列表来播放下一首
        const currentIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
        const nextIndex = (currentIndex + 1) % this.playlist.length;
        this.selectSongFromPlaylist(nextIndex);
      }
    },
    
    skipPrevious() {
      if (!this.currentSong || this.playlist.length === 0) return;
      
      if (this.playMode === 'random') {
        // 随机播放模式下，手动上一首应该随机选择一首歌
        this.playRandomNext();
      } else {
        // 始终使用播放列表来播放上一首
        const currentIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
        const prevIndex = currentIndex === 0 ? this.playlist.length - 1 : currentIndex - 1;
        this.selectSongFromPlaylist(prevIndex);
      }
    },
    
    playNext() {
      if (this.playlist.length === 0) return;
      
      switch (this.playMode) {
        case 'single':
          // 单曲循环：重新播放当前歌曲
          if (this.currentSong) {
            this.selectSongFromPlaylist(this.playlist.findIndex(song => song.id === this.currentSong.id));
          }
          break;
          
        case 'list':
          // 列表循环：播放下一首，到末尾后从头开始
          const currentIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
          if (currentIndex !== -1 && currentIndex < this.playlist.length - 1) {
            this.selectSongFromPlaylist(currentIndex + 1);
          } else {
            this.selectSongFromPlaylist(0);
          }
          break;
          
        case 'order':
          // 顺序播放：播放下一首，到末尾后停止
          const orderIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
          if (orderIndex !== -1 && orderIndex < this.playlist.length - 1) {
            this.selectSongFromPlaylist(orderIndex + 1);
          } else {
            // 播放结束，停止播放
            this.isPlaying = false;
            this.currentTime = 0;
          }
          break;
          
        case 'random':
          // 随机播放：从未播放的歌曲中随机选择
          this.playRandomNext();
          break;
          
        default:
          // 默认为列表循环
          const defaultIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
          if (defaultIndex !== -1 && defaultIndex < this.playlist.length - 1) {
            this.selectSongFromPlaylist(defaultIndex + 1);
          } else {
            this.selectSongFromPlaylist(0);
          }
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
      
      // 加载收藏的歌曲
      this.loadLikedSongs();
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
      // 不再切换界面，直接打开播放列表菜单
      this.showPlaylistMenu = true;
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
    
    // 最小化播放器
    minimizePlayer() {
      this.isMinimized = true;
      // 更新通知位置
      this.updateNotificationPosition();
    },
    
    // 恢复播放器
    restorePlayer() {
      this.isMinimized = false;
      // 更新通知位置
      this.updateNotificationPosition();
    },
    
    // 开始拖拽悬浮播放器
    startDragMiniPlayer(event) {
      // 检查是否点击了控制按钮或播放列表菜单
      const target = event.target;
      if (target.closest('.mini-controls') || 
          target.closest('.mini-player-controls') || 
          target.closest('.mini-progress') ||
          target.closest('.mini-playlist-menu')) {
        return; // 如果点击的是控制按钮或播放列表菜单，不启动拖拽
      }
      
      this.isDraggingMiniPlayer = true;
      
      // 检测是鼠标事件还是触摸事件
      const isTouchEvent = event.type === 'touchstart';
      const clientX = isTouchEvent ? event.touches[0].clientX : event.clientX;
      const clientY = isTouchEvent ? event.touches[0].clientY : event.clientY;
      
      this.dragOffset.x = clientX - this.miniPlayerPosition.x;
      this.dragOffset.y = clientY - this.miniPlayerPosition.y;
      
      // 根据事件类型添加相应的事件监听器
      if (isTouchEvent) {
        document.addEventListener('touchmove', this.onDragMiniPlayerThrottled, { passive: false });
            document.addEventListener('touchend', this.stopDragMiniPlayer, { passive: true });
            document.addEventListener('touchcancel', this.stopDragMiniPlayer, { passive: true });      } else {
        document.addEventListener('mousemove', this.onDragMiniPlayerThrottled);
        document.addEventListener('mouseup', this.stopDragMiniPlayer);
      }
      
      event.preventDefault();
    },
    
    // 更新播放列表菜单方向
    updatePlaylistMenuDirection() {
      const windowHeight = window.innerHeight;
      const playerHeight = 120; // 悬浮窗高度
      const menuHeight = 300; // 播放列表菜单高度
      const playerTop = this.displayPosition.y; // 使用显示位置而非实际位置
      const playerBottom = playerTop + playerHeight;
      
      // 检查向下展开是否会超出界面
      const canExpandDown = playerBottom + menuHeight <= windowHeight;
      // 检查向上展开是否会超出界面
      const canExpandUp = playerTop - menuHeight >= 0;
      
      if (canExpandDown) {
        // 向下展开不会超出界面，优先向下展开
        this.playlistMenuDirection = 'down';
      } else if (canExpandUp) {
        // 向下展开会超出但向上展开不会，向上展开
        this.playlistMenuDirection = 'up';
      } else {
        // 两个方向都会超出，选择超出较少的方向
        const spaceBelow = windowHeight - playerBottom;
        const spaceAbove = playerTop;
        this.playlistMenuDirection = spaceBelow >= spaceAbove ? 'down' : 'up';
      }
    },
    
    // 切换播放列表菜单
    togglePlaylistMenu() {
      // 先关闭菜单，再重新计算位置并打开
      if (this.showPlaylistMenu) {
        this.showPlaylistMenu = false;
      } else {
        this.updatePlaylistMenuDirection();
        this.$nextTick(() => {
          this.showPlaylistMenu = true;
          // 延迟执行滚动，确保菜单已经渲染
          setTimeout(() => {
            this.scrollToCurrentSong();
          }, 100);
        });
      }
    },
    
    // 滚动到当前播放歌曲
    scrollToCurrentSong() {
      if (!this.currentSong || !this.playlist.length) return;
      
      // 延迟执行，确保DOM完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          // 查找当前歌曲在播放列表中的索引
          const currentIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
          if (currentIndex === -1) return;
          
          // 根据播放器状态选择不同的容器和元素
          let playlistContainer, playlistItems;
          
          if (this.isMinimized) {
            // 迷你播放器状态
            playlistContainer = document.querySelector('.mini-playlist-content');
            if (playlistContainer) {
              playlistItems = playlistContainer.querySelectorAll('.mini-playlist-item');
            }
          } else {
            // 正常播放器状态
            playlistContainer = document.querySelector('.playlist-menu-content');
            if (playlistContainer) {
              playlistItems = playlistContainer.querySelectorAll('.playlist-menu-item');
            }
          }
          
          if (!playlistContainer || !playlistItems || playlistItems.length === 0) return;
          
          const currentItem = playlistItems[currentIndex];
          if (!currentItem) return;
          
          // 计算滚动位置，让当前歌曲显示在容器中间
          const containerHeight = playlistContainer.clientHeight;
          const itemHeight = currentItem.offsetHeight;
          const itemTop = currentItem.offsetTop;
          const scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
          
          // 平滑滚动到目标位置
          playlistContainer.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        }, 300); // 增加延迟时间确保动画完成
      });
    },
    
    // 节流处理的拖拽函数
    onDragMiniPlayerThrottled(event) {
      if (!this.isDraggingMiniPlayer) return;
      
      // 检测是鼠标事件还是触摸事件
      const isTouchEvent = event.type === 'touchmove';
      const clientX = isTouchEvent ? event.touches[0].clientX : event.clientX;
      const clientY = isTouchEvent ? event.touches[0].clientY : event.clientY;
      
      // 更新实际位置
      this.miniPlayerPosition.x = clientX - this.dragOffset.x;
      this.miniPlayerPosition.y = clientY - this.dragOffset.y;
      
      // 限制在窗口范围内
      const maxX = window.innerWidth - 300; // 悬浮窗宽度约300px
      const maxY = window.innerHeight - 120; // 悬浮窗高度约120px
      
      this.miniPlayerPosition.x = Math.max(0, Math.min(this.miniPlayerPosition.x, maxX));
      this.miniPlayerPosition.y = Math.max(0, Math.min(this.miniPlayerPosition.y, maxY));
      
      // 使用滞后效果更新显示位置
      this.updateDisplayPosition();
      
      // 阻止默认行为（防止移动端页面滚动）
      if (isTouchEvent) {
        event.preventDefault();
      }
    },
    
    // 更新显示位置（带滞后效果）
    updateDisplayPosition() {
      if (this.dragAnimationId) {
        cancelAnimationFrame(this.dragAnimationId);
      }
      
      this.dragAnimationId = requestAnimationFrame(() => {
        // 计算滞后效果，使用插值实现平滑过渡
        const easing = 0.2; // 滞后系数，值越小滞后效果越明显
        this.displayPosition.x += (this.miniPlayerPosition.x - this.displayPosition.x) * easing;
        this.displayPosition.y += (this.miniPlayerPosition.y - this.displayPosition.y) * easing;
        
        // 如果还在拖拽中，继续更新
        if (this.isDraggingMiniPlayer) {
          this.updateDisplayPosition();
        }
      });
    },
    
    // 停止拖拽悬浮播放器
    stopDragMiniPlayer() {
      this.isDraggingMiniPlayer = false;
      
      // 移除所有可能的事件监听器
      document.removeEventListener('mousemove', this.onDragMiniPlayerThrottled);
      document.removeEventListener('mouseup', this.stopDragMiniPlayer);
      document.removeEventListener('touchmove', this.onDragMiniPlayerThrottled);
      document.removeEventListener('touchend', this.stopDragMiniPlayer);
      document.removeEventListener('touchcancel', this.stopDragMiniPlayer);
      
      // 确保最终位置准确
      if (this.dragAnimationId) {
        cancelAnimationFrame(this.dragAnimationId);
        this.dragAnimationId = null;
      }
      this.displayPosition.x = this.miniPlayerPosition.x;
      this.displayPosition.y = this.miniPlayerPosition.y;
    },
    
    closePlayer() {
      // 如果沉浸式播放器开启，先关闭它
      if (this.showImmersivePlayer) {
        this.closeImmersivePlayer();
      }
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
        this.showNotification('歌曲已添加到播放列表', 'success');
      } else {
        this.showNotification('歌曲已在播放列表中', 'warning');
      }
    },

    // 检查歌曲是否已在播放列表中
    isSongInPlaylist(song) {
      return this.playlist.some(s => s.id === song.id);
    },

    // 获取歌曲在当前播放列表中的索引
    getSongIndex(song, playlist) {
      if (!song || !song.id || !playlist || !Array.isArray(playlist)) return -1;
      return playlist.findIndex(s => s && s.id === song.id);
    },

    // 获取歌手详情
    async getArtistDetail(artistId, isRetry = false) {
      if (!artistId) return;
      
      // 立即显示加载动画
      this.isLoadingArtist = true;
      this.showArtistDetail = true;
      
      try {
        const options = this.loginCookie ? 
          { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
          {};
        
        // 使用并发请求获取歌手完整详情
        const artistCompleteData = await this.apiRequestManager.getArtistCompleteDetail(artistId, options);
        const { detail: detailData, hotSongs: hotSongsData, albums: albumsData, errors } = artistCompleteData;
        
        // 如果有错误，显示通知
        if (errors.length > 0) {
          console.warn('部分数据加载失败:', errors.join(', '));
          this.showNotification(`部分数据加载失败: ${errors.join(', ')}`, 'warning');
        }
        
        // 获取歌手全部歌曲，分页获取所有歌曲
        let allSongs = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;
        
        while (hasMore) {
          const allSongsData = await this.apiRequestManager.request('/artist/songs', {
            id: artistId,
            limit: limit,
            offset: offset,
            order: 'hot'
          }, options);
          
          if (allSongsData.songs && allSongsData.songs.length > 0) {
            allSongs = allSongs.concat(allSongsData.songs);
            
            // 如果返回的歌曲数小于limit，说明已经是最后一页
            if (allSongsData.songs.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } else {
            hasMore = false;
          }
        }
        
        // 获取歌手描述
        const descData = await this.request(`${this.currentApiUrl}/artist/desc?id=${artistId}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`);
        
        // 处理歌手基本信息
        if (detailData.code === 200) {
          // 根据API文档，歌手详情在data.artist中
          const artistData = detailData.data?.artist || detailData.artist || detailData.data;
          
          if (artistData) {
            // 处理头像URL - 使用avatar字段
            let avatarUrl = artistData.avatar || artistData.picUrl || artistData.img1v1Url;
            
            // 检查是否为默认头像
            const isDefaultAvatar = !avatarUrl || 
                (artistData.img1v1Url && artistData.img1v1Url.includes('/default/')) ||
                avatarUrl.includes('/default/');
            
            if (isDefaultAvatar) {
              avatarUrl = this.defaultAlbumArt;
            }
            
            this.artistDetail = {
              id: artistData.id,
              name: artistData.name || '未知歌手',
              picUrl: avatarUrl, // 保持picUrl字段以兼容模板
              avatar: avatarUrl,  // 添加avatar字段
              img1v1Url: artistData.img1v1Url,
              // 统计数据
              musicSize: artistData.musicSize || artistData.songSize || 0,
              albumSize: artistData.albumSize || 0,
              mvSize: artistData.mvSize || 0,
              // 其他信息
              identify: artistData.identify,
              briefDesc: '',
              // 添加颜色相关字段
              extractedColor: null
            };
            
            // 添加歌手描述
            if (descData.code === 200) {
              if (descData.briefDesc) {
                this.artistDetail.briefDesc = descData.briefDesc;
              } else if (descData.desc) {
                this.artistDetail.briefDesc = descData.desc;
              }
            }
            
            // 如果不是默认头像，提取头像颜色
            if (!isDefaultAvatar && avatarUrl) {
              this.extractArtistAvatarColor(avatarUrl, artistData.id);
            }
          } else {
            // 如果没有找到歌手数据，使用默认值
            this.artistDetail = {
              id: artistId,
              name: '未知歌手',
              picUrl: this.defaultAlbumArt,
              avatar: this.defaultAlbumArt,
              musicSize: 0,
              albumSize: 0,
              mvSize: 0,
              briefDesc: '',
              extractedColor: null
            };
          }
        }
        
        // 处理热门歌曲
        if (hotSongsData && hotSongsData.length > 0) {
          this.artistSongs = hotSongsData.map(song => ({
            id: song.id,
            name: song.name,
            artists: song.ar || song.artists || [],
            artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
            duration: song.duration || (song.dt ? song.dt : 0),
            album: song.al || song.album || {},
            albumName: song.al ? song.al.name : (song.album ? song.album.name : '未知专辑'),
            picUrl: this.getSongCoverUrl(song),
            url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
          }));
          
          // 预加载热门歌曲详细信息（异步进行，不阻塞界面）
          this.preloadSongsInfo(this.artistSongs.slice(0, 20));
        }
        
        // 处理全部歌曲 - 已通过分页获取所有歌曲
        if (allSongs && allSongs.length > 0) {
          const processedSongs = allSongs.map(song => ({
            id: song.id,
            name: song.name,
            artists: song.ar || song.artists || [],
            artist: song.artists ? song.artists.map(a => a.name).join(', ') : (song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家'),
            duration: song.duration || (song.dt ? song.dt : 0),
            album: song.al || song.album || {},
            albumName: song.al ? song.al.name : (song.album ? song.album.name : '未知专辑'),
            picUrl: this.getSongCoverUrl(song),
            url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
          }));
          
          // 保存完整列表
          this.fullArtistAllSongs = processedSongs;
          this.artistAllSongsTotal = processedSongs.length;
          
          // 重置分页并显示第一页
          this.artistAllSongsPage = 1;
          const startIndex = 0;
          const endIndex = Math.min(this.pageSize, processedSongs.length);
          this.artistAllSongs = processedSongs.slice(startIndex, endIndex);
        }
        
        // 处理专辑
        if (albumsData && albumsData.length > 0) {
          this.artistAlbums = albumsData.map(album => ({
            ...album,
            picUrl: album.picUrl || album.blurPicUrl || this.defaultAlbumArt
          }));
        }
        
        this.showArtistDetail = true;
        
        // 重置重试计数
        this.retryCount.artist = 0;
        this.lastFailedRequest.artist = null;
      } catch (error) {
        console.error('获取歌手详情失败:', error);
        
        // 重试逻辑
        if (!isRetry && this.retryCount.artist < this.maxRetries) {
          this.retryCount.artist++;
          this.lastFailedRequest.artist = artistId;
          this.showNotification(`加载失败，正在重试 (${this.retryCount.artist}/${this.maxRetries})...`, 'warning');
          
          // 延迟1秒后重试
          setTimeout(() => {
            this.getArtistDetail(artistId, true);
          }, 1000);
        } else {
          // 重试次数用完或已经是重试请求
          this.showNotification(`获取歌手详情失败: ${error.message}`, 'danger');
          this.retryCount.artist = 0;
          this.lastFailedRequest.artist = null;
        }
      } finally {
        this.isLoadingArtist = false;
      }
    },

    // 关闭歌手详情
    closeArtistDetail() {
      this.showArtistDetail = false;
      this.artistDetail = null;
      this.artistSongs = [];
      this.artistAlbums = [];
      this.isLoadingArtist = false;
    },

    // 从歌手歌曲中选择歌曲播放
    selectArtistSong(index, type = 'hot') {
      const songs = type === 'all' ? this.artistAllSongs : this.artistSongs;
      const song = songs[index];
      // 同步歌手歌曲到播放列表
      this.syncPlaylistToMain(songs);
      this.selectSong(index);
      this.closeArtistDetail();
    },

    // 格式化播放次数
    formatPlayCount(count) {
      if (!count) return '0';
      if (count >= 10000) {
        return Math.floor(count / 10000) + '万';
      }
      return count.toString();
    },

    // 获取当前结果数量
    // 获取当前搜索类型标签
    getCurrentSearchTypeLabel() {
      const currentType = this.searchTypes.find(type => type.value === this.searchType);
      return currentType ? currentType.label : '歌曲';
    },

    // 切换下拉菜单显示状态
    toggleSearchTypeDropdown() {
      this.showSearchTypeDropdown = !this.showSearchTypeDropdown;
    },

    // 选择搜索类型
    selectSearchType(type) {
      this.changeSearchType(type);
      this.showSearchTypeDropdown = false;
    },

    // 点击外部关闭下拉菜单
    handleClickOutside(event) {
      // 关闭搜索类型下拉菜单
      if (!event.target.closest('.search-type-dropdown')) {
        this.showSearchTypeDropdown = false;
      }
      
      // 关闭用户下拉菜单
      if (!event.target.closest('.user-info-container')) {
        this.showUserDropdown = false;
      }
      
      // 关闭播放列表菜单
      if (!event.target.closest('.playlist-button-container')) {
        this.showPlaylistMenu = false;
      }
      
      // 关闭迷你播放列表菜单（如果存在）
      if (!event.target.closest('.mini-playlist-menu')) {
        // 这里可以添加迷你播放列表的关闭逻辑
      }
    },

    // 切换网格视图
    toggleGridView() {
      this.isGridView = !this.isGridView;
      // 切换模式时清空引用数组
      if (!this.isGridView) {
        this.stopPhysicsSimulation();
        this.gridItemRefs = [];
        this.gridItemPositions = [];
        this.gridItemVelocities = [];
        this.gridItemOriginalPositions = [];
        this.gridItemHoverStates = [];
      } else {
        // 切换到网格视图时生成新布局
        this.$nextTick(() => {
          this.generateAppleWatchLayout();
        });
      }
    },

    // 跟踪鼠标位置
    trackMouseMove(event) {
      if (this.isGridView) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
      }
    },

    // 计算元素与鼠标的距离
    calculateDistance(element) {
      if (!this.isGridView || !element) return 1;
      
      try {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(this.mouseX - centerX, 2) + Math.pow(this.mouseY - centerY, 2)
        );
        
        // 最大距离为200px，距离越近缩放越大
        const maxDistance = 200;
        const scale = Math.max(0.8, Math.min(1.5, 1.5 - (distance / maxDistance) * 0.7));
        
        return scale;
      } catch (error) {
        console.warn('计算距离时出错:', error);
        return 1;
      }
    },

    // 生成均匀的球体排布位置
    generateAppleWatchLayout() {
      const positions = [];
      const velocities = [];
      const itemCount = this.currentPlaylist.length;
      
      // 获取容器实际尺寸
      const container = this.$el.querySelector('.apple-watch-layout');
      if (container) {
        this.containerWidth = container.clientWidth;
        this.containerHeight = container.clientHeight;
      }
      
      const centerX = this.containerWidth / 2;
      const centerY = this.containerHeight / 2;
      const baseSize = 80; // 基础球体大小
      
      // 使用螺旋算法生成均匀分布的点
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 黄金角度
      const maxRadius = Math.min(this.containerWidth, this.containerHeight) * 0.4;
      
      for (let i = 0; i < itemCount; i++) {
        // 螺旋分布算法
        const angle = i * goldenAngle;
        const radius = Math.sqrt(i / itemCount) * maxRadius;
        
        let x = centerX + Math.cos(angle) * radius;
        let y = centerY + Math.sin(angle) * radius;
        
        // 根据位置调整大小（中心稍大，边缘稍小）
        const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const sizeFactor = 1 - (distanceFromCenter / maxRadius) * 0.3;
        const size = baseSize * (0.8 + sizeFactor * 0.4);
        
        // 确保球体在容器内
        x = Math.max(size/2 + 10, Math.min(this.containerWidth - size/2 - 10, x));
        y = Math.max(size/2 + 10, Math.min(this.containerHeight - size/2 - 10, y));
        
        positions.push({
          x: x,
          y: y,
          size: size,
          targetX: x,
          targetY: y
        });
        
        velocities.push({
          x: 0,
          y: 0
        });
      }
      
      this.gridItemPositions = positions;
      this.gridItemVelocities = velocities;
      this.gridItemOriginalPositions = JSON.parse(JSON.stringify(positions));
      this.gridItemHoverStates = new Array(itemCount).fill(false);
      
      // 开始物理模拟
      this.startPhysicsSimulation();
    },

    // 开始物理模拟
    startPhysicsSimulation() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animatePhysics();
    },

    // 停止物理模拟
    stopPhysicsSimulation() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    },

    // 物理模拟动画
    animatePhysics() {
      if (!this.isGridView) return;
      
      this.updatePhysics();
      this.animationFrameId = requestAnimationFrame(() => this.animatePhysics());
    },

    // 更新物理状态 - 简化版，只处理碰撞
    updatePhysics() {
      const damping = 0.85; // 阻尼系数
      const collisionForce = 0.8; // 碰撞力强度
      const maxVelocity = 2.0; // 最大速度
      const minVelocity = 0.01; // 最小速度阈值
      
      for (let i = 0; i < this.gridItemPositions.length; i++) {
        const item = this.gridItemPositions[i];
        const velocity = this.gridItemVelocities[i];
        
        // 只处理球体之间的碰撞
        for (let j = i + 1; j < this.gridItemPositions.length; j++) {
          const other = this.gridItemPositions[j];
          const dx = other.x - item.x;
          const dy = other.y - item.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 计算最小距离 - 考虑hover状态的大小变化
          const itemSize = this.gridItemHoverStates[i] ? item.size * 1.2 : item.size;
          const otherSize = this.gridItemHoverStates[j] ? other.size * 1.2 : other.size;
          const minDistance = (itemSize + otherSize) / 2 + 10;
          
          if (distance < minDistance && distance > 0.1) {
            const overlap = minDistance - distance;
            const overlapRatio = Math.min(overlap / minDistance, 1);
            
            const angle = Math.atan2(dy, dx);
            const force = overlapRatio * collisionForce;
            const separationX = Math.cos(angle) * force;
            const separationY = Math.sin(angle) * force;
            
            // 应用力到两个球体
            velocity.x -= separationX;
            velocity.y -= separationY;
            this.gridItemVelocities[j].x += separationX;
            this.gridItemVelocities[j].y += separationY;
            
            // 直接位置修正 - 防止球体重叠
            if (overlap > 1) {
              const correctionFactor = overlap * 0.5;
              const correctionX = Math.cos(angle) * correctionFactor;
              const correctionY = Math.sin(angle) * correctionFactor;
              
              item.x -= correctionX;
              item.y -= correctionY;
              other.x += correctionX;
              other.y += correctionY;
            }
          }
        }
        
        // 速度限制
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (currentSpeed > maxVelocity) {
          const speedRatio = maxVelocity / currentSpeed;
          velocity.x *= speedRatio;
          velocity.y *= speedRatio;
        }
        
        // 应用阻尼
        velocity.x *= damping;
        velocity.y *= damping;
        
        // 速度阈值处理 - 快速停止
        if (Math.abs(velocity.x) < minVelocity) velocity.x = 0;
        if (Math.abs(velocity.y) < minVelocity) velocity.y = 0;
        
        // 更新位置
        item.x += velocity.x;
        item.y += velocity.y;
        
        // 简单边界检测
        const margin = item.size / 2 + 5;
        item.x = Math.max(margin, Math.min(this.containerWidth - margin, item.x));
        item.y = Math.max(margin, Math.min(this.containerHeight - margin, item.y));
      }
    },

    // 获取网格项的样式
    getGridItemStyle(index) {
      if (!this.isGridView || !this.gridItemPositions[index]) {
        return {};
      }
      
      const position = this.gridItemPositions[index];
      const isHovered = this.gridItemHoverStates[index];
      
      // hover时变大，否则保持原始大小
      const scale = isHovered ? 1.2 : 1.0;
      
      return {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.size}px`,
        height: `${position.size}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        zIndex: Math.floor(scale * 10),
        transition: 'transform 0.2s ease' // 添加平滑过渡
      };
    },

    // 获取信息卡片的样式
    getInfoCardStyle(index) {
      if (!this.isGridView || !this.gridItemRefs[index]) {
        return { display: 'none' };
      }
      
      const element = this.gridItemRefs[index];
      if (!element) return { display: 'none' };
      
      const rect = element.getBoundingClientRect();
      const cardWidth = 200;
      const cardHeight = 120; // 预估高度
      const margin = 10;
      
      // 计算最佳位置
      let left = rect.left + rect.width / 2 - cardWidth / 2;
      let top = rect.bottom + margin;
      
      // 检查是否超出右边界
      if (left + cardWidth > window.innerWidth - margin) {
        left = window.innerWidth - cardWidth - margin;
      }
      
      // 检查是否超出左边界
      if (left < margin) {
        left = margin;
      }
      
      // 检查是否超出底部边界，如果超出则显示在上方
      if (top + cardHeight > window.innerHeight - margin) {
        top = rect.top - cardHeight - margin;
      }
      
      // 检查是否超出顶部边界
      if (top < margin) {
        top = margin;
      }
      
      return {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${cardWidth}px`
      };
    },

    // 处理球体hover事件
    handleBallHover(index, isHovering) {
      if (this.gridItemHoverStates[index] !== isHovering) {
        this.gridItemHoverStates[index] = isHovering;
      }
    },
    
    // 提取歌手头像颜色
    async extractArtistAvatarColor(avatarUrl, artistId) {
      try {
        // 使用已有的音乐颜色提取器
        const color = await this.musicColorExtractor.extractPrimaryColor(avatarUrl, `artist_${artistId}`);
        
        if (this.artistDetail) {
          this.artistDetail.extractedColor = color;
          
          // 应用颜色到歌手名称
          this.applyArtistNameColor(color);
        }
      } catch (error) {
        // 颜色提取失败，使用默认样式
      }
    },
    
    // 应用歌手名称颜色
    applyArtistNameColor(color) {
      if (!color || !this.artistDetail) return;
      
      // 查找歌手名称元素
      const artistNameElement = document.querySelector('.artist-details .artist-name');
      if (artistNameElement) {
        // 创建渐变色
        const lightColor = this.lightenColor(color, 0.2);
        const gradientCSS = `linear-gradient(135deg, ${color} 0%, ${lightColor} 100%)`;
        
        // 应用渐变样式
        artistNameElement.style.background = gradientCSS;
        artistNameElement.style.webkitBackgroundClip = 'text';
        artistNameElement.style.webkitTextFillColor = 'transparent';
        artistNameElement.style.backgroundClip = 'text';
        artistNameElement.style.color = 'transparent';
      }
    },
    
    // 颜色变亮方法
    lightenColor(color, amount) {
      const hex = color.replace('#', '');
      const num = parseInt(hex, 16);
      const r = Math.min(255, ((num >> 16) & 0xff) + Math.floor(255 * amount));
      const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * amount));
      const b = Math.min(255, (num & 0xff) + Math.floor(255 * amount));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    },
    
    // 处理歌手点击事件（当只有歌手名称时）
    handleArtistClick(song) {
      if (!song) return;
      
      // 尝试从歌曲中提取歌手信息
      if (song.ar && Array.isArray(song.ar) && song.ar.length > 0) {
        this.getArtistDetail(song.ar[0].id);
      } else if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
        this.getArtistDetail(song.artists[0].id);
      } else {
        // 如果没有歌手ID，尝试搜索歌手
        this.searchArtistByName(song.artist || '未知艺术家');
      }
    },
    
    // 通过歌手名称搜索歌手
    async searchArtistByName(artistName) {
      if (!artistName || artistName === '未知艺术家') {
        this.showNotification('无法识别歌手信息', 'warning');
        return;
      }
      
      try {
        this.isSearching = true;
        const url = `${this.currentApiUrl}/cloudsearch?keywords=${encodeURIComponent(artistName)}&type=100&limit=10${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
      const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.result && data.result.artists && data.result.artists.length > 0) {
            // 取第一个匹配的歌手
            const artist = data.result.artists[0];
            this.getArtistDetail(artist.id);
          } else {
            this.showNotification(`未找到歌手: ${artistName}`, 'warning');
          }
        } else {
          this.showNotification('搜索歌手失败', 'danger');
        }
      } catch (error) {
        console.error('搜索歌手失败:', error);
        this.showNotification('搜索歌手失败', 'danger');
      } finally {
        this.isSearching = false;
      }
    },
    
    // 随机播放下一首
    playRandomNext() {
      if (this.playlist.length === 0) return;
      
      // 获取未播放过的歌曲索引
      const unplayedIndices = [];
      for (let i = 0; i < this.playlist.length; i++) {
        if (!this.randomPlayHistory.includes(i)) {
          unplayedIndices.push(i);
        }
      }
      
      if (unplayedIndices.length === 0) {
        // 所有歌曲都已播放过，重置历史记录
        this.randomPlayHistory = [];
        // 重新获取未播放的歌曲索引
        for (let i = 0; i < this.playlist.length; i++) {
          unplayedIndices.push(i);
        }
      }
      
      // 随机选择一首未播放的歌曲
      const randomIndex = Math.floor(Math.random() * unplayedIndices.length);
      const nextSongIndex = unplayedIndices[randomIndex];
      
      // 记录已播放的歌曲
      this.randomPlayHistory.push(nextSongIndex);
      
      // 播放选中的歌曲
      this.selectSongFromPlaylist(nextSongIndex);
    },
    
    // 切换播放模式
    togglePlayMode() {
      const currentIndex = this.playModes.findIndex(mode => mode.value === this.playMode);
      const nextIndex = (currentIndex + 1) % this.playModes.length;
      this.playMode = this.playModes[nextIndex].value;
      
      // 重置随机播放历史（当切换到随机模式时）
      if (this.playMode === 'random') {
        this.randomPlayHistory = [];
        // 如果当前有歌曲在播放，将其加入历史记录
        if (this.currentSong) {
          const currentIndex = this.playlist.findIndex(song => song.id === this.currentSong.id);
          if (currentIndex !== -1) {
            this.randomPlayHistory.push(currentIndex);
          }
        }
      }
      
      // 保存播放模式到localStorage
      this.savePlayMode();
      
      // 显示当前播放模式提示（在控件上显示）
      this.showPlayModeTooltip();
    },
    
    // 获取当前播放模式标签
    getCurrentPlayModeLabel() {
      const currentMode = this.playModes.find(mode => mode.value === this.playMode);
      return currentMode ? currentMode.label : '未知';
    },
    
    // 获取当前播放模式图标
    getCurrentPlayModeIcon() {
      const currentMode = this.playModes.find(mode => mode.value === this.playMode);
      return currentMode ? currentMode.icon : '';
    },
    
    // 保存播放模式到localStorage
    savePlayMode() {
      try {
        localStorage.setItem('musicPlayerPlayMode', this.playMode);
      } catch (error) {
        console.error('保存播放模式失败:', error);
      }
    },
    
    // 从localStorage加载播放模式
    loadPlayMode() {
      try {
        const savedMode = localStorage.getItem('musicPlayerPlayMode');
        if (savedMode && this.playModes.find(mode => mode.value === savedMode)) {
          this.playMode = savedMode;
        }
      } catch (error) {
        console.error('加载播放模式失败:', error);
      }
    },
    
    // 显示播放模式提示
    showPlayModeTooltip() {
      // 清除之前的定时器
      if (this.playModeTooltipTimer) {
        clearTimeout(this.playModeTooltipTimer);
      }
      
      // 显示提示
      this.showPlayModeTooltipVisible = true;
      
      // 2秒后自动隐藏
      this.playModeTooltipTimer = setTimeout(() => {
        this.showPlayModeTooltipVisible = false;
      }, 2000);
    },
    
    // 登录相关方法
    openLoginModal() {
      this.showLoginModal = true;
      this.showUserDropdown = false;
    },
    
    hideLoginModal() {
      this.showLoginModal = false;
    },
    
    handleUserContainerClick() {
      if (this.isLoggedIn) {
        // 只切换用户菜单显示状态
        this.showUserDropdown = !this.showUserDropdown;
      } else {
        this.openLoginModal();
      }
    },
    
    // 处理登录成功
    handleLoginSuccess(data) {
      console.log('handleLoginSuccess: 处理登录成功', data);
      this.loginCookie = data.cookie;
      this.isLoggedIn = true;
      this.showNotification('登录成功！', 'success');
      // 立即获取用户信息
      this.getUserInfo();
    },
    
    // 处理用户信息更新
    handleUserInfoUpdated(userInfo) {
      console.log('handleUserInfoUpdated: 收到用户信息更新', userInfo);
      this.userInfo = userInfo;
      // 获取用户等级信息
      this.getUserLevel();
      // 加载主页数据
      this.loadHomePageData();
      // 加载用户喜欢的歌曲列表
      this.loadLikedSongs();
    },
    
    // 获取用户等级信息
    async getUserLevel() {
      if (!this.loginCookie) return;
      
      try {
        const url = `${this.currentApiUrl}/user/level?timestamp=${Date.now()}&cookie=${encodeURIComponent(this.loginCookie)}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            this.userLevel = data.data;
          }
        }
      } catch (error) {
        console.error('获取用户等级失败:', error);
      }
    },
    
    // 刷新用户信息
    async refreshUserInfo() {
      if (!this.loginCookie) return;
      
      // 关闭用户菜单
      this.showUserDropdown = false;
      
      try {
        const url = `${this.currentApiUrl}/user/account?timestamp=${Date.now()}&cookie=${encodeURIComponent(this.loginCookie)}`;
        console.log('refreshUserInfo: 强制从服务器刷新用户信息');
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.profile) {
            this.userInfo = data.profile;
            // 更新用户信息缓存
            try {
              localStorage.setItem('musicUserInfo', JSON.stringify(data.profile));
              console.log('refreshUserInfo: 用户信息缓存已更新');
            } catch (error) {
              console.error('保存用户信息失败:', error);
            }
            
            // 清除主页缓存，以便获取最新的推荐内容
            try {
              localStorage.removeItem('musicUserPlaylists');
              localStorage.removeItem('musicRecommendPlaylists');
              localStorage.removeItem('musicRecommendSongs');
              localStorage.removeItem('musicHomePageCacheTime');
              console.log('refreshUserInfo: 主页缓存已清除');
            } catch (error) {
              console.error('清除主页缓存失败:', error);
            }
            
            // 重新加载主页数据
            await this.loadHomePageData();
            
            this.showNotification('用户信息已刷新', 'success');
          }
        } else {
          this.showNotification('刷新用户信息失败', 'danger');
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error);
        this.showNotification('刷新用户信息失败', 'danger');
      }
    },
    
    // 显示登出确认
    showLogoutConfirm() {
      this.showLogoutConfirmModal = true;
    },
    
    // 关闭登出确认
    closeLogoutConfirm() {
      this.showLogoutConfirmModal = false;
    },
    
    // 确认登出
    async confirmLogout() {
      this.closeLogoutConfirm();
      await this.logout();
    },

    // 退出登录
    async logout() {
      console.log('logout: 开始退出登录流程');
      try {
        // 调用退出登录API
        if (this.loginCookie) {
          const url = `${this.currentApiUrl}/logout?timestamp=${Date.now()}&cookie=${encodeURIComponent(this.loginCookie)}`;
          await fetch(url);
          console.log('logout: 退出登录API调用成功');
        }
      } catch (error) {
        console.error('调用退出登录API失败:', error);
      }
      
      try {
        // 清除本地存储
        localStorage.removeItem('musicLoginCookie');
        localStorage.removeItem('musicLoginTime');
        localStorage.removeItem('musicUserInfo');
        localStorage.removeItem('musicUserPlaylists');
        localStorage.removeItem('musicRecommendPlaylists');
        localStorage.removeItem('musicRecommendSongs');
        localStorage.removeItem('musicHomePageCacheTime');
        localStorage.removeItem('musicLikedSongs');
        console.log('logout: 已清除所有本地缓存');
      } catch (error) {
        console.error('清除本地存储失败:', error);
      }
      
      // 重置状态
      this.isLoggedIn = false;
      this.userInfo = null;
      this.userLevel = null;
      this.loginCookie = '';
      this.showUserDropdown = false;
      this.userPlaylists = [];
      this.recommendPlaylists = [];
      this.recommendSongs = [];
      this.likedSongs = new Set();
      
      console.log('logout: 用户状态已重置');
      this.showNotification('已退出登录', 'info');
    },
    
    // 检查登录状态
    checkLoginStatus() {
      try {
        const cookie = localStorage.getItem('musicLoginCookie');
        const loginTime = localStorage.getItem('musicLoginTime');
        const userInfo = localStorage.getItem('musicUserInfo');
        
        if (cookie && loginTime) {
          // 检查登录是否过期（30天）
          const currentTime = Date.now();
          const loginTimestamp = parseInt(loginTime, 10);
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          
          if (currentTime - loginTimestamp < thirtyDaysInMs) {
            // 登录未过期，恢复登录状态并获取用户信息
            this.loginCookie = cookie;
            this.isLoggedIn = true;
            
            // 如果有缓存的用户信息，先使用缓存
            if (userInfo) {
              try {
                this.userInfo = JSON.parse(userInfo);
                this.getUserLevel();
              } catch (error) {
                console.error('解析用户信息失败:', error);
              }
            }
            
            // 无论是否有缓存，都重新获取最新的用户信息
            this.getUserInfo();
            // 加载主页数据
            this.loadHomePageData();
            // 加载用户喜欢的歌曲列表
            this.loadLikedSongs();
          } else {
            // 登录已过期，清除信息
            this.logout();
          }
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      }
    },

    // 获取用户信息
    async getUserInfo() {
      if (!this.loginCookie) {
        console.log('getUserInfo: 无登录cookie，跳过获取用户信息');
        return;
      }
      
      // 先检查localStorage中是否有用户信息
      try {
        const cachedUserInfo = localStorage.getItem('musicUserInfo');
        if (cachedUserInfo) {
          const userInfo = JSON.parse(cachedUserInfo);
          console.log('getUserInfo: 从localStorage获取缓存的用户信息', userInfo);
          this.userInfo = userInfo;
          // 获取用户等级信息
          this.getUserLevel();
          // 通知父组件用户信息已更新
          this.$emit('user-info-updated', userInfo);
          return;
        }
      } catch (error) {
        console.error('getUserInfo: 读取缓存的用户信息失败', error);
      }
      
      // 没有缓存或缓存无效，从服务器获取
      try {
        // 使用完整API URL，避免代理
        const url = `${this.currentApiUrl}/user/account?timestamp=${Date.now()}&cookie=${encodeURIComponent(this.loginCookie)}`;
        console.log('getUserInfo: 从服务器获取用户信息，URL:', url);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('getUserInfo: 服务器获取用户信息成功', data);
          if (data.code === 200 && data.profile) {
            this.userInfo = data.profile;
            console.log('getUserInfo: 用户信息已更新', this.userInfo);
            // 保存用户信息到localStorage
            try {
              localStorage.setItem('musicUserInfo', JSON.stringify(data.profile));
              console.log('getUserInfo: 用户信息已保存到localStorage');
            } catch (error) {
              console.error('保存用户信息失败:', error);
            }
            // 获取用户等级信息
            this.getUserLevel();
            // 通知父组件用户信息已更新
            this.$emit('user-info-updated', data.profile);
          } else {
            console.warn('getUserInfo: 返回数据异常', data);
          }
        } else {
          console.error('getUserInfo: HTTP错误', response.status, response.statusText);
        }
      } catch (error) {
        console.error('getUserInfo: 获取用户信息失败:', error);
      }
    },

    // 跳转到主页
    goToHomePage() {
      try {
        this.showSearchResults = false;
        this.searchQuery = '';
        this.loadHomePageData();
      } catch (error) {
        console.error('goToHomePage: 错误', error);
        this.showNotification('返回主页失败', 'error');
      }
    },

    // 加载主页数据
    async loadHomePageData() {
      if (!this.isLoggedIn) {
        console.log('loadHomePageData: 未登录，跳过加载主页数据');
        return;
      }
      
      const currentTime = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000; // 24小时缓存
      
      // 每次打开都加载用户歌单
      await this.loadUserPlaylists();
      
      // 检查推荐歌单缓存（每日刷新）
      const recommendPlaylistsCacheTime = localStorage.getItem('musicRecommendPlaylistsCacheTime');
      const hasValidPlaylistCache = recommendPlaylistsCacheTime && (currentTime - parseInt(recommendPlaylistsCacheTime, 10) < oneDayInMs);
      
      if (hasValidPlaylistCache) {
        try {
          const cachedRecommendPlaylists = localStorage.getItem('musicRecommendPlaylists');
          if (cachedRecommendPlaylists) {
            this.recommendPlaylists = JSON.parse(cachedRecommendPlaylists);
            console.log('loadHomePageData: 使用推荐歌单缓存数据');
          } else {
            // 缓存时间存在但数据不存在，重新加载
            await this.loadRecommendPlaylists();
          }
        } catch (error) {
          console.error('loadHomePageData: 读取推荐歌单缓存失败', error);
          // 缓存读取失败，重新加载
          await this.loadRecommendPlaylists();
        }
      } else {
        // 缓存过期或不存在，重新加载推荐歌单
        console.log('loadHomePageData: 推荐歌单缓存不存在或已过期，重新加载');
        await this.loadRecommendPlaylists();
      }
      
      // 检查推荐歌曲缓存（每日刷新）
      const recommendSongsCacheTime = localStorage.getItem('musicRecommendSongsCacheTime');
      const hasValidSongCache = recommendSongsCacheTime && (currentTime - parseInt(recommendSongsCacheTime, 10) < oneDayInMs);
      
      if (hasValidSongCache) {
        try {
          const cachedRecommendSongs = localStorage.getItem('musicRecommendSongs');
          if (cachedRecommendSongs) {
            this.recommendSongs = JSON.parse(cachedRecommendSongs);
            console.log('loadHomePageData: 使用推荐歌曲缓存数据');
          } else {
            // 缓存时间存在但数据不存在，重新加载
            await this.loadRecommendSongs();
          }
        } catch (error) {
          console.error('loadHomePageData: 读取推荐歌曲缓存失败', error);
          // 缓存读取失败，重新加载
          await this.loadRecommendSongs();
        }
      } else {
        // 缓存过期或不存在，重新加载推荐歌曲
        console.log('loadHomePageData: 推荐歌曲缓存不存在或已过期，重新加载');
        await this.loadRecommendSongs();
      }
      
      console.log('loadHomePageData: 主页数据加载完成');
    },

    

    // 加载用户歌单
    async loadUserPlaylists() {
      if (!this.userInfo || !this.userInfo.userId) {
        console.log('loadUserPlaylists: 无用户ID，跳过加载');
        return;
      }
      
      this.isLoadingUserPlaylists = true;
      try {
        const url = `${this.currentApiUrl}/user/playlist?uid=${this.userInfo.userId}&timestamp=${Date.now()}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.playlist) {
            this.userPlaylists = data.playlist.map(playlist => ({
              id: playlist.id,
              name: playlist.name,
              description: playlist.description || '',
              coverImgUrl: playlist.coverImgUrl,
              playCount: playlist.playCount || 0,
              trackCount: playlist.trackCount || 0,
              creator: playlist.creator ? playlist.creator.nickname : '未知创建者',
              creatorId: playlist.creator ? playlist.creator.userId : null
            }));
            console.log('loadUserPlaylists: 已加载', this.userPlaylists.length, '个歌单');
          }
        }
      } catch (error) {
        console.error('loadUserPlaylists: 加载失败', error);
      } finally {
        this.isLoadingUserPlaylists = false;
      }
    },

    // 加载推荐歌单
    async loadRecommendPlaylists() {
      this.isLoadingRecommendPlaylists = true;
      try {
        const url = `${this.currentApiUrl}/personalized?limit=10&timestamp=${Date.now()}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.result) {
            this.recommendPlaylists = data.result.map(playlist => ({
              id: playlist.id,
              name: playlist.name,
              description: playlist.description || '',
              picUrl: playlist.picUrl,
              playCount: playlist.playCount || 0,
              trackCount: playlist.trackCount || 0,
              creator: playlist.creator ? playlist.creator.nickname : '未知创建者',
              creatorId: playlist.creator ? playlist.creator.userId : null
            }));
            
            // 保存到缓存，记录当前时间戳
            try {
              localStorage.setItem('musicRecommendPlaylists', JSON.stringify(this.recommendPlaylists));
              localStorage.setItem('musicRecommendPlaylistsCacheTime', Date.now().toString());
              console.log('loadRecommendPlaylists: 推荐歌单已缓存');
            } catch (error) {
              console.error('loadRecommendPlaylists: 保存缓存失败', error);
            }
            
            console.log('loadRecommendPlaylists: 已加载', this.recommendPlaylists.length, '个推荐歌单');
          }
        }
      } catch (error) {
        console.error('loadRecommendPlaylists: 加载失败', error);
      } finally {
        this.isLoadingRecommendPlaylists = false;
      }
    },

    // 加载推荐歌曲
    async loadRecommendSongs() {
      this.isLoadingRecommendSongs = true;
      try {
        const url = `${this.currentApiUrl}/recommend/songs?timestamp=${Date.now()}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        console.log('loadRecommendSongs: 请求URL', url);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('loadRecommendSongs: API返回数据', data);
          
          if (data.code === 200 && data.data && data.data.dailySongs) {
            this.recommendSongs = data.data.dailySongs.map(song => ({
              id: song.id,
              name: song.name,
              artist: song.ar ? song.ar.map(a => a.name).join(', ') : '未知艺术家',
              album: song.al,
              duration: song.dt || 0,
              picUrl: song.al ? song.al.picUrl : null,
              ar: song.ar || [],
              al: song.al || {}
            }));
            
            // 保存到缓存，记录当前时间戳
            try {
              localStorage.setItem('musicRecommendSongs', JSON.stringify(this.recommendSongs));
              localStorage.setItem('musicRecommendSongsCacheTime', Date.now().toString());
              console.log('loadRecommendSongs: 推荐歌曲已缓存');
            } catch (error) {
              console.error('loadRecommendSongs: 保存缓存失败', error);
            }
            
            console.log('loadRecommendSongs: 已加载', this.recommendSongs.length, '首推荐歌曲');
            console.log('loadRecommendSongs: 推荐歌曲数据示例', this.recommendSongs[0]);
          } else {
            console.error('loadRecommendSongs: 数据格式不正确', data);
          }
        } else {
          console.error('loadRecommendSongs: HTTP错误', response.status, response.statusText);
        }
      } catch (error) {
        console.error('loadRecommendSongs: 加载失败', error);
      } finally {
        this.isLoadingRecommendSongs = false;
      }
    },

    // 播放/暂停（用于底部播放控件）
    togglePlay() {
      this.togglePlayPause();
    },
    
    // 上一首（用于底部播放控件）
    previousSong() {
      this.skipPrevious();
    },
    
    // 下一首（用于底部播放控件）
    nextSong() {
      this.skipNext();
    },
    
    // 进度条跳转（用于底部播放控件和沉浸式播放器）
    seekTo(event) {
      if (!this.audio || !this.duration) return;
      
      // 阻止触摸事件的默认行为（防止页面滚动）
      if (event.type.includes('touch')) {
        event.preventDefault();
      }
      
      const progressBar = event.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      
      // 处理触摸事件和鼠标事件
      let clientX;
      if (event.type.includes('touch')) {
        clientX = event.touches[0].clientX;
      } else {
        clientX = event.clientX;
      }
      
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = percentage * this.duration;
      
      this.audio.currentTime = targetTime;
    },
    
    // 播放推荐歌曲（临时播放）
    playRecommendSong(song) {
      // 创建临时播放列表，只包含当前歌曲
      const tempPlaylist = [song];
      this.playTemporarily(tempPlaylist, 0);
    },

    // 打开歌单
    openPlaylist(playlist) {
      try {
        this.showPlaylistDetail = true;
        this.playlistDetail = playlist;
        this.getPlaylistDetail(playlist.id);
      } catch (error) {
        console.error('openPlaylist: 错误', error);
        this.showNotification('打开歌单失败', 'error');
      }
    },

    // 高亮当前播放歌曲
    highlightCurrentSong(element) {
      // 添加临时高亮类
      element.classList.add('current-song-highlight');
      
      // 2秒后移除高亮
      setTimeout(() => {
        element.classList.remove('current-song-highlight');
      }, 2000);
    },

    // 从播放列表中选择歌曲播放
    selectSongFromPlaylist(index) {
      // 确保当前播放列表始终是播放列表
      this.currentPlaylist = [...this.playlist];
      // 不切换界面，保持当前视图状态
      this.selectSong(index);
      this.showPlaylistMenu = false;
    },

    // 处理音频播放错误 - 重写的重试逻辑
    async handleAudioError(errorDetails) {
      if (!this.currentSong) {
        console.warn('没有当前歌曲，跳过错误处理');
        return;
      }
      
      // 显示重试提示
      this.showNotification(`播放出错，正在重试...`, 'warning');
      
      // 获取歌曲ID
      const songId = this.currentSong.id;
      
      // 保存原始播放状态和错误详情
      const wasPlaying = errorDetails.wasPlaying || this.isPlaying;
      this.lastErrorDetails = errorDetails;
      
      // 初始化重试状态
      if (!this.retryState) {
        this.retryState = new Map();
      }
      
      // 获取或创建重试状态
      let state = this.retryState.get(songId);
      if (!state) {
        state = {
          count: 0,
          maxRetries: 3,
          isRetrying: false,
          lastError: null,
          retryTimeout: null
        };
        this.retryState.set(songId, state);
      }
      
      // 如果正在重试，避免重复触发
      if (state.isRetrying) {
        return;
      }
      
      // 增加重试计数
      state.count++;
      state.lastError = errorDetails;
      state.isRetrying = true;
      
      try {
        if (state.count <= state.maxRetries) {
          // 计算延迟时间（指数退避）
          const delay = Math.min(1000 * Math.pow(2, state.count - 1), 5000);
          console.log(`等待 ${delay}ms 后重试`);
          
          // 等待延迟
          await new Promise(resolve => {
            state.retryTimeout = setTimeout(resolve, delay);
          });
          
          // 尝试重新播放
          const success = await this.retryPlaySong();
          
          if (success) {
            // 重试成功，清除重试状态
            console.log('重试成功，清除重试状态');
            this.retryState.delete(songId);
            this.showNotification('播放已恢复', 'success');
          } else {
            // 重试失败，继续重试或跳过
            if (state.count >= state.maxRetries) {
              console.log('重试次数已达上限，跳过歌曲');
              this.skipToNextSong();
            } else {
              // 继续重试
              state.isRetrying = false;
              // 递归调用继续重试
              setTimeout(() => this.handleAudioError(errorDetails), 100);
            }
          }
        } else {
          // 超过最大重试次数
          console.log('超过最大重试次数，跳过歌曲');
          this.skipToNextSong();
        }
      } catch (error) {
        console.error('重试过程中发生错误:', error);
        // 发生异常，跳过歌曲
        this.skipToNextSong();
      } finally {
        // 清理状态
        if (state.retryTimeout) {
          clearTimeout(state.retryTimeout);
          state.retryTimeout = null;
        }
        state.isRetrying = false;
      }
    },

    // 重试播放歌曲
    async retryPlaySong() {
      if (!this.currentSong) {
        return false;
      }
      
      try {
        // 使用保存的播放状态（如果isPlaying已经被修改为false，使用errorDetails中的状态）
        const wasPlaying = this.isPlaying || this.lastErrorDetails?.wasPlaying || false;
        const currentTime = this.audio.currentTime;
        
        // 获取新的播放URL
        const newUrl = await this.getFreshSongUrl();
        
        if (!newUrl) {
          console.error('无法获取新的播放URL');
          return false;
        }
        
        // 更新音频源
        this.audio.src = newUrl;
        this.audio.load();
        
        // 等待音频可以播放
        await this.waitForAudioCanPlay();
        
        // 如果之前在播放，恢复播放
        if (wasPlaying) {
          // 恢复播放位置
          this.audio.currentTime = currentTime;
          
          // 尝试播放
          await this.audio.play();
        }
        
        return true;
      } catch (error) {
        console.error('重试播放失败:', error);
        return false;
      }
    },

    // 等待音频可以播放
    waitForAudioCanPlay() {
      return new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
          this.audio.removeEventListener('canplay', onCanPlay);
          this.audio.removeEventListener('error', onError);
          reject(new Error('等待音频加载超时'));
        }, 10000);
        
        const onCanPlay = () => {
          clearTimeout(timeout);
          this.audio.removeEventListener('canplay', onCanPlay);
          this.audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e) => {
          clearTimeout(timeout);
          this.audio.removeEventListener('canplay', onCanPlay);
          this.audio.removeEventListener('error', onError);
          reject(e);
        };
        
        this.audio.addEventListener('canplay', onCanPlay);
        this.audio.addEventListener('error', onError);
      });
    },

    // 获取新的歌曲URL
    async getFreshSongUrl() {
      if (!this.currentSong) return null;
      
      try {
        // 构建请求选项
        const options = {
          skipCache: true,
          ...(this.loginCookie && {
            fetchOptions: { headers: { 'Cookie': this.loginCookie } }
          })
        };
        
        // 获取歌曲URL
        const songUrls = await this.apiRequestManager.getSongUrls([this.currentSong.id], options);
        
        if (songUrls && songUrls.length > 0 && songUrls[0].url) {
          return songUrls[0].url;
        } else {
          // 使用备用URL
          const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${this.currentSong.id}.mp3`;
          return fallbackUrl;
        }
      } catch (error) {
        console.error('获取歌曲URL失败:', error);
        // 返回备用URL
        const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${this.currentSong.id}.mp3`;
        return fallbackUrl;
      }
    },

    // 跳到下一首歌曲
    skipToNextSong() {
      if (!this.currentSong) return;
      
      const songId = this.currentSong.id;
      console.log(`跳过歌曲: ${this.currentSong.name}`);
      
      // 清除重试状态
      if (this.retryState && this.retryState.has(songId)) {
        this.retryState.delete(songId);
      }
      
      // 显示提示
      this.showNotification(`跳过歌曲: ${this.currentSong.name}`, 'info');
      
      // 播放下一首
      this.playNext();
    },

    // 从播放列表中移除歌曲
    removeFromPlaylist(index) {
      if (index >= 0 && index < this.playlist.length) {
        const removedSong = this.playlist[index];
        this.playlist.splice(index, 1);
        
        // 如果当前播放的歌曲被移除，更新当前播放列表
        if (this.currentSong && this.currentSong.id === removedSong.id) {
          this.currentPlaylist = [...this.playlist];
        }
        
        // 如果当前显示的是播放列表，更新当前播放列表
        if (!this.showSearchResults) {
          this.currentPlaylist = [...this.playlist];
        }
        
        this.showNotification('已从播放列表中移除', 'info');
      }
    },

    // 清空播放列表
    clearPlaylist() {
      if (this.playlist.length === 0) return;
      
      // 保存当前播放状态
      const wasPlaying = this.isPlaying;
      const currentSong = this.currentSong;
      const currentTime = this.currentTime;
      
      // 完全清空播放列表
      this.playlist = [];
      
      // 如果当前显示的是播放列表，更新当前播放列表
      if (!this.showSearchResults) {
        this.currentPlaylist = [];
      }
      
      // 如果有正在播放的歌曲，保持播放状态但不将其加入播放列表
      if (currentSong) {
        // 保持当前歌曲和播放状态不变
        this.currentSong = currentSong;
        this.isPlaying = wasPlaying;
        this.currentTime = currentTime;
        this.showNotification('播放列表已清空，当前歌曲继续播放', 'info');
      } else {
        this.showNotification('播放列表已清空', 'info');
      }
    },

    // 显示音乐播放器专属通知
    showNotification(message, type = 'info') {
      // 检查是否启用了音乐播放器通知
      if (!this.settings.enableMusicPlayerNotifications) {
        return;
      }
      
      // 清除之前的定时器
      if (this.notification.timer) {
        clearTimeout(this.notification.timer);
      }
      
      // 设置通知内容
      this.notification.message = message;
      this.notification.type = type;
      this.notification.show = true;
      
      // 计算通知位置
      this.updateNotificationPosition();
      
      // 设置自动消失定时器
      this.notification.timer = setTimeout(() => {
        this.notification.show = false;
      }, 3000);
    },

    // ========== 收藏和歌单管理功能 ==========

    // 获取用户喜欢的歌曲列表
    async loadLikedSongs() {
      if (!this.isLoggedIn) {
        console.log('loadLikedSongs: 用户未登录');
        this.likedSongs = new Set();
        return;
      }

      this.isLoadingLikedSongs = true;
      try {
        const url = `${this.currentApiUrl}/likelist?uid=${this.userInfo.userId}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            // 确保likedSongs是一个Set
            this.likedSongs = new Set(data.ids || []);
            console.log('loadLikedSongs: 已加载', this.likedSongs.size, '首喜欢的歌曲');
          }
        }
      } catch (error) {
        console.error('loadLikedSongs: 加载失败', error);
        // 加载失败时确保likedSongs为空Set
        this.likedSongs = new Set();
      } finally {
        this.isLoadingLikedSongs = false;
      }
    },

    

    // 处理收藏按钮点击
    handleLikeButtonClick(song) {
      console.log('=== 收藏按钮被点击 ===');
      console.log('歌曲信息:', song);
      
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }
      
      if (!song || !song.id) {
        this.showNotification('无效的歌曲信息', 'error');
        return;
      }
      
      // 确保likedSongs是Set
      if (!(this.likedSongs instanceof Set)) {
        this.likedSongs = new Set(this.likedSongs);
      }
      
      const isLiked = this.likedSongs.has(song.id);
      const likeAction = isLiked ? 'unlike' : 'like';
      
      console.log(`准备${likeAction}歌曲: ${song.name} (ID: ${song.id})`);
      
      // 构建请求URL
      const likeParam = isLiked ? 0 : 1;
      const url = `${this.currentApiUrl}/like?id=${song.id}&like=${likeParam}&cookie=${encodeURIComponent(this.loginCookie)}`;
      
      console.log('请求URL:', url);
      
      // 发送请求
      fetch(url)
        .then(response => {
          console.log('响应状态:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('响应数据:', data);
          
          if (data.code === 200) {
            // 更新本地状态
            if (isLiked) {
              this.likedSongs.delete(song.id);
              this.showNotification(`已取消收藏《${song.name}》`, 'info');
            } else {
              this.likedSongs.add(song.id);
              this.showNotification(`已收藏《${song.name}》`, 'success');
            }
            console.log('收藏状态更新成功');
          } else {
            console.error('API返回错误:', data);
            this.showNotification(data.message || '操作失败', 'error');
          }
        })
        .catch(error => {
          console.error('请求失败:', error);
          this.showNotification('网络错误，请稍后重试', 'error');
        });
    },

    // 打开创建歌单模态框
    openCreatePlaylistModal() {
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }
      
      this.newPlaylistName = '';
      this.newPlaylistDescription = '';
      this.newPlaylistTags = '';
      this.showCreatePlaylistModal = true;
    },

    // 关闭创建歌单模态框
    closeCreatePlaylistModal() {
      this.showCreatePlaylistModal = false;
      this.newPlaylistName = '';
      this.newPlaylistDescription = '';
      this.newPlaylistPrivacy = 'public';
    },

    // 创建新歌单
    async createPlaylist() {
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }

      if (!this.newPlaylistName.trim()) {
        this.showNotification('请输入歌单名称', 'warning');
        return;
      }

      this.isCreatingPlaylist = true;
      try {
        // 构建请求参数
        let url = `${this.currentApiUrl}/playlist/create?name=${encodeURIComponent(this.newPlaylistName)}`;
        
        // 添加描述
        if (this.newPlaylistDescription) {
          url += `&desc=${encodeURIComponent(this.newPlaylistDescription)}`;
        }
        
        // 添加隐私设置
        if (this.newPlaylistPrivacy === 'private') {
          url += '&privacy=10';
        }
        
        // 添加登录cookie
        if (this.loginCookie) {
          url += `&cookie=${encodeURIComponent(this.loginCookie)}`;
        }
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.id) {
            this.showNotification(`歌单"${this.newPlaylistName}"创建成功`, 'success');
            this.closeCreatePlaylistModal();
            // 重新加载用户歌单
            await this.loadUserPlaylists();
          } else {
            this.showNotification(data.message || '创建失败', 'error');
          }
        } else {
          this.showNotification('网络错误，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('createPlaylist: 创建失败', error);
        this.showNotification('创建失败，请稍后重试', 'error');
      } finally {
        this.isCreatingPlaylist = false;
      }
    },

    // 打开编辑歌单模态框
    openEditPlaylistModal(playlist) {
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }

      this.editingPlaylist = { ...playlist };
      this.newPlaylistName = playlist.name;
      this.newPlaylistDescription = playlist.description || '';
      this.newPlaylistTags = '';
      this.showEditPlaylistModal = true;
    },

    // 关闭编辑歌单模态框
    closeEditPlaylistModal() {
      this.showEditPlaylistModal = false;
      this.editingPlaylist = null;
      this.newPlaylistName = '';
      this.newPlaylistDescription = '';
      this.newPlaylistTags = '';
    },

    // 更新歌单信息
    async updatePlaylist() {
      if (!this.isLoggedIn || !this.editingPlaylist) {
        this.showNotification('请先登录', 'warning');
        return;
      }

      if (!this.newPlaylistName.trim()) {
        this.showNotification('请输入歌单名称', 'warning');
        return;
      }

      this.isUpdatingPlaylist = true;
      try {
        const url = `${this.currentApiUrl}/playlist/update?id=${this.editingPlaylist.id}&name=${encodeURIComponent(this.newPlaylistName)}${this.newPlaylistDescription ? '&desc=' + encodeURIComponent(this.newPlaylistDescription) : ''}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            this.showNotification(`歌单"${this.newPlaylistName}"更新成功`, 'success');
            this.closeEditPlaylistModal();
            // 重新加载用户歌单
            await this.loadUserPlaylists();
          } else {
            this.showNotification(data.message || '更新失败', 'error');
          }
        } else {
          this.showNotification('网络错误，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('updatePlaylist: 更新失败', error);
        this.showNotification('更新失败，请稍后重试', 'error');
      } finally {
        this.isUpdatingPlaylist = false;
      }
    },

    // 删除歌单
    async deletePlaylist(playlist) {
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }

      if (!confirm(`确定要删除歌单"${playlist.name}"吗？此操作不可恢复。`)) {
        return;
      }

      try {
        const url = `${this.currentApiUrl}/playlist/delete?id=${playlist.id}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            this.showNotification(`歌单"${playlist.name}"删除成功`, 'success');
            // 重新加载用户歌单
            await this.loadUserPlaylists();
          } else {
            this.showNotification(data.message || '删除失败', 'error');
          }
        } else {
          this.showNotification('网络错误，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('deletePlaylist: 删除失败', error);
        this.showNotification('删除失败，请稍后重试', 'error');
      }
    },

    // 收藏/取消收藏歌单
    async toggleSubscribePlaylist(playlist) {
      if (!this.isLoggedIn) {
        this.showNotification('请先登录', 'warning');
        return;
      }

      if (!playlist || !playlist.id) {
        this.showNotification('无效的歌单信息', 'error');
        return;
      }

      // 检查是否已收藏（通过检查用户歌单中是否有该歌单）
      const isSubscribed = this.userPlaylists.some(p => p.id === playlist.id);
      const subscribeAction = isSubscribed ? 2 : 1; // 1: 收藏, 2: 取消收藏

      try {
        const url = `${this.currentApiUrl}/playlist/subscribe?t=${subscribeAction}&id=${playlist.id}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            if (isSubscribed) {
              this.showNotification(`已取消收藏歌单"${playlist.name}"`, 'info');
            } else {
              this.showNotification(`已收藏歌单"${playlist.name}"`, 'success');
            }
            // 重新加载用户歌单
            await this.loadUserPlaylists();
          } else {
            this.showNotification(data.message || '操作失败', 'error');
          }
        } else {
          this.showNotification('网络错误，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('toggleSubscribePlaylist: 操作失败', error);
        this.showNotification('操作失败，请稍后重试', 'error');
      }
    },

    // 更新通知位置
    updateNotificationPosition() {
      if (this.isMinimized) {
        // 最小化状态下，通知显示在悬浮窗上方
        this.notificationPosition.x = this.miniPlayerPosition.x;
        this.notificationPosition.y = this.miniPlayerPosition.y - 60; // 在悬浮窗上方
      } else {
        // 正常状态下，通知显示在播放器内部右上角
        this.notificationPosition.x = window.innerWidth / 2 - 150; // 居中显示
        this.notificationPosition.y = 100; // 距离顶部100px
      }
    },

    // 拖拽开始
    dragStart(index, event) {
      this.draggedItemIndex = index;
      // 设置拖拽数据
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', index.toString());
    },

    // 拖拽进入
    dragEnter(index) {
      this.draggedOverIndex = index;
    },

    // 拖拽放置
    drop(index, event) {
      event.preventDefault();
      
      if (this.draggedItemIndex !== null && this.draggedItemIndex !== index) {
        // 移动歌曲
        const draggedSong = this.playlist[this.draggedItemIndex];
        this.playlist.splice(this.draggedItemIndex, 1);
        this.playlist.splice(index, 0, draggedSong);
        
        // 更新当前播放列表
        if (!this.showSearchResults) {
          this.currentPlaylist = [...this.playlist];
        }
        
        // 如果当前播放的歌曲被移动，更新播放索引
        if (this.currentSong && this.currentSong.id === draggedSong.id) {
          // 不需要做任何操作，因为歌曲对象已经移动到新位置
        }
      }
      
      this.draggedItemIndex = null;
      this.draggedOverIndex = null;
    },

    // 同步歌单到播放列表
    syncPlaylistToMain(songs) {
      if (!songs || !Array.isArray(songs)) return;
      
      // 深拷贝歌曲列表
      this.playlist = songs.map(song => ({ ...song }));
      this.currentPlaylist = [...this.playlist];
      this.showSearchResults = false;
      
      this.showNotification(`已同步 ${songs.length} 首歌曲到播放列表`, 'success');
    },

    // 临时播放（不更新播放列表）
    playTemporarily(songs, index = 0) {
      if (!songs || !Array.isArray(songs) || index < 0 || index >= songs.length) return;
      
      // 设置当前播放列表为临时列表
      this.currentPlaylist = [...songs];
      // 不切换界面，保持当前视图状态
      // this.showSearchResults = true;
      
      // 播放指定歌曲
      this.selectSong(index);
    },

    // 从搜索结果中临时播放
    playFromSearchResults(song) {
      const index = this.getSongIndex(song, this.currentPlaylist);
      if (index !== -1) {
        this.playTemporarily(this.currentPlaylist, index);
      }
    },

    // 右键菜单相关方法
    showContextMenu(event, type, target) {
      event.preventDefault();
      event.stopPropagation();
      this.hideContextMenu();
      
      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type: type,
        target: target,
        song: type === 'song' ? target : null,
        playlist: type === 'playlist' ? target : null
      };

      // 确保菜单不会超出视窗
      this.$nextTick(() => {
        this.adjustContextMenuPosition();
      });
    },

    hideContextMenu(delay = 0) {
      if (delay > 0) {
        setTimeout(() => {
          this.contextMenu.visible = false;
          this.resetContextMenuData();
        }, delay);
      } else {
        this.contextMenu.visible = false;
        this.resetContextMenuData();
      }
    },

    // 重置右键菜单数据
    resetContextMenuData() {
      this.contextMenu.x = 0;
      this.contextMenu.y = 0;
      this.contextMenu.type = '';
      this.contextMenu.target = null;
      this.contextMenu.song = null;
      this.contextMenu.playlist = null;
    },

    // 打开删除歌单确认弹窗
    showDeletePlaylistConfirm() {
      this.showDeletePlaylistConfirmModal = true;
    },

    // 关闭删除歌单确认弹窗
    closeDeletePlaylistConfirm() {
      this.showDeletePlaylistConfirmModal = false;
      this.playlistToDelete = null;
    },

    // 确认删除歌单
    async confirmDeletePlaylist() {
      if (!this.playlistToDelete) return;
      
      try {
        const url = `${this.currentApiUrl}/playlist/delete?id=${this.playlistToDelete.id}${this.loginCookie ? '&cookie=' + encodeURIComponent(this.loginCookie) : ''}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200) {
            this.showNotification(`歌单"${this.playlistToDelete.name}"已删除`, 'success');
            // 重新加载用户歌单
            await this.loadUserPlaylists();
          } else {
            this.showNotification(data.message || '删除失败', 'error');
          }
        } else {
          this.showNotification('网络错误，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('删除歌单失败:', error);
        this.showNotification('删除失败，请稍后重试', 'error');
      } finally {
        this.closeDeletePlaylistConfirm();
      }
    },

    // 处理键盘事件
    handleKeyDown(event) {
      // ESC键关闭右键菜单
      if (event.key === 'Escape' && this.contextMenu.visible) {
        this.hideContextMenu();
      }
    },

    // 处理鼠标按下事件（使用capture阶段确保优先处理）
    handleMouseDown(event) {
      // 如果右键菜单可见
      if (this.contextMenu.visible) {
        // 检查点击是否在右键菜单内部
        const contextMenuElement = this.$refs.contextMenu;
        if (contextMenuElement) {
          // 使用composedPath获取完整的点击路径，包括shadow DOM
          const path = event.composedPath();
          const clickedInsideMenu = path.includes(contextMenuElement);
          
          // 如果点击在菜单外部，关闭菜单
          if (!clickedInsideMenu) {
            this.hideContextMenu();
          }
        }
      }
    },

    // 处理窗口大小变化
    handleWindowResize() {
      // 如果右键菜单可见，重新调整位置
      if (this.contextMenu.visible) {
        this.adjustContextMenuPosition();
      }
      
      // 如果沉浸式播放器可见，重新加载背景
      if (this.showImmersivePlayer && this.$refs.immersiveCanvas) {
        this.loadImmersiveBackground();
      }
    },

    // 调整右键菜单位置，确保不超出视窗
    adjustContextMenuPosition() {
      if (!this.$refs.contextMenu) return;
      
      const menu = this.$refs.contextMenu;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = this.contextMenu.x;
      let adjustedY = this.contextMenu.y;
      
      // 检查右边界
      if (this.contextMenu.x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 10;
      }
      
      // 检查下边界
      if (this.contextMenu.y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10;
      }
      
      // 检查左边界
      if (adjustedX < 10) {
        adjustedX = 10;
      }
      
      // 检查上边界
      if (adjustedY < 10) {
        adjustedY = 10;
      }
      
      // 更新位置
      this.contextMenu.x = adjustedX;
      this.contextMenu.y = adjustedY;
    },

    // 歌单右键菜单方法
    editPlaylistFromMenu() {
      if (this.contextMenu.playlist) {
        this.openEditPlaylistModal(this.contextMenu.playlist);
        // 延迟关闭菜单，确保操作完成
        this.hideContextMenu(100);
      }
    },

    deletePlaylistFromMenu() {
      if (this.contextMenu.playlist) {
        this.playlistToDelete = this.contextMenu.playlist;
        this.showDeletePlaylistConfirmModal = true;
        this.hideContextMenu();
      }
    },

    // 歌曲右键菜单方法
    toggleLikeSong() {
      if (!this.contextMenu.song || !this.isLoggedIn) {
        this.hideContextMenu();
        return;
      }

      const song = this.contextMenu.song;
      console.log('=== 右键菜单收藏歌曲 ===');
      console.log('歌曲信息:', song);
      
      // 确保likedSongs是Set
      if (!(this.likedSongs instanceof Set)) {
        this.likedSongs = new Set(this.likedSongs);
      }
      
      const isLiked = this.likedSongs.has(song.id);
      const likeParam = isLiked ? 0 : 1;
      
      console.log(`准备${isLiked ? '取消收藏' : '收藏'}歌曲: ${song.name}`);
      
      const url = `${this.currentApiUrl}/like?id=${song.id}&like=${likeParam}&cookie=${encodeURIComponent(this.loginCookie)}`;
      console.log('请求URL:', url);
      
      fetch(url)
        .then(response => {
          console.log('响应状态:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('响应数据:', data);
          
          if (data.code === 200) {
            if (isLiked) {
              this.likedSongs.delete(song.id);
              this.showNotification(`已取消收藏《${song.name}》`, 'info');
            } else {
              this.likedSongs.add(song.id);
              this.showNotification(`已收藏《${song.name}》`, 'success');
            }
          } else {
            this.showNotification(data.message || '操作失败', 'error');
            console.error('收藏/取消收藏失败:', data);
          }
        })
        .catch(error => {
          console.error('收藏/取消收藏歌曲出错:', error);
          this.showNotification('操作失败，请稍后重试', 'error');
        })
        .finally(() => {
          // 延迟关闭菜单，确保操作完成
          this.hideContextMenu(100);
        });
    },

    addSongToCurrentPlaylist() {
      if (this.contextMenu.song) {
        this.addToPlaylist(this.contextMenu.song);
        // 延迟关闭菜单，确保操作完成
        this.hideContextMenu(100);
      }
    },

    addSongToPlaylist(playlist) {
      if (!this.contextMenu.song || !this.isLoggedIn) {
        this.hideContextMenu();
        return;
      }

      this.selectedSongToAdd = this.contextMenu.song;
      this.selectedPlaylistId = playlist.id;
      this.showAddToPlaylistModal = true;
      this.hideContextMenu();
    },

    // 直接添加歌曲到歌单（不打开弹窗）
    async addSongToPlaylistDirectly(playlist) {
      if (!this.contextMenu.song || !this.isLoggedIn || !playlist.id) {
        this.hideContextMenu();
        return;
      }

      const song = this.contextMenu.song;
      const playlistId = playlist.id;
      this.hideContextMenu();

      try {
        const url = `${this.currentApiUrl}/playlist/tracks?op=add&pid=${playlistId}&tracks=${song.id}&cookie=${encodeURIComponent(this.loginCookie)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
          // 更新歌单的歌曲数量
          playlist.trackCount = (playlist.trackCount || 0) + 1;
          
          this.showToast(`《${song.name}》已添加到歌单"${playlist.name}"`, 'success');
        } else {
          console.error('添加到歌单失败:', data);
          this.showToast('添加失败，请重试', 'error');
        }
      } catch (error) {
        console.error('添加到歌单出错:', error);
        this.showToast('添加失败，请重试', 'error');
      }
    },

    

    // 工具方法
    isSongLiked(songOrId) {
      // 确保likedSongs是一个Set
      if (!(this.likedSongs instanceof Set)) {
        this.likedSongs = new Set(this.likedSongs);
      }
      
      // 支持传入song对象或songId
      const songId = typeof songOrId === 'object' ? songOrId.id : songOrId;
      return this.likedSongs.has(songId);
    },

    showToast(message, type = 'success') {
      // 简单的提示实现，可以后续优化
      console.log(`${type}: ${message}`);
          },
      
          // ========== 沉浸式播放器相关方法 ==========
          
          // 初始化沉浸式播放器
          initImmersivePlayer() {
            // 监听当前歌曲变化
            this.$watch('currentSong', (newSong) => {
              if (newSong && this.showImmersivePlayer) {
                // 重置transform值为0
                if (this.$refs.lyricsScroll) {
                  this.$refs.lyricsScroll.style.transform = 'translateY(0px)';
                  this.currentScrollTop = 0;
                }
                
                this.loadImmersiveBackground();
                this.loadLyrics();
              }
            });
            
            // 监听播放时间变化，更新歌词位置
            this.$watch('currentTime', (newTime) => {
              if (this.showImmersivePlayer && this.lyrics.length > 0) {
                this.updateLyricsPosition(newTime);
              }
            });
          },
          
          // 处理沉浸式播放器鼠标移动
          handleImmersiveMouseMove(event) {
            if (!this.showImmersivePlayer) return;
            
            const windowHeight = window.innerHeight;
            const mouseY = event.clientY;
            const bottomThreshold = windowHeight * 0.85; // 底部15%区域
            
            if (mouseY >= bottomThreshold) {
              // 鼠标在底部区域，显示控件
              this.showImmersiveControls = true;
              this.clearImmersiveControlsTimer();
            } else {
              // 鼠标不在底部区域，立即隐藏控件
              this.showImmersiveControls = false;
              this.clearImmersiveControlsTimer();
            }
          },
          
          // 设置控件隐藏定时器
          setImmersiveControlsTimer() {
            this.clearImmersiveControlsTimer();
            this.immersiveControlsTimer = setTimeout(() => {
              this.showImmersiveControls = false;
            }, 3000); // 3秒后隐藏
          },
          
          // 清除控件隐藏定时器
          clearImmersiveControlsTimer() {
            if (this.immersiveControlsTimer) {
              clearTimeout(this.immersiveControlsTimer);
              this.immersiveControlsTimer = null;
            }
          },
          
          // 打开沉浸式播放器
          openImmersivePlayer() {
            console.log('[Canvas Debug] 打开沉浸式播放器');
            
            if (!this.currentSong) {
              this.showNotification('请先选择一首歌曲', 'warning');
              return;
            }
            
            this.showImmersivePlayer = true;
            this.showImmersiveControls = false; // 初始隐藏控件
            this.clearImmersiveControlsTimer(); // 清除可能存在的定时器
            
            this.$nextTick(() => {
              this.loadImmersiveBackground();
              this.loadLyrics().then(() => {
                // 歌词加载完成后，根据当前播放时间滚动到正确位置
                if (this.currentTime > 0 && this.lyrics.length > 0) {
                  this.updateLyricsPosition(this.currentTime);
                }
              });
            });
          },
          
          // 关闭沉浸式播放器
          closeImmersivePlayer() {
            this.showImmersivePlayer = false;
            this.showImmersiveControls = false;
            this.clearImmersiveControlsTimer();
            
            // 清理用户滚动定时器
            if (this.userScrollTimer) {
              clearTimeout(this.userScrollTimer);
              this.userScrollTimer = null;
            }
            this.isUserScrolling = false;
            
            // 清理沉浸式文字颜色样式
            const styleElement = document.getElementById('immersive-text-styles');
            if (styleElement) {
              styleElement.remove();
            }
          },
          
                    // 加载沉浸式背景
                    async loadImmersiveBackground() {
                      if (!this.$refs.immersiveCanvas) {
                        return;
                      }
                      
                      if (!this.currentSong) {
                        return;
                      }
                      
                      const canvas = this.$refs.immersiveCanvas;
                      const ctx = canvas.getContext('2d');
                      
                      // 设置canvas尺寸
                      const dpr = window.devicePixelRatio || 1;
                      const displayWidth = window.innerWidth;
                      const displayHeight = window.innerHeight;
                      
                      // 设置显示尺寸
                      canvas.style.width = displayWidth + 'px';
                      canvas.style.height = displayHeight + 'px';
                      
                      // 设置实际像素尺寸
                      canvas.width = displayWidth * dpr;
                      canvas.height = displayHeight * dpr;
                      
                      try {
                        // 使用现有的音乐颜色提取器
                        if (!this.musicColorExtractor) {
                          this.musicColorExtractor = new MusicColorExtractor();
                        }
                        
                        // 从歌曲封面提取主要颜色，尝试多个可能的URL
                        let imageUrl = this.currentSong.picUrl || 
                                       (this.currentSong.al && this.currentSong.al.picUrl) || 
                                       (this.currentSong.album && this.currentSong.album.picUrl);
                        
                        // 如果还是没有URL，尝试其他可能的字段
                        if (!imageUrl && this.currentSong.artists && this.currentSong.artists[0]) {
                          imageUrl = this.currentSong.artists[0].img1v1Url;
                        }
                        
                        if (imageUrl) {
                          // 使用歌曲ID作为缓存键
                          const songId = this.currentSong.id || this.currentSong.songId;
                          
                          // 提取颜色和明暗度
                          const colorResult = await this.musicColorExtractor.extractPrimaryColor(imageUrl, songId);
                          
                          // 根据明暗度设置文字颜色
                          this.setImmersiveTextColor(colorResult.brightness);
                          
                          const colors = await this.musicColorExtractor.extractMultipleColors(imageUrl, songId, 4);
                          
                          if (colors && colors.length > 0) {
                            this.immersiveColors = colors;
                            // 绘制渐变背景
                            this.drawGradientBackground(ctx, colors);
                          } else {
                            // 使用默认颜色
                            this.drawGradientBackground(ctx, ['#1a1a2e', '#16213e', '#0f3460']);
                            // 设置默认文字颜色（深色背景）
                            this.setImmersiveTextColor(50);
                          }
                        } else {
                          // 使用默认颜色
                          this.drawGradientBackground(ctx, ['#1a1a2e', '#16213e', '#0f3460']);
                          // 设置默认文字颜色（深色背景）
                          this.setImmersiveTextColor(50);
                        }
                      } catch (error) {
                        console.error('加载背景失败:', error);
                        // 使用默认颜色
                        this.drawGradientBackground(ctx, ['#1a1a2e', '#16213e', '#0f3460']);
                      }
                    },                        
                        // 根据封面明暗度设置沉浸式播放器文字颜色
                        setImmersiveTextColor(brightness) {
                          // 移除之前的样式
                          const oldStyle = document.getElementById('immersive-text-styles');
                          if (oldStyle) {
                            oldStyle.remove();
                          }
                          
                          // 创建新的样式
                          const style = document.createElement('style');
                          style.id = 'immersive-text-styles';
                          
                          // 根据明暗度决定文字颜色
                          // brightness范围是0-255，128是中间值
                          const isDark = brightness < 128;
                          
                          if (isDark) {
                            // 封面较暗，使用白色文字
                            style.textContent = `
                              .immersive-song-name {
                                color: rgba(255, 255, 255, 0.95) !important;
                                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
                              }
                              .immersive-artist-name,
                              .immersive-album-name {
                                color: rgba(255, 255, 255, 0.75) !important;
                                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                              }
                              .control-btn {
                                color: rgba(255, 255, 255, 0.8) !important;
                              }
                              .control-btn:hover {
                                color: white !important;
                              }
                              .progress-time {
                                color: rgba(255, 255, 255, 0.7) !important;
                              }
                              .translation-btn {
                                color: rgba(255, 255, 255, 0.7) !important;
                                border-color: rgba(255, 255, 255, 0.3) !important;
                              }
                              .translation-btn:hover {
                                color: white !important;
                                border-color: rgba(255, 255, 255, 0.5) !important;
                              }
                            `;
                          } else {
                            // 封面较亮，使用黑色文字
                            style.textContent = `
                              .immersive-song-name {
                                color: rgba(0, 0, 0, 0.95) !important;
                                text-shadow: 0 1px 3px rgba(255, 255, 255, 0.5);
                              }
                              .immersive-artist-name,
                              .immersive-album-name {
                                color: rgba(0, 0, 0, 0.75) !important;
                                text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
                              }
                              .control-btn {
                                color: rgba(0, 0, 0, 0.8) !important;
                              }
                              .control-btn:hover {
                                color: black !important;
                              }
                              .progress-time {
                                color: rgba(0, 0, 0, 0.7) !important;
                              }
                              .translation-btn {
                                color: rgba(0, 0, 0, 0.7) !important;
                                border-color: rgba(0, 0, 0, 0.3) !important;
                              }
                              .translation-btn:hover {
                                color: black !important;
                                border-color: rgba(0, 0, 0, 0.5) !important;
                              }
                            `;
                          }
                          
                          document.head.appendChild(style);
                        },
                        
                        // 绘制渐变背景          
          drawGradientBackground(ctx, colors) {
            // 获取Canvas实际尺寸
            const width = ctx.canvas.width;
            const height = ctx.canvas.height;
            
            // 重置所有状态
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.filter = 'none';
            
            // 清空画布
            ctx.clearRect(0, 0, width, height);
            
            // 填充基础背景色
            ctx.fillStyle = colors[0] || '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            
            // 生成随机种子
            const seed = Date.now() / 1000;
            
            // 创建随机色块
            const blocks = this.generateRandomColorBlocks(width, height, colors, seed);
            
            // 绘制色块
            blocks.forEach((block, index) => {
              this.drawColorBlock(ctx, block, width, height);
            });
            
            // 在色块交界处绘制过渡效果
            this.drawTransitions(ctx, blocks, colors, width, height);
            
            // 添加整体融合效果
            this.applyBlendingEffect(ctx, width, height, colors);
            
            // 计算背景平均亮度并设置字体颜色
            this.calculateAndSetTextColor(colors);
          },
          
          // 计算背景平均亮度并设置字体颜色
          calculateAndSetTextColor(colors) {
            // 分析颜色特征
            const colorAnalysis = this.analyzeColorPalette(colors);
            
            // 智能计算最佳字体颜色
            const textColors = this.calculateOptimalTextColors(colorAnalysis);
            
            // 设置CSS变量
            this.setImmersiveTextColors(textColors.primary, textColors.secondary, textColors.accent);
          },
          
          // 分析调色板特征
          analyzeColorPalette(colors) {
            let totalBrightness = 0;
            let totalSaturation = 0;
            let totalHue = 0;
            let warmth = 0; // 暖色调程度
            let contrast = 0; // 对比度
            
            const rgbColors = colors.map(color => this.hexToRgb(color));
            const hslColors = rgbColors.map(rgb => this.rgbToHsl(rgb.r, rgb.g, rgb.b));
            
            // 计算各项指标
            hslColors.forEach(hsl => {
              totalBrightness += hsl.l;
              totalSaturation += hsl.s;
              totalHue += hsl.h;
              
              // 计算暖色调程度（红黄为暖色，蓝绿为冷色）
              if ((hsl.h >= 0 && hsl.h <= 60) || (hsl.h >= 300 && hsl.h <= 360)) {
                warmth += 1; // 红色、黄色系
              } else if (hsl.h >= 180 && hsl.h <= 240) {
                warmth -= 1; // 蓝色、青色系
              }
            });
            
            // 计算亮度对比度
            const brightnesses = hslColors.map(hsl => hsl.l);
            const maxBrightness = Math.max(...brightnesses);
            const minBrightness = Math.min(...brightnesses);
            contrast = maxBrightness - minBrightness;
            
            const avgBrightness = totalBrightness / colors.length;
            const avgSaturation = totalSaturation / colors.length;
            const avgHue = (totalHue / colors.length + 360) % 360;
            const warmthRatio = (warmth + colors.length) / (colors.length * 2); // 归一化到0-1
            
            return {
              avgBrightness,
              avgSaturation,
              avgHue,
              warmthRatio,
              contrast,
              isDark: avgBrightness < 40,
              isLight: avgBrightness > 60,
              isHighContrast: contrast > 40,
              isWarm: warmthRatio > 0.6,
              isCool: warmthRatio < 0.4
            };
          },
          
          // 智能计算最佳字体颜色
          calculateOptimalTextColors(analysis) {
            let primary, secondary, accent;
            
            if (analysis.isDark) {
              // 暗背景
              if (analysis.isWarm) {
                // 暖色调暗背景
                primary = '#ffffff';
                secondary = '#f0f0f0';
                accent = '#ffe4b5'; // 暖白色调
              } else if (analysis.isCool) {
                // 冷色调暗背景
                primary = '#ffffff';
                secondary = '#e8f4f8';
                accent = '#e0f2fe'; // 冷白色调
              } else {
                // 中性暗背景
                primary = '#ffffff';
                secondary = '#e0e0e0';
                accent = '#f5f5f5';
              }
            } else if (analysis.isLight) {
              // 亮背景
              if (analysis.isWarm) {
                // 暖色调亮背景
                primary = '#2c1810';
                secondary = '#4a2c1a';
                accent = '#8b4513'; // 暖深色调
              } else if (analysis.isCool) {
                // 冷色调亮背景
                primary = '#0a1929';
                secondary = '#1a2332';
                accent = '#0d47a1'; // 冷深色调
              } else {
                // 中性亮背景
                primary = '#1a1a1a';
                secondary = '#424242';
                accent = '#616161';
              }
            } else {
              // 中等亮度背景
              if (analysis.isHighContrast) {
                // 高对比度
                primary = analysis.avgBrightness > 50 ? '#000000' : '#ffffff';
                secondary = analysis.avgBrightness > 50 ? '#424242' : '#e0e0e0';
                accent = this.generateComplementaryColor(analysis.avgHue, analysis.avgBrightness);
              } else {
                // 低对比度，需要增强可读性
                if (analysis.avgBrightness > 50) {
                  primary = '#2c2c2c';
                  secondary = '#5a5a5a';
                  accent = '#7a7a7a';
                } else {
                  primary = '#f5f5f5';
                  secondary = '#d0d0d0';
                  accent = '#b8b8b8';
                }
              }
            }
            
            // 根据饱和度调整颜色强度
            if (analysis.avgSaturation > 60) {
              // 高饱和度背景，使用更柔和的文字
              primary = this.adjustColorIntensity(primary, 0.8);
              secondary = this.adjustColorIntensity(secondary, 0.7);
              accent = this.adjustColorIntensity(accent, 0.6);
            }
            
            return { primary, secondary, accent };
          },
          
          // 生成互补色
          generateComplementaryColor(hue, brightness) {
            const complementaryHue = (hue + 180) % 360;
            const adjustedBrightness = brightness > 50 ? 30 : 70;
            const rgb = this.hslToRgb(complementaryHue, 50, adjustedBrightness);
            return this.rgbToHex(rgb.r, rgb.g, rgb.b);
          },
          
          // 调整颜色强度
          adjustColorIntensity(hex, factor) {
            const rgb = this.hexToRgb(hex);
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            hsl.l = Math.min(100, Math.max(0, hsl.l * factor));
            const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
          },
          
          // 设置沉浸式界面的文字颜色CSS变量
          setImmersiveTextColors(primary, secondary, accent) {
            // 创建或更新CSS样式
            let styleElement = document.getElementById('immersive-text-styles');
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = 'immersive-text-styles';
              document.head.appendChild(styleElement);
            }
            
            const css = `
              .immersive-player {
                --immersive-text-primary: ${primary};
                --immersive-text-secondary: ${secondary};
                --immersive-text-accent: ${accent};
              }
              
              .immersive-song-name,
              .immersive-artist-name,
              .immersive-album-name {
                color: var(--immersive-text-primary) !important;
              }
              
              .immersive-song-name {
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              }
              
              .immersive-artist-name,
              .immersive-album-name {
                color: var(--immersive-text-secondary) !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
              }
              
              /* 歌词样式 - 使用更强的选择器覆盖 */
              .immersive-player .lyric-line .lyric-text,
              .immersive-player .lyric-line .lyric-translation {
                transition: all 0.3s ease !important;
              }
              
              .immersive-player .lyric-line.active .lyric-text {
                color: ${primary} !important;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
                opacity: 1 !important;
                transform: scale(1) !important;
              }
              
              .immersive-player .lyric-line:not(.active) .lyric-text {
                color: ${secondary} !important;
                text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4) !important;
                opacity: 0.7 !important;
                transform: scale(0.9) !important;
              }
              
              .immersive-player .lyric-line.active .lyric-translation {
                color: ${accent} !important;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
                opacity: 0.8 !important;
              }
              
              .immersive-player .lyric-line:not(.active) .lyric-translation {
                color: ${accent} !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
                opacity: 0.5 !important;
              }
              
              /* 近似翻译标识 */
              .immersive-player .lyric-translation.approximate {
                border-left: 2px solid ${accent} !important;
                opacity: 0.7 !important;
              }
              
              /* 空行样式 */
              .immersive-player .lyric-line.empty-line .lyric-text {
                color: ${accent} !important;
                font-style: italic !important;
                opacity: 0.6 !important;
              }
              
              /* 前一行和后一行 */
              .immersive-player .lyric-line.prev .lyric-text,
              .immersive-player .lyric-line.next .lyric-text {
                color: ${secondary} !important;
                opacity: 0.6 !important;
                transform: scale(0.85) !important;
              }
              
              .immersive-player .lyric-line.prev .lyric-translation,
              .immersive-player .lyric-line.next .lyric-translation {
                color: ${accent} !important;
                opacity: 0.4 !important;
              }
              
              .immersive-btn,
              .exit-btn,
              .lyrics-control-btn {
                color: var(--immersive-text-primary) !important;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
              }
              
              .immersive-btn:hover,
              .exit-btn:hover,
              .lyrics-control-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
              }
              
              .time-current,
              .time-total {
                color: var(--immersive-text-secondary) !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
              }
            `;
            
            styleElement.textContent = css;
          },
          
          // 生成随机色块
          generateRandomColorBlocks(width, height, colors, seed) {
            const blocks = [];
            const blockCount = 8 + Math.floor(Math.random() * 5); // 8-12个色块
            
            for (let i = 0; i < blockCount; i++) {
              const randomX = (Math.sin(seed + i * 1.7) + 1) * width * 0.5;
              const randomY = (Math.cos(seed + i * 2.3) + 1) * height * 0.5;
              const randomSize = Math.min(width, height) * (0.3 + Math.random() * 0.4);
              const colorIndex = i % colors.length;
              
              blocks.push({
                x: randomX,
                y: randomY,
                size: randomSize,
                color: colors[colorIndex],
                type: Math.random() > 0.5 ? 'circle' : 'blob',
                rotation: Math.random() * Math.PI * 2,
                distortion: 0.7 + Math.random() * 0.3
              });
            }
            
            return blocks;
          },
          
          // 绘制单个色块
          drawColorBlock(ctx, block, canvasWidth, canvasHeight) {
            ctx.save();
            
            // 设置混合模式
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.6;
            
            if (block.type === 'circle') {
              // 绘制多层圆形色块，增强过渡效果
              for (let layer = 0; layer < 3; layer++) {
                const layerSize = block.size * (1 - layer * 0.2);
                const layerAlpha = 0.4 - layer * 0.1;
                
                const gradient = ctx.createRadialGradient(
                  block.x, block.y, 0,
                  block.x, block.y, layerSize
                );
                
                gradient.addColorStop(0, this.hexToRgba(block.color, layerAlpha));
                gradient.addColorStop(0.3, this.hexToRgba(block.color, layerAlpha * 0.8));
                gradient.addColorStop(0.6, this.hexToRgba(block.color, layerAlpha * 0.4));
                gradient.addColorStop(0.9, this.hexToRgba(block.color, layerAlpha * 0.1));
                gradient.addColorStop(1, this.hexToRgba(block.color, 0));
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(block.x, block.y, layerSize, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              // 绘制多层不规则色块
              ctx.translate(block.x, block.y);
              ctx.rotate(block.rotation);
              
              for (let layer = 0; layer < 3; layer++) {
                const layerSize = block.size * (1 - layer * 0.15);
                const layerAlpha = 0.4 - layer * 0.1;
                
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerSize);
                gradient.addColorStop(0, this.hexToRgba(block.color, layerAlpha));
                gradient.addColorStop(0.4, this.hexToRgba(block.color, layerAlpha * 0.7));
                gradient.addColorStop(0.7, this.hexToRgba(block.color, layerAlpha * 0.3));
                gradient.addColorStop(1, this.hexToRgba(block.color, 0));
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                
                // 创建更平滑的不规则形状
                const points = 12; // 增加点数使形状更平滑
                for (let i = 0; i <= points; i++) {
                  const angle = (i / points) * Math.PI * 2;
                  const radiusVariation = Math.sin(angle * 3 + layer) * 0.1; // 添加半径变化
                  const radius = layerSize * (0.9 + radiusVariation + Math.random() * 0.2 * block.distortion);
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  
                  if (i === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    const prevAngle = ((i - 1) / points) * Math.PI * 2;
                    const prevRadiusVariation = Math.sin(prevAngle * 3 + layer) * 0.1;
                    const prevRadius = layerSize * (0.9 + prevRadiusVariation + Math.random() * 0.2 * block.distortion);
                    const prevX = Math.cos(prevAngle) * prevRadius;
                    const prevY = Math.sin(prevAngle) * prevRadius;
                    
                    // 使用更平滑的曲线控制点
                    const cpAngle = (prevAngle + angle) / 2;
                    const cpRadius = (prevRadius + radius) / 2 * 1.1;
                    const cpX = Math.cos(cpAngle) * cpRadius;
                    const cpY = Math.sin(cpAngle) * cpRadius;
                    
                    ctx.quadraticCurveTo(cpX, cpY, x, y);
                  }
                }
                
                ctx.closePath();
                ctx.fill();
              }
            }
            
            ctx.restore();
          },
          
          // 绘制色块交界处的过渡效果
          drawTransitions(ctx, blocks, colors, width, height) {
            ctx.save();
            
            // 创建多个过渡层
            const layers = [
              { operation: 'screen', alpha: 0.4 },
              { operation: 'overlay', alpha: 0.3 },
              { operation: 'soft-light', alpha: 0.2 }
            ];
            
            layers.forEach(layer => {
              ctx.globalCompositeOperation = layer.operation;
              ctx.globalAlpha = layer.alpha;
              
              // 在色块之间创建过渡区域
              for (let i = 0; i < blocks.length - 1; i++) {
                for (let j = i + 1; j < blocks.length; j++) {
                  const block1 = blocks[i];
                  const block2 = blocks[j];
                  
                  // 计算两个色块之间的距离
                  const distance = Math.sqrt(
                    Math.pow(block2.x - block1.x, 2) + 
                    Math.pow(block2.y - block1.y, 2)
                  );
                  
                  // 增加过渡距离判断
                  const maxTransitionDistance = (block1.size + block2.size) * 2;
                  
                  if (distance < maxTransitionDistance) {
                    // 计算过渡参数
                    const midX = (block1.x + block2.x) / 2;
                    const midY = (block1.y + block2.y) / 2;
                    const transitionSize = (block1.size + block2.size) / 2.5;
                    
                    // 创建更复杂的过渡渐变
                    const gradient = ctx.createRadialGradient(
                      midX, midY, 0,
                      midX, midY, transitionSize
                    );
                    
                    // 混合两个色块的颜色
                    const mixedColor1 = this.mixColors(block1.color, block2.color, 0.6);
                    const mixedColor2 = this.mixColors(block1.color, block2.color, 0.4);
                    
                    gradient.addColorStop(0, this.hexToRgba(mixedColor1, 0.6));
                    gradient.addColorStop(0.3, this.hexToRgba(block1.color, 0.4));
                    gradient.addColorStop(0.5, this.hexToRgba(mixedColor2, 0.5));
                    gradient.addColorStop(0.7, this.hexToRgba(block2.color, 0.3));
                    gradient.addColorStop(1, this.hexToRgba(block2.color, 0));
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(midX, midY, transitionSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // 添加额外的扩散过渡
                    const spreadGradient = ctx.createRadialGradient(
                      midX, midY, transitionSize * 0.8,
                      midX, midY, transitionSize * 1.5
                    );
                    
                    spreadGradient.addColorStop(0, this.hexToRgba(mixedColor2, 0.2));
                    spreadGradient.addColorStop(1, this.hexToRgba(mixedColor2, 0));
                    
                    ctx.fillStyle = spreadGradient;
                    ctx.beginPath();
                    ctx.arc(midX, midY, transitionSize * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
            });
            
            ctx.restore();
          },
          
          // 颜色混合工具方法
          mixColors(color1, color2, ratio) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            
            const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
            const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
            const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);
            
            return this.rgbToHex(r, g, b);
          },
          
          // 十六进制转RGB
          hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
          },
          
          // 应用整体融合效果
          applyBlendingEffect(ctx, width, height, colors) {
            ctx.save();
            
            // 第一层：整体色彩平衡
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.15;
            
            const balanceGradient = ctx.createLinearGradient(0, 0, width, height);
            balanceGradient.addColorStop(0, colors[1]);
            balanceGradient.addColorStop(0.3, colors[2]);
            balanceGradient.addColorStop(0.7, colors[3]);
            balanceGradient.addColorStop(1, colors[0]);
            
            ctx.fillStyle = balanceGradient;
            ctx.fillRect(0, 0, width, height);
            
            // 第二层：柔化过渡
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = 0.2;
            
            const softGradient = ctx.createRadialGradient(
              width / 2, height / 2, 0,
              width / 2, height / 2, Math.max(width, height) / 2
            );
            
            softGradient.addColorStop(0, this.hexToRgba(colors[0], 0.3));
            softGradient.addColorStop(0.5, this.hexToRgba(colors[1], 0.2));
            softGradient.addColorStop(1, this.hexToRgba(colors[2], 0.1));
            
            ctx.fillStyle = softGradient;
            ctx.fillRect(0, 0, width, height);
            
            // 第三层：轻微模糊效果
            ctx.filter = 'blur(8px)';
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.08;
            
            const blurGradient = ctx.createLinearGradient(width, 0, 0, height);
            blurGradient.addColorStop(0, colors[3]);
            blurGradient.addColorStop(1, colors[0]);
            
            ctx.fillStyle = blurGradient;
            ctx.fillRect(0, 0, width, height);
            
            // 第四层：最终色彩调整
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.1;
            
            const finalGradient = ctx.createRadialGradient(
              width * 0.3, height * 0.3, 0,
              width * 0.7, height * 0.7, Math.max(width, height) * 0.8
            );
            
            finalGradient.addColorStop(0, colors[1]);
            finalGradient.addColorStop(0.5, colors[2]);
            finalGradient.addColorStop(1, colors[3]);
            
            ctx.fillStyle = finalGradient;
            ctx.fillRect(0, 0, width, height);
            
            ctx.restore();
          },
          
          // 添加噪声纹理
          addNoiseTexture(ctx, width, height) {
            const dpr = window.devicePixelRatio || 1;
            const actualWidth = width * dpr;
            const actualHeight = height * dpr;
            const imageData = ctx.createImageData(actualWidth, actualHeight);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * 20; // -10 到 10 的噪声
              data[i] = data[i] + noise;     // R
              data[i + 1] = data[i] + noise; // G
              data[i + 2] = data[i] + noise; // B
              data[i + 3] = 15;              // A (低透明度)
            }
            
            ctx.putImageData(imageData, 0, 0);
          },
          
          // 辅助方法：将十六进制颜色转换为RGBA
          hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          },
          
          // RGB转十六进制
          rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
              const hex = x.toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('');
          },
          
          // RGB转HSL
          rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
              h = s = 0; // 灰度
            } else {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              
              switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
              }
            }
            
            return {
              h: Math.round(h * 360),
              s: Math.round(s * 100),
              l: Math.round(l * 100)
            };
          },
          
          // HSL转RGB
          hslToRgb(h, s, l) {
            h /= 360;
            s /= 100;
            l /= 100;
            
            let r, g, b;
            
            if (s === 0) {
              r = g = b = l; // 灰度
            } else {
              const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
              };
              
              const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
              const p = 2 * l - q;
              
              r = hue2rgb(p, q, h + 1/3);
              g = hue2rgb(p, q, h);
              b = hue2rgb(p, q, h - 1/3);
            }
            
            return {
              r: Math.round(r * 255),
              g: Math.round(g * 255),
              b: Math.round(b * 255)
            };
          },
          
                    
          
          
          // 格式化时间
          formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          },
          
          
          
          // 进度条跳转
          seekTo(event) {
            if (!this.duration) return;
            
            const rect = event.currentTarget.getBoundingClientRect();
            const percent = (event.clientX - rect.left) / rect.width;
            this.audio.currentTime = percent * this.duration;
          },
          
          
          
          // 加载歌词
          async loadLyrics() {
            if (!this.currentSong?.id) {
              return;
            }
            
            try {
              // 重置状态
              this.lyrics = [];
              this.translationLyrics = [];
              this.currentLyricIndex = -1;
              
              const options = this.loginCookie ? 
                { fetchOptions: { headers: { 'Cookie': this.loginCookie } } } : 
                {};
              
              // 获取歌词
              const response = await this.apiRequestManager.request('/lyric', { id: this.currentSong.id }, options);
              
              if (response && response.code === 200 && response.lrc) {
                // 解析歌词
                const parsedLyrics = this.parseLyrics(response.lrc.lyric);
                this.lyrics = parsedLyrics;
                
                // 解析翻译歌词并与原歌词时间对齐
                if (response.tlyric && response.tlyric.lyric) {
                  const parsedTranslations = this.parseLyrics(response.tlyric.lyric);
                  this.translationLyrics = this.alignTranslations(parsedLyrics, parsedTranslations);
                } else {
                  this.translationLyrics = [];
                }
                
                // 解析罗马音歌词并与原歌词时间对齐
                if (response.romalrc && response.romalrc.lyric) {
                  const parsedRoma = this.parseLyrics(response.romalrc.lyric);
                  this.romaLyrics = this.alignTranslations(parsedLyrics, parsedRoma);
                } else {
                  this.romaLyrics = [];
                }
                
                // 根据当前播放时间设置初始歌词位置
                this.$nextTick(() => {
                  // 初始化transform为0，让歌词从原始位置开始
                  if (this.$refs.lyricsScroll && this.lyrics.length > 0) {
                    this.$refs.lyricsScroll.style.transform = 'translateY(0px)';
                    this.currentScrollTop = 0;
                  }
                  
                  if (this.currentTime > 0 && this.lyrics.length > 0) {
                    this.updateLyricsPosition(this.currentTime);
                  }
                });
              } else {
                // 没有歌词时显示空数组
                this.lyrics = [];
              }
            } catch (error) {
              console.error('加载歌词失败:', error);
              this.lyrics = [];
            }
          },
          
          // 解析歌词
          parseLyrics(lrcText) {
            if (!lrcText) {
              return [];
            }
            
            const lines = lrcText.split('\n');
            const lyrics = [];
            // 支持两种格式：[00:00.00] 和 [00:00:00]（第三段是秒的小数部分）
            const timeRegex1 = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/; // 标准格式 [mm:ss.ms]
            const timeRegex2 = /\[(\d{2}):(\d{2}):(\d{2,3})\](.*)/; // 冒号格式 [mm:ss:ms]
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              // 跳过标签行
              if (trimmedLine.startsWith('[tag:') || 
                  trimmedLine.startsWith('[offset:') || 
                  trimmedLine.startsWith('[by:') ||
                  trimmedLine.startsWith('[ti:') ||
                  trimmedLine.startsWith('[ar:') ||
                  trimmedLine.startsWith('[al:')) {
                continue;
              }
              
              // 尝试匹配标准格式
              let match = trimmedLine.match(timeRegex1);
              if (!match) {
                // 尝试匹配冒号格式
                match = trimmedLine.match(timeRegex2);
              }
              
              if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                const time = minutes * 60 + seconds + milliseconds / 1000;
                const text = match[4].trim();
                
                // 保留所有有时间标签的行，包括空行
                // 空行使用特殊符号表示
                const displayText = text || '♪';
                lyrics.push({
                  time,
                  text: displayText,
                  originalLine: trimmedLine,
                  isEmpty: !text // 标记是否为空行
                });
              } else {
                // 没有时间标签的行，可能是纯文本歌词
                lyrics.push({
                  time: -1, // 使用-1表示无时间标签
                  text: trimmedLine,
                  originalLine: trimmedLine
                });
              }
            }
            
            // 按时间排序（无时间标签的放在最后）
            const sortedLyrics = lyrics.sort((a, b) => {
              if (a.time === -1 && b.time === -1) return 0;
              if (a.time === -1) return 1;
              if (b.time === -1) return -1;
              return a.time - b.time;
            });
            
            
            
            return sortedLyrics;
          },
          
          // 更新歌词位置
          // 处理歌词滚轮滚动
          handleLyricsWheel(event) {
            if (!this.isUserScrolling) {
              // 用户开始滚动，暂停自动滚动
              this.isUserScrolling = true;
              this.userScrollOffset = this.currentScrollTop || 0;
              
              // 设置所有歌词行为active状态
              this.setAllLyricsActive(true);
              
              // 清除之前的定时器
              if (this.userScrollTimer) {
                clearTimeout(this.userScrollTimer);
              }
            }
            
            // 阻止默认滚动行为
            event.preventDefault();
            
            // 计算滚动量（取反以修复方向）
            const delta = -event.deltaY;
            this.userScrollOffset += delta;
            
            // 应用滚动
            if (this.$refs.lyricsScroll) {
              this.$refs.lyricsScroll.style.transform = `translateY(${this.userScrollOffset}px)`;
              this.$refs.lyricsScroll.style.transition = 'none';
            }
            
            // 重置3秒定时器
            if (this.userScrollTimer) {
              clearTimeout(this.userScrollTimer);
            }
            this.userScrollTimer = setTimeout(() => {
              // 3秒后恢复自动滚动
              this.isUserScrolling = false;
              this.setAllLyricsActive(false);
              
              // 恢复过渡动画
              if (this.$refs.lyricsScroll) {
                this.$refs.lyricsScroll.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              }
              
              // 立即更新到当前歌词位置
              if (this.currentTime > 0 && this.lyrics.length > 0) {
                this.updateLyricsPosition(this.currentTime);
              }
            }, 3000);
          },
          
          // 设置所有歌词的active状态
          setAllLyricsActive(isActive) {
            if (!this.$refs.lyricsScroll) return;
            
            const lyricLines = this.$refs.lyricsScroll.querySelectorAll('.lyric-line');
            lyricLines.forEach(line => {
              if (isActive) {
                line.classList.add('user-scrolling');
              } else {
                line.classList.remove('user-scrolling');
              }
            });
          },
          
          updateLyricsPosition(currentTime) {
            // 如果用户正在滚动，不执行自动滚动
            if (this.isUserScrolling) {
              return;
            }
            
            if (!this.lyrics || this.lyrics.length === 0) {
              return;
            }
            
            // 提前0.2秒进行滚动，以补偿动画过渡时间
            const adjustedTime = currentTime + 0.2;
            
            // 找到当前应该高亮的歌词
            let targetIndex = -1;
            
            // 从后往前找，找到第一个时间小于等于调整后时间的歌词
            for (let i = this.lyrics.length - 1; i >= 0; i--) {
              const lyric = this.lyrics[i];
              if (lyric.time <= adjustedTime && lyric.time !== -1) {
                targetIndex = i;
                break;
              }
            }
            
            // 检查是否需要更新
            if (targetIndex !== this.currentLyricIndex) {
              const oldIndex = this.currentLyricIndex;
              this.currentLyricIndex = targetIndex;
              
              // 滚动到当前歌词
              this.scrollToLyric(targetIndex, oldIndex);
            }
          },
          
          // 滚动到指定歌词
          scrollToLyric(newIndex, oldIndex = -1) {
            if (!this.$refs.lyricsScroll) {
              return;
            }
            
            if (newIndex === -1) {
              return;
            }
            
            const lyricsScroll = this.$refs.lyricsScroll;
            const lyricLines = lyricsScroll.querySelectorAll('.lyric-line');
            
            if (lyricLines[newIndex]) {
              // 基础行高度 5rem = 80px
              let totalHeight = 0;
              let lineHeight = 80; // 5 * 16
              
              // 计算到当前行的总高度，考虑是否有译文或罗马音
              for (let i = 0; i <= newIndex; i++) {
                // 检查当前行是否有译文或罗马音（确保不为null）
                const hasTranslation = this.showTranslation && this.translationLyrics[i] != null;
                const hasRoma = this.showRoma && this.romaLyrics[i] != null;
                
                if (i === newIndex) {
                  // 当前行：如果有译文或罗马音，使用更高的高度
                  if (hasTranslation || hasRoma) {
                    lineHeight = 104; // 6.5rem * 16px
                  } else {
                    lineHeight = 88; // 5.5rem * 16px
                  }
                } else {
                  // 其他行：如果有译文或罗马音，使用更高的高度
                  if (hasTranslation || hasRoma) {
                    totalHeight += 96; // 6rem * 16px
                  } else {
                    totalHeight += 80; // 5rem * 16px
                  }
                }
              }
              
              // 加上当前行的高度
              totalHeight += lineHeight;
              
              // 计算transform值，使当前行居中
              const transformValue = -(totalHeight - lineHeight);
              
              // 设置transform
              lyricsScroll.style.transform = `translateY(${transformValue}px)`;
              lyricsScroll.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              
              // 保存当前transform值
              this.currentScrollTop = transformValue;
            }
          },
          
          // 对齐译文和原歌词
          alignTranslations(originalLyrics, translationLyrics) {
            const alignedTranslations = [];
            
            // 创建译文时间映射
            const translationMap = new Map();
            translationLyrics.forEach(translation => {
              if (translation.time >= 0) {
                translationMap.set(translation.time, translation);
              }
            });
            
            // 遍历原歌词，为每行查找对应的译文
            originalLyrics.forEach((original, index) => {
              if (original.time >= 0) {
                // 查找相同时间的译文
                const translation = translationMap.get(original.time);
                
                if (translation) {
                  // 找到完全匹配的译文
                  alignedTranslations[index] = {
                    time: original.time,
                    text: translation.text,
                    originalLine: translation.originalLine
                  };
                } else {
                  // 没有找到完全匹配的译文，尝试查找最近的译文
                  let closestTranslation = null;
                  let minTimeDiff = Infinity;
                  
                  translationLyrics.forEach(t => {
                    if (t.time >= 0) {
                      const timeDiff = Math.abs(t.time - original.time);
                      if (timeDiff < minTimeDiff && timeDiff < 2) { // 2秒内的译文才考虑
                        minTimeDiff = timeDiff;
                        closestTranslation = t;
                      }
                    }
                  });
                  
                  if (closestTranslation) {
                    alignedTranslations[index] = {
                      time: original.time,
                      text: closestTranslation.text,
                      originalLine: closestTranslation.originalLine,
                      isApproximate: true // 标记为近似匹配
                    };
                  } else {
                    // 没有找到任何匹配的译文
                    alignedTranslations[index] = null;
                  }
                }
              } else {
                // 无时间标签的行，不添加译文
                alignedTranslations[index] = null;
              }
            });
            
            return alignedTranslations;
          },
          
          // 点击歌词跳转
          seekToLyric(time) {
            if (time === -1) {
              return;
            }
            
            if (!this.audio) {
              return;
            }
            
            this.audio.currentTime = time;
          },
          
          // 切换翻译显示
          toggleTranslation() {
            this.showTranslation = !this.showTranslation;
            // 如果打开译文，关闭罗马音
            if (this.showTranslation) {
              this.showRoma = false;
            }
          },
          
          // 切换罗马音显示
          toggleRoma() {
            this.showRoma = !this.showRoma;
            // 如果打开罗马音，关闭译文
            if (this.showRoma) {
              this.showTranslation = false;
            }
          },
          
          // 处理图片加载错误
          handleImageError(event) {
            event.target.src = this.defaultAlbumArt;
          },
          
        }
}
</script>

<style scoped>
/* ========== 沉浸式播放器样式 ========== */
.immersive-player {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  animation: immersiveFadeIn 0.5s ease;
}

/* 右上角关闭按钮 */
.immersive-close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 100;
}

.immersive-player:hover .immersive-close-btn {
  opacity: 1;
}

.immersive-close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  transform: scale(1.1);
}

@keyframes immersiveFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.immersive-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: block;
  object-fit: cover;
}

.immersive-content {
  flex: 1;
  display: flex;
  padding: 2rem;
  padding-bottom: 6rem; /* 为底部固定控件留出空间 */
  gap: 3rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  z-index: 10;
  position: relative;
}

.immersive-left {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.immersive-cover-container {
  position: relative;
  width: 320px;
  height: 320px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.immersive-cover-container:hover {
  transform: scale(1.02);
}

.immersive-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 歌曲信息移动到封面左下角 */
.immersive-song-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  background: transparent;
  color: white;
  text-align: left;
}

.immersive-song-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  line-height: 1.3;
}

.immersive-artist-name {
  font-size: 0.9rem;
  font-weight: 400;
  margin: 0 0 0.1rem 0;
  opacity: 0.8;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.immersive-album-name {
  font-size: 0.8rem;
  font-weight: 300;
  margin: 0;
  opacity: 0.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.immersive-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 垂直播放控件样式 */
.immersive-controls-vertical {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

/* 操控按钮样式 */
.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
}

.control-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  color: white;
  transform: scale(1.1);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.play-pause {
  margin: 0 0.5rem;
}

.control-btn.play-pause:hover {
  transform: scale(1.05);
}

.control-btn svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* ========== Apple Music 风格进度条 ========== */
.progress-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 0;
  margin: 0 0.5rem;
}

.progress-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  min-width: 3.2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.progress-track {
  flex: 1;
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-track:hover {
  height: 10px;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);
}

.progress-track:active {
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
}

.progress-buffer {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-current {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 3px;
  transition: width 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-width: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-track:hover .progress-current {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}

.progress-track:active .progress-current {
  background: white;
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.6);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.progress-track:hover .progress-thumb {
  transform: translate(-50%, -50%) scale(1);
}

.progress-track:active .progress-thumb {
  transform: translate(-50%, -50%) scale(1.15);
  width: 16px;
  height: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* 译文控制按钮 */
.translation-control {
  display: flex;
  justify-content: center;
}

.translation-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
  padding: 0.5rem 1rem;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.translation-btn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.lyrics-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 2rem 0;
}

.lyrics-scroll {
  display: flex;
  flex-direction: column;
  padding-left: 2rem;
  padding-right: 2rem;
  /* 添加顶部padding，让第一行歌词显示在容器中心稍上方的位置 */
  padding-top: 15vh;
  padding-bottom: 85vh;
  transform: translateY(0);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  /* 增加歌词区域宽度，仅在左侧与封面之间留有空隙 */
  max-width: calc(100% - 2rem);
  will-change: transform;
}

.lyric-line {
  cursor: pointer;
  transition: all 0.3s ease;
  /* 增加高度 */
  height: 5rem;
  min-height: 5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  /* 增加歌词行宽度 */
  width: 100%;
  max-width: 100%;
  text-align: left;
  opacity: 0.5;
  transform: scale(0.9);
  /* 防止内容溢出 */
  overflow: hidden;
}

.lyric-text {
  font-size: 1.4rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
  transition: all 0.3s ease;
  /* 防止文本溢出 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  /* 限制最大行数，防止文本过长 */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lyric-translation {
  font-size: 1.1rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  line-height: 1.2;
  margin-top: 0.2rem;
  font-style: italic;
  transition: all 0.3s ease;
  /* 限制翻译歌词的最大行数 */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 确保译文不会影响原歌词的布局 */
  position: relative;
  z-index: 1;
}

/* 罗马音歌词样式 */
.lyric-roma {
  font-style: normal;
  font-family: 'Arial', 'Helvetica', sans-serif;
  letter-spacing: 0.05em;
}

/* 当前活跃歌词 */
.lyric-line.active {
  opacity: 1;
  transform: scale(1.1);
  height: 5.5rem; /* 增加活跃行的高度 */
  min-height: 5.5rem;
}

/* 有译文时的歌词行 */
.lyric-line.has-translation {
  height: 6rem;
  min-height: 6rem;
}

/* 有译文时的活跃歌词行 */
.lyric-line.active.has-translation {
  height: 6.5rem;
  min-height: 6.5rem;
}

/* 空行样式 */
.lyric-line.empty-line {
  opacity: 0.3;
}

.lyric-line.empty-line.active {
  opacity: 0.6;
}

/* 用户滚动时的歌词样式 */
.lyric-line.user-scrolling {
  opacity: 0.9 !important;
  transform: scale(1) !important;
  height: 5rem !important;
  min-height: 5rem !important;
  transition: all 0.2s ease !important;
}

.lyric-line.user-scrolling.has-translation {
  height: 6rem !important;
  min-height: 6rem !important;
}

/* 用户滚动时非当前歌词的样式 */
.lyric-line.user-scrolling:not(.active) .lyric-text {
  color: rgba(255, 255, 255, 0.7) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.lyric-line.user-scrolling:not(.active) .lyric-translation {
  color: rgba(255, 255, 255, 0.5) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

/* 用户滚动时当前歌词保持高亮样式 */
.lyric-line.user-scrolling.active .lyric-text {
  color: rgba(255, 255, 255, 0.95) !important;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
  font-weight: 500 !important;
}

.lyric-line.user-scrolling.active .lyric-translation {
  color: rgba(255, 255, 255, 0.75) !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
}

/* 歌词行hover效果 */
.lyric-line:hover {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.lyric-line.user-scrolling:hover {
  background: rgba(0, 0, 0, 0.3) !important;
}

.lyric-line.active:hover {
  background: rgba(0, 0, 0, 0.15);
}

.lyric-line.empty-line .lyric-text {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

/* 近似匹配的译文样式 */
.lyric-translation.approximate {
  opacity: 0.7;
  border-left: 2px solid rgba(255, 255, 255, 0.3);
  padding-left: 0.5rem;
}

.lyric-line.active .lyric-text {
  color: white;
  font-weight: 400;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
  -webkit-line-clamp: 2; /* 允许活跃行显示更多文本 */
  transform: scale(1.1); /* 使用transform放大字体，避免影响布局 */
  transform-origin: center;
}

.lyric-line.active .lyric-translation {
  color: rgba(255, 255, 255, 0.8);
  -webkit-line-clamp: 1;
}

/* 上一行歌词 */
.lyric-line.prev {
  opacity: 0.7;
  transform: scale(0.98);
}

.lyric-line.prev .lyric-text {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.lyric-line.prev .lyric-translation {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
}

/* 下一行歌词 */
.lyric-line.next {
  opacity: 0.7;
  transform: scale(0.98);
}

.lyric-line.next .lyric-text {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.lyric-line.next .lyric-translation {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
}

.lyrics-controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.lyrics-control-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.lyrics-control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .lyric-line {
    max-width: 90%;
    height: 3.2rem; /* 减小移动端歌词行高度 */
  }
  
  .lyric-line.active {
    height: 3.6rem;
  }
  
  .lyric-text {
    font-size: 1.4rem;
  }
  
  .lyric-line.active .lyric-text {
    font-size: 1.6rem;
  }
  
  .lyric-line.prev .lyric-text,
  .lyric-line.next .lyric-text {
    font-size: 1.3rem;
  }
  
  .lyric-translation {
    font-size: 1.1rem;
  }
  
  .lyric-line.active .lyric-translation {
    font-size: 1.2rem;
  }
  
  .lyric-line.prev .lyric-translation,
  .lyric-line.next .lyric-translation {
    font-size: 1rem;
  }
}



.immersive-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 2rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 15px 15px 0 0;
  max-width: 100%;
  width: 100%;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

/* 控件过渡动画 */
.immersive-controls-fade-enter-active,
.immersive-controls-fade-leave-active {
  transition: all 0.3s ease;
}

.immersive-controls-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.immersive-controls-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.immersive-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
}

.progress-bar {
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
  border-radius: 2px;
  transition: width 0.1s ease;
}

.immersive-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.immersive-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.immersive-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.immersive-btn.play-pause {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.immersive-btn.play-pause:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.immersive-exit {
  display: flex;
  align-items: center;
}

.exit-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.exit-btn:hover {
  background: rgba(255, 67, 54, 0.3);
  border-color: rgba(255, 67, 54, 0.5);
  transform: scale(1.05);
}

.immersive-btn.play-pause {
  width: 64px;
  height: 64px;
  background: var(--primary-color);
  border: none;
}

.immersive-btn.play-pause:hover {
  background: var(--primary-hover);
}

.exit-btn {
  background: rgba(255, 67, 54, 0.8);
  border: none;
}

.exit-btn:hover {
  background: rgba(255, 67, 54, 1);
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .immersive-content {
    flex-direction: column;
    padding: 1rem;
  }
  
  .immersive-left {
    flex: none;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
  
  .immersive-cover-container {
    width: 250px;
    height: 250px;
  }
  
  .immersive-song-name {
    font-size: 1.5rem;
  }
  
  .immersive-controls {
    padding: 0.5rem 1rem;
    gap: 1rem;
  }
}
.music-player-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, var(--modal-backdrop-opacity, 0.7));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 更流畅的缓动 */
  /* 添加模糊效果 */
  backdrop-filter: blur(var(--modal-backdrop-blur, 8px));
  -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 8px)); /* Safari 支持 */
}

.music-player-modal-overlay[style*="display: block"], 
.music-player-modal-overlay:not([style*="display: none"]) {
  opacity: 1;
  transform: scale(1);
}

.music-player-modal-content {
  width: 90%;
  max-width: 1200px; /* 增加最大宽度 */
  height: 95%; /* 增加高度 */
  max-height: 1000px; /* 增加最大高度 */
  background: var(--bg-primary);
  border-radius: 2rem; /* 增大圆角 */
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); /* 增强阴影 */
  overflow: hidden;
  transform: translateY(-50px); /* 初始位置向上偏移 */
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 更流畅的缓动 */
  border: 1px solid var(--border-color); /* 添加边框 */
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
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
  border-radius: 2rem 2rem 0 0; /* 顶部圆角 */
  flex-shrink: 0; /* 防止压缩 */
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 120px;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  max-width: 600px;
}

.header-right {
  display: flex;
  align-items: center;
  min-width: 50px;
  justify-content: flex-end;
  gap: 0.75rem;
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
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
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

/* 移除搜索section的样式，已移至header */

.search-input-wrapper {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.search-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1.5rem;
  font-size: 0.9em;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  min-width: 0;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-input:focus {
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.15);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
  transform: translateY(-1px);
}

.search-btn {
  padding: 0.6rem 1.2rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  font-size: 0.9em;
  white-space: nowrap;
}

.search-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
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
  min-height: 200px;
}

.playlist-container.expanded {
  height: 400px;
  min-height: 300px;
}

.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-tertiary);
  border: 1px solid transparent;
}

.playlist-item:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
  border-color: var(--border-color);
}

.playlist-item.playing {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
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
  font-size: 0.7em;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name.clickable {
  cursor: pointer;
  color: var(--primary-color, #4a90e2);
  transition: color 0.2s ease;
}

.artist-name.clickable:hover {
  color: var(--primary-hover, #357abd);
  text-decoration: underline;
}

.artist-separator {
  margin: 0 2px;
}

.song-duration {
  font-size: 0.75em;
  opacity: 0.7;
  min-width: 40px;
  text-align: right;
}

.player-controls {
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 100px;
  border-radius: 0 0 2rem 2rem; /* 底部圆角 */
  flex-shrink: 0; /* 防止压缩 */
}

.current-song-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
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
  font-size: 1em;
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

/* 播放列表按钮样式 */
.playlist-button-container {
  position: relative;
  display: flex;
  align-items: center;
}

.playlist-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.playlist-button:hover {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(var(--primary-color-rgb), 0.4);
}

.playlist-button.active {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  border-color: var(--primary-color);
}

.playlist-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 播放列表菜单样式 */
.playlist-menu {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 400px;
  max-height: 60vh;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.playlist-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.playlist-menu-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.playlist-menu-controls {
  display: flex;
  gap: 8px;
}

.clear-playlist-btn,
.close-playlist-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.clear-playlist-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(220, 53, 69, 0.1);
  transform: scale(0);
  transition: transform 0.2s ease;
}

.clear-playlist-btn:hover:not(:disabled) {
  color: #dc3545;
}

.clear-playlist-btn:hover:not(:disabled)::after {
  transform: scale(1);
}

.clear-playlist-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.close-playlist-menu-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

.playlist-menu-content {
  max-height: 400px;
  overflow-y: auto;
}

/* 空播放列表样式 */
.empty-playlist {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-playlist-icon {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty-playlist p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
}

.empty-playlist-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* 播放列表项样式 */
.playlist-menu-items {
  padding: 8px 0;
}

.playlist-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.playlist-menu-item:hover {
  background: var(--bg-hover);
}

.playlist-menu-item.playing {
  background: rgba(var(--primary-color-rgb), 0.1);
  color: var(--primary-color);
}

.playlist-menu-item.loading {
  opacity: 0.7;
}

.playlist-menu-item.current-song-highlight {
  background: rgba(var(--primary-color-rgb), 0.2);
  border-left: 3px solid var(--primary-color);
  animation: highlightPulse 2s ease-out;
}

@keyframes highlightPulse {
  0% {
    background: rgba(var(--primary-color-rgb), 0.4);
    transform: translateX(5px);
  }
  100% {
    background: rgba(var(--primary-color-rgb), 0.2);
    transform: translateX(0);
  }
}

.playlist-item-info {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.playlist-item-index {
  width: 24px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-right: 12px;
  flex-shrink: 0;
}

.playlist-item-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.playlist-item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playlist-item-details {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.playlist-item-title {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.playlist-item-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.playlist-item-loader {
  width: 16px;
  height: 16px;
}

.playlist-item-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.playlist-menu-item:hover .playlist-item-remove-btn {
  opacity: 1;
}

.playlist-item-remove-btn:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.playlist-item-duration {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 40px;
  text-align: right;
}

.playlist-item-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-left: 4px;
}

.playlist-menu-item:hover .playlist-item-drag-handle {
  opacity: 1;
}

.playlist-item-drag-handle:active {
  cursor: grabbing;
}

/* 滚动条样式 */
.playlist-menu-content::-webkit-scrollbar {
  width: 6px;
}

.playlist-menu-content::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.playlist-menu-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.playlist-menu-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* 空搜索状态样式 */
.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  height: 100%;
}

.empty-search-icon {
  color: var(--text-muted);
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-search-state p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.empty-search-hint {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* 加载动画优化 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  height: 100%;
}

.music-loader {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}

.loader-bar {
  width: 4px;
  height: 32px;
  background: var(--primary-color);
  border-radius: 2px;
  animation: loadingWave 1.4s ease-in-out infinite;
}

.loader-bar:nth-child(1) {
  animation-delay: 0s;
}

.loader-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.loader-bar:nth-child(3) {
  animation-delay: 0.4s;
}

.loader-bar:nth-child(4) {
  animation-delay: 0.6s;
}

@keyframes loadingWave {
  0%, 80%, 100% {
    transform: scaleY(0.4);
    opacity: 0.5;
  }
  40% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

/* 统一的加载动画样式，使用主题颜色 */
.playlist-loading .music-loader .loader-bar,
.artist-loading .music-loader .loader-bar,
.album-loading .music-loader .loader-bar {
  background: var(--primary-color);
  box-shadow: 0 0 10px rgba(var(--primary-color-rgb, 74, 144, 226), 0.3);
}

/* 加载进度指示器 */
.loading-progress {
  position: relative;
  width: 200px;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 16px;
}

.loading-progress-bar {
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
  animation: progressAnimation 2s ease-in-out infinite;
}

@keyframes progressAnimation {
  0% {
    width: 0%;
    opacity: 0.8;
  }
  50% {
    width: 70%;
    opacity: 1;
  }
  100% {
    width: 100%;
    opacity: 0.8;
  }
}

/* 播放列表菜单响应式设计 */
@media (max-width: 768px) {
  .playlist-menu {
    width: calc(100vw - 40px);
    max-width: 400px;
    right: 20px;
    bottom: 70px;
    max-height: 50vh;
  }
}

@media (max-width: 480px) {
  .playlist-menu {
    width: calc(100vw - 20px);
    right: 10px;
    bottom: 60px;
    max-height: 45vh;
  }
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
  height: 8px;
  border-radius: 1rem;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.progress-slider:hover {
  height: 10px;
  background: linear-gradient(90deg, var(--bg-tertiary), var(--bg-hover));
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.4);
  border: 2px solid white;
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 6px 16px rgba(var(--primary-color-rgb), 0.6);
}

.progress-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  cursor: pointer;
  border: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.4);
  border: 2px solid white;
}

.progress-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 6px 16px rgba(var(--primary-color-rgb), 0.6);
}

.player-controls-main {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.08);
}

.control-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(var(--primary-color-rgb), 0.4);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.control-btn.large {
  width: 52px;
  height: 52px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.play-mode-wrapper {
  position: absolute;
  right: 20px;
  top: 0;
  top:46%;
  height: 8%; /* 与player-controls-main相同的高度 */
  display: flex;
  align-items: center;
}

.play-mode-btn {
  position: relative;
}

.play-mode-btn::after {
  content: attr(title);
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1000;
}

.play-mode-btn:hover::after {
  opacity: 1;
}

.play-mode-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary-color, #4a90e2);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 1000;
  animation: tooltipFadeIn 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.play-mode-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--primary-color, #4a90e2);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 专门为播放模式tooltip创建的动画 */
.play-mode-tooltip {
  animation: tooltipFadeIn 0.3s ease;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
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
  
  .music-player-header {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
  }
  
  .header-left {
    order: 1;
    min-width: auto;
  }
  
  .header-center {
    order: 3;
    width: 100%;
    margin-top: 0.5rem;
    max-width: none;
  }
  
  .header-right {
    order: 2;
    min-width: auto;
  }
  
  .search-input {
    padding: 0.5rem 0.75rem;
    font-size: 0.85em;
  }
  
  .search-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.85em;
  }
  
  .dropdown-trigger {
    padding: 0.5rem 0.75rem;
    font-size: 0.85em;
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
  
  .playlist-container.expanded {
    height: 300px;
    min-height: 200px;
  }
  
  /* Apple Watch布局响应式 */
  .apple-watch-layout {
    min-height: 400px;
  }
  
  .apple-watch-layout .grid-song-info {
    width: 100px;
  }
}

@media (max-width: 768px) {
  .header-center {
    max-width: 400px;
  }
  
  .search-input::placeholder {
    font-size: 0.85em;
  }
  
  .apple-watch-layout {
    min-height: 350px;
  }
}

@media (max-width: 900px) {
  .header-center {
    max-width: 500px;
  }
  
  .apple-watch-layout {
    min-height: 400px;
  }
}

@media (min-width: 1200px) {
  .apple-watch-layout {
    min-height: 600px;
  }
}

@media (max-width: 768px) {
  .header-center {
    max-width: 400px;
  }
  
  .search-input::placeholder {
    font-size: 0.85em;
  }
}

@media (max-width: 900px) {
  .header-center {
    max-width: 500px;
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

/* 加载动画样式 */
.search-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.loader-circle {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 搜索加载容器 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  height: 100%;
  min-height: 200px;
}

.music-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 16px;
}

.loader-bar {
  width: 4px;
  height: 24px;
  background: var(--primary-color);
  border-radius: 2px;
  animation: musicLoader 1.2s ease-in-out infinite;
}

.loader-bar:nth-child(1) { animation-delay: -0.4s; }
.loader-bar:nth-child(2) { animation-delay: -0.2s; }
.loader-bar:nth-child(3) { animation-delay: 0s; }
.loader-bar:nth-child(4) { animation-delay: 0.2s; }

@keyframes musicLoader {
  0%, 40%, 100% {
    transform: scaleY(0.4);
    opacity: 0.5;
  }
  20% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
  animation: fadeInOut 1.5s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 歌曲加载状态 */
.playlist-item.loading {
  background: var(--bg-hover);
  border: 1px solid var(--primary-color);
}

.song-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.mini-loader {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 图片加载遮罩 */
.image-loader-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
}

.image-loader {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 加载状态提示 */
.loading-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.loading-dots {
  display: flex;
  gap: 2px;
}

.loading-dots span {
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: loadingDot 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes loadingDot {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.loading-message {
  animation: fadeInOut 1.5s ease-in-out infinite;
}

/* 禁用状态样式 */
.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.search-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}

/* 歌手名称点击样式 */
.artist-name {
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.artist-name:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.artist-separator {
  color: var(--text-secondary);
  cursor: default;
}

/* 歌手详情弹窗样式 */
.artist-detail-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.artist-detail-modal-content {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.artist-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.artist-detail-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.artist-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) var(--bg-hover);
}

.artist-detail-body::-webkit-scrollbar {
  width: 8px;
}

.artist-detail-body::-webkit-scrollbar-track {
  background: var(--bg-hover);
  border-radius: 10px;
}

.artist-detail-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border-radius: 10px;
}

.artist-basic-info {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.artist-basic-info::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
  animation: shimmer 3s ease-in-out infinite;
}

/* 歌手标签页样式 */
.artist-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.artist-tab {
  padding: 0.875rem 2rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.95rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
}

.artist-tab::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 12px;
}

.artist-tab:hover {
  color: var(--text-primary);
  transform: translateY(-2px);
}

.artist-tab:hover::before {
  opacity: 0.1;
}

.artist-tab.active {
  color: white;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  box-shadow: 0 6px 20px rgba(var(--primary-color-rgb), 0.3);
  transform: translateY(-2px);
}

.artist-tab.active::before {
  opacity: 1;
}

.artist-tab span {
  position: relative;
  z-index: 1;
}

.artist-avatar {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  transition: all 0.3s ease;
  border: 3px solid var(--bg-primary);
}

.artist-avatar:hover {
  transform: scale(1.05) rotate(2deg);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.artist-avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.2));
  pointer-events: none;
}

.artist-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.artist-avatar:hover img {
  transform: scale(1.1);
}

.artist-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.artist-details .artist-name {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textShimmer 3s ease-in-out infinite;
}

.artist-description {
  color: var(--text-secondary);
  margin: 0.75rem 0 1.5rem 0;
  line-height: 1.6;
  font-size: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.artist-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-hover));
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.stat-item::before {
  content: attr(data-label);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.artist-meta {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.identify-tag {
  display: inline-block;
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(var(--primary-color-rgb), 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.identify-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.identify-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--primary-color-rgb), 0.4);
}

.identify-tag:hover::before {
  left: 100%;
}

.artist-section {
  margin-bottom: 2.5rem;
}

.artist-section h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 12px;
  border-left: 4px solid var(--primary-color);
}

.artist-section h3 {
  padding-left: 0.5rem;
  border-left: 3px solid var(--primary-color);
}

.artist-songs-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.artist-song-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.artist-song-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 16px;
}

.artist-song-item:hover {
  transform: translateX(8px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.artist-song-item:hover::before {
  opacity: 0.05;
}

.artist-song-item:active {
  transform: translateX(8px) scale(0.98);
}

.song-index {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.artist-song-item:hover .song-index {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.1);
}

.song-cover {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.artist-song-item:hover .song-cover {
  transform: scale(1.1) rotate(3deg);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.song-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.3));
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.artist-song-item:hover .song-cover::after {
  opacity: 1;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.artist-song-item:hover .song-cover img {
  transform: scale(1.1);
}

.artist-song-item .song-info {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.artist-song-item .song-title {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  transition: color 0.3s ease;
}

.artist-song-item:hover .song-title {
  color: var(--primary-color);
}

.artist-song-item .song-album {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-song-item .song-album {
  padding-left: 0.5rem;
  border-left: 2px solid var(--border-color);
}

.artist-song-item .song-duration {
  color: var(--text-secondary);
  font-size: 0.9rem;
  background: var(--bg-secondary);
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.artist-song-item:hover .song-duration {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.05);
}

/* 无封面歌曲列表样式 */
.artist-song-item.no-cover {
  gap: 1rem;
  padding: 0.875rem 1.125rem;
}

.artist-song-item.no-cover .song-index {
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
}

.artist-song-item.no-cover .song-info-full {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.artist-song-item.no-cover .song-title {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}

.artist-song-item.no-cover .song-album {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-song-item.no-cover .song-duration {
  font-size: 0.85rem;
  padding: 0.25rem 0.625rem;
}

.artist-song-item.no-cover:hover {
  transform: translateX(6px) scale(1.01);
}

.artist-albums-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.artist-album-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.artist-album-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-info {
  text-align: center;
}

.album-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-date, .album-size {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 搜索输入容器 */
/* 移除search-input-container样式，已整合到header-center */

/* 搜索类型下拉菜单样式 */
.search-type-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dropdown-trigger svg {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-trigger svg.dropdown-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: var(--primary-color);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-item {
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  position: relative;
  color: white;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.15);
  padding-left: 1.5rem;
}

.dropdown-item.active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 600;
}

.dropdown-item.active::before {
  content: '✓';
  position: absolute;
  right: 1.25rem;
  font-weight: bold;
}

/* 第一个项目的圆角 */
.dropdown-item:first-child {
  border-radius: 1rem 1rem 0 0;
}

/* 最后一个项目的圆角 */
.dropdown-item:last-child {
  border-radius: 0 0 1rem 1rem;
}

/* 歌曲搜索结果项样式 */
.song-search-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.song-search-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent, rgba(var(--primary-color-rgb), 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.song-search-item:hover {
  background: var(--bg-hover);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.song-search-item:hover::before {
  opacity: 1;
}

.song-search-item.playing {
  background: linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.1), rgba(var(--primary-color-rgb), 0.05));
  border-left: 3px solid var(--primary-color);
  box-shadow: 0 4px 15px rgba(var(--primary-color-rgb), 0.2);
}

.song-search-item.playing::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-color-light));
  animation: pulse 2s infinite;
}

/* 圆角封面容器 */
.song-cover-container {
  flex-shrink: 0;
}

.song-cover-rounded {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.song-search-item:hover .song-cover-rounded {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.song-cover-rounded:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.song-cover-rounded img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-cover-rounded.default-cover {
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
}

.song-cover-rounded:hover .play-overlay {
  opacity: 1;
}

/* 歌曲信息容器 */
.song-info-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.song-search-item .song-title {
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.05em;
}

.song-search-item .song-title:hover {
  color: var(--primary-color);
  transform: translateX(2px);
}

.song-search-item .song-artist {
  font-size: 0.9em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.song-search-item:hover .song-artist {
  color: var(--text-primary);
}

.song-search-item .song-album {
  font-size: 0.85em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.song-search-item:hover .song-album {
  color: var(--text-secondary);
}

/* 右侧操作区域 */
.song-actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.song-search-item .song-duration {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

/* 搜索结果中的收藏按钮 */
.like-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
}

.like-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  color: var(--danger-color);
  transform: scale(1.1);
}

.like-btn.liked {
  color: var(--danger-color);
}

.like-btn.liked:hover {
  background: rgba(244, 67, 54, 0.2);
}

/* 歌单搜索结果样式 */
.playlist-result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.playlist-result-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent, rgba(var(--primary-color-rgb), 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.playlist-result-item:hover {
  background: var(--bg-hover);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.playlist-result-item:hover::before {
  opacity: 1;
}

.playlist-cover {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.playlist-result-item:hover .playlist-cover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.playlist-cover::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(var(--primary-color-rgb), 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.playlist-result-item:hover .playlist-cover::after {
  opacity: 1;
}

.playlist-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.05em;
  transition: color 0.3s ease;
}

.playlist-result-item:hover .playlist-name {
  color: var(--primary-color);
}

.playlist-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.playlist-result-item:hover .playlist-description {
  color: var(--text-primary);
}

.playlist-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.playlist-creator {
  font-weight: 500;
}

/* 歌手搜索结果样式 */
.artist-result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.artist-result-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent, rgba(var(--primary-color-rgb), 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.artist-result-item:hover {
  background: var(--bg-hover);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.artist-result-item:hover::before {
  opacity: 1;
}

.artist-avatar-small {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.artist-result-item:hover .artist-avatar-small {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.artist-avatar-small::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  background: linear-gradient(45deg, var(--primary-color), var(--primary-color-light)) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.artist-result-item:hover .artist-avatar-small::after {
  opacity: 1;
}

.artist-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-info-small {
  flex: 1;
}

.artist-name-small {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  font-size: 1.1em;
  transition: color 0.3s ease;
}

.artist-result-item:hover .artist-name-small {
  color: var(--primary-color);
}

.artist-stats-small {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.artist-result-item:hover .artist-stats-small {
  color: var(--text-primary);
}

.artist-stats-small span {
  padding: 2px 8px;
  background: rgba(var(--primary-color-rgb), 0.1);
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.artist-result-item:hover .artist-stats-small span {
  background: rgba(var(--primary-color-rgb), 0.2);
}

/* 专辑搜索结果样式 */
.album-result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.album-result-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent, rgba(var(--primary-color-rgb), 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.album-result-item:hover {
  background: var(--bg-hover);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.album-result-item:hover::before {
  opacity: 1;
}

.album-cover-small {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.album-result-item:hover .album-cover-small {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.album-cover-small::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(var(--primary-color-rgb), 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-result-item:hover .album-cover-small::after {
  opacity: 1;
}

.album-cover-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-info-small {
  flex: 1;
}

.album-name-small {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  font-size: 1.05em;
  transition: color 0.3s ease;
}

.album-result-item:hover .album-name-small {
  color: var(--primary-color);
}

.album-artist-small {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.album-result-item:hover .album-artist-small {
  color: var(--text-primary);
}

.album-meta-small {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  transition: color 0.3s ease;
}

.album-result-item:hover .album-meta-small {
  color: var(--text-secondary);
}

.album-meta-small span {
  padding: 2px 8px;
  background: rgba(var(--primary-color-rgb), 0.1);
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.album-result-item:hover .album-meta-small span {
  background: rgba(var(--primary-color-rgb), 0.2);
}

/* 专辑详情弹窗样式 */
/* 歌单详情弹窗样式 */
.playlist-detail-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10002;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.playlist-detail-modal-content {
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.playlist-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.playlist-detail-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.playlist-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) var(--bg-hover);
}

.playlist-detail-body::-webkit-scrollbar {
  width: 8px;
}

.playlist-detail-body::-webkit-scrollbar-track {
  background: var(--bg-hover);
  border-radius: 10px;
}

.playlist-detail-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border-radius: 10px;
}

.playlist-info-section {
  margin-bottom: 2rem;
}

.playlist-basic-info {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.playlist-cover-large {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  border: 3px solid var(--bg-primary);
}

.playlist-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.playlist-cover-large:hover img {
  transform: scale(1.1);
}

.playlist-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.playlist-details .playlist-name {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.2;
}

.playlist-details .playlist-creator {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

.playlist-details .playlist-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.6;
  max-height: 4.8em;
  overflow-y: auto;
  padding-right: 0.5em;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.playlist-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.playlist-stats .stat-item {
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
  font-size: 0.9rem;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.playlist-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.playlist-tags .tag-item {
  padding: 0.4rem 0.8rem;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 0.85rem;
}

.playlist-songs-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
}

.playlist-songs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.playlist-song-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.playlist-song-item:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  transform: translateX(5px);
}

.playlist-song-item .song-index {
  width: 30px;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

.playlist-song-item .song-cover-small {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.playlist-song-item .song-cover-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playlist-song-item .song-info-full {
  flex: 1;
  min-width: 0;
}

.playlist-song-item .song-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-song-item .song-artist {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-song-item .song-album-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-song-item .song-duration {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.album-detail-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10002;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.album-detail-modal-content {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.album-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.album-detail-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.album-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) var(--bg-hover);
}

.album-detail-body::-webkit-scrollbar {
  width: 8px;
}

.album-detail-body::-webkit-scrollbar-track {
  background: var(--bg-hover);
  border-radius: 10px;
}

.album-detail-body::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border-radius: 10px;
}

.album-basic-info {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.album-basic-info::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
  animation: shimmer 3s ease-in-out infinite;
}

.album-cover-large {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  position: relative;
  transition: all 0.3s ease;
  border: 3px solid var(--bg-primary);
}

.album-cover-large:hover {
  transform: scale(1.05) rotate(-2deg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.album-cover-large::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.2));
  pointer-events: none;
}

.album-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.album-cover-large:hover img {
  transform: scale(1.1);
}

.album-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.album-details .album-name {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textShimmer 3s ease-in-out infinite;
}

.album-artist {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.album-artist {
  padding-left: 0.5rem;
  border-left: 2px solid var(--border-color);
}

.album-publish-date {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0.5rem 0;
}

.album-publish-date {
  padding-left: 0.5rem;
  border-left: 2px solid var(--border-color);
}

.album-description {
  color: var(--text-secondary);
  margin: 1rem 0 1.5rem 0;
  line-height: 1.6;
  font-size: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.album-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-hover));
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.stat-item::before {
  content: attr(data-label);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.album-section {
  margin-bottom: 2.5rem;
}

.album-section h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 12px;
  border-left: 4px solid var(--primary-color);
}

.album-section h3 {
  padding-left: 0.5rem;
  border-left: 3px solid var(--primary-color);
}

.album-songs-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.album-song-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.album-song-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 16px;
}

.album-song-item:hover {
  transform: translateX(8px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.album-song-item:hover::before {
  opacity: 0.05;
}

.album-song-item:active {
  transform: translateX(8px) scale(0.98);
}

.album-song-item .song-index {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.album-song-item:hover .song-index {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.1);
}

.album-song-item .song-cover {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.album-song-item:hover .song-cover {
  transform: scale(1.1) rotate(3deg);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.album-song-item .song-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.3));
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-song-item:hover .song-cover::after {
  opacity: 1;
}

.album-song-item .song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.album-song-item:hover .song-cover img {
  transform: scale(1.1);
}

.album-song-item .song-info {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.album-song-item .song-title {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  transition: color 0.3s ease;
}

.album-song-item:hover .song-title {
  color: var(--primary-color);
}

.album-song-item .song-artist {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-song-item .song-artist {
  padding-left: 0.5rem;
  border-left: 2px solid var(--border-color);
}

.album-song-item .song-duration {
  color: var(--text-secondary);
  font-size: 0.9rem;
  background: var(--bg-secondary);
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.album-song-item:hover .song-duration {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.05);
}

/* 加载动画样式 */
.image-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

.image-loader {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 骨架屏样式 */
.loading-skeleton {
  animation: fadeIn 0.5s ease;
}

.song-skeleton-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
}

.skeleton-index {
  width: 30px;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-cover {
  width: 40px;
  height: 40px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-title {
  width: 60%;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-artist {
  width: 40%;
  height: 14px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-duration {
  width: 40px;
  height: 14px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 加载更多按钮样式 */
/* 翻页组件样式 */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1rem;
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
}

.pagination-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  padding: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.pagination-btn.page-number {
  min-width: 36px;
}

.pagination-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination-ellipsis {
  padding: 0.5rem;
  color: var(--text-secondary);
  user-select: none;
}

.no-more-results {
  text-align: center;
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
}

/* 网格视图按钮样式 */
.grid-view-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.grid-view-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.grid-view-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 网格视图容器 */
.grid-view-container {
  height: 100%;
  overflow-y: auto;
  position: relative;
  padding: 1rem;
}

/* Apple Watch布局容器 */
.apple-watch-layout {
  min-height: 500px;
  position: relative;
  overflow: hidden;
}

/* 网格歌曲项 */
.grid-song-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  position: relative;
  border: 1px solid transparent;
  aspect-ratio: 1; /* 确保始终为正方形 */
}

/* Apple Watch布局中的网格项 */
.apple-watch-layout .grid-song-item {
  position: absolute;
  border-radius: 50%; /* 圆形设计，更像Apple Watch */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.grid-song-item:hover {
  z-index: 10;
  border-color: var(--primary-color);
  box-shadow: 0 8px 24px rgba(var(--primary-color-rgb), 0.2);
}

.grid-song-item.playing {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.05);
}

/* 网格封面 */
.grid-song-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--bg-secondary);
}

.apple-watch-layout .grid-song-cover {
  border-radius: 50%; /* 圆形封面 */
}

.grid-song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.apple-watch-layout .grid-song-cover img {
  border-radius: 50%;
}

.grid-song-item:hover .grid-song-cover img {
  transform: scale(1.05);
}

/* 网格播放覆盖层 */
.grid-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
}

.grid-song-item:hover .grid-play-overlay {
  opacity: 1;
}

/* 播放状态指示器 */
.playing-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
}

.apple-watch-layout .playing-indicator {
  bottom: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border: 2px solid white;
}

.playing-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.playing-bars .bar {
  width: 2px;
  background: white;
  animation: playingBar 0.8s ease-in-out infinite;
}

.playing-bars .bar:nth-child(1) { animation-delay: 0s; height: 6px; }
.playing-bars .bar:nth-child(2) { animation-delay: 0.2s; height: 10px; }
.playing-bars .bar:nth-child(3) { animation-delay: 0.4s; height: 8px; }
.playing-bars .bar:nth-child(4) { animation-delay: 0.6s; height: 12px; }

@keyframes playingBar {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

/* 网格歌曲信息 */
.grid-song-info {
  padding: 0.75rem;
  position: relative;
  display: none; /* 在Apple Watch布局中默认隐藏 */
}

.apple-watch-layout .grid-song-info {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
  display: block;
  width: 200px;
  max-width: 90vw;
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.apple-watch-layout .grid-song-item:hover .grid-song-info {
  opacity: 1;
  visibility: visible;
}

.grid-song-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
}

.grid-song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.grid-song-album {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.grid-song-duration {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.grid-song-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.grid-add-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.grid-add-btn:hover {
  background: var(--primary-hover);
  transform: scale(1.1);
}

/* 扩大搜索结果页面占比 */
.playlist-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  max-height: 600px; /* 增加最大高度 */
}

.music-player-modal-content {
  width: 90%;
  max-width: 1000px;
  height: 90%;
  max-height: 900px;
}

.playlist-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: none; /* 移除高度限制 */
}

/* 动画关键帧 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUpScale {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes textShimmer {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* 用户相关样式 */
.user-info-container {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  transition: all 0.3s ease;
  height: 36px;
}

.user-info-container:hover {
  background: rgba(255, 255, 255, 0.15);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.user-avatar:hover {
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.user-name {
  font-size: 0.85rem;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 280px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 10005;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu {
  padding: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
}

.user-avatar-large {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-color);
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.user-level {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.75rem 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item.logout {
  color: var(--danger-color, #F44336);
}

.menu-item.logout:hover {
  background: rgba(244, 67, 54, 0.1);
}

/* 登出确认弹窗样式 */
.logout-confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10004;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.logout-confirm-modal-content {
  width: 90%;
  max-width: 380px;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.logout-confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.logout-confirm-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
}

.logout-confirm-body {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.logout-confirm-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 50%;
  color: #F44336;
  margin-bottom: 0.5rem;
}

.logout-confirm-text {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.logout-confirm-user {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.logout-confirm-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 0 0 20px 20px;
}

/* 删除歌单确认弹窗样式 */
.delete-confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10004;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.delete-confirm-modal-content {
  width: 90%;
  max-width: 380px;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.delete-confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.delete-confirm-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
}

.delete-confirm-body {
  flex: 1;
  padding: 2rem;
  text-align: center;
}

.delete-confirm-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--danger-color);
}

.delete-confirm-text {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.delete-confirm-playlist-name {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.delete-confirm-warning {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.delete-confirm-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: var(--bg-secondary);
  border-radius: 0 0 20px 20px;
}

.confirm-btn.danger {
  background: var(--danger-color);
  color: white;
}

.confirm-btn.danger:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 0.875rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 600;
}

.cancel-btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background: var(--bg-hover);
  transform: translateY(-1px);
}

.confirm-btn {
  background: #F44336;
  color: white;
}

.confirm-btn:hover {
  background: #D32F2F;
  transform: translateY(-1px);
}

/* 主页样式 */
.home-page {
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
  padding-bottom: 70px; /* 为底部播放控件预留空间，与bottom-player高度一致 */
}

.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-radius: 0;
  padding: 1.5rem;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  border-left: none;
  border-top: none;
  border-bottom: none;
}

.sidebar-section {
  margin-bottom: 2rem;
}

.sidebar-section:last-child {
  margin-bottom: 0;
}

.sidebar-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.user-playlists-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.playlist-item:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
}

.playlist-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.playlist-count {
  font-size: 0.8rem;
  color: white;
  white-space: nowrap;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  border-right: none;
  border-left: none;
  border-top: none;
  border-bottom: none;
}

.main-content.full-width {
  flex: 1;
  width: 100%;
}

/* 登录提示样式 */
.login-prompt-section {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.login-prompt-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.login-prompt-icon {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

.login-prompt-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.login-prompt-description {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 2rem 0;
}

.login-prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-prompt-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.recommend-section {
  margin-bottom: 2rem;
}

.recommend-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-weight: 600;
}

.recommend-playlists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.recommend-songs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recommend-playlist-item {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  text-align: center;
}

.recommend-playlist-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.recommend-song-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recommend-song-item:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
}

.recommend-playlist-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 0.75rem;
}

.recommend-song-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.recommend-playlist-info {
  text-align: center;
}

.recommend-song-info {
  flex: 1;
  min-width: 0;
}

.recommend-playlist-name {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-song-name {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-playlist-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.recommend-song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-add-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recommend-add-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.loading-placeholder, .empty-placeholder {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
  font-size: 0.9rem;
}

/* 底部播放控件样式 */
.bottom-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.bottom-player-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 1rem;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.bottom-song-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
  max-width: 300px;
}

.bottom-song-cover {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.bottom-song-cover:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.bottom-song-cover::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.3s ease;
}

.bottom-song-cover:hover::after {
  background: rgba(255, 255, 255, 0.1);
}

.bottom-song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-song-cover {
  width: 100%;
  height: 100%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 6px;
}

.bottom-song-details {
  min-width: 0;
  flex: 1;
}

.bottom-song-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.bottom-song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bottom-song-artist .artist-name.clickable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.bottom-song-artist .artist-name.clickable:hover {
  color: var(--primary-color);
}

.artist-separator {
  margin: 0 2px;
}

.bottom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bottom-control-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-control-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.bottom-play-btn {
  background: var(--primary-color);
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.25rem;
}

.bottom-play-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: scale(1.05);
}

.bottom-play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bottom-control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bottom-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
}

.bottom-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 35px;
  text-align: center;
}

.bottom-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-hover);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.bottom-progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.bottom-right-controls {
  display: flex;
  align-items: center;
}

.bottom-playlist-btn {
  position: relative;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-playlist-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.bottom-playlist-btn.active {
  color: var(--primary-color);
}

.bottom-playlist-count {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  line-height: 1;
}

.header-title {
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-title:hover {
  color: var(--primary-color);
  transform: scale(1.02);
}

.menu-item svg {
  flex-shrink: 0;
}

/* 最小化按钮样式 */
.minimize-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  margin-right: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.minimize-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: white;
  transform: scale(1.05);
}

.minimize-btn:active {
  transform: scale(0.95);
}

/* 悬浮播放器样式 */
.mini-player {
  position: fixed;
  width: 300px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  user-select: none;
  cursor: move;
  will-change: transform;
  transition: box-shadow 0.2s ease;
}

.mini-player:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.mini-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.mini-song-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.mini-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  margin-right: 10px;
  flex-shrink: 0;
}

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-details {
  flex: 1;
  min-width: 0;
}

.mini-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-artist {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-controls {
  display: flex;
  gap: 4px;
}

.mini-restore-btn,
.mini-close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.mini-restore-btn:hover,
.mini-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mini-progress {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.mini-progress-slider {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  margin-bottom: 6px;
}

.mini-progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
}

.mini-progress-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.mini-time {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.mini-player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  gap: 8px;
}

.mini-control-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.mini-control-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mini-control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-control-btn.active {
  color: var(--primary-color);
}

.mini-separator {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
}

.mini-playlist-count {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--primary-color);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

/* 悬浮播放器播放列表菜单 */
.mini-playlist-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow: hidden;
  transform-origin: bottom center;
  animation: slideDown 0.3s ease-out;
  z-index: 10001;
}

/* 向下展开的播放列表菜单 */
.mini-playlist-menu.menu-down {
  bottom: auto;
  top: 100%;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform-origin: top center;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: scaleY(0) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: scaleY(0) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
}

.mini-playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}

.mini-playlist-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.mini-close-playlist-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.mini-close-playlist-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mini-playlist-content {
  max-height: 250px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.mini-empty-playlist {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.mini-playlist-items {
  padding: 4px 0;
}

.mini-playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mini-playlist-item:hover {
  background: var(--bg-hover);
}

.mini-playlist-item.playing {
  background: var(--primary-color-opacity);
  color: var(--primary-color);
  position: relative;
}

.mini-playlist-item.playing::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary-color);
  border-radius: 0 2px 2px 0;
}

.mini-item-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.mini-item-index {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 8px;
  min-width: 16px;
}

.mini-item-title {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.mini-item-artist {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-item-duration {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

/* 滚动条样式 */
.mini-playlist-content::-webkit-scrollbar {
  width: 4px;
}

.mini-playlist-content::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.mini-playlist-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.mini-playlist-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 音乐播放器专属通知 */
.music-notification {
  position: fixed;
  z-index: 10000;
  min-width: 300px;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  animation: notificationSlideIn 0.3s ease-out;
  transition: all 0.3s ease;
}

.music-notification.success {
  background: rgba(52, 211, 153, 0.9);
  color: white;
}

.music-notification.warning {
  background: rgba(251, 191, 36, 0.9);
  color: white;
}

.music-notification.danger {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

.music-notification.info {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

@keyframes notificationSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 收藏和歌单管理样式 ========== */

/* 歌曲操作按钮组 */
.recommend-song-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.recommend-like-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recommend-like-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  color: var(--danger-color);
  transform: scale(1.1);
}

.recommend-like-btn.liked {
  color: var(--danger-color);
}

.recommend-like-btn.liked:hover {
  background: rgba(244, 67, 54, 0.2);
}

/* 侧边栏头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.create-playlist-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
  position: relative;
  overflow: hidden;
}

.create-playlist-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.create-playlist-btn:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--primary-color-rgb), 0.4);
}

.create-playlist-btn:hover::before {
  left: 100%;
}

.create-playlist-btn:active {
  transform: scale(0.98) translateY(-1px);
}

/* 歌单项布局 */
.playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.playlist-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.playlist-item:hover {
  background: var(--bg-hover);
}



.playlist-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.playlist-item:hover .playlist-actions {
  opacity: 1;
}

.playlist-action-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.playlist-action-btn:hover {
  background: var(--bg-hover);
}

.playlist-action-btn.edit:hover {
  color: var(--primary-color);
}

.playlist-action-btn.delete:hover {
  color: var(--danger-color);
}

/* 推荐歌单项布局 */
.recommend-playlist-item {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  text-align: center;
  position: relative;
}

.recommend-playlist-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.recommend-playlist-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.recommend-playlist-subscribe-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.recommend-playlist-subscribe-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.recommend-playlist-subscribe-btn:has(svg[fill="currentColor"]) {
  color: var(--danger-color);
}

.recommend-playlist-subscribe-btn:has(svg[fill="currentColor"]):hover {
  background: var(--danger-color);
  color: white;
}

/* 歌单模态框样式 */
.playlist-modal {
  width: 90%;
  max-width: 520px;
  background: var(--bg-primary);
  border-radius: 20px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* 创建歌单模态框 */
.create-playlist-modal {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
}

.create-playlist-header {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
}

.create-playlist-close {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.create-playlist-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  transform: scale(1.1);
}

.create-playlist-content {
  display: flex;
  padding: 40px;
  gap: 40px;
  flex: 1;
  overflow-y: auto;
}

.create-playlist-cover-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.playlist-cover-preview {
  position: relative;
  width: 200px;
  height: 200px;
}

.cover-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color, #ec4899));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.cover-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
}

.cover-overlay {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.create-playlist-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.create-playlist-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.create-playlist-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 0 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--danger-color);
}

.optional {
  color: var(--text-muted);
  font-size: 12px;
}

.input-container {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 59, 130, 246), 0.1);
}

.input-counter {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-muted);
}

.textarea-container {
  position: relative;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 59, 130, 246), 0.1);
}

.textarea-counter {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.privacy-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.privacy-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.privacy-option:hover {
  background: var(--bg-secondary);
}

.privacy-option input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
}

.privacy-label {
  font-weight: 500;
  color: var(--text-primary);
}

.privacy-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

.create-playlist-fixed-actions {
  position: absolute;
  bottom: 24px;
  left: 24px;
  display: flex;
  gap: 12px;
  z-index: 100;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.create-playlist-fixed-actions:hover {
  opacity: 1;
}

.action-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-btn.primary {
  background: var(--primary-color);
  color: white;
  position: relative;
  z-index: 10;
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--primary-color-dark);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .create-playlist-content {
    flex-direction: column;
    padding: 24px;
    gap: 24px;
    padding-bottom: 80px; /* 为固定按钮留出空间 */
  }
  
  .create-playlist-cover-section {
    order: 2;
  }
  
  .create-playlist-info-section {
    order: 1;
  }
  
  .playlist-cover-preview {
    width: 160px;
    height: 160px;
  }
  
  .create-playlist-fixed-actions {
    bottom: 16px;
    left: 16px;
    right: 16px;
    justify-content: stretch;
  }
  
  .action-btn {
    flex: 1;
  }
}

.modern-modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 20px;
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 236, 72, 153), 0.05), 
    transparent
  );
  border-bottom: 1px solid var(--border-light);
  position: relative;
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 236, 72, 153), 0.3);
  flex-shrink: 0;
}

.edit-icon {
  background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
  box-shadow: 0 4px 12px rgba(var(--secondary-color-rgb, 59, 130, 246), 0.3);
}

.modal-title-section {
  flex: 1;
  min-width: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.modern-modal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.modern-modal-close-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
  color: var(--text-primary);
  transform: scale(1.05);
}

.modern-modal-body {
  padding: 24px;
}

.form-group-modern {
  margin-bottom: 24px;
}

.form-label-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.form-label-modern {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
}

.required-mark {
  color: var(--danger-color);
  font-size: 0.75rem;
  font-weight: 600;
}

.optional-mark {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: 400;
}

.input-wrapper, .textarea-wrapper {
  position: relative;
}

.form-control-modern {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.4;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.form-control-modern:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 236, 72, 153), 0.1);
}

.form-control-modern.has-content {
  border-color: var(--primary-color);
}

.form-control-modern::placeholder {
  color: var(--text-tertiary);
}

.textarea-modern {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.input-counter, .textarea-counter {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: var(--bg-primary);
  padding: 2px 4px;
  border-radius: 4px;
  pointer-events: none;
}

.playlist-preview {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.preview-header {
  margin-bottom: 12px;
}

.preview-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.preview-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.preview-info {
  flex: 1;
  min-width: 0;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.modern-modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
}

.modern-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
}

.modern-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.modern-btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.modern-btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-dark);
  transform: translateY(-1px);
}

.modern-btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 236, 72, 153), 0.3);
}

.modern-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--primary-color-rgb, 236, 72, 153), 0.4);
}

.modern-btn-primary.loading {
  pointer-events: none;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  flex-shrink: 0;
}

.loading-icon {
  flex-shrink: 0;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 4px 0;
  min-width: 160px;
  z-index: 10007;
  animation: contextMenuFadeIn 0.15s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-item.danger {
  color: var(--danger-color);
}

.context-menu-item.danger:hover {
  background: rgba(var(--danger-color-rgb, 239, 68, 68), 0.1);
}

.context-menu-item svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.context-menu-divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 8px;
}

.context-menu-submenu {
  position: relative;
}

.context-menu-submenu-content {
  position: absolute;
  left: 100%;
  top: -4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 4px 0;
  min-width: 180px;
  max-height: 300px;
  overflow-y: auto;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-8px);
  transition: all 0.15s ease;
  z-index: 10008;
}

.context-menu-submenu:hover .context-menu-submenu-content {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.submenu-arrow {
  margin-left: auto;
  flex-shrink: 0;
}

.submenu-playlist-cover {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}



/* 暗色主题适配 */
[data-theme="dark"] .modern-modal {
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .modern-modal-header {
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 236, 72, 153), 0.1), 
    transparent
  );
}

[data-theme="dark"] .context-menu {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .context-menu-submenu-content {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10006;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  animation: fadeIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-40px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  position: relative;
}

.modal-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 2.5rem;
  right: 2.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-close-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.3);
  color: var(--danger-color);
  transform: rotate(90deg) scale(1.1);
}

.modal-body {
  padding: 2.5rem;
  background: var(--bg-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 2rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  position: relative;
}

.modal-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 2.5rem;
  right: 2.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
  letter-spacing: 0.025em;
}

.form-control {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(var(--primary-color-rgb), 0.15);
  transform: translateY(-1px);
}

.form-control::placeholder {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.form-control.textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 2rem;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  letter-spacing: 0.025em;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn:disabled::before {
  display: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 4px 15px rgba(var(--primary-color-rgb), 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(var(--primary-color-rgb), 0.4);
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
}

.btn-primary:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-secondary:hover:not(:disabled)::before {
  left: 100%;
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}
</style>