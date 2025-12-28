<template>
  <div class="tavern-container" :class="{ 'mode-transitioning': isTransitioning }">
    <!-- 酒馆模式 Header -->
    <div class="tavern-header">
      <div class="tavern-header-left">
        <button
                class="back-to-configs-btn"
                :class="{ 'shine-effect': styleSettings.enableShineEffect }"
                @click="selectedConfig = null"
                v-if="selectedConfig"
              >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                  返回
                </button>
                <h1 class="tavern-title" @click="exitTavernMode" v-if="!selectedConfig">
                  <span class="title-icon">🍺</span>
                  <span class="title-text">AI酒馆</span>
                  <span class="back-hint">← 点击返回普通模式</span>
                </h1>
                <div class="config-name-display" v-if="selectedConfig">
                  <span class="config-icon">{{ selectedConfig.icon || '🏰' }}</span>
                  <span class="config-name">{{ selectedConfig.name }}</span>
                </div>
              </div>
              <div class="tavern-header-actions">
                <button
                  class="tavern-action-btn"
                  :class="{ 'shine-effect': styleSettings.enableShineEffect }"
                  @click="$emit('show-style-settings')"
                  title="样式设置"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                  </svg>
                  样式设置
                </button>
                <button
                  class="tavern-action-btn"
                  :class="{ 'shine-effect': styleSettings.enableShineEffect }"
                  @click="$emit('show-ai-settings')"
                  title="AI设置"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  AI设置
                </button>
              </div>
    </div>

    <!-- 酒馆内容区域 -->
    <div class="tavern-content">
      <!-- 配置列表视图 -->
      <div v-if="!selectedConfig" class="tavern-configs-view">
        <div v-if="configs.length === 0" class="tavern-empty-state">
          <div class="empty-icon">🏰</div>
          <h3>还没有酒馆配置</h3>
          <p>创建一套新的配置来开始你的酒馆故事</p>
          <button
            class="create-config-btn"
            :class="{ 'shine-effect': styleSettings.enableShineEffect }"
            @click="showCreateConfigModal = true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            创建配置
          </button>
        </div>
        <div v-else class="tavern-configs-grid">
          <button
            v-for="config in configs"
            :key="config.id"
            class="tavern-config-card"
            @click="selectConfig(config)"
          >
            <div class="config-card-icon">{{ config.icon || '🏰' }}</div>
            <div class="config-card-info">
              <h3 class="config-card-title">{{ config.name }}</h3>
              <p class="config-card-description">{{ config.description || '暂无描述' }}</p>
              <div class="config-card-meta">
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {{ config.characters?.length || 0 }} 角色
                </span>
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  {{ formatDate(config.updatedAt) }}
                </span>
              </div>
            </div>
            <div class="config-card-actions">
              <button
                class="config-action-btn delete"
                @click.stop="deleteConfig(config)"
                title="删除配置"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </button>
          <button
            class="tavern-config-card create-new"
            @click="showCreateConfigModal = true"
          >
            <div class="config-card-icon">➕</div>
            <div class="config-card-info">
              <h3 class="config-card-title">创建新配置</h3>
              <p class="config-card-description">开始一个新的酒馆故事</p>
            </div>
          </button>
        </div>
      </div>

      <!-- 酒馆主界面（侧边栏 + 聊天） -->

              <div v-else class="tavern-main-view">

                <!-- 右侧侧边栏 -->

                <TavernSidebar

                  v-show="sidebarVisible"

                  :config="selectedConfig"

                  :style-settings="styleSettings"

                  @update-config="updateConfig"

                  :class="{ 'mobile-open': mobileSidebarOpen }"

                />

                <!-- 左侧聊天界面 -->

                <TavernChat

                  :config="selectedConfig"

                  :style-settings="styleSettings"

                  :ai-settings="aiSettings"

                  @update-config="updateConfig"

                  @toggle-sidebar="toggleSidebar"

                />

                <!-- 移动端侧边栏遮罩 -->

                <div

                  v-if="mobileSidebarOpen"

                  class="mobile-sidebar-overlay"

                  @click="mobileSidebarOpen = false"

                ></div>

              </div>    </div>

    <!-- 创建配置弹窗 -->
    <Modal
      v-model:visible="showCreateConfigModal"
      title="创建酒馆配置"
      size="medium"
      @confirm="createConfig"
      @close="showCreateConfigModal = false"
    >
      <div class="form-group">
        <label>配置名称</label>
        <input
          type="text"
          class="form-control"
          v-model="newConfigForm.name"
          placeholder="例如：落风镇酒馆"
        >
      </div>
      <div class="form-group">
        <label>配置图标</label>
        <input
          type="text"
          class="form-control"
          v-model="newConfigForm.icon"
          placeholder="例如：🏰"
          maxlength="2"
        >
      </div>
      <div class="form-group">
        <label>配置描述</label>
        <textarea
          class="form-control textarea"
          v-model="newConfigForm.description"
          placeholder="描述这个酒馆场景..."
          rows="3"
        ></textarea>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, onUnmounted } from 'vue';
