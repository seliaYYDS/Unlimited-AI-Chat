<template>
  <div class="music-player-modal-overlay" v-if="visible && !isMinimized" @click="closePlayer">
    <div class="music-player-modal-content" @click.stop>
      <div class="music-player-header">
        <div class="header-left">
          <h3>音乐播放器</h3>
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
          <div class="user-info-container" @click="showUserMenu">
            <div v-if="isLoggedIn && userInfo" class="user-avatar">
              <img :src="userInfo.avatarUrl || defaultAlbumArt" :alt="userInfo.nickname" />
            </div>
            <div v-else class="login-btn" @click="openLoginModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
              <span>登录</span>
            </div>
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
              <div class="menu-item logout" @click="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                退出登录
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
        
        <!-- 播放列表 -->
        <div class="playlist-section">
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
            <div class="song-image" v-if="currentSong">
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
            <div v-if="artistAllSongsTotal > 0" class="pagination-container">
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
              <div v-if="fullPlaylistSongs.length > 0" class="pagination-container">
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
      :api-url="apiUrl"
      @close="hideLoginModal"
      @login-success="handleLoginSuccess"
      @user-info-updated="handleUserInfoUpdated"
    />
  </div>
  
  <!-- 最小化悬浮播放器 -->
  <div 
    v-if="visible && isMinimized" 
    class="mini-player"
    :style="{ left: displayPosition.x + 'px', top: displayPosition.y + 'px' }"
    @mousedown="startDragMiniPlayer"
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
</template>

