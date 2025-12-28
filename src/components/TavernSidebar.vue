<template>
  <div class="tavern-sidebar">
    <!-- Sidebar Content -->
    <div class="sidebar-content">
      <!-- Tabs -->
      <div class="sidebar-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id, 'shine-effect': styleSettings.enableShineEffect }]"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- 世界设定 Tab -->
        <div v-if="activeTab === 'world'" class="tab-panel">
          <div class="panel-section">
            <h3 class="section-title">世界设定</h3>
            <p class="section-hint">定义酒馆场景的世界观、物理法则、社会体系等</p>
            <textarea
              class="form-control textarea"
              v-model="localConfig.worldSettings"
              placeholder="例如：本场景是名为'落风镇'的边境小镇，镇上只有一家酒馆'避风港'。小镇被魔兽森林环绕，来往客人多是猎人、佣兵和逃犯..."
              rows="12"
            ></textarea>
          </div>
        </div>

        <!-- 角色 Tab -->
        <div v-if="activeTab === 'characters'" class="tab-panel">
          <div class="panel-header">
            <h3 class="section-title">角色列表</h3>
            <button
            class="add-btn"
            :class="{ 'shine-effect': styleSettings.enableShineEffect }"
            @click="showAddCharacterModal = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            添加角色
          </button>
          </div>

          <div v-if="!localConfig.characters || localConfig.characters.length === 0" class="empty-state">
            <div class="empty-icon">👥</div>
            <p>还没有角色</p>
          </div>

          <div v-else class="characters-list">
            <div
              v-for="(character, index) in localConfig.characters"
              :key="character.id"
              class="character-item"
            >
              <div class="character-avatar">{{ character.avatar || '👤' }}</div>
              <div class="character-info">
                <h4 class="character-name">{{ character.name }}</h4>
                <p class="character-role">{{ character.role || '无角色设定' }}</p>
              </div>
              <div class="character-actions">
                <button class="action-btn edit" @click="editCharacter(character)" title="编辑">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="action-btn delete" @click="showDeleteCharacterConfirm = character.id" title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 记忆 Tab -->
        <div v-if="activeTab === 'memories'" class="tab-panel">
          <div class="panel-header">
            <h3 class="section-title">记忆管理</h3>
            <button
            class="add-btn"
            :class="{ 'shine-effect': styleSettings.enableShineEffect }"
            @click="showAddMemoryModal = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            添加记忆
          </button>
          </div>

          <div v-if="!localConfig.memories || Object.keys(localConfig.memories).length === 0" class="empty-state">
            <div class="empty-icon">🧠</div>
            <p>还没有记忆</p>
          </div>

          <div v-else class="memories-list">
            <div
              v-for="(memory, key) in localConfig.memories"
              :key="key"
              class="memory-item"
            >
              <div class="memory-type">{{ getMemoryTypeLabel(key) }}</div>
              <div class="memory-content">{{ memory }}</div>
              <button class="memory-delete" @click="showDeleteMemoryConfirm = key" title="删除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 设置 Tab -->
        <div v-if="activeTab === 'settings'" class="tab-panel">
          <div class="panel-section">
            <h3 class="section-title">配置信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>配置名称</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="localConfig.name"
                >
              </div>
              <div class="info-item">
                <label>配置图标</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="localConfig.icon"
                  maxlength="2"
                >
              </div>
              <div class="info-item full-width">
                <label>配置描述</label>
                <textarea
                  class="form-control textarea"
                  v-model="localConfig.description"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
