<template>
  <div class="horizontal-slider" :class="{ 'is-disabled': disabled }">
    <div class="slider-track">
      <div
        class="slider-indicator"
        :style="indicatorStyle"
      ></div>
      <div
        v-for="(option, index) in options"
        :key="option.value"
        :class="['slider-option', { 'is-active': modelValue === option.value }]"
        @click="selectOption(option.value)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HorizontalSlider',
  props: {
    modelValue: {
      type: [String, Number],
      required: true
    },
    options: {
      type: Array,
      required: true,
      validator: (value) => {
        return value.every(option => 
          option.hasOwnProperty('value') && option.hasOwnProperty('label')
        )
      }
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  computed: {
    currentIndex() {
      return this.options.findIndex(option => option.value === this.modelValue)
    },
    indicatorStyle() {
      if (this.currentIndex === -1) return {}
      
      const optionCount = this.options.length
      const optionWidth = 100 / optionCount
      
      return {
        left: `${this.currentIndex * optionWidth}%`,
        width: `${optionWidth}%`
      }
    }
  },
  methods: {
    selectOption(value) {
      if (this.disabled) return
      this.$emit('update:modelValue', value)
    }
  }
}
</script>

<style scoped>
.horizontal-slider {
  position: relative;
  width: 100%;
  user-select: none;
}

.horizontal-slider.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.slider-track {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  padding: 4px;
  overflow: hidden;
}

.slider-indicator {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: var(--primary-color);
  border-radius: calc(var(--radius) - 4px);
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.slider-option {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
  z-index: 2;
}

.slider-option:hover {
  color: var(--text-primary);
}

.slider-option.is-active {
  color: #ffffff;
  font-weight: 500;
}

/* 主题适配 */
[data-theme="dark"] .slider-track {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .slider-option {
  color: rgba(255, 255, 255, 0.7);
}

[data-theme="dark"] .slider-option:hover {
  color: rgba(255, 255, 255, 0.9);
}

[data-theme="dark"] .slider-option.is-active {
  color: #ffffff;
}

/* 动画效果 */
.horizontal-slider:not(.is-disabled) .slider-indicator {
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 响应式 */
@media (max-width: 768px) {
  .slider-option {
    padding: 6px 8px;
    font-size: 13px;
  }
}
</style>