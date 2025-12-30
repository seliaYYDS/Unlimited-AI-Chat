<template>
  <div class="tavern-memory">
    <!-- 头部 -->
    <div class="memory-header">
      <div class="header-left">
        <h2 class="header-title">角色记忆管理</h2>
        <p class="header-subtitle">查看和管理所有角色的记忆内容</p>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <!-- 角色记忆区域 -->
    <div class="memory-section character-memory">
      <div v-if="!config.characters || config.characters.length === 0" class="empty-state">
        <div class="empty-icon">👤</div>
        <p>暂无角色</p>
        <p class="empty-hint">请先在侧边栏中添加角色</p>
      </div>

      <div v-else class="characters-grid">
        <div 
          v-for="character in config.characters" 
          :key="character.id"
          class="character-card"
        >
          <div class="character-header">
            <div class="character-info">
              <span class="character-avatar">
                <img v-if="isImageUrl(character.avatar)" :src="character.avatar" :alt="character.name" class="character-avatar-img" />
                <span v-else>{{ character.avatar || '👤' }}</span>
              </span>
              <div class="character-details">
                <h4 class="character-name">{{ character.name }}</h4>
                <p class="character-role">{{ character.role || '未设定' }}</p>
              </div>
            </div>
            <div class="character-actions">
              <button 
                class="action-btn summarize-btn" 
                @click="summarizeCharacterMemory(character)"
                :disabled="isSummarizing"
                title="自动总结对话生成记忆"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19Z"/>
                </svg>
                自动总结
              </button>
              <button 
                class="action-btn add-btn" 
                @click="openAddMemoryModal(character)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                添加记忆
              </button>
            </div>
          </div>

          <div class="character-memories">
            <div v-if="!character.memories || character.memories.length === 0" class="character-empty">
              <p>暂无记忆</p>
            </div>
            <div v-else class="character-memories-list">
              <div 
                v-for="(memory, index) in character.memories" 
                :key="index"
                class="memory-item"
              >
                <div class="memory-content">{{ memory.content }}</div>
                <div class="memory-footer">
                  <span class="memory-time">{{ formatTime(memory.timestamp) }}</span>
                  <button 
                    class="memory-delete" 
                    @click="deleteCharacterMemory(character.id, index)"
                    title="删除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加记忆弹窗 -->
    <div v-if="showAddMemoryModal" class="confirm-overlay" @click.self="showAddMemoryModal = null">
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>添加角色记忆</h3>
          <button class="close-btn" @click="showAddMemoryModal = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="confirm-body">
          <div class="form-group">
            <label>角色</label>
            <div class="character-selector">
              <span class="selected-character-avatar">
                <img v-if="isImageUrl(selectedCharacter?.avatar)" :src="selectedCharacter.avatar" :alt="selectedCharacter.name" class="selected-character-avatar-img" />
                <span v-else>{{ selectedCharacter?.avatar || '👤' }}</span>
              </span>
              <span class="selected-character-name">{{ selectedCharacter?.name || '未选择' }}</span>
            </div>
          </div>
          <div class="form-group">
            <label>记忆内容</label>
            <textarea
              v-model="newMemoryContent"
              class="form-control textarea"
              placeholder="输入该角色的重要记忆内容..."
              rows="6"
            ></textarea>
          </div>
        </div>
        <div class="confirm-footer">
          <button class="confirm-btn cancel" @click="showAddMemoryModal = null">取消</button>
          <button class="confirm-btn primary" @click="addMemory" :disabled="!newMemoryContent.trim()">添加</button>
        </div>
      </div>
    </div>

    <!-- 加载提示 -->
    <div v-if="isSummarizing" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>正在总结对话生成记忆...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { tavernAIService } from '../tavernAIService.js';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  messages: {
    type: Array,
    default: () => []
  },
  aiSettings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'update-config', 'notify']);

// 状态
const showAddMemoryModal = ref(false);
const selectedCharacter = ref(null);
const newMemoryContent = ref('');
const isSummarizing = ref(false);

// 格式化时间
const formatTime = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '未知时间';
  }
};

// 判断是否为图片URL
const isImageUrl = (avatar) => {
  if (!avatar) return false;
  return avatar.startsWith('http://') || avatar.startsWith('https://');
};

// 打开添加记忆弹窗
const openAddMemoryModal = (character) => {
  selectedCharacter.value = character;
  newMemoryContent.value = '';
  showAddMemoryModal.value = true;
};