<button
          class="save-btn"
          :class="{ 'shine-effect': styleSettings.enableShineEffect }"
          @click="saveConfig"
        >
          保存配置
        </button>
    </div>

    <!-- 删除角色确认弹窗 -->
    <div v-if="showDeleteCharacterConfirm" class="confirm-overlay" @click.self="showDeleteCharacterConfirm = null">
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>确认删除角色</h3>
          <button class="close-btn" @click="showDeleteCharacterConfirm = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="confirm-body">
          <p>确定要删除此角色吗？此操作不可恢复。</p>
        </div>
        <div class="confirm-footer">
          <button class="confirm-btn cancel" @click="showDeleteCharacterConfirm = null">取消</button>
          <button class="confirm-btn danger" @click="confirmDeleteCharacter">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 删除记忆确认弹窗 -->
    <div v-if="showDeleteMemoryConfirm" class="confirm-overlay" @click.self="showDeleteMemoryConfirm = null">
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>确认删除记忆</h3>
          <button class="close-btn" @click="showDeleteMemoryConfirm = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="confirm-body">
          <p>确定要删除此记忆吗？此操作不可恢复。</p>
        </div>
        <div class="confirm-footer">
          <button class="confirm-btn cancel" @click="showDeleteMemoryConfirm = null">取消</button>
          <button class="confirm-btn danger" @click="confirmDeleteMemory">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 添加角色弹窗 -->
    <Modal
      v-model:visible="showAddCharacterModal"
      :title="editingCharacter ? '编辑角色' : '添加角色'"
      size="medium"
      @confirm="saveCharacter"
      @close="closeCharacterModal"
    >
      <div class="form-group">
        <label>角色名称</label>
        <input
          type="text"
          class="form-control"
          v-model="characterForm.name"
          placeholder="例如：酒馆老板雷蒙德"
        >
      </div>
      <div class="form-group">
        <label>角色头像</label>
        <input
          type="text"
          class="form-control"
          v-model="characterForm.avatar"
          placeholder="例如：👨‍🍳"
          maxlength="2"
        >
      </div>
      <div class="form-group">
        <label>角色身份</label>
        <input
          type="text"
          class="form-control"
          v-model="characterForm.role"
          placeholder="例如：酒馆老板"
        >
      </div>
      <div class="form-group">
        <label>核心人设</label>
        <textarea
          class="form-control textarea"
          v-model="characterForm.personality"
          placeholder="例如：表面圆滑实则重情义的中年酒馆老板，讨厌赊账但对落魄旅人心软"
          rows="3"
        ></textarea>
      </div>
      <div class="form-group">
        <label>语言风格</label>
        <textarea
          class="form-control textarea"
          v-model="characterForm.style"
          placeholder="例如：说话带方言词汇，喜欢用'老弟''姑娘'称呼人，句子简短直白"
          rows="2"
        ></textarea>
      </div>
      <div class="form-group">
        <label>行为准则</label>
        <textarea
          class="form-control textarea"
          v-model="characterForm.rules"
          placeholder="例如：1. 优先维护酒馆秩序；2. 不参与客人的阵营斗争；3. 看到穷人会送免费面包"
          rows="3"
        ></textarea>
      </div>
      <div class="form-group">
        <label>个人目标</label>
        <textarea
          class="form-control textarea"
          v-model="characterForm.goal"
          placeholder="例如：攒钱给女儿治病；查明妻子失踪的真相"
          rows="2"
        ></textarea>
      </div>
    </Modal>

    <!-- 添加记忆弹窗 -->
    <Modal
      v-model:visible="showAddMemoryModal"
      title="添加记忆"
      size="medium"
      @confirm="saveMemory"
      @close="showAddMemoryModal = false"
    >
      <div class="form-group">
        <label>记忆类型</label>
        <select class="form-control" v-model="memoryForm.type">
          <option value="world">世界记忆</option>
          <option value="event">公共事件</option>
          <option value="custom">自定义记忆</option>
        </select>
      </div>
      <div class="form-group">
        <label>记忆内容</label>
        <textarea
          class="form-control textarea"
          v-model="memoryForm.content"
          placeholder="输入记忆内容..."
          rows="6"
        ></textarea>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import Modal from './Modal.vue';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  styleSettings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update-config']);

// 本地配置副本
const localConfig = reactive({ ...props.config });

// Tabs
const tabs = [
  { id: 'world', label: '世界设定', icon: '🌍' },
  { id: 'characters', label: '角色', icon: '👥' },
  { id: 'memories', label: '记忆', icon: '🧠' },
  { id: 'settings', label: '设置', icon: '⚙️' }
];
const activeTab = ref('world');

// 角色管理
const showAddCharacterModal = ref(false);
const editingCharacter = ref(null);
const characterForm = reactive({
  name: '',
  avatar: '👤',
  role: '',
  personality: '',
  style: '',
  rules: '',
  goal: ''
});

// 记忆管理
const showAddMemoryModal = ref(false);
const memoryForm = reactive({
  type: 'world',
  content: ''
});

// 确认弹窗状态
const showDeleteCharacterConfirm = ref(null);
const showDeleteMemoryConfirm = ref(null);

// 监听配置变化
watch(() => props.config, (newConfig) => {
  Object.assign(localConfig, newConfig);
}, { deep: true });

// 编辑角色
const editCharacter = (character) => {
  editingCharacter.value = character;
  Object.assign(characterForm, character);
  showAddCharacterModal.value = true;
};

