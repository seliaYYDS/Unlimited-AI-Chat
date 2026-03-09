<template>
  <div class="agent-memory">
    <!-- 智能体信息头部 -->
    <div class="memory-header" v-if="agent">
      <div class="agent-info">
        <div class="agent-avatar">
          <div v-if="agent.avatar && agent.avatar.startsWith('data:image')" class="avatar-image">
            <img :src="agent.avatar" alt="智能体头像" />
          </div>
          <div v-else class="avatar-icon">{{ agent.avatar || '🤖' }}</div>
        </div>
        <div class="agent-details">
          <h3 class="agent-name">{{ agent.name }}</h3>
          <p class="agent-scenario">{{ agent.scenario || '无场景描述' }}</p>
        </div>
      </div>
      
      <!-- 记忆状态指示器 -->
      <div class="memory-status">
        <div v-if="memory" class="status-indicator has-memory">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>有记忆内容</span>
        </div>
        <div v-else class="status-indicator no-memory">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>暂无记忆内容</span>
        </div>
      </div>
    </div>

    <!-- 记忆内容编辑区域 -->
    <div class="memory-content">
      <div class="form-group">
        <label class="memory-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          智能体记忆内容
        </label>
        <div class="memory-textarea-wrapper">
          <textarea
            v-model="memoryContent"
            class="memory-textarea"
            placeholder="在此输入智能体的长期记忆内容...&#10;&#10;这些内容将在每次对话开始时作为上下文提供给智能体，帮助智能体记住重要的信息、偏好设定、过往经历等。&#10;&#10;例如：&#10;- 用户喜欢的技术栈和编程语言&#10;- 重要的项目背景信息&#10;- 用户的沟通偏好&#10;- 过往讨论的重要结论"
            rows="12"
            ref="memoryTextarea"
          ></textarea>
          <div class="textarea-info">
            <span class="char-count">{{ memoryContent.length }} 字符</span>
            <span class="last-updated" v-if="memory && memory.updatedAt">
              最后更新：{{ formatDate(memory.updatedAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 记忆使用提示 -->
      <div class="memory-tips">
        <div class="tips-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
          <span>使用提示</span>
        </div>
        <ul class="tips-list">
          <li>智能体记忆会在每次对话开始时自动作为上下文发送给AI</li>
          <li>记忆内容不会显示在聊天界面中，但会影响AI的回复</li>
          <li>建议定期使用"总结对话"功能来更新记忆内容</li>
          <li>记忆内容会随智能体数据一起导出和导入</li>
        </ul>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="memory-actions">
      <button 
        class="action-btn clear-btn" 
        @click="clearMemory"
        :disabled="!memoryContent.trim()"
        v-if="memory"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        清除记忆
      </button>
      
      <div class="right-actions">
        <button class="action-btn cancel-btn" @click="$emit('close')">
          取消
        </button>
        <button 
          class="action-btn save-btn" 
          @click="saveMemory"
          :disabled="isSaving || !memoryContent.trim()"
        >
          <div v-if="isSaving" class="loading-spinner small"></div>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
          </svg>
          保存记忆
        </button>
      </div>
    </div>

    <!-- 确认清除弹窗 -->
    <div v-if="showClearConfirm" class="confirm-overlay" @click="showClearConfirm = false">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <h4>确认清除记忆</h4>
        </div>
        <div class="confirm-content">
          <p>确定要清除 {{ agent.name }} 的所有记忆内容吗？</p>
          <p class="warning-text">此操作不可撤销。</p>
        </div>
        <div class="confirm-actions">
          <button class="btn secondary" @click="showClearConfirm = false">取消</button>
          <button class="btn primary" @click="confirmClearMemory">确认清除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AgentMemory',
  props: {
    agent: {
      type: Object,
      required: true
    },
    storageManager: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'memory-updated', 'notify'],
  data() {
    return {
      memoryContent: '',
      memory: null,
      isSaving: false,
      showClearConfirm: false
    }
  },
  mounted() {
    this.loadMemory()
  },
  methods: {
    // 加载智能体记忆
    loadMemory() {
      if (this.agent) {
        this.memory = this.storageManager.getAgentMemory(this.agent.id)
        this.memoryContent = this.memory ? this.memory.content : ''
      }
    },

    // 保存记忆
    async saveMemory() {
      if (!this.memoryContent.trim()) {
        this.$emit('notify', '记忆内容不能为空', 'warning')
        return
      }

      this.isSaving = true
      
      try {
        const success = this.storageManager.saveAgentMemory(this.agent.id, this.memoryContent.trim())
        
        if (success) {
          this.memory = this.storageManager.getAgentMemory(this.agent.id)
          this.$emit('notify', '智能体记忆已保存', 'success')
          this.$emit('memory-updated', this.agent.id)
        } else {
          this.$emit('notify', '保存失败，请重试', 'error')
        }
      } catch (error) {
        console.error('保存智能体记忆失败:', error)
        this.$emit('notify', '保存失败，请重试', 'error')
      } finally {
        this.isSaving = false
      }
    },

    // 清除记忆
    clearMemory() {
      this.showClearConfirm = true
    },

    // 确认清除记忆
    confirmClearMemory() {
      try {
        const success = this.storageManager.clearAgentMemory(this.agent.id)
        
        if (success) {
          this.memoryContent = ''
          this.memory = null
          this.showClearConfirm = false
          this.$emit('notify', '智能体记忆已清除', 'success')
          this.$emit('memory-updated', this.agent.id)
        } else {
          this.$emit('notify', '清除失败，请重试', 'error')
        }
      } catch (error) {
        console.error('清除智能体记忆失败:', error)
        this.$emit('notify', '清除失败，请重试', 'error')
      }
    },

    // 格式化日期
    formatDate(dateString) {
      try {
        const date = new Date(dateString)
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        return '未知时间'
      }
    }
  }
}
</script>

<style scoped>
.agent-memory {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

/* 智能体信息头部 */
.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 16px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.avatar-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-details {
  flex: 1;
  min-width: 0;
}

.agent-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-scenario {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 记忆状态指示器 */
.memory-status {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.has-memory {
  background: var(--success-color);
  color: white;
}

.status-indicator.no-memory {
  background: var(--text-tertiary);
  color: white;
}

/* 记忆内容区域 */
.memory-content {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.memory-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 14px;
}

.memory-textarea-wrapper {
  position: relative;
}

.memory-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 200px;
  font-family: inherit;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--duration-fast) ease;
}

.memory-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.memory-textarea::placeholder {
  color: var(--text-tertiary);
}

.textarea-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 使用提示区域 */
.memory-tips {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 16px;
  margin-top: 16px;
  border: 1px solid var(--border-light);
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 14px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
}

.tips-list li {
  margin-bottom: 6px;
  line-height: 1.4;
  font-size: 13px;
}

.tips-list li:last-child {
  margin-bottom: 0;
}

/* 操作按钮区域 */
.memory-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.right-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  border: none;
  border-radius: var(--radius) !important;
  font-size: 14px !important;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  user-select: none;
  position: relative;
  overflow: hidden;
  width: auto !important;
  height: auto !important;
}

.action-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.clear-btn {
  background: var(--danger-color);
  color: white;
}

.clear-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.cancel-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.save-btn {
  background: var(--primary-color);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

/* 渐变模式下的按钮样式 */
[data-color-mode="gradient"] .save-btn {
  background: var(--gradient-primary);
  border-color: transparent;
}

[data-color-mode="gradient"] .save-btn:hover:not(:disabled) {
  background: var(--gradient-primary);
  filter: brightness(1.1);
}

/* 加载动画 */
.loading-spinner.small {
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

/* 确认弹窗样式 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, var(--modal-backdrop-opacity, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(var(--modal-backdrop-blur, 8px));
  -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 8px));
}

.confirm-dialog {
  background: var(--bg-primary);
  border-radius: var(--radius);
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  animation: slideUp 0.3s ease;
}

.confirm-header h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.confirm-content p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.confirm-content p:last-child {
  margin-bottom: 0;
}

.warning-text {
  color: var(--danger-color) !important;
  font-weight: 500;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* 动画 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .agent-memory {
    max-width: 100%;
  }
  
  .memory-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .memory-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .right-actions {
    justify-content: flex-end;
  }
  
  .confirm-dialog {
    min-width: 0;
    width: calc(100vw - 32px);
    margin: 16px;
  }
}
</style>
