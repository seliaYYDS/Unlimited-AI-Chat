<template>
  <div class="avatar-upload">
    <!-- 头像类型选择 -->
    <div class="avatar-type-selector">
      <button 
        v-for="type in avatarTypes" 
        :key="type.value"
        :class="['type-btn', { 'active': currentType === type.value }]"
        @click="currentType = type.value"
      >
        <span class="type-icon">{{ type.icon }}</span>
        <span class="type-label">{{ type.label }}</span>
      </button>
    </div>

    <!-- 表情符号选择 -->
    <div v-if="currentType === 'emoji'" class="emoji-selector">
      <div class="emoji-grid">
        <button 
          v-for="emoji in commonEmojis" 
          :key="emoji"
          :class="['emoji-btn', { 'selected': selectedEmoji === emoji }]"
          @click="selectEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <div class="custom-emoji-input">
        <input 
          type="text" 
          v-model="customEmoji" 
          placeholder="或输入自定义表情符号"
          maxlength="2"
          @input="selectEmoji(customEmoji)"
        >
      </div>
    </div>

    <!-- 自定义文字输入 -->
    <div v-if="currentType === 'text'" class="text-input">
      <input 
        type="text" 
        v-model="customText" 
        placeholder="输入自定义文字（1-2个字符）"
        maxlength="2"
        @input="selectText(customText)"
      >
      <div class="text-preview">
        {{ customText || '预览' }}
      </div>
    </div>

    <!-- 图片 URL 输入 -->
    <div v-if="currentType === 'image'" class="image-url-section">
      <input 
        type="text" 
        v-model="imageUrl" 
        placeholder="输入图片 URL 链接"
        @input="validateImageUrl"
      >
      <div v-if="imageUrl && isValidUrl" class="image-preview-container">
        <img 
          :src="imageUrl" 
          alt="头像预览" 
          class="image-preview" 
          @load="handleImageLoad"
          @error="handleImageError"
        >
        <div v-if="!imageLoaded" class="loading-indicator">加载中...</div>
      </div>
      <div v-if="imageUrl && !isValidUrl" class="error-message">图片链接无效或加载失败</div>
    </div>
  </div>
</template>

<script>

