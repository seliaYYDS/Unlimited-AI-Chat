<template>
  <!-- 主题设置 -->
    <div class="settings-section">
      <h4 class="section-title">主题设置</h4>

      <div class="form-group">
        <label>主题模式</label>
        <div class="theme-options">
          <div
            v-for="theme in themeOptions"
            :key="theme.value"
            :class="['theme-option', { active: settings.theme === theme.value }]"
            @click="updateSetting('theme', theme.value)"
          >
            <div class="theme-preview" :class="theme.value">
              <div class="preview-content">
                <div class="preview-header"></div>
                <div class="preview-body">
                  <div class="preview-message user"></div>
                  <div class="preview-message assistant"></div>
                </div>
              </div>
            </div>
            <span class="theme-label">{{ theme.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>颜色模式</label>
        <CustomSelect
          :model-value="settings.colorMode"
          :options="colorModeOptions"
          placeholder="选择颜色模式"
          @update:model-value="updateSetting('colorMode', $event)"
        />
      </div>

      <!-- 单色模式 -->
      <div v-if="settings.colorMode === 'single'" class="form-group">
        <label>主色调</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.primaryColor"
            @change="updateSetting('primaryColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('primaryColor', color)"
            ></div>
          </div>
        </div>
      </div>

      <!-- 双色模式 -->
      <div v-if="settings.colorMode === 'dual'" class="form-group">
        <label>主色调</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.primaryColor"
            @change="updateSetting('primaryColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('primaryColor', color)"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="settings.colorMode === 'dual'" class="form-group">
        <label>副色调</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.secondaryColor"
            @change="updateSetting('secondaryColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('secondaryColor', color)"
            ></div>
          </div>
        </div>
      </div>

      <!-- 渐变模式 -->
      <div v-if="settings.colorMode === 'gradient'" class="form-group">
        <label>渐变色一</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.gradientColor1"
            @change="updateSetting('gradientColor1', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('gradientColor1', color)"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="settings.colorMode === 'gradient'" class="form-group">
        <label>渐变色二</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.gradientColor2"
            @change="updateSetting('gradientColor2', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('gradientColor2', color)"
            ></div>
          </div>
        </div>
      </div>

      
    </div>

    <!-- 界面样式 -->
    <div class="settings-section">
      <h4 class="section-title">界面样式</h4>

      <div class="form-group">
        <label>字体大小</label>
        <div class="option-buttons">
          <button
            v-for="size in fontSizeOptions"
            :key="size.value"
            :class="['option-btn', { active: settings.fontSize === size.value }]"
            @click="updateSetting('fontSize', size.value)"
          >
            {{ size.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>圆角大小</label>
        <div class="option-buttons">
          <button
            v-for="radius in borderRadiusOptions"
            :key="radius.value"
            :class="['option-btn', { active: settings.borderRadius === radius.value }]"
            @click="updateSetting('borderRadius', radius.value)"
          >
            {{ radius.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>消息气泡样式</label>
        <div class="option-buttons">
          <button
            v-for="style in bubbleStyleOptions"
            :key="style.value"
            :class="['option-btn', { active: settings.messageBubbleStyle === style.value }]"
            @click="updateSetting('messageBubbleStyle', style.value)"
          >
            {{ style.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>聊天布局</label>
        <div class="option-buttons">
          <button
            v-for="layout in chatLayoutOptions"
            :key="layout.value"
            :class="['option-btn', { active: settings.chatLayout === layout.value }]"
            @click="updateSetting('chatLayout', layout.value)"
          >
            {{ layout.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 动画设置 -->
    <div class="settings-section">
      <h4 class="section-title">动画设置</h4>

      <div class="form-group">

        <CustomCheckbox

          :model-value="settings.enableAnimations"

          label="启用动画效果"

          @update:model-value="updateSetting('enableAnimations', $event)"

        />

        <div class="form-hint">

          启用后，界面元素将会有平滑的过渡动画效果

        </div>

      </div>

      <div class="form-group">
        <label>动画速度</label>
        <div class="option-buttons">
          <button
            v-for="speed in animationSpeedOptions"
            :key="speed.value"
            :class="['option-btn', { active: settings.animationSpeed === speed.value }]"
            @click="updateSetting('animationSpeed', speed.value)"
          >
            {{ speed.label }}
          </button>
        </div>
      </div>
    </div>





    <!-- 灵动岛设置 -->

    <div class="settings-section">

      <h4 class="section-title">灵动岛设置</h4>



      <div class="form-group">

        <label>边框宽度</label>

        <div class="option-buttons">

          <button

            v-for="width in dynamicIslandBorderWidthOptions"

            :key="width.value"

            :class="['option-btn', { active: settings.dynamicIslandBorderWidth === width.value }]"

            @click="updateSetting('dynamicIslandBorderWidth', width.value)"

          >

            {{ width.label }}

          </button>

        </div>

      </div>



      <div class="form-group" v-if="settings.dynamicIslandBorderWidth > 0">

        <label>边框颜色</label>

        <div class="color-picker-group">

          <input

            type="color"

            class="color-picker"

            v-model="settings.dynamicIslandBorderColor"

            @change="updateSetting('dynamicIslandBorderColor', $event.target.value)"

          >

          <div class="color-presets">

            <div

              v-for="color in colorPresets"

              :key="color"

              class="color-preset"

              :style="{ backgroundColor: color }"

              @click="updateSetting('dynamicIslandBorderColor', color)"

            ></div>

          </div>

        </div>

      </div>

    </div>





    <!-- 流光效果设置 -->

    <div class="settings-section">
      <h4 class="section-title">流光效果设置</h4>

      <div class="form-group">

        <CustomCheckbox

          :model-value="settings.enableShineEffect"

          label="启用流光效果"

          @update:model-value="updateSetting('enableShineEffect', $event)"

        />

        <div class="form-hint">

          启用后，按钮和元素在悬停时将显示流光效果

        </div>

      </div>

      <div class="form-group">
        <label>流光颜色</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.shineColor"
            @change="updateSetting('shineColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in shineColorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('shineColor', color)"
            ></div>
          </div>
        </div>
      </div>

      <div class="form-group">

        <label>流光速度</label>

        <div class="option-buttons">

          <button

            v-for="speed in shineSpeedOptions"

            :key="speed.value"

            :class="['option-btn', { active: settings.shineSpeed === speed.value }]"

            @click="updateSetting('shineSpeed', speed.value)"

          >

            {{ speed.label }}

          </button>

        </div>

      </div>



      <div class="form-group">

        <label>流光透明度</label>

        <input

          type="range"

          min="0"

          max="1"

          step="0.1"

          :value="settings.shineOpacity"

          @input="updateSetting('shineOpacity', parseFloat($event.target.value))"

          class="slider"

        >

        <div class="slider-value">{{ settings.shineOpacity }}</div>

      </div>
    </div>

    <!-- 通知设置 -->
    <div class="settings-section">
      <h4 class="section-title">通知设置</h4>

      <div class="form-group">
        <label>边框模式</label>
        <CustomSelect
          :model-value="settings.notificationBorderMode"
          :options="notificationBorderOptions"
          placeholder="选择边框模式"
          @update:model-value="updateSetting('notificationBorderMode', $event)"
        />
      </div>

      <div class="form-group">
        <label>滞留时间（秒）</label>
        <CustomSlider
          :model-value="settings.notificationDuration"
          :min="1"
          :max="10"
          :step="0.5"
          label=""
          unit="秒"
          @update:model-value="updateSetting('notificationDuration', $event)"
        />
      </div>
    </div>

    <!-- 重置按钮 -->
    <div class="settings-actions">
      <button class="btn secondary" @click="resetToDefaults">
        重置为默认值
      </button>
    </div>
</template>

<script>
import { StorageManager } from '../storage.js'
import CustomSelect from './CustomSelect.vue'
import CustomSlider from './CustomSlider.vue'
import CustomCheckbox from './CustomCheckbox.vue'

export default {
  name: 'StyleSettings',
  components: {
    CustomSelect,
    CustomSlider,
    CustomCheckbox
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      storageManager: null,

      // 选项配置
      themeOptions: [
        { value: 'light', label: '亮色' },
        { value: 'dark', label: '暗色' }
      ],

      colorPresets: [
        '#ec4899', // 粉红
        '#3b82f6', // 蓝色
        '#10b981', // 绿色
        '#f59e0b', // 橙色
        '#8b5cf6', // 紫色
        '#ef4444'  // 红色
      ],

      colorModeOptions: [
        { value: 'single', label: '单色模式' },
        { value: 'dual', label: '双色模式' },
        { value: 'gradient', label: '渐变模式' }
      ],

      fontSizeOptions: [
        { value: 'small', label: '小' },
        { value: 'medium', label: '中' },
        { value: 'large', label: '大' }
      ],

      borderRadiusOptions: [
        { value: 'small', label: '小' },
        { value: 'medium', label: '中' },
        { value: 'large', label: '大' }
      ],

      bubbleStyleOptions: [
        { value: 'default', label: '默认' },
        { value: 'rounded', label: '圆角' },
        { value: 'minimal', label: '极简' }
      ],

      chatLayoutOptions: [
        { value: 'standard', label: '标准' },
        { value: 'compact', label: '紧凑' },
        { value: 'expanded', label: '扩展' }
      ],

      animationSpeedOptions: [
        { value: 'fast', label: '快速' },
        { value: 'normal', label: '正常' },
        { value: 'slow', label: '慢速' }
      ],

      // 流光效果设置选项
      shineColorPresets: [
        '#ec4899', // 粉红
        '#3b82f6', // 蓝色
        '#10b981', // 绿色
        '#f59e0b', // 橙色
        '#8b5cf6', // 紫色
        '#ef4444', // 红色
        '#ffffff'  // 白色
      ],

      shineSpeedOptions: [

        { value: 'fast', label: '快速' },

        { value: 'normal', label: '正常' },

        { value: 'slow', label: '慢速' }

      ],



      // 灵动岛边框宽度选项

      dynamicIslandBorderWidthOptions: [

        { value: 0, label: '无边框' },

        { value: 1, label: '1px' },

        { value: 2, label: '2px' },

        { value: 3, label: '3px' }

      ],
      
      // 通知边框模式选项
      notificationBorderOptions: [
        { value: 'none', label: '无边框' },
        { value: 'left', label: '左边框' },
        { value: 'right', label: '右边框' },
        { value: 'full', label: '完全边框' }
      ],

      

    }

  },
  mounted() {
    this.storageManager = new StorageManager()
  },
  methods: {
    updateSetting(key, value) {
      this.$emit('update:settings', {
        ...this.settings,
        [key]: value
      })
    },

    resetToDefaults() {

      const defaultSettings = this.storageManager.getSettings()

      this.$emit('update:settings', {

        ...this.settings,

        theme: 'light',

        primaryColor: '#ec4899',

        secondaryColor: '#3b82f6',

        gradientColor1: '#ec4899',

        gradientColor2: '#3b82f6',

        fontSize: 'medium',

        borderRadius: 'medium',

        animationSpeed: 'normal',

        enableAnimations: true,

        messageBubbleStyle: 'default',

        chatLayout: 'standard',

        colorMode: 'single',

        // 流光效果默认设置

        enableShineEffect: true,

        shineColor: '#ec4899',

        shineSpeed: 'normal',

        // 灵动岛默认设置

        dynamicIslandBorderWidth: 0,

        dynamicIslandBorderColor: '#ffffff',
        
        // 通知默认设置
        notificationBorderMode: 'none',
        notificationDuration: 3

      })

      this.showNotification('已重置为默认样式', 'success')

    },

    showNotification(message, type) {
      this.$emit('notify', { message, type })
    }
  }
}
</script>

<style scoped>
/* 应用于组件顶级元素的样式 */
:deep(.settings-section:first-child) {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 16px;
  padding-left: 16px;
  width: 100%;
  min-width: 300px;
  box-sizing: border-box;
}

/* 隐藏滚动条但保留功能 */
:deep(.settings-section:first-child)::-webkit-scrollbar {
  width: 6px;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* 隐藏父级模态框的滚动条 */
:deep(.modal-content) {
  overflow-y: hidden !important;
}

:deep(.modal-content .settings-section:first-child) {
  max-height: 65vh;
  min-width: 300px;
}

.settings-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 主题选项 */
.theme-options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.theme-option {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s ease;
}

.theme-option:hover {
  transform: translateY(-2px);
}

.theme-option.active .theme-preview {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.theme-preview {
  width: 80px;
  height: 60px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.theme-preview.light {
  background: #ffffff;
}

.theme-preview.dark {
  background: #1a1a1a;
}

.preview-content {
  padding: 4px;
}

.preview-header {
  height: 8px;
  background: var(--primary-color);
  border-radius: 2px;
  margin-bottom: 4px;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-message {
  height: 4px;
  border-radius: 2px;
}

.preview-message.user {
  background: var(--primary-color);
  width: 70%;
  align-self: flex-end;
}

.preview-message.assistant {
  background: var(--text-secondary);
  width: 60%;
  align-self: flex-start;
}

.theme-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 颜色选择器 */
.color-picker-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.color-presets {
  display: flex;
  gap: 8px;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid var(--border-color);
  transition: transform 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.1);
}

/* 选项按钮 */
.option-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.option-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.option-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}



/* 操作按钮 */
.settings-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 复选框样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
  margin-bottom: 0;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.checkbox-input:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-input:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.checkbox-input:hover {
  border-color: var(--primary-color);
}

.checkbox-text {
  flex: 1;
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* 滑块样式 */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-value {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-options {
    justify-content: center;
  }

  .option-buttons {
    justify-content: center;
  }
}
</style>