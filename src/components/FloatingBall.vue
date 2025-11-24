<template>
  <div 
    class="floating-ball" 
    :class="{ 'expanded': isExpanded }"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      '--primary-color': primaryColor,
      '--secondary-color': secondaryColor,
      '--primary-color-dark': primaryColorDark,
      '--secondary-color-dark': secondaryColorDark
    }"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <div class="floating-ball-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.7 7.1 1.2 10.1 3.2 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
      </svg>
    </div>
    <div v-if="isExpanded" class="tools-dropdown">
      <div class="tools-list">
        <div class="tool-item" @click.stop="onToolClick('new-agent')">新建智能体</div>
        <div class="tool-item" @click.stop="onToolClick('export-data')">导出数据</div>
        <div class="tool-item" @click.stop="onToolClick('import-data')">导入数据</div>
        <div class="tool-item" @click.stop="onToolClick('settings')">AI设置</div>
        <div class="tool-item" @click.stop="onToolClick('clear-history')">清空历史</div>
        <div class="tool-item" @click.stop="onToolClick('style-settings')">样式设置</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FloatingBall',
  props: {
    primaryColor: {
      type: String,
      default: '#ec4899'
    },
    secondaryColor: {
      type: String,
      default: '#3b82f6'
    },
    primaryColorDark: {
      type: String,
      default: '#c0399d'
    },
    secondaryColorDark: {
      type: String,
      default: '#2c6cb0'
    }
  },
  data() {
    return {
      isExpanded: false,
      position: { x: 20, y: 20 }, // 初始位置 - 右下角
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      initialX: 0,
      initialY: 0,
      rafId: null,
      hasLoadedPosition: false,
      clickStartX: 0, // 用于检测是否拖动
      clickStartY: 0, // 用于检测是否拖动
      isClickDetected: false, // 标记是否在点击模式下
      isMobile: false // 检测是否为移动设备
    }
  },
  mounted() {
    // 检测是否为移动设备
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 从localStorage加载之前保存的位置
    this.loadPosition()
    
    // 设置初始位置为右下角（如果之前没有保存过位置）
    this.$nextTick(() => {
      if (!this.hasLoadedPosition) {
        this.setPositionToBottomRight()
      }
      window.addEventListener('resize', this.handleResize)
    })
    
    // 添加鼠标/触摸事件监听器 - 使用 passive 优化性能
    if (this.isMobile) {
      document.addEventListener('touchmove', this.onDrag, { passive: false })
      document.addEventListener('touchend', this.stopDrag, { passive: true })
      document.addEventListener('touchcancel', this.stopDrag, { passive: true })
    } else {
      document.addEventListener('mousemove', this.onDrag, { passive: false })
      document.addEventListener('mouseup', this.stopDrag, { passive: true })
    }
    document.addEventListener('click', this.handleOutsideClick)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    if (this.isMobile) {
      document.removeEventListener('touchmove', this.onDrag)
      document.removeEventListener('touchend', this.stopDrag)
      document.removeEventListener('touchcancel', this.stopDrag)
    } else {
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
    }
    document.removeEventListener('click', this.handleOutsideClick)
  },
  methods: {
    // 处理窗口大小变化
    handleResize() {
      // 重新计算位置，确保悬浮球在窗口范围内
      this.position.x = Math.max(0, Math.min(window.innerWidth - this.$el.offsetWidth, this.position.x))
      this.position.y = Math.max(0, Math.min(window.innerHeight - this.$el.offsetHeight, this.position.y))
      this.savePosition()
    },
    
    // 从localStorage加载位置
    loadPosition() {
      try {
        const savedPosition = localStorage.getItem('floatingBallPosition')
        if (savedPosition) {
          const position = JSON.parse(savedPosition)
          // 确保加载的位置在窗口范围内
          this.position.x = Math.max(0, Math.min(window.innerWidth - 50, position.x))
          this.position.y = Math.max(0, Math.min(window.innerHeight - 50, position.y))
          this.hasLoadedPosition = true
        }
      } catch (error) {
        console.warn('加载悬浮球位置失败:', error)
        this.setPositionToBottomRight()
      }
    },
    
    // 保存位置到localStorage
    savePosition() {
      try {
        localStorage.setItem('floatingBallPosition', JSON.stringify(this.position))
      } catch (error) {
        console.warn('保存悬浮球位置失败:', error)
      }
    },
    
    setPositionToBottomRight() {
      if (this.$el) {
        const rect = this.$el.getBoundingClientRect()
        this.position.x = window.innerWidth - rect.width - 20
        this.position.y = window.innerHeight - rect.height - 20
        this.savePosition() // 保存默认位置
      }
    },
    
    toggleExpand() {
      // 点击时切换展开状态
      this.isExpanded = !this.isExpanded;
    },

    handleOutsideClick(event) {
      // 如果悬浮球是展开状态，点击其他地方时收起
      if (this.isExpanded) {
        const el = this.$el;
        if (!el.contains(event.target)) {
          this.isExpanded = false;
        }
      }
    },

    onToolClick(toolName) {
      // 工具点击事件处理
      this.$emit('tool-click', toolName);
      // 点击工具后自动收起
      this.isExpanded = false;
      // 可以根据需要添加具体的工具功能
      console.log(`点击了工具: ${toolName}`);
    },
    
    startDrag(event) {
      // 获取事件坐标 - 支持鼠标和触摸事件
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      
      this.isDragging = true
      this.dragStartX = clientX - this.position.x
      this.dragStartY = clientY - this.position.y
      // 记录点击开始位置用于检测是否拖动
      this.clickStartX = clientX
      this.clickStartY = clientY
      this.isClickDetected = false // 重置点击检测
      // 防止在拖动过程中选中文本
      document.body.style.userSelect = 'none'
      event.preventDefault()
    },
    
    onDrag(event) {
      if (!this.isDragging) return
      
      // 获取事件坐标 - 支持鼠标和触摸事件
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      
      // 检测是否实际移动了足够距离来判断是否为拖动
      const distance = Math.sqrt(
        Math.pow(clientX - this.clickStartX, 2) + 
        Math.pow(clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离超过5像素，则认为是在拖动
      if (distance > 5) {
        this.isClickDetected = false; // 确保不是点击
      } else {
        this.isClickDetected = true; // 移动很小，可能为点击
      }
      
      // 使用 requestAnimationFrame 优化拖动性能
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.position.x = clientX - this.dragStartX
          this.position.y = clientY - this.dragStartY
          
          // 确保悬浮球在窗口范围内
          this.position.x = Math.max(0, Math.min(window.innerWidth - this.$el.offsetWidth, this.position.x))
          this.position.y = Math.max(0, Math.min(window.innerHeight - this.$el.offsetHeight, this.position.y))
          
          // 保存当前位置
          this.savePosition()
          
          this.rafId = null
        })
      }
    },
    
    stopDrag(event) {
      this.isDragging = false
      // 恢复用户选择
      document.body.style.userSelect = ''
      // 取消待处理的动画
      if (this.rafId) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      // 确保在拖动结束时也保存位置
      this.savePosition()
      
      // 获取事件坐标 - 支持鼠标和触摸事件
      const clientX = event.clientX || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
      const clientY = event.clientY || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
      
      // 检测是否为点击事件（即拖动距离很小）
      const distance = Math.sqrt(
        Math.pow(clientX - this.clickStartX, 2) + 
        Math.pow(clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离小于等于5像素，则认为是点击，触发展开/收起
      if (distance <= 5) {
        this.isClickDetected = true;
        this.toggleExpand();
      }
    }
  }
}
</script>

