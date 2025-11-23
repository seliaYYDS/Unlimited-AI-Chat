<template>
  <label class="custom-checkbox" :class="{ checked: modelValue, disabled: disabled }">
    <input 
      type="checkbox" 
      :checked="modelValue" 
      :disabled="disabled"
      @change="handleChange"
      class="checkbox-input"
    />
    <div class="checkbox-control">
      <div class="checkbox-checkmark">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 5L4 8L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <span class="checkbox-label" v-if="$slots.default || label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script>
export default {
  name: 'CustomCheckbox',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleChange(event) {
      if (this.disabled) return
      this.$emit('update:modelValue', event.target.checked)
      this.$emit('change', event.target.checked)
    }
  }
}
</script>

<style scoped>
.custom-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.custom-checkbox.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-control {
  position: relative;
  width: 20px;
  height: 20px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-checkbox:hover .checkbox-control {
  border-color: var(--primary-color);
}

.custom-checkbox.checked .checkbox-control {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-checkmark {
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  color: white;
}

.custom-checkbox.checked .checkbox-checkmark {
  opacity: 1;
  transform: scale(1);
}

.checkbox-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  transition: color 0.2s ease;
}

.custom-checkbox.disabled .checkbox-label {
  color: var(--text-tertiary);
}

/* 焦点状态 */
.custom-checkbox:focus-within .checkbox-control {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 动画效果 */
@keyframes checkmark {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.custom-checkbox.checked .checkbox-checkmark {
  animation: checkmark 0.2s ease;
}
</style>