import Modal from './Modal.vue';
import TavernSidebar from './TavernSidebar.vue';
import TavernChat from './TavernChat.vue';
import { tavernDB } from '../tavernDB.js';

const emit = defineEmits(['exit', 'show-style-settings', 'show-ai-settings']);

// 接收样式设置
const props = defineProps({
  styleSettings: {
    type: Object,
    default: () => ({})
  },
  aiSettings: {
    type: Object,
    default: () => ({})
  }
});

// 过渡状态
const isTransitioning = ref(false)

// 配置列表
const configs = ref([]);

// 选中的配置
const selectedConfig = ref(null);

// 侧边栏可见性状态
const sidebarVisible = ref(true);

// 移动端侧边栏状态
const mobileSidebarOpen = ref(false);

// 创建配置弹窗
const showCreateConfigModal = ref(false);
const newConfigForm = reactive({
  name: '',
  icon: '🏰',
  description: ''
});

// 从 IndexedDB 加载配置
const loadConfigs = async () => {
  try {
    const loaded = await tavernDB.getAllConfigs();
    configs.value = loaded;
  } catch (error) {
    console.error('加载酒馆配置失败:', error);
    configs.value = [];
  }
};

// 监听配置变化
watch(configs, (newConfigs) => {
  // 配置变化时不需要手动保存，因为每个配置单独保存
}, { deep: true });

// 组件挂载时加载配置
onMounted(async () => {
  await tavernDB.init(); // 初始化 IndexedDB
  await loadConfigs();

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
});

// 处理窗口大小变化
const handleResize = () => {
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // 切换到桌面端时，确保侧边栏可见
    mobileSidebarOpen.value = false;
    if (!sidebarVisible.value) {
      sidebarVisible.value = true;
    }
  }
};

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 退出酒馆模式
const exitTavernMode = () => {
  emit('exit');
};

// 选择配置
const selectConfig = (config) => {
  selectedConfig.value = config;
  sidebarVisible.value = true;
};

// 切换侧边栏
const toggleSidebar = () => {
  // 检测是否为移动端
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // 移动端：切换遮罩和滑动效果
    mobileSidebarOpen.value = !mobileSidebarOpen.value;
  } else {
    // 桌面端：直接切换显示/隐藏
    sidebarVisible.value = !sidebarVisible.value;
  }
};

// 创建配置
const createConfig = async () => {
  if (!newConfigForm.name.trim()) return;

  const config = {
    id: Date.now().toString(),
    name: newConfigForm.name,
    icon: newConfigForm.icon,
    description: newConfigForm.description,
    worldSettings: '',
    characters: [],
    memories: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const saved = await tavernDB.saveConfig(config);
    configs.value.push(saved);
    showCreateConfigModal.value = false;

    // 重置表单
    newConfigForm.name = '';
    newConfigForm.icon = '🏰';
    newConfigForm.description = '';
  } catch (error) {
    console.error('创建配置失败:', error);
  }
};

