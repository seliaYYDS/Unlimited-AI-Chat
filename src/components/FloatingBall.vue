<template>
  <div 
    class="floating-ball" 
    :class="{ 'expanded': isExpanded, 'mobile': isMobile }"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      '--primary-color': primaryColor,
      '--secondary-color': secondaryColor,
      '--primary-color-dark': primaryColorDark,
      '--secondary-color-dark': secondaryColorDark
    }"
    @mousedown="onDesktopDragStart"
    @touchstart="onMobileDragStart"
  >
    <div class="floating-ball-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.7 7.1 1.2 10.1 3.2 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
      </svg>
    </div>
    <div v-if="isExpanded" class="tools-dropdown">
      <div class="tools-list">
        <div 
          class="tool-item" 
          @click.stop="onToolClick('music-player')"
          @touchend.stop="onToolTouchEnd($event, 'music-player')"
        >音乐播放器</div>
        <div 
          class="tool-item" 
          @click.stop="onToolClick('notepad')"
          @touchend.stop="onToolTouchEnd($event, 'notepad')"
        >草稿纸</div>
        <div 
          class="tool-item" 
          @click.stop="onToolClick('quick-chat')"
          @touchend.stop="onToolTouchEnd($event, 'quick-chat')"
        >快速对话</div>
        <div 
          class="tool-item" 
          @click.stop="onToolClick('image-generator')"
          @touchend.stop="onToolTouchEnd($event, 'image-generator')"
        >AI图片生成</div>
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
    this.isMobile = 'ontouchstart' in window || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 从localStorage加载之前保存的位置
    this.loadPosition()
    
    // 设置初始位置为右下角（如果之前没有保存过位置）
    this.$nextTick(() => {
      if (!this.hasLoadedPosition) {
        this.setPositionToBottomRight()
      }
      window.addEventListener('resize', this.handleResize)
    })
    
    // 添加桌面端事件监听器
    document.addEventListener('mousemove', this.onDesktopDrag, { passive: false })
    document.addEventListener('mouseup', this.onDesktopDragEnd, { passive: true })
    
    // 添加移动端事件监听器
    document.addEventListener('touchmove', this.onMobileDrag, { passive: false })
    document.addEventListener('touchend', this.onMobileDragEnd, { passive: true })
    document.addEventListener('touchcancel', this.onMobileDragEnd, { passive: true })
    
    // 添加外部点击事件监听器
    document.addEventListener('click', this.handleOutsideClick)
    
    // 添加移动端外部触摸事件监听器
    if (this.isMobile) {
      document.addEventListener('touchstart', this.handleOutsideTouch, { passive: true })
    }
    
    // 添加移动端触摸事件监听器（用于处理触摸反馈）
    if (this.isMobile) {
      this.$el.addEventListener('touchstart', this.onTouchStart, { passive: true })
      this.$el.addEventListener('touchend', this.onTouchEnd, { passive: true })
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    
    // 移除桌面端事件监听器
    document.removeEventListener('mousemove', this.onDesktopDrag)
    document.removeEventListener('mouseup', this.onDesktopDragEnd)
    
    // 移除移动端事件监听器
    document.removeEventListener('touchmove', this.onMobileDrag)
    document.removeEventListener('touchend', this.onMobileDragEnd)
    document.removeEventListener('touchcancel', this.onMobileDragEnd)
    
    document.removeEventListener('click', this.handleOutsideClick)
    
    // 移除移动端外部触摸事件监听器
    if (this.isMobile) {
      document.removeEventListener('touchstart', this.handleOutsideTouch)
    }
    
    // 移除移动端触摸事件监听器
    if (this.isMobile && this.$el) {
      this.$el.removeEventListener('touchstart', this.onTouchStart)
      this.$el.removeEventListener('touchend', this.onTouchEnd)
    }
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
    
    // 移动端外部触摸处理
    handleOutsideTouch(event) {
      // 如果悬浮球是展开状态，触摸其他地方时收起
      if (this.isExpanded) {
        const el = this.$el;
        if (!el.contains(event.target)) {
          this.isExpanded = false;
        }
      }
    },

    onToolClick(toolName) {
      // 点击工具后立即收起菜单
      this.isExpanded = false;
      // 触发工具点击事件
      this.$emit('tool-click', toolName);
      // 可以根据需要添加具体的工具功能
      console.log(`点击了工具: ${toolName}`);
    },
    
    // 移动端工具项触摸结束处理
    onToolTouchEnd(event, toolName) {
      // 防止事件冒泡和默认行为
      event.preventDefault();
      event.stopPropagation();
      
      // 添加触觉反馈（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(50); // 轻微震动反馈
      }
      
      // 触发工具点击
      this.onToolClick(toolName);
    },
    
    // 桌面端拖动开始
    onDesktopDragStart(event) {
      this.isDragging = true
      this.dragStartX = event.clientX - this.position.x
      this.dragStartY = event.clientY - this.position.y
      // 记录点击开始位置用于检测是否拖动
      this.clickStartX = event.clientX
      this.clickStartY = event.clientY
      this.isClickDetected = false // 重置点击检测
      // 防止在拖动过程中选中文本
      document.body.style.userSelect = 'none'
      event.preventDefault()
    },

    // 移动端拖动开始
    onMobileDragStart(event) {
      if (!event.touches || event.touches.length !== 1) return
      
      const touch = event.touches[0]
      this.isDragging = true
      this.dragStartX = touch.clientX - this.position.x
      this.dragStartY = touch.clientY - this.position.y
      // 记录触摸开始位置用于检测是否拖动
      this.clickStartX = touch.clientX
      this.clickStartY = touch.clientY
      this.isClickDetected = false // 重置点击检测
      // 防止在拖动过程中选中文本和页面滚动
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      event.preventDefault()
    },

    // 统一的拖动开始处理
    startDrag(event) {
      if (this.isMobile) {
        this.onMobileDragStart(event)
      } else {
        this.onDesktopDragStart(event)
      }
    },

    // 桌面端拖动中
    onDesktopDrag(event) {
      if (!this.isDragging) return
      
      // 检测是否实际移动了足够距离来判断是否为拖动
      const distance = Math.sqrt(
        Math.pow(event.clientX - this.clickStartX, 2) + 
        Math.pow(event.clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离超过5像素，则认为是在拖动
      if (distance > 5) {
        this.isClickDetected = false; // 确保不是点击
      }
      
      // 使用 requestAnimationFrame 优化拖动性能
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.position.x = event.clientX - this.dragStartX
          this.position.y = event.clientY - this.dragStartY
          
          // 确保悬浮球在窗口范围内
          this.position.x = Math.max(0, Math.min(window.innerWidth - this.$el.offsetWidth, this.position.x))
          this.position.y = Math.max(0, Math.min(window.innerHeight - this.$el.offsetHeight, this.position.y))
          
          // 保存当前位置
          this.savePosition()
          
          this.rafId = null
        })
      }
    },

    // 移动端拖动中
    onMobileDrag(event) {
      if (!this.isDragging || !event.touches || event.touches.length !== 1) return
      
      const touch = event.touches[0]
      
      // 检测是否实际移动了足够距离来判断是否为拖动
      const distance = Math.sqrt(
        Math.pow(touch.clientX - this.clickStartX, 2) + 
        Math.pow(touch.clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离超过10像素（移动端需要更大的阈值），则认为是在拖动
      if (distance > 10) {
        this.isClickDetected = false; // 确保不是点击
      }
      
      // 使用 requestAnimationFrame 优化拖动性能
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.position.x = touch.clientX - this.dragStartX
          this.position.y = touch.clientY - this.dragStartY
          
          // 确保悬浮球在窗口范围内
          this.position.x = Math.max(0, Math.min(window.innerWidth - this.$el.offsetWidth, this.position.x))
          this.position.y = Math.max(0, Math.min(window.innerHeight - this.$el.offsetHeight, this.position.y))
          
          // 保存当前位置
          this.savePosition()
          
          this.rafId = null
        })
      }
      
      event.preventDefault() // 防止页面滚动
    },

    // 桌面端拖动结束
    onDesktopDragEnd(event) {
      if (!this.isDragging) return
      
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
      
      // 检测是否为点击事件（即拖动距离很小）
      const distance = Math.sqrt(
        Math.pow(event.clientX - this.clickStartX, 2) + 
        Math.pow(event.clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离小于等于5像素，则认为是点击，触发展开/收起
      if (distance <= 5) {
        this.isClickDetected = true;
        // 延迟执行展开/收起以确保事件处理完成
        setTimeout(() => {
          this.toggleExpand();
        }, 0);
      }
    },

    // 移动端拖动结束
    onMobileDragEnd(event) {
      if (!this.isDragging) return
      
      this.isDragging = false
      // 恢复用户选择
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      // 取消待处理的动画
      if (this.rafId) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      // 确保在拖动结束时也保存位置
      this.savePosition()
      
      // 获取触摸结束位置
      const touch = event.changedTouches && event.changedTouches[0]
      if (!touch) return
      
      // 检测是否为点击事件（即拖动距离很小）
      const distance = Math.sqrt(
        Math.pow(touch.clientX - this.clickStartX, 2) + 
        Math.pow(touch.clientY - this.clickStartY, 2)
      );
      
      // 如果移动距离小于等于10像素，则认为是点击，触发展开/收起
      if (distance <= 10) {
        this.isClickDetected = true;
        // 延迟执行展开/收起以确保事件处理完成
        setTimeout(() => {
          this.toggleExpand();
        }, 50); // 移动端需要稍微延迟以避免误触发
      }
    },

    // 移动端触摸开始（用于触摸反馈）
    onTouchStart(event) {
      if (!this.isMobile) return
      // 添加触摸反馈样式
      this.$el.style.transform = 'scale(0.95)'
    },

    // 移动端触摸结束（用于触摸反馈）
    onTouchEnd(event) {
      if (!this.isMobile) return
      // 移除触摸反馈样式
      this.$el.style.transform = ''
    },
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
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: none; /* 防止触摸时页面滚动 */
}

.floating-ball:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

/* 移动端特定样式 */
.floating-ball.mobile {
  /* 移动端不需要hover效果 */
}

.floating-ball.mobile:active {
  transform: scale(0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.floating-ball.expanded {
  width: 200px;
  height: 50px;
  border-radius: 25px;
  padding: 0 15px;
  cursor: default;
}

.floating-ball.mobile.expanded {
  /* 移动端展开时的样式调整 */
  width: 180px; /* 稍微小一点以适应移动端 */
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
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1001;
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  /* 确保子元素能访问到这些 CSS 变量 */
  --primary-color: var(--primary-color, #ec4899);
  --secondary-color: var(--secondary-color, #3b82f6);
}

/* 移动端工具下拉菜单特定样式 */
.floating-ball.mobile .tools-dropdown {
  width: 180px; /* 移动端稍微窄一点 */
  max-width: 90vw; /* 确保在小屏幕上不会超出视口 */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); /* 更深的阴影以增强层次感 */
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
  padding: 12px 15px; /* 移动端增加点击区域 */
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
  text-align: left;
  white-space: nowrap;
  user-select: none; /* 防止文本选择 */
  -webkit-user-select: none; /* Safari */
  -webkit-tap-highlight-color: transparent; /* 移除移动端点击高亮 */
  position: relative; /* 为触摸反馈做准备 */
}

.tool-item:hover {
  background-color: var(--bg-hover, #f5f5f5);
  color: var(--text-primary, #333);
  transform: translateX(5px);
}

/* 移动端特定样式 */
.floating-ball.mobile .tool-item {
  padding: 14px 15px; /* 移动端进一步增加点击区域 */
  min-height: 44px; /* 符合移动端最小触摸目标尺寸 */
  display: flex;
  align-items: center;
}

.floating-ball.mobile .tool-item:active {
  background-color: var(--bg-hover, #e8e8e8);
  transform: translateX(3px);
}

/* 移动端触摸反馈效果 */
.floating-ball.mobile .tool-item::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.floating-ball.mobile .tool-item:active::after {
  width: 100%;
  height: 100%;
}

/* 暗色主题适配 */
.theme-dark .floating-ball {
  background: linear-gradient(135deg, var(--primary-color-dark, #c0399d), var(--secondary-color-dark, #2c6cb0));
}

/* 颜色模式适配 */
body[data-color-mode="single"] .floating-ball {
  background: var(--primary-color, #ec4899);
}

body[data-color-mode="single"].theme-dark .floating-ball {
  background: var(--primary-color, #ec4899);
}

body[data-color-mode="dual"] .floating-ball {
  background: linear-gradient(135deg, var(--primary-color, #ec4899), var(--secondary-color, #3b82f6));
}

body[data-color-mode="dual"].theme-dark .floating-ball {
  background: linear-gradient(135deg, var(--primary-color, #ec4899), var(--secondary-color, #3b82f6));
}

body[data-color-mode="gradient"] .floating-ball,
body[data-color-mode="advanced-gradient"] .floating-ball {
  background: var(--gradient-primary, linear-gradient(135deg, #ec4899 0%, #3b82f6 100%));
}

body[data-color-mode="gradient"].theme-dark .floating-ball,
body[data-color-mode="advanced-gradient"].theme-dark .floating-ball {
  background: var(--gradient-primary, linear-gradient(135deg, #ec4899 0%, #3b82f6 100%));
}

/* 确保悬浮球在其他元素之上 */
.floating-ball {
  z-index: 9999;
}
</style>