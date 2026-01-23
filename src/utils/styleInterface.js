/**
 * 样式接口工具类
 * 为自定义组件提供访问样式设置中各种样式的接口
 */

export class StyleInterface {
  constructor() {
    this.cache = new Map()
  }

  /**
   * 获取所有样式信息
   * @returns {Object} 包含所有样式信息的对象
   */
  getAllStyles() {
    return {
      theme: this.getTheme(),
      colors: this.getColors(),
      fonts: this.getFonts(),
      sizes: this.getSizes(),
      effects: this.getEffects(),
      layout: this.getLayout()
    }
  }

  /**
   * 获取当前主题
   * @returns {string} 'light' 或 'dark'
   */
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light'
  }

  /**
   * 获取颜色信息
   * @returns {Object} 颜色配置对象
   */
  getColors() {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)

    return {
      // 主题背景色
      bgPrimary: this.getCssVar('--bg-primary') || '#ffffff',
      bgSecondary: this.getCssVar('--bg-secondary') || '#f8f9fa',
      bgTertiary: this.getCssVar('--bg-tertiary') || '#e9ecef',
      bgHover: this.getCssVar('--bg-hover') || '#f1f3f4',

      // 文字颜色
      textPrimary: this.getCssVar('--text-primary') || '#1a1a1a',
      textSecondary: this.getCssVar('--text-secondary') || '#6c757d',
      textTertiary: this.getCssVar('--text-tertiary') || '#adb5bd',

      // 边框颜色
      borderColor: this.getCssVar('--border-color') || '#dee2e6',
      borderLight: this.getCssVar('--border-light') || '#e9ecef',

      // 主色调（根据颜色模式）
      primaryColor: this.getPrimaryColor(),
      secondaryColor: this.getCssVar('--secondary-color') || '#3b82f6',
      primaryHover: this.getCssVar('--primary-hover') || '#db2777',

      // 渐变色
      gradientColor1: this.getCssVar('--gradient-color1') || '#ec4899',
      gradientColor2: this.getCssVar('--gradient-color2') || '#3b82f6',

      // 功能色
      successColor: this.getCssVar('--success-color') || '#28a745',
      warningColor: this.getCssVar('--warning-color') || '#ffc107',
      dangerColor: this.getCssVar('--danger-color') || '#dc3545',

      // 其他颜色
      titleColor: this.getCssVar('--title-color') || 'var(--primary-color)',
      componentColor: this.getCssVar('--component-color') || 'var(--primary-color)',
      avatarColor: this.getCssVar('--avatar-color') || 'var(--primary-color)',

      // 流光效果颜色
      shineColor: this.getCssVar('--shine-color') || 'rgba(255, 255, 255, 0.3)',
      shineOpacity: this.getCssVar('--shine-opacity') || '0.4',

      // 霓虹效果
      neonGlow: this.getCssVar('--neon-glow') || '0 0 10px rgba(0, 123, 255, 0.5)',
      neonBorder: this.getCssVar('--neon-border') || '1px solid rgba(0, 123, 255, 0.3)'
    }
  }

  /**
   * 获取主色调（根据颜色模式智能选择）
   * @returns {string} 主色调
   */
  getPrimaryColor() {
    const colorMode = document.body.getAttribute('data-color-mode') || 'single'
    const root = document.documentElement

    switch (colorMode) {
      case 'single':
        return this.getCssVar('--primary-color') || '#ec4899'
      case 'dual':
        return this.getCssVar('--primary-color') || '#ec4899'
      case 'gradient':
        return this.getCssVar('--gradient-color1') || '#ec4899'
      case 'advanced-gradient':
        return this.getCssVar('--gradient-color-1') || '#ec4899'
      default:
        return this.getCssVar('--primary-color') || '#ec4899'
    }
  }

  /**
   * 获取渐变样式（根据颜色模式）
   * @returns {string} 渐变CSS
   */
  getGradient() {
    const colorMode = document.body.getAttribute('data-color-mode') || 'single'

    switch (colorMode) {
      case 'single':
        return this.getCssVar('--gradient-primary') || 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
      case 'dual':
        return this.getCssVar('--gradient-primary') || 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
      case 'gradient':
        return this.getCssVar('--gradient-primary') || 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
      case 'advanced-gradient':
        return this.getCssVar('--gradient-primary') || 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
      default:
        return this.getCssVar('--gradient-primary') || 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
    }
  }

  /**
   * 获取字体信息
   * @returns {Object} 字体配置对象
   */
  getFonts() {
    return {
      fontFamily: this.getCssVar('--font-family') || 'system-ui',
      fontSize: this.getCssVar('--text-base') || '16px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      fontWeightBlack: '700'
    }
  }

  /**
   * 获取尺寸信息
   * @returns {Object} 尺寸配置对象
   */
  getSizes() {
    return {
      // 圆角
      borderRadius: this.getCssVar('--radius') || '8px',
      borderRadiusSmall: '4px',
      borderRadiusMedium: '8px',
      borderRadiusLarge: '12px',
      borderRadiusXLarge: '16px',

      // 间距
      spacingXs: '4px',
      spacingSm: '8px',
      spacingMd: '16px',
      spacingLg: '24px',
      spacingXl: '32px',

      // 组件尺寸
      componentPadding: '16px',
      componentMargin: '16px'
    }
  }

  /**
   * 获取特效信息
   * @returns {Object} 特效配置对象
   */
  getEffects() {
    return {
      // 阴影
      shadow: this.getCssVar('--shadow') || '0 2px 10px rgba(0, 0, 0, 0.1)',
      shadowLg: this.getCssVar('--shadow-lg') || '0 10px 40px rgba(0, 0, 0, 0.15)',

      // 动画
      animationEnabled: this.getCssVar('--animation-enabled') === '1',
      animationSpeed: this.getCssVar('--duration-normal') || '300ms',
      animationSpeedFast: '150ms',
      animationSpeedSlow: '500ms',

      // 流光效果
      shineEnabled: document.body.getAttribute('data-shine-enabled') === 'true',
      shineColor: this.getCssVar('--shine-color') || 'rgba(255, 255, 255, 0.3)',
      shineOpacity: this.getCssVar('--shine-opacity') || '0.4',
      shineDuration: this.getCssVar('--shine-duration') || '0.6s',

      // 模糊效果
      modalBackdropBlur: this.getCssVar('--modal-backdrop-blur') || 'blur(8px)',
      modalBackdropOpacity: this.getCssVar('--modal-backdrop-opacity') || '0.5'
    }
  }

  /**
   * 获取布局信息
   * @returns {Object} 布局配置对象
   */
  getLayout() {
    return {
      // 消息气泡样式
      messageBubbleStyle: document.body.getAttribute('data-bubble-style') || 'default',

      // 聊天布局
      chatLayout: document.body.getAttribute('data-chat-layout') || 'default',

      // 颜色模式
      colorMode: document.body.getAttribute('data-color-mode') || 'single',

      // 通知边框模式
      notificationBorderMode: document.body.getAttribute('data-notification-border') || 'default',

      // 通知持续时间
      notificationDuration: this.getCssVar('--notification-duration') || '3s'
    }
  }

  /**
   * 获取CSS变量值
   * @param {string} varName CSS变量名（包含或不包含--）
   * @returns {string} CSS变量值
   */
  getCssVar(varName) {
    if (!varName.startsWith('--')) {
      varName = '--' + varName
    }

    // 检查缓存
    if (this.cache.has(varName)) {
      return this.cache.get(varName)
    }

    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    const value = computedStyle.getPropertyValue(varName).trim()

    // 缓存结果
    this.cache.set(varName, value)

    return value
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * 生成样式对象供自定义组件使用
   * @returns {Object} 包含样式属性的对象
   */
  generateStyleObject() {
    const styles = this.getAllStyles()
    const theme = this.getTheme()

    return {
      // 背景色
      bgColor: theme === 'dark' ? styles.colors.bgPrimary : styles.colors.bgSecondary,
      bgColorPrimary: styles.colors.bgPrimary,
      bgColorSecondary: styles.colors.bgSecondary,
      bgColorTertiary: styles.colors.bgTertiary,

      // 文字色
      textColor: styles.colors.textPrimary,
      textColorPrimary: styles.colors.textPrimary,
      textColorSecondary: styles.colors.textSecondary,
      textColorTertiary: styles.colors.textTertiary,

      // 边框色
      borderColor: styles.colors.borderColor,

      // 主色调（根据颜色模式）
      primaryColor: styles.colors.primaryColor,
      secondaryColor: styles.colors.secondaryColor,
      gradient: this.getGradient(),

      // 功能色
      successColor: styles.colors.successColor,
      warningColor: styles.colors.warningColor,
      dangerColor: styles.colors.dangerColor,

      // 字体
      fontFamily: styles.fonts.fontFamily,
      fontSize: styles.fonts.fontSize,

      // 圆角
      borderRadius: styles.sizes.borderRadius,

      // 阴影
      shadow: styles.effects.shadow,

      // 主题标识
      theme: theme,
      isDark: theme === 'dark',
      isLight: theme === 'light'
    }
  }

  /**
   * 生成CSS样式字符串供自定义组件使用
   * @returns {string} CSS样式字符串
   */
  generateStyleString() {
    const styles = this.getAllStyles()
    const theme = this.getTheme()

    return `
      /* 基础颜色 */
      --component-bg-primary: ${styles.colors.bgPrimary};
      --component-bg-secondary: ${styles.colors.bgSecondary};
      --component-bg-tertiary: ${styles.colors.bgTertiary};
      --component-text-primary: ${styles.colors.textPrimary};
      --component-text-secondary: ${styles.colors.textSecondary};
      --component-text-tertiary: ${styles.colors.textTertiary};
      --component-border-color: ${styles.colors.borderColor};

      /* 主题色 */
      --component-primary-color: ${styles.colors.primaryColor};
      --component-secondary-color: ${styles.colors.secondaryColor};
      --component-gradient: ${styles.getGradient()};

      /* 功能色 */
      --component-success-color: ${styles.colors.successColor};
      --component-warning-color: ${styles.colors.warningColor};
      --component-danger-color: ${styles.colors.dangerColor};

      /* 字体 */
      --component-font-family: ${styles.fonts.fontFamily};
      --component-font-size: ${styles.fonts.fontSize};

      /* 圆角 */
      --component-border-radius: ${styles.sizes.borderRadius};

      /* 阴影 */
      --component-shadow: ${styles.effects.shadow};

      /* 主题 */
      --component-theme: ${theme};
    `
  }
}

// 创建全局实例
export const styleInterface = new StyleInterface()

// 导出工具函数
export function getStyles() {
  return styleInterface.getAllStyles()
}

export function getTheme() {
  return styleInterface.getTheme()
}

export function getColors() {
  return styleInterface.getColors()
}

export function getPrimaryColor() {
  return styleInterface.getPrimaryColor()
}

export function getGradient() {
  return styleInterface.getGradient()
}

export function getCssVar(varName) {
  return styleInterface.getCssVar(varName)
}

export function generateStyleObject() {
  return styleInterface.generateStyleObject()
}

export function generateStyleString() {
  return styleInterface.generateStyleString()
}

export default styleInterface