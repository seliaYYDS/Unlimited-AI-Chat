<template>
  <div class="avatar-upload">
    <!-- 上传按钮 -->
    <div class="upload-area" @click="triggerFileInput">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileSelect"
        style="display: none"
      >
      <div class="upload-placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>上传图片</span>
      </div>
    </div>

    <!-- 裁剪模态框 -->
    <Modal
      v-model:visible="showCropModal"
      title="裁剪头像"
      size="medium"
      @confirm="confirmCrop"
      @close="cancelCrop"
    >
      <div class="crop-container">
        <div class="crop-preview" ref="cropPreview">
          <img :src="originalImage" ref="imageElement" alt="原始图片" style="max-width: 100%; max-height: 300px;">
        </div>

        <div class="crop-controls">
          <div class="control-group">
            <label>缩放: {{ cropScale.toFixed(2) }}</label>
            <input
              type="range"
              v-model="cropScale"
              min="0.5"
              max="3"
              step="0.1"
              class="slider"
            >
          </div>

          <div class="control-group">
            <label>旋转: {{ cropRotation }}°</label>
            <input
              type="range"
              v-model="cropRotation"
              min="-180"
              max="180"
              step="1"
              class="slider"
            >
          </div>
        </div>

        <div class="preview-section">
          <h4>预览</h4>
          <div class="avatar-preview">
            <img :src="croppedImage" alt="裁剪预览" class="preview-image">
          </div>
        </div>
      </div>
    </Modal>
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
      showCropModal: false,
      originalImage: '',
      croppedImage: '',
      cropScale: 1,
      cropRotation: 0
    }
  },
  mounted() {
    console.log('AvatarUpload: Component mounted')
    console.log('AvatarUpload: fileInput ref:', this.$refs.fileInput)
  },
  methods: {
    triggerFileInput() {
      console.log('AvatarUpload: triggerFileInput called')
      // 使用 nextTick 确保 DOM 已更新
      this.$nextTick(() => {
        const fileInput = this.$refs.fileInput
        console.log('AvatarUpload: fileInput ref:', fileInput)
        if (fileInput) {
          console.log('AvatarUpload: Clicking file input')
          fileInput.click()
        } else {
          console.error('AvatarUpload: fileInput ref is null or undefined')
        }
      })
    },

    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        try {
          // 压缩图片
          const compressedImage = await this.compressImage(file, 128, 128, 0.8)
          this.originalImage = compressedImage
          this.croppedImage = compressedImage
          this.showCropModal = true
        } catch (error) {
          console.error('图片处理失败:', error)
          // 如果压缩失败，使用原始图片
          const reader = new FileReader()
          reader.onload = (e) => {
            this.originalImage = e.target.result
            this.croppedImage = e.target.result
            this.showCropModal = true
          }
          reader.readAsDataURL(file)
        }
      }
    },

    confirmCrop() {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 设置画布大小为128x128（头像标准尺寸）
        canvas.width = 128
        canvas.height = 128

        // 计算缩放和旋转
        const scale = this.cropScale
        const rotation = this.cropRotation * Math.PI / 180

        // 保存上下文状态
        ctx.save()

        // 移动到画布中心
        ctx.translate(canvas.width / 2, canvas.height / 2)

        // 应用旋转
        ctx.rotate(rotation)

        // 绘制图像
        ctx.drawImage(
          img,
          -img.width * scale / 2,
          -img.height * scale / 2,
          img.width * scale,
          img.height * scale
        )

        // 恢复上下文状态
        ctx.restore()

        // 获取裁剪后的图像数据，使用WebP格式压缩
        this.croppedImage = canvas.toDataURL('image/webp', 0.8)

        // 清理资源
        canvas.width = 0
        canvas.height = 0
        URL.revokeObjectURL(img.src)

        // 更新模型值
        console.log('AvatarUpload: Emitting cropped image:', this.croppedImage.substring(0, 50) + '...')
        this.$emit('update:modelValue', this.croppedImage)

        this.showCropModal = false
      }
      img.src = this.originalImage
    },

    cancelCrop() {
      this.showCropModal = false
      this.originalImage = ''
      this.croppedImage = ''
      this.cropScale = 1
      this.cropRotation = 0
    },

    updatePreview() {
      // 实时更新预览
      if (this.originalImage) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
          canvas.width = 128
          canvas.height = 128

          ctx.save()
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate(this.cropRotation * Math.PI / 180)

          ctx.drawImage(
            img,
            -img.width * this.cropScale / 2,
            -img.height * this.cropScale / 2,
            img.width * this.cropScale,
            img.height * this.cropScale
          )

          ctx.restore()

          // 使用WebP格式压缩预览图片
          this.croppedImage = canvas.toDataURL('image/webp', 0.8)

          // 清理资源
          canvas.width = 0
          canvas.height = 0
          URL.revokeObjectURL(img.src)
        }
        img.src = this.originalImage
      }
    },

    // 图片压缩方法
    compressImage(file, maxWidth = 128, maxHeight = 128, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
          // 计算缩放比例
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
          canvas.width = img.width * scale
          canvas.height = img.height * scale

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // 使用WebP格式压缩
          const compressedDataUrl = canvas.toDataURL('image/webp', quality)

          // 清理资源
          canvas.width = 0
          canvas.height = 0
          URL.revokeObjectURL(img.src)

          resolve(compressedDataUrl)
        }

        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
    }
  },
  watch: {
    cropScale() {
      this.updatePreview()
    },
    cropRotation() {
      this.updatePreview()
    }
  },
}
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
}

.upload-area:hover {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.crop-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crop-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-secondary);
}

.crop-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-section h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.avatar-preview {
  display: flex;
  justify-content: center;
}

.preview-image {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  object-fit: cover;
}
</style>