<script>
import { MusicColorExtractor } from '../utils/musicColorExtractor.js'
import MusicLogin from './MusicLogin.vue'

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
    'playPrevMusic'
  ],
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
      searchType: 'songs', // 搜索类型：songs, playlists, artists
      currentPlaylist: [],
      showSearchResults: false,
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
      showUserDropdown: false,
      isLoggedIn: false,
      userInfo: null,
      userLevel: null,
      loginCookie: '',
      // 播放列表菜单
      showPlaylistMenu: false,
      // 拖拽相关
      draggedItemIndex: null,
      draggedOverIndex: null,
      // 搜索结果缓存
      searchCache: {
        songs: [],
        playlists: [],
        artists: [],
        albums: []
      },
      // 当前搜索查询缓存
      searchQueryCache: '',
      // 歌单详情加载状态
      isLoadingPlaylist: false,
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
    }
  },
  mounted() {
    // 加载保存的音量设置
    this.loadSavedVolume();
    // 加载保存的播放模式
    this.loadPlayMode();
    this.initAudio();
    this.loadDefaultPlaylist();
    // 添加点击外部关闭下拉菜单的事件监听
    document.addEventListener('click', this.handleClickOutside);
    // 初始化网格项目引用数组
    this.gridItemRefs = [];
    // 初始化音乐颜色提取器
    this.musicColorExtractor = new MusicColorExtractor();
    // 检查登录状态
    this.checkLoginStatus();
  },
  beforeUnmount() {
    // 移除事件监听
    document.removeEventListener('click', this.handleClickOutside);
    // 停止物理模拟
    this.stopPhysicsSimulation();
    // 清理播放模式提示定时器
    if (this.playModeTooltipTimer) {
      clearTimeout(this.playModeTooltipTimer);
    }
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
        this.$emit('notify', `搜索失败: ${error.message}`, 'danger');
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
      const response = await fetch(`${this.apiUrl}/cloudsearch?keywords=${encodeURIComponent(this.searchQuery)}&type=1&limit=${this.pageSize}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.result && data.result.songs) {
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
        } else {
          this.searchCache.songs = [];
          this.searchResults = [];
          this.currentPlaylist = [];
          this.totalResults = 0;
        }
      } else {
        this.searchCache.songs = [];
        this.searchResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
      }
    },

    // 搜索歌单
    async searchPlaylists() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const response = await fetch(`${this.apiUrl}/cloudsearch?keywords=${encodeURIComponent(this.searchQuery)}&type=1000&limit=${this.pageSize}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.result && data.result.playlists) {
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
      } else {
        this.searchCache.playlists = [];
        this.playlistResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
      }
    },

    // 搜索歌手
    async searchArtists() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const response = await fetch(`${this.apiUrl}/cloudsearch?keywords=${encodeURIComponent(this.searchQuery)}&type=100&limit=${this.pageSize}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.result && data.result.artists) {
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
      } else {
        this.searchCache.artists = [];
        this.artistSearchResults = [];
        this.currentPlaylist = [];
        this.totalResults = 0;
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
      
      if (cachedResults.length > 0) {
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
    async getPlaylistDetail(playlistId) {
      try {
        // 立即显示加载动画
        this.isLoadingPlaylist = true;
        this.showPlaylistDetail = true;
        
        const response = await fetch(`${this.apiUrl}/playlist/detail?id=${playlistId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.playlist && data.playlist.tracks) {
            const songs = data.playlist.tracks.map(song => ({
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
            
            // 保存歌单详情信息
            this.playlistDetail = {
              id: data.playlist.id,
              name: data.playlist.name,
              description: data.playlist.description || '',
              coverImgUrl: data.playlist.coverImgUrl,
              creator: data.playlist.creator ? data.playlist.creator.nickname : '未知',
              playCount: data.playlist.playCount,
              trackCount: data.playlist.trackCount,
              tags: data.playlist.tags || []
            };
            
            // 保存完整的歌单歌曲列表
            this.fullPlaylistSongs = songs;
            
            // 重置分页并显示第一页
            this.playlistDetailPage = 1;
            const startIndex = 0;
            const endIndex = Math.min(this.pageSize, songs.length);
            this.playlistDetailSongs = songs.slice(startIndex, endIndex);
            
            // 显示歌单详情界面
            this.showPlaylistDetail = true;
            
            this.$emit('notify', `已加载歌单: ${data.playlist.name} (共${songs.length}首歌曲)`, 'success');
          }
        }
      } catch (error) {
        console.error('获取歌单详情失败:', error);
        this.$emit('notify', `获取歌单详情失败: ${error.message}`, 'danger');
      } finally {
        // 重置歌单加载状态
        this.isLoadingPlaylist = false;
      }
    },

    // 搜索专辑
    async searchAlbums() {
      const offset = (this.currentPage - 1) * this.pageSize;
      const response = await fetch(`${this.apiUrl}/cloudsearch?keywords=${encodeURIComponent(this.searchQuery)}&type=10&limit=${this.pageSize}&offset=${offset}`);
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
    async getAlbumDetail(albumId) {
      if (!albumId) return;
      
      // 立即显示加载动画
      this.isLoadingAlbum = true;
      this.showAlbumDetail = true;
      
      try {
        const response = await fetch(`${this.apiUrl}/album?id=${albumId}`);
        const data = await response.json();
        
        
        
        if (data.code === 200 && data.album) {
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
          }
          
          this.showAlbumDetail = true;
        }
      } catch (error) {
        console.error('获取专辑详情失败:', error);
        this.$emit('notify', `获取专辑详情失败: ${error.message}`, 'danger');
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
      } finally {
        this.isLoadingSong = false;
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
    },
    
    // 恢复播放器
    restorePlayer() {
      this.isMinimized = false;
    },
    
    // 开始拖拽悬浮播放器
    startDragMiniPlayer(event) {
      if (event.target.closest('.mini-controls') || 
          event.target.closest('.mini-player-controls') || 
          event.target.closest('.mini-progress') ||
          event.target.closest('.mini-playlist-menu')) {
        return; // 如果点击的是控制按钮或播放列表菜单，不启动拖拽
      }
      
      this.isDraggingMiniPlayer = true;
      this.dragOffset.x = event.clientX - this.miniPlayerPosition.x;
      this.dragOffset.y = event.clientY - this.miniPlayerPosition.y;
      
      document.addEventListener('mousemove', this.onDragMiniPlayerThrottled);
      document.addEventListener('mouseup', this.stopDragMiniPlayer);
      
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
      
      // 更新实际位置
      this.miniPlayerPosition.x = event.clientX - this.dragOffset.x;
      this.miniPlayerPosition.y = event.clientY - this.dragOffset.y;
      
      // 限制在窗口范围内
      const maxX = window.innerWidth - 300; // 悬浮窗宽度约300px
      const maxY = window.innerHeight - 120; // 悬浮窗高度约120px
      
      this.miniPlayerPosition.x = Math.max(0, Math.min(this.miniPlayerPosition.x, maxX));
      this.miniPlayerPosition.y = Math.max(0, Math.min(this.miniPlayerPosition.y, maxY));
      
      // 使用滞后效果更新显示位置
      this.updateDisplayPosition();
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
      document.removeEventListener('mousemove', this.onDragMiniPlayerThrottled);
      document.removeEventListener('mouseup', this.stopDragMiniPlayer);
      
      // 确保最终位置准确
      if (this.dragAnimationId) {
        cancelAnimationFrame(this.dragAnimationId);
        this.dragAnimationId = null;
      }
      this.displayPosition.x = this.miniPlayerPosition.x;
      this.displayPosition.y = this.miniPlayerPosition.y;
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
      if (!song || !song.id || !playlist || !Array.isArray(playlist)) return -1;
      return playlist.findIndex(s => s && s.id === song.id);
    },

    // 获取歌手详情
    async getArtistDetail(artistId) {
      if (!artistId) return;
      
      // 立即显示加载动画
      this.isLoadingArtist = true;
      this.showArtistDetail = true;
      
      try {
        // 获取歌手基本信息
        const detailResponse = await fetch(`${this.apiUrl}/artist/detail?id=${artistId}`);
        const detailData = await detailResponse.json();
        
        // 获取歌手热门歌曲
        const hotSongsResponse = await fetch(`${this.apiUrl}/artist/top/song?id=${artistId}`);
        const hotSongsData = await hotSongsResponse.json();
        
        // 获取歌手全部歌曲
        const allSongsResponse = await fetch(`${this.apiUrl}/artist/songs?id=${artistId}&limit=100&order=hot`);
        const allSongsData = await allSongsResponse.json();
        
        // 获取歌手专辑
        const albumsResponse = await fetch(`${this.apiUrl}/artist/album?id=${artistId}&limit=50`);
        const albumsData = await albumsResponse.json();
        
        // 获取歌手描述
        const descResponse = await fetch(`${this.apiUrl}/artist/desc?id=${artistId}`);
        const descData = await descResponse.json();
        
        
        
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
        if (hotSongsData.code === 200 && hotSongsData.songs) {
          this.artistSongs = hotSongsData.songs.map(song => ({
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
        }
        
        // 处理全部歌曲 - 一次性获取所有歌曲
        if (allSongsData.code === 200 && allSongsData.songs) {
          const allSongs = allSongsData.songs.map(song => ({
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
          this.fullArtistAllSongs = allSongs;
          this.artistAllSongsTotal = allSongsData.total || allSongs.length;
          
          // 重置分页并显示第一页
          this.artistAllSongsPage = 1;
          const startIndex = 0;
          const endIndex = Math.min(this.pageSize, allSongs.length);
          this.artistAllSongs = allSongs.slice(startIndex, endIndex);
        }
        
        // 处理专辑
        if (albumsData.code === 200 && albumsData.hotAlbums) {
          this.artistAlbums = albumsData.hotAlbums.map(album => ({
            ...album,
            picUrl: album.picUrl || album.blurPicUrl || this.defaultAlbumArt
          }));
        }
        
        this.showArtistDetail = true;
      } catch (error) {
        console.error('获取歌手详情失败:', error);
        this.$emit('notify', `获取歌手详情失败: ${error.message}`, 'danger');
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
      if (!event.target.closest('.search-type-dropdown')) {
        this.showSearchTypeDropdown = false;
      }
      if (!event.target.closest('.user-info-container') && !event.target.closest('.user-dropdown')) {
        this.showUserDropdown = false;
      }
      if (!event.target.closest('.playlist-button-container')) {
        this.showPlaylistMenu = false;
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
        this.$emit('notify', '无法识别歌手信息', 'warning');
        return;
      }
      
      try {
        this.isSearching = true;
        const response = await fetch(`${this.apiUrl}/cloudsearch?keywords=${encodeURIComponent(artistName)}&type=100&limit=10`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.result && data.result.artists && data.result.artists.length > 0) {
            // 取第一个匹配的歌手
            const artist = data.result.artists[0];
            this.getArtistDetail(artist.id);
          } else {
            this.$emit('notify', `未找到歌手: ${artistName}`, 'warning');
          }
        } else {
          this.$emit('notify', '搜索歌手失败', 'danger');
        }
      } catch (error) {
        console.error('搜索歌手失败:', error);
        this.$emit('notify', '搜索歌手失败', 'danger');
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
    
    showUserMenu() {
      if (this.isLoggedIn) {
        this.showUserDropdown = !this.showUserDropdown;
      } else {
        this.openLoginModal();
      }
    },
    
    // 处理登录成功
    handleLoginSuccess(data) {
      this.loginCookie = data.cookie;
      this.isLoggedIn = true;
      this.$emit('notify', '登录成功！', 'success');
    },
    
    // 处理用户信息更新
    handleUserInfoUpdated(userInfo) {
      this.userInfo = userInfo;
      // 获取用户等级信息
      this.getUserLevel();
    },
    
    // 获取用户等级信息
    async getUserLevel() {
      if (!this.loginCookie) return;
      
      try {
        const response = await fetch(`${this.apiUrl}/user/level?timestamp=${Date.now()}`, {
          headers: {
            'Cookie': this.loginCookie
          }
        });
        
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
      
      try {
        const response = await fetch(`${this.apiUrl}/user/account?timestamp=${Date.now()}`, {
          headers: {
            'Cookie': this.loginCookie
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.profile) {
            this.userInfo = data.profile;
            // 保存用户信息
            try {
              localStorage.setItem('musicUserInfo', JSON.stringify(data.profile));
            } catch (error) {
              console.error('保存用户信息失败:', error);
            }
            this.$emit('notify', '用户信息已刷新', 'success');
          }
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error);
        this.$emit('notify', '刷新用户信息失败', 'danger');
      }
      
      this.showUserDropdown = false;
    },
    
    // 退出登录
    logout() {
      // 清除本地存储
      try {
        localStorage.removeItem('musicLoginCookie');
        localStorage.removeItem('musicLoginTime');
        localStorage.removeItem('musicUserInfo');
      } catch (error) {
        console.error('清除登录信息失败:', error);
      }
      
      // 重置状态
      this.isLoggedIn = false;
      this.userInfo = null;
      this.userLevel = null;
      this.loginCookie = '';
      this.showUserDropdown = false;
      
      this.$emit('notify', '已退出登录', 'info');
    },
    
    // 检查登录状态
    checkLoginStatus() {
      try {
        const cookie = localStorage.getItem('musicLoginCookie');
        const loginTime = localStorage.getItem('musicLoginTime');
        const userInfo = localStorage.getItem('musicUserInfo');
        
        if (cookie && loginTime && userInfo) {
          // 检查登录是否过期（30天）
          const currentTime = Date.now();
          const loginTimestamp = parseInt(loginTime, 10);
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          
          if (currentTime - loginTimestamp < thirtyDaysInMs) {
            this.loginCookie = cookie;
            this.userInfo = JSON.parse(userInfo);
            this.isLoggedIn = true;
            // 获取用户等级
            this.getUserLevel();
          } else {
            // 登录已过期，清除信息
            this.logout();
          }
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
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
        
        this.$emit('notify', '已从播放列表中移除', 'info');
      }
    },

    // 清空播放列表
    clearPlaylist() {
      if (this.playlist.length === 0) return;
      
      this.playlist = [];
      
      // 如果当前显示的是播放列表，更新当前播放列表
      if (!this.showSearchResults) {
        this.currentPlaylist = [];
      }
      
      // 如果当前播放的歌曲在播放列表中，停止播放
      if (this.currentSong) {
        const isInPlaylist = this.playlist.some(song => song.id === this.currentSong.id);
        if (!isInPlaylist) {
          this.isPlaying = false;
          this.currentSong = null;
          this.currentTime = 0;
        }
      }
      
      this.$emit('notify', '播放列表已清空', 'info');
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
      
      this.$emit('notify', `已同步 ${songs.length} 首歌曲到播放列表`, 'success');
    },

    // 临时播放（不更新播放列表）
    playTemporarily(songs, index = 0) {
      if (!songs || !Array.isArray(songs) || index < 0 || index >= songs.length) return;
      
      // 设置当前播放列表为临时列表
      this.currentPlaylist = [...songs];
      this.showSearchResults = true;
      
      // 播放指定歌曲
      this.selectSong(index);
    },

    // 从搜索结果中临时播放
    playFromSearchResults(song) {
      const index = this.getSongIndex(song, this.currentPlaylist);
      if (index !== -1) {
        this.playTemporarily(this.currentPlaylist, index);
      }
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
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 160px;
  border-radius: 0 0 2rem 2rem; /* 底部圆角 */
  flex-shrink: 0; /* 防止压缩 */
}

.current-song-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.song-image {
  width: 60px;
  height: 60px;
  border-radius: 1rem;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid var(--border-color);
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
  gap: 20px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  width: 60px;
  height: 60px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
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
  z-index: 1000;
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
  color: var(--text-primary);
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
</style>