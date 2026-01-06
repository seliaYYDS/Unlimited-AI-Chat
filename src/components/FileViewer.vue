<template>
  <div class="file-viewer-modal" v-if="visible" @click.self="handleClose">
    <div class="file-viewer-container">
      <div class="file-viewer-header">
        <div class="file-viewer-title">
          <div class="file-viewer-icon">📄</div>
          <div class="file-viewer-name">{{ safeFileInfo.name }}</div>
        </div>
        <div class="file-viewer-actions">
          <button class="action-btn copy-btn" @click="copyContent" title="复制内容">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            复制
          </button>
          <button class="action-btn close-btn" @click="handleClose" title="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="file-viewer-content">
        <pre>{{ safeFileInfo.content }}</pre>
      </div>
      <div class="file-viewer-footer">
        <div class="file-viewer-meta">{{ safeFileInfo.size }}</div>
        <div class="file-viewer-stats">{{ safeFileInfo.content.length }} 字符</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    fileInfo: {
      type: Object,
      default: () => ({
        name: '',
        content: '',
        size: ''
      })
    }
  },
  emits: ['close', 'copy-success'],
  computed: {
    safeFileInfo() {
      return this.fileInfo || { name: '', content: '', size: '' }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    copyContent() {
      navigator.clipboard.writeText(this.safeFileInfo.content).then(() => {
        this.$emit('copy-success')
      }).catch(err => {
        console.error('复制失败:', err)
      })
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  },
  beforeUnmount() {
    document.body.style.overflow = ''
  }
}
</script>

<style scoped>
.file-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.file-viewer-container {
  width: 100%;
  max-width: 900px;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.file-viewer-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-viewer-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.file-viewer-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn svg {
  flex-shrink: 0;
}

.close-btn {
  padding: 8px;
}

.close-btn svg {
  margin: 0;
}

.file-viewer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-primary);
}

.file-viewer-content pre {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.file-viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
}

/* 暗色主题适配 */
[data-theme="dark"] .file-viewer-modal {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .file-viewer-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

[data-theme="dark"] .file-viewer-header {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

[data-theme="dark"] .action-btn {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .action-btn:hover {
  background: var(--bg-tertiary);
}

[data-theme="dark"] .file-viewer-content {
  background: var(--bg-secondary);
}

[data-theme="dark"] .file-viewer-footer {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

/* 滚动条样式 */
.file-viewer-content::-webkit-scrollbar {
  width: 8px;
}

.file-viewer-content::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 4px;
}

.file-viewer-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.file-viewer-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-viewer-modal {
    padding: 10px;
  }

  .file-viewer-container {
    max-height: 90vh;
  }

  .file-viewer-header {
    padding: 12px 16px;
  }

  .file-viewer-content {
    padding: 16px;
  }

  .file-viewer-footer {
    padding: 10px 16px;
  }

  .file-viewer-name {
    font-size: 14px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .file-viewer-content pre {
    font-size: 13px;
  }
}
</style>