<style scoped>
.floating-ball {
  position: fixed;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color, #ec4899), var(--secondary-color, #3b82f6));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
}

.floating-ball:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.floating-ball.expanded {
  width: 200px;
  height: 50px;
  border-radius: 25px;
  padding: 0 15px;
  cursor: default;
}

.floating-ball-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.floating-ball.expanded .floating-ball-icon {
  margin-right: 10px;
  width: auto;
  height: auto;
}

.tools-dropdown {
  position: absolute;
  top: 60px;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1001;
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.floating-ball.expanded .tools-dropdown {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
}

.tool-item {
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
  color: #333;
  text-align: left;
  white-space: nowrap;
  user-select: none; /* 防止文本选择 */
  -webkit-user-select: none; /* Safari */
}

.tool-item:hover {
  background-color: #f5f5f5;
  transform: translateX(5px);
}

/* 暗色主题适配 */
.theme-dark .floating-ball {
  background: linear-gradient(135deg, var(--primary-color-dark, #c0399d), var(--secondary-color-dark, #2c6cb0));
}

.theme-dark .tools-dropdown {
  background: #2d2d2d;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .tool-item {
  color: #ddd;
}

.theme-dark .tool-item:hover {
  background-color: #444;
}

/* 颜色模式适配 */
body[data-color-mode="single"] .floating-ball {
  background: var(--primary-color, #ec4899);
}

body[data-color-mode="single"].theme-dark .floating-ball {
  background: var(--primary-color-dark, #c0399d);
}

body[data-color-mode="dual"] .floating-ball {
  background: linear-gradient(135deg, var(--primary-color, #ec4899), var(--secondary-color, #3b82f6));
}

body[data-color-mode="dual"].theme-dark .floating-ball {
  background: linear-gradient(135deg, var(--primary-color-dark, #c0399d), var(--secondary-color-dark, #2c6cb0));
}

body[data-color-mode="gradient"] .floating-ball {
  background: var(--gradient-primary, linear-gradient(135deg, #ec4899 0%, #3b82f6 100%));
}

body[data-color-mode="gradient"].theme-dark .floating-ball {
  background: var(--gradient-primary-dark, linear-gradient(135deg, #c0399d 0%, #2c6cb0 100%));
}

/* 确保悬浮球在其他元素之上 */
.floating-ball {
  z-index: 9999;
}
</style>