export default {

  name: 'AvatarUpload',

  props: {

    modelValue: {

      type: String,

      default: ''

    }

  },

  emits: ['update:modelValue'],

  data() {

      return {

        currentType: 'emoji', // 'emoji', 'text', 'image'

        selectedEmoji: '',

        customEmoji: '',

        customText: '',

        imageUrl: '',

        isValidUrl: false,

        imageLoaded: false,

        avatarTypes: [

          { value: 'emoji', label: '表情符号', icon: '😊' },

          { value: 'text', label: '自定义文字', icon: 'Aa' },

          { value: 'image', label: '图片链接', icon: '🔗' }

        ],

        commonEmojis: [

          '🤖', '😊', '😎', '🤓', '🦊', '🐱', '🐶', '🦄', 

          '🌟', '⭐', '💡', '🎨', '🎭', '🎪', '🎯', '🎲',

          '🔮', '💎', '🌈', '☀️', '🌙', '⚡', '🔥', '💫',

          '🚀', '🛸', '🌍', '🌎', '🌏', '🏔️', '🌊', '🌸'

        ]

      }

    },

  mounted() {

      console.log('[AvatarUpload] Component mounted')

      console.log('[AvatarUpload] Initial modelValue:', this.modelValue)

      this.initializeFromValue()

      console.log('[AvatarUpload] After initialization - currentType:', this.currentType, 'imageUrl:', this.imageUrl, 'isValidUrl:', this.isValidUrl, 'imageLoaded:', this.imageLoaded)

    },

  methods: {

    initializeFromValue() {

          console.log('[AvatarUpload] initializeFromValue called, modelValue:', this.modelValue)

          

          if (this.modelValue) {

            if (this.modelValue.startsWith('http://') || this.modelValue.startsWith('https://')) {

              console.log('[AvatarUpload] Detected image URL type')

              this.currentType = 'image'

              this.imageUrl = this.modelValue

              this.isValidUrl = true

              this.imageLoaded = false

            } else if (this.commonEmojis.includes(this.modelValue)) {

              console.log('[AvatarUpload] Detected emoji type')

              this.currentType = 'emoji'

              this.selectedEmoji = this.modelValue

            } else {

              console.log('[AvatarUpload] Detected text type')

              this.currentType = 'text'

              this.customText = this.modelValue

            }

          } else {

            console.log('[AvatarUpload] No initial value, using defaults')

          }

          

          console.log('[AvatarUpload] After initialization - currentType:', this.currentType, 'imageUrl:', this.imageUrl, 'isValidUrl:', this.isValidUrl, 'imageLoaded:', this.imageLoaded)

        },

    

        selectEmoji(emoji) {

          this.selectedEmoji = emoji

          this.$emit('update:modelValue', emoji)

        },

    

        selectText(text) {

          if (text.length > 0) {

            this.$emit('update:modelValue', text)

          }

        },

    

        validateImageUrl() {

    

              console.log('[AvatarUpload] validateImageUrl called, current imageUrl:', this.imageUrl)

    

              

    

              if (!this.imageUrl) {

    

                this.isValidUrl = false

    

                this.imageLoaded = false

    

                this.$emit('update:modelValue', '')

    

                console.log('[AvatarUpload] imageUrl is empty, resetting state')

    

                return

    

              }

    

        

    

              // 改进的 URL 验证，支持查询参数

    

              const urlPattern = /^https?:\/\/.+\..+/

    

              if (!urlPattern.test(this.imageUrl)) {

    

                this.isValidUrl = false

    

                this.imageLoaded = false

    

                console.log('[AvatarUpload] URL validation failed:', this.imageUrl)

    

                return

    

              }

    

        

    

              // 确保 URL 以 http:// 或 https:// 开头

    

              if (!this.imageUrl.startsWith('http://') && !this.imageUrl.startsWith('https://')) {

    

                this.imageUrl = 'https://' + this.imageUrl

    

                console.log('[AvatarUpload] Added https:// prefix, new URL:', this.imageUrl)

    

              }

    

        

    

              this.isValidUrl = true

    

              this.imageLoaded = false

    

              this.$emit('update:modelValue', this.imageUrl)

    

              console.log('[AvatarUpload] URL validated successfully, isValidUrl:', this.isValidUrl, 'imageLoaded:', this.imageLoaded)

    

            },

    

        

    

            handleImageLoad(event) {

    

              console.log('[AvatarUpload] Image loaded successfully:', this.imageUrl)

    

              this.imageLoaded = true

    

              this.isValidUrl = true

    

            },

    

        

    

            handleImageError(event) {

    

              console.error('[AvatarUpload] Image load failed:', this.imageUrl, event)

    

              this.isValidUrl = false

    

              this.imageLoaded = false

    

            }

  }

}

</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.avatar-type-selector {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: var(--text-secondary);
}

.type-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.type-btn.active {
  background: var(--primary-color);
  color: white;
}

.type-icon {
  font-size: 1.5em;
}

.type-label {
  font-size: 0.75em;
  font-weight: 500;
}

.emoji-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  font-size: 1.5em;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.emoji-btn:hover {
  background: var(--bg-hover);
  transform: scale(1.1);
}

.emoji-btn.selected {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.custom-emoji-input {
  display: flex;
  gap: 8px;
}

.custom-emoji-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.2em;
  text-align: center;
}

.text-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-input input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1em;
  text-align: center;
}

.text-preview {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 50%;
  font-size: 2em;
  margin: 0 auto;
}

.image-url-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-url-section input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9em;
}

.image-preview-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview {
  width: 128px;
  height: 128px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid var(--border-color);
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  white-space: nowrap;
}

.loading-indicator {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9em;
}
</style>