// 添加记忆
const addMemory = () => {
  if (!newMemoryContent.value.trim() || !selectedCharacter.value) return;

  const updatedConfig = { ...props.config };
  const characterIndex = updatedConfig.characters.findIndex(c => c.id === selectedCharacter.value.id);
  
  if (characterIndex !== -1) {
    if (!updatedConfig.characters[characterIndex].memories) {
      updatedConfig.characters[characterIndex].memories = [];
    }
    updatedConfig.characters[characterIndex].memories.push({
      type: 'character',
      content: newMemoryContent.value.trim(),
      timestamp: new Date().toISOString()
    });
  }

  emit('update-config', updatedConfig);
  showAddMemoryModal.value = false;
  newMemoryContent.value = '';
  selectedCharacter.value = null;
  emit('notify', '记忆已添加', 'success');
};

// 删除角色记忆
const deleteCharacterMemory = (characterId, index) => {
  const updatedConfig = { ...props.config };
  const characterIndex = updatedConfig.characters.findIndex(c => c.id === characterId);
  
  if (characterIndex !== -1 && updatedConfig.characters[characterIndex].memories) {
    updatedConfig.characters[characterIndex].memories.splice(index, 1);
  }
  
  emit('update-config', updatedConfig);
  emit('notify', '角色记忆已删除', 'success');
};

// 自动总结角色记忆
const summarizeCharacterMemory = async (character) => {
  if (props.messages.length === 0) {
    emit('notify', '暂无对话记录可总结', 'warning');
    return;
  }

  // 过滤出该角色相关的消息（仅包含该角色发言的消息）
  const characterMessages = props.messages.filter(msg => {
    return msg.type === 'character' && msg.characterId === character.id;
  });

  if (characterMessages.length === 0) {
    emit('notify', `${character.name} 暂无对话记录`, 'warning');
    return;
  }

  isSummarizing.value = true;
  
  try {
    const summary = await tavernAIService.summarizeConversation(
      props.config,
      characterMessages.slice(-20),
      props.aiSettings,
      'character',
      character
    );

    if (summary) {
      const updatedConfig = { ...props.config };
      const characterIndex = updatedConfig.characters.findIndex(c => c.id === character.id);
      
      if (characterIndex !== -1) {
        if (!updatedConfig.characters[characterIndex].memories) {
          updatedConfig.characters[characterIndex].memories = [];
        }
        updatedConfig.characters[characterIndex].memories.push({
          type: 'character',
          content: summary,
          timestamp: new Date().toISOString()
        });
      }
      
      emit('update-config', updatedConfig);
      emit('notify', `${character.name} 的记忆已生成`, 'success');
    }
  } catch (error) {
    console.error('总结对话失败:', error);
    emit('notify', '总结失败，请重试', 'error');
  } finally {
    isSummarizing.value = false;
  }
};
</script>

<style scoped>
.tavern-memory {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 500px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

/* 头部 */
.memory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.header-left {
  flex: 1;
}

.header-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.close-btn {
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

.close-btn:hover {
  background: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}

/* 内容区域 */
.tavern-memory > *:not(.memory-header) {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 记忆区域 */
.memory-section {
  margin-bottom: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 4px 0;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 角色网格 */
.characters-grid {
  display: grid;
  gap: 16px;
}

.character-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.character-card:hover {
  border-color: var(--primary-color);
}

.character-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  flex-wrap: nowrap;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.character-avatar {
  font-size: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
}

.character-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-details {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.character-name {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-role {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.character-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.action-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summarize-btn {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.add-btn {
  color: var(--success-color);
  border-color: var(--success-color);
}

.character-memories {
  padding: 16px;
  max-height: 250px;
  overflow-y: auto;
}

.character-empty {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
  padding: 30px 0;
}

.character-memories-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.memory-item {
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.memory-item:hover {
  border-color: var(--primary-color);
}

.memory-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.memory-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.memory-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.memory-delete {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.memory-delete:hover {
  background: var(--danger-color);
  color: white;
}

/* 确认弹窗样式 */
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
  max-width: 500px;
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

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.character-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.selected-character-avatar {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
}

.selected-character-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-character-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
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
  min-height: 120px;
  font-family: inherit;
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

.confirm-btn.primary {
  background: var(--primary-color);
  color: white;
}

.confirm-btn.primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

.loading-content p {
  margin: 0;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tavern-memory {
    width: 100%;
    max-width: 100%;
  }

  .characters-grid {
    grid-template-columns: 1fr;
  }

  .character-header {
    padding: 12px;
  }

  .character-info {
    gap: 8px;
  }

  .character-avatar {
    font-size: 28px;
  }

  .character-name {
    font-size: 14px;
  }

  .character-role {
    font-size: 11px;
  }

  .character-actions {
    gap: 6px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .action-btn span {
    display: none;
  }

  .action-btn svg {
    margin: 0;
  }

  .character-memories {
    padding: 12px;
  }
}
</style>