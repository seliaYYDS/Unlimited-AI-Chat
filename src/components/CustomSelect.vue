<template>
  <div class="custom-select" :class="{ open: isOpen, disabled: disabled }">
    <div class="select-trigger" @click="toggleSelect">
      <span class="select-value" :style="{ fontFamily: selectedFontFamily || 'inherit' }">{{ selectedLabel || placeholder }}</span>
      <svg class="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="select-dropdown" v-show="isOpen">
      <div 
        class="select-option" 
        v-for="option in options" 
        :key="option.value" 
        :class="{ selected: isSelected(option), disabled: option.disabled }"
        :style="{ fontFamily: option.fontFamily || 'inherit' }"
        @click="selectOption(option)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomSelect',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: '请选择'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isOpen: false
    }
  },
  computed: {
    selectedLabel() {
      const selected = this.options.find(option => option.value === this.modelValue)
      return selected ? selected.label : ''
    },
    selectedFontFamily() {
      const selected = this.options.find(option => option.value === this.modelValue)
      return selected ? selected.fontFamily : null
    }
  },
  methods: {
    toggleSelect() {
      if (this.disabled) return
      this.isOpen = !this.isOpen
    },
    selectOption(option) {
      if (this.disabled || option.disabled) return
      this.$emit('update:modelValue', option.value)
      this.$emit('change', option.value)
      this.isOpen = false
    },
    isSelected(option) {
      return option.value === this.modelValue
    }
  },
  mounted() {
    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.isOpen = false
      }
    })
  }
}
</script>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
  min-width: 120px;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.select-trigger:hover {
  border-color: var(--primary-color);
}

.select-trigger:active {
  transform: translateY(1px);
}

.custom-select.open .select-trigger {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.custom-select.disabled .select-trigger {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}

.select-value {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.select-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.custom-select.open .select-arrow {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  z-index: 1000;
  max-height: 250px;
  overflow-y: auto;
  margin-top: 4px;
}

.select-option {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.select-option:hover {
  background: var(--bg-hover);
}

.select-option.selected {
  background: var(--primary-color);
  color: white;
}

.select-option.selected:hover {
  background: var(--primary-hover);
}

.select-option.disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
  background: var(--bg-secondary);
  font-style: italic;
}

.select-option.disabled:hover {
  background: var(--bg-secondary);
}
</style>