// 保存角色
const saveCharacter = () => {
  if (!characterForm.name.trim()) return;

  const character = { ...characterForm };

  if (editingCharacter.value) {
    // 编辑现有角色
    const index = localConfig.characters.findIndex(c => c.id === editingCharacter.value.id);
    if (index !== -1) {
      localConfig.characters[index] = character;
    }
  } else {
    // 添加新角色
    character.id = Date.now().toString();
    if (!localConfig.characters) {
      localConfig.characters = [];
    }
    localConfig.characters.push(character);
  }

  closeCharacterModal();
};

// 关闭角色弹窗
const closeCharacterModal = () => {
  showAddCharacterModal.value = false;
  editingCharacter.value = null;
  characterForm.name = '';
  characterForm.avatar = '👤';
  characterForm.role = '';
  characterForm.personality = '';
  characterForm.style = '';
  characterForm.rules = '';
  characterForm.goal = '';
};

// 确认删除角色
const confirmDeleteCharacter = () => {
  if (showDeleteCharacterConfirm.value) {
    const index = localConfig.characters.findIndex(c => c.id === showDeleteCharacterConfirm.value);
    if (index !== -1) {
      localConfig.characters.splice(index, 1);
    }
    showDeleteCharacterConfirm.value = null;
  }
};

// 删除角色
const deleteCharacter = (index) => {
  localConfig.characters.splice(index, 1);
};

// 保存记忆
const saveMemory = () => {
  if (!memoryForm.content.trim()) return;

  if (!localConfig.memories) {
    localConfig.memories = {};
  }

  const key = `${memoryForm.type}_${Date.now()}`;
  localConfig.memories[key] = memoryForm.content;

  showAddMemoryModal.value = false;
  memoryForm.content = '';
};

// 删除记忆
const deleteMemory = (key) => {
  delete localConfig.memories[key];
};

// 确认删除记忆
const confirmDeleteMemory = () => {
  if (showDeleteMemoryConfirm.value) {
    deleteMemory(showDeleteMemoryConfirm.value);
    showDeleteMemoryConfirm.value = null;
  }
};

// 获取记忆类型标签
const getMemoryTypeLabel = (key) => {
  const type = key.split('_')[0];
  const labels = {
    world: '世界记忆',
    event: '公共事件',
    custom: '自定义记忆'
  };
  return labels[type] || '未知类型';
};

// 保存配置
const saveConfig = () => {
  emit('update-config', { ...localConfig });
};
</script>

<style scoped>
.tavern-sidebar {
  display: flex;
  flex-direction: column;
  width: 400px;
  min-width: 320px;
  max-width: 500px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
}

/* Content */
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs */
.sidebar-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  padding: 1px;
  background: var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.tab-panel {
  display: block;
}

.panel-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.section-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Characters List */
.characters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.character-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.character-item:hover {
  border-color: var(--primary-color);
}

.character-avatar {
  font-size: 32px;
  flex-shrink: 0;
}

.character-info {
  flex: 1;
  min-width: 0;
}

.character-name {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.character-role {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.action-btn.delete:hover {
  background: var(--danger-color);
  border-color: var(--danger-color);
}

/* Memories List */
.memories-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-item {
  position: relative;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.memory-item:hover {
  border-color: var(--primary-color);
}

.memory-type {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.memory-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  padding-right: 24px;
}

.memory-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
}

.memory-item:hover .memory-delete {
  opacity: 1;
}

.memory-delete:hover {
  color: var(--danger-color);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* Footer */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.save-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--primary-color);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

/* Form Group */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

select.form-control {
  cursor: pointer;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tavern-sidebar {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: none;
    z-index: 101;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .tavern-sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-tabs {
    grid-template-columns: repeat(4, 1fr);
  }

  .tab-btn {
    padding: 8px 4px;
  }
}

/* 确认弹窗 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.confirm-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.confirm-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.confirm-body {
  padding: 20px;
}

.confirm-body p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn.cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.confirm-btn.cancel:hover {
  background: var(--bg-hover);
}

.confirm-btn.danger {
  background: var(--danger-color);
  color: white;
}

.confirm-btn.danger:hover {
  background: #c0392b;
}

  .tab-icon {
    font-size: 18px;
  }

  .tab-label {
    font-size: 10px;
  }

  .tab-content {
    padding: 12px;
  }

  .character-item {
    padding: 10px;
  }

  .character-avatar {
    font-size: 28px;
  }

  .character-name {
    font-size: 13px;
  }

  .sidebar-footer {
    padding: 12px;
  }
</style>