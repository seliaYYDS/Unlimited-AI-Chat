<template>
  <div class="custom-slider" :class="{ disabled: disabled }">
    <div class="slider-header">
      <span class="slider-label">{{ label }}: {{ displayValue }}</span>
      <span class="slider-value">{{ displayValue }}{{ unit }}</span>
    </div>
    <div class="slider-track" @click="handleTrackClick">
      <div class="slider-progress" :style="{ width: progressWidth }"></div>
      <div 
        class="slider-thumb" 
        :style="{ left: progressWidth }"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <div class="slider-thumb-glow"></div>
      </div>
    </div>
    <div class="slider-ticks" v-if="showTicks">
      <div class="tick" :style="{ left: `${(tick - min) / (max - min) * 100}%` }" v-for="tick in ticks" :key="tick">
        <span class="tick-label">{{ tick }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomSlider',
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    step: {
      type: Number,
      default: 1
    },
    label: {
      type: String,
      default: ''
    },
    unit: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    showTicks: {
      type: Boolean,
      default: false
    },
    tickInterval: {
      type: Number,
      default: 10
    }
  },
  data() {
    return {
      isDragging: false
    }
  },
  computed: {
    progressWidth() {
      return `${((this.modelValue - this.min) / (this.max - this.min)) * 100}%`
    },
    ticks() {
      if (!this.showTicks) return []
      const ticks = []
      for (let i = this.min; i <= this.max; i += this.tickInterval) {
        ticks.push(i)
      }
      return ticks
    },
    displayValue() {
      // 确保显示的值有正确的小数位数
      const stepPrecision = this.getDecimalPlaces(this.step)
      return parseFloat(this.modelValue.toFixed(stepPrecision))
    }
  },
  methods: {
    startDrag(event) {
      if (this.disabled) return
      this.isDragging = true
      this.updateValueFromEvent(event)
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
      document.addEventListener('touchmove', this.onDrag, { passive: false })
      document.addEventListener('touchend', this.stopDrag)
    },
    onDrag(event) {
      if (!this.isDragging || this.disabled) return
      event.preventDefault()
      this.updateValueFromEvent(event)
    },
    stopDrag() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
      document.removeEventListener('touchmove', this.onDrag)
      document.removeEventListener('touchend', this.stopDrag)
    },
    updateValueFromEvent(event) {
      const track = this.$el.querySelector('.slider-track')
      const rect = track.getBoundingClientRect()
      let clientX
      
      if (event.type.includes('touch')) {
        clientX = event.touches[0].clientX
      } else {
        clientX = event.clientX
      }
      
      let position = (clientX - rect.left) / rect.width
      position = Math.max(0, Math.min(1, position))
      
      // 修复浮点数精度问题
      let newValue = this.min + position * (this.max - this.min)
      
      // 使用更精确的四舍五入方法来避免浮点数精度问题
      const stepPrecision = this.getDecimalPlaces(this.step)
      const roundFactor = Math.pow(10, stepPrecision)
      newValue = Math.round(newValue / this.step) * this.step
      
      // 再次使用toFixed来确保精度
      newValue = parseFloat(newValue.toFixed(stepPrecision))
      newValue = Math.max(this.min, Math.min(this.max, newValue))
      
      if (this.modelValue !== newValue) {
        this.$emit('update:modelValue', newValue)
        this.$emit('change', newValue)
      }
    },
    
    // 获取小数位数
    getDecimalPlaces(num) {
      const str = num.toString()
      if (str.indexOf('.') !== -1 && str.indexOf('e-') === -1) {
        return str.split('.')[1].length
      } else if (str.indexOf('e-') !== -1) {
        const parts = str.split('e-')
        return parseInt(parts[1], 10)
      }
      return 0
    },
    handleTrackClick(event) {
      if (this.disabled) return
      this.updateValueFromEvent(event)
    }
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('mouseup', this.stopDrag)
    document.removeEventListener('touchmove', this.onDrag)
    document.removeEventListener('touchend', this.stopDrag)
  }
}
</script>

<style scoped>
.custom-slider {
  width: 100%;
  padding: 8px 0;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slider-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.slider-value {
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 600;
}

/* 渐变模式下的滑块值 */
[data-color-mode="gradient"] .slider-value {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

.slider-track {
  position: relative;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider-track:hover {
  background: var(--border-color);
}

.custom-slider.disabled .slider-track {
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}

.slider-progress {
  position: absolute;
  height: 100%;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 0.2s ease;
}

/* 渐变模式下的滑块进度条 */
[data-color-mode="gradient"] .slider-progress {
  background: var(--gradient-primary);
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  background: var(--primary-color);
  border: 2px solid white;
  border-radius: 50%;
  cursor: grab;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* 渐变模式下的滑块手柄 */
[data-color-mode="gradient"] .slider-thumb {
  background: var(--gradient-primary);
}

.slider-thumb:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.slider-thumb:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.2);
}

.custom-slider.disabled .slider-thumb {
  cursor: not-allowed;
  opacity: 0.6;
}

.slider-thumb-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary-color);
  opacity: 0.3;
  filter: blur(6px);
  z-index: -1;
}

/* 渐变模式下的滑块光晕 */
[data-color-mode="gradient"] .slider-thumb-glow {
  background: var(--gradient-primary);
}

.slider-ticks {
  position: relative;
  height: 16px;
  margin-top: 4px;
}

.tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 6px;
  background: var(--border-color);
}

.tick .tick-label {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--text-tertiary);
}
</style>