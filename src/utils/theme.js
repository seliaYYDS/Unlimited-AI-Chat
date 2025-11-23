// 主题管理工具
export class ThemeManager {
  constructor(storageManager) {
    this.storageManager = storageManager
    this.currentTheme = this.getStoredTheme() || 'light'
    this.applyTheme(this.currentTheme)
  }

  // 获取存储的主题
  getStoredTheme() {
    try {
      const settings = this.storageManager.getSettings()
      return settings.theme || 'light'
    } catch (error) {
      console.error('获取主题设置失败:', error)
      return 'light'
    }
  }

  // 保存主题设置
  saveTheme(theme) {
    try {
      const settings = this.storageManager.getSettings()
      settings.theme = theme
      this.storageManager.saveSettings(settings)
      return true
    } catch (error) {
      console.error('保存主题设置失败:', error)
      return false
    }
  }

  // 应用主题
  applyTheme(theme) {
    this.currentTheme = theme
    document.documentElement.setAttribute('data-theme', theme)

    // 更新CSS变量
    const root = document.documentElement
    const themeVars = this.getThemeVariables(theme)

    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    this.saveTheme(theme)
  }

  // 应用样式设置
  applyStyleSettings(settings) {
    const root = document.documentElement

    // 根据颜色模式应用相应颜色

    if (settings.colorMode === 'single') {

      // 单色模式：只应用主色调

      if (settings.primaryColor) {

        root.style.setProperty('--primary-color', settings.primaryColor)

        // 应用到title-text等元素

        root.style.setProperty('--title-color', settings.primaryColor)

        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.primaryColor} 0%, ${this.lightenColor(settings.primaryColor, 0.2)} 100%)`)

        // 应用到所有需要颜色的元素

        root.style.setProperty('--component-color', settings.primaryColor)

        root.style.setProperty('--avatar-color', settings.primaryColor)

        // 根据主色调生成相关颜色

        this.generateColorVariants(settings.primaryColor)

      }

    } else if (settings.colorMode === 'dual') {

      // 双色模式：应用主色调和副色调

      if (settings.primaryColor) {

        root.style.setProperty('--primary-color', settings.primaryColor)

        // title-text和组件使用主色调

        root.style.setProperty('--title-color', settings.primaryColor)

        root.style.setProperty('--component-color', settings.primaryColor)

        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor || '#3b82f6'} 100%)`)

      }

      if (settings.secondaryColor) {

        // 智能体头像、用户头像等使用副色调

        root.style.setProperty('--secondary-color', settings.secondaryColor)

        root.style.setProperty('--avatar-color', settings.secondaryColor)

      }

      // 生成主色调的变体

      if (settings.primaryColor) {

        this.generateColorVariants(settings.primaryColor)

      }

    } else if (settings.colorMode === 'gradient') {

      // 渐变模式：应用两个渐变色

      if (settings.gradientColor1 && settings.gradientColor2) {

        // 所有元素使用颜色一与二的渐变

        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${settings.gradientColor2} 100%)`)

        root.style.setProperty('--title-color', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${settings.gradientColor2} 100%)`)

        root.style.setProperty('--component-color', settings.gradientColor1)

        root.style.setProperty('--avatar-color', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${settings.gradientColor2} 100%)`)

      } else if (settings.gradientColor1) {

        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${this.lightenColor(settings.gradientColor1, 0.2)} 100%)`)

        root.style.setProperty('--title-color', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${this.lightenColor(settings.gradientColor1, 0.2)} 100%)`)

        root.style.setProperty('--component-color', settings.gradientColor1)

        root.style.setProperty('--avatar-color', `linear-gradient(135deg, ${settings.gradientColor1} 0%, ${this.lightenColor(settings.gradientColor1, 0.2)} 100%)`)

      }

      // 渐变样式将在CSS中使用这些变量

    }

    // 应用字体大小
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    if (settings.fontSize && fontSizeMap[settings.fontSize]) {
      root.style.setProperty('--text-base', fontSizeMap[settings.fontSize])
    }

    // 应用圆角

    const borderRadiusMap = {

      small: '4px',

      medium: '8px',

      large: '12px'

    }

    if (settings.borderRadius && borderRadiusMap[settings.borderRadius]) {

      root.style.setProperty('--radius', borderRadiusMap[settings.borderRadius])

      // 应用灵动岛圆角

      root.style.setProperty('--dynamic-island-radius', settings.borderRadius === 'small' ? '16px' : settings.borderRadius === 'medium' ? '20px' : '24px')

    }



    // 应用动画速度

    const animationSpeedMap = {

      fast: '150ms',

      normal: '300ms',

      slow: '500ms'

    }

    if (settings.animationSpeed && animationSpeedMap[settings.animationSpeed]) {

      root.style.setProperty('--duration-normal', animationSpeedMap[settings.animationSpeed])

      // 应用灵动岛动画速度

      const dynamicIslandSpeedMap = {

        fast: '0.3s',

        normal: '0.5s',

        slow: '0.7s'

      }

      root.style.setProperty('--dynamic-island-animation-speed', dynamicIslandSpeedMap[settings.animationSpeed])

    }

    // 应用动画开关
    if (settings.enableAnimations !== undefined) {
      root.style.setProperty('--animation-enabled', settings.enableAnimations ? '1' : '0')
    }

    // 应用消息气泡样式
    if (settings.messageBubbleStyle) {
      document.body.setAttribute('data-bubble-style', settings.messageBubbleStyle)
    }

    // 应用聊天布局

    if (settings.chatLayout) {

      document.body.setAttribute('data-chat-layout', settings.chatLayout)

    }



    // 应用颜色模式设置

    if (settings.colorMode) {

      document.body.setAttribute('data-color-mode', settings.colorMode)

    }



    // 应用流光效果设置

    if (settings.enableShineEffect !== undefined) {

      document.body.setAttribute('data-shine-enabled', settings.enableShineEffect.toString())

    }
    
    if (settings.shineColor) {
      root.style.setProperty('--shine-color', settings.shineColor)
    }
    
    // 应用流光透明度
    if (settings.shineOpacity !== undefined) {
      // 确保值在0-1范围内
      const opacity = Math.min(1, Math.max(0, parseFloat(settings.shineOpacity) || 0.4))
      root.style.setProperty('--shine-opacity', opacity)
    }
    
    // 应用流光速度

    const shineSpeedMap = {

      fast: '0.3s',

      normal: '0.6s',

      slow: '1s'

    }

    if (settings.shineSpeed && shineSpeedMap[settings.shineSpeed]) {

      root.style.setProperty('--shine-duration', shineSpeedMap[settings.shineSpeed])

    }

    

    // 应用灵动岛边框设置

    if (settings.dynamicIslandBorderWidth !== undefined) {

      root.style.setProperty('--dynamic-island-border-width', settings.dynamicIslandBorderWidth + 'px')

    }

    if (settings.dynamicIslandBorderColor) {

      root.style.setProperty('--dynamic-island-border-color', settings.dynamicIslandBorderColor)

    }

  }
  

  // 根据主色调生成颜色变体
  generateColorVariants(primaryColor) {
    const root = document.documentElement

    // 这里可以添加更复杂的颜色计算逻辑
    // 暂时使用简单的变体生成
    root.style.setProperty('--primary-hover', this.lightenColor(primaryColor, 0.1))
    root.style.setProperty('--primary-active', this.darkenColor(primaryColor, 0.1))
  }

  // 颜色变亮
  lightenColor(color, amount) {
    const hex = color.replace('#', '')
    const num = parseInt(hex, 16)
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.floor(255 * amount))
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * amount))
    const b = Math.min(255, (num & 0xff) + Math.floor(255 * amount))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }

  // 颜色变暗
  darkenColor(color, amount) {
    const hex = color.replace('#', '')
    const num = parseInt(hex, 16)
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.floor(255 * amount))
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount))
    const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }

  // 切换主题
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.applyTheme(newTheme)
    return newTheme
  }

  // 获取主题变量

  getThemeVariables(theme) {

    const themes = {

      light: {

        '--bg-primary': '#ffffff',

        '--bg-secondary': '#f8f9fa',

        '--bg-tertiary': '#e9ecef',

        '--bg-hover': '#f1f3f4',

        '--text-primary': '#1a1a1a',

        '--text-secondary': '#6c757d',

        '--text-tertiary': '#adb5bd',

        '--border-color': '#dee2e6',

        '--border-light': '#e9ecef',

        '--primary-color': '#ec4899',

        '--secondary-color': '#3b82f6',

        '--gradient-color1': '#ec4899',

        '--gradient-color2': '#3b82f6',

        '--title-color': 'var(--primary-color)',

        '--component-color': 'var(--primary-color)',

        '--avatar-color': 'var(--primary-color)',

        '--primary-hover': '#db2777',

        '--success-color': '#28a745',

        '--warning-color': '#ffc107',

        '--danger-color': '#dc3545',

        '--shadow': '0 2px 10px rgba(0, 0, 0, 0.1)',

        '--shadow-lg': '0 10px 40px rgba(0, 0, 0, 0.15)',

        '--gradient-primary': 'linear-gradient(135deg, var(--gradient-color1) 0%, var(--gradient-color2) 100%)',

        '--gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',

        '--neon-glow': '0 0 10px rgba(0, 123, 255, 0.5)',

        '--neon-border': '1px solid rgba(0, 123, 255, 0.3)'

      },

      dark: {

        '--bg-primary': '#1a1a1a',

        '--bg-secondary': '#2d2d2d',

        '--bg-tertiary': '#3d3d3d',

        '--bg-hover': '#383838',

        '--text-primary': '#ffffff',

        '--text-secondary': '#b0b0b0',

        '--text-tertiary': '#808080',

        '--border-color': '#404040',

        '--border-light': '#4d4d4d',

        '--primary-color': '#f472b6',

        '--secondary-color': '#60a5fa',

        '--gradient-color1': '#f472b6',

        '--gradient-color2': '#60a5fa',

        '--title-color': 'var(--primary-color)',

        '--component-color': 'var(--primary-color)',

        '--avatar-color': 'var(--primary-color)',

        '--primary-hover': '#ec4899',

        '--success-color': '#10b981',

        '--warning-color': '#f59e0b',

        '--danger-color': '#ef4444',

        '--shadow': '0 2px 10px rgba(0, 0, 0, 0.3)',

        '--shadow-lg': '0 10px 40px rgba(0, 0, 0, 0.4)',

        '--gradient-primary': 'linear-gradient(135deg, var(--gradient-color1) 0%, var(--gradient-color2) 100%)',

        '--gradient-secondary': 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',

        '--neon-glow': '0 0 15px rgba(59, 130, 246, 0.6)',

        '--neon-border': '1px solid rgba(59, 130, 246, 0.4)'

      }

    }



    return themes[theme] || themes.light

  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme
  }

  // 检查是否为暗色主题
  isDark() {
    return this.currentTheme === 'dark'
  }

  // 检查是否为亮色主题
  isLight() {
    return this.currentTheme === 'light'
  }
}