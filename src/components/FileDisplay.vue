<template>
  <div class="file-display" @click="handleClick">
    <div class="file-display-icon">📄</div>
    <div class="file-display-info">
      <div class="file-display-name">{{ fileName }}</div>
      <div class="file-display-meta">{{ fileSize }}</div>
    </div>
    <div class="file-display-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileDisplay',
  props: {
    fileName: {
      type: String,
      required: true
    },
    fileContent: {
      type: String,
      required: true
    },
    fileSize: {
      type: String,
      default: ''
    }
  },
  emits: ['click'],
  methods: {
    handleClick() {
      this.$emit('click', {
        name: this.fileName,
        content: this.fileContent,
        size: this.fileSize
      })
    }
  }
}
</script>

<style scoped>
.file-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 8px 0;
}

.file-display:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-display-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.file-display-info {
  flex: 1;
  min-width: 0;
}

.file-display-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-display-meta {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.file-display-arrow {
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.file-display:hover .file-display-arrow {
  color: var(--primary-color);
  transform: translateX(2px);
}

/* 暗色主题适配 */
[data-theme="dark"] .file-display {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

[data-theme="dark"] .file-display:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-color);
}
</style>