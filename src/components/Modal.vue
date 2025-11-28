<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" :class="[size === 'auto' ? 'auto-width' : size, type]" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close" @click="close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-content">
        <slot></slot>
      </div>
      <div class="modal-footer" v-if="showFooter">
        <button class="btn secondary" @click="close" v-if="showCancel">取消</button>
        <button class="btn primary" @click="confirm" :disabled="confirmDisabled">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'medium', // small, medium, large, auto
      validator: (value) => ['small', 'medium', 'large', 'auto'].includes(value)
    },
    type: {
      type: String,
      default: 'default', // default, warning, danger, success
      validator: (value) => ['default', 'warning', 'danger', 'success'].includes(value)
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    showCancel: {
      type: Boolean,
      default: true
    },
    confirmText: {
      type: String,
      default: '确认'
    },
    confirmDisabled: {
      type: Boolean,
      default: false
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:visible', 'confirm', 'close'],
  methods: {
    close() {
      this.$emit('update:visible', false)
      this.$emit('close')
    },
    confirm() {
      this.$emit('confirm')
    },
    handleOverlayClick() {
      if (this.closeOnOverlay) {
        this.close()
      }
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
  }
}
</script>

<style scoped>
.modal-overlay {
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
  animation: fadeIn 0.3s ease;
  /* 添加模糊效果 */
  backdrop-filter: blur(var(--modal-backdrop-blur, 8px));
  -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 8px)); /* Safari 支持 */
}

/* 为不支持 backdrop-filter 的浏览器提供降级方案 */
@supports not (backdrop-filter: blur(8px)) {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.7);
  }
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  max-height: 90vh;
  min-width: 300px;
  width: fit-content; /* 根据内容调整宽度 */
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.modal-container.small {
  width: min(400px, 90vw);
}

.modal-container.medium {
  width: min(500px, 90vw);
}

.modal-container.large {
  width: min(600px, 90vw);
}

/* 内容自适应宽度的模态框 */
.modal-container.auto-width {
  width: fit-content;
  min-width: 300px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-content {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  background: transparent;
  box-sizing: border-box;
}

.modal-content .form-group {
  margin-bottom: 16px;
  width: 100%; /* 确保表单组占满容器宽度 */
}

.modal-content .form-control {
  max-width: 100%;
  box-sizing: border-box;
  width: 100%; /* 确保表单控件占满容器宽度 */
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 0 24px 20px;
}

/* 模态框类型样式 */
.modal-container.warning {
  border-left: 4px solid #f59e0b;
}

.modal-container.danger {
  border-left: 4px solid #ef4444;
}

.modal-container.success {
  border-left: 4px solid #10b981;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

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

/* 暗色主题适配 */
:root[data-theme="dark"] .modal-container {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}
</style>