// 删除配置
const deleteConfig = async (config) => {
  try {
    await tavernDB.deleteConfig(config.id);
    const index = configs.value.findIndex(c => c.id === config.id);
    if (index !== -1) {
      configs.value.splice(index, 1);
    }
  } catch (error) {
    console.error('删除配置失败:', error);
  }
};

// 更新配置
const updateConfig = async (updatedConfig) => {
  try {
    const saved = await tavernDB.saveConfig(updatedConfig);
    const index = configs.value.findIndex(c => c.id === saved.id);
    if (index !== -1) {
      configs.value[index] = saved;
      if (selectedConfig.value && selectedConfig.value.id === saved.id) {
        selectedConfig.value = saved;
      }
    }
  } catch (error) {
    console.error('更新配置失败:', error);
  }
};

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};
</script>

<style scoped>
.tavern-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-primary);
  color: var(--text-primary);
  z-index: 1000;
}

/* 强制使用 CSS 变量确保主题适配 */
.tavern-container * {
  color: var(--text-primary);
}

/* Header */
.tavern-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  height: 56px;
  min-height: 56px;
}

.tavern-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.tavern-title:hover {
  opacity: 0.8;
}

.title-icon {
  font-size: 24px;
}

.title-text {
  background: var(--gradient-primary, linear-gradient(135deg, var(--primary-color), var(--secondary-color)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.back-hint {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tavern-header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tavern-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tavern-action-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Content */
.tavern-content {
  flex: 1;
  overflow: hidden;
}

/* Configs View */
.tavern-configs-view {
  height: 100%;
  padding: 32px;
  overflow-y: auto;
}

.tavern-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.tavern-empty-state h3 {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.tavern-empty-state p {
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.create-config-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--gradient-primary, linear-gradient(135deg, var(--primary-color), var(--secondary-color)));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.create-config-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

/* Configs Grid */
.tavern-configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tavern-config-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  position: relative;
}

.tavern-config-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.tavern-config-card.create-new {
  border-style: dashed;
  opacity: 0.7;
}

.tavern-config-card.create-new:hover {
  opacity: 1;
  border-color: var(--primary-color);
}

.config-card-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.config-card-info {
  flex: 1;
  min-width: 0;
}

.config-card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.config-card-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.config-card-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.config-card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.config-action-btn:hover {
  background: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}

/* 流光效果 */
.shine-effect {
  position: relative;
  overflow: hidden;
}

.shine-effect::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s ease;
}

.shine-effect:hover::before {
  left: 100%;
}

/* Main View */
.tavern-main-view {
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Form Group */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.tavern-title:hover .back-hint {
  opacity: 1;
}

.tavern-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-to-configs-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-to-configs-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.config-name-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.config-icon {
  font-size: 20px;
}

.config-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.tavern-header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}


.tavern-action-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Content */
.tavern-content {
  flex: 1;
  overflow: hidden;
}

/* Main View */
.tavern-main-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Form Group */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tavern-header {
    padding: 10px 16px;
    height: 52px;
    min-height: 52px;
  }

  .tavern-title {
    font-size: 16px;
  }

  .title-icon {
    font-size: 20px;
  }

  .back-hint {
    display: none;
  }

  .tavern-header-left {
    gap: 8px;
  }

  .back-to-configs-btn {
    padding: 4px 8px;
    font-size: 12px;
  }

  .config-name-display {
    padding: 4px 8px;
  }

  .config-icon {
    font-size: 16px;
  }

  .config-name {
    font-size: 13px;
  }

  .tavern-header-actions {
    gap: 6px;
  }

  .tavern-action-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .tavern-configs-view {
    padding: 16px;
  }

  .tavern-configs-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tavern-config-card {
    padding: 16px;
  }

  .config-card-icon {
    font-size: 40px;
  }

  .config-card-title {
    font-size: 16px;
  }

  .empty-icon {
    font-size: 60px;
  }

  .create-config-btn {
    padding: 10px 20px;
    font-size: 14px;
  }

  .tavern-main-view {
    position: relative;
  }
}

/* 移动端侧边栏遮罩 */
.mobile-sidebar-overlay {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}
</style>