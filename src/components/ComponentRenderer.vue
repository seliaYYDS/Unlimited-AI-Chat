<template>
  <div class="component-renderer" :class="{ 'preview-mode': isPreview }">
    <!-- 柱状图 -->
    <div v-if="component.type === 'bar'" class="bar-chart">
      <div class="chart-title">{{ component.data.label }}</div>
      <div class="bar-container">
        <div
          v-for="(item, index) in component.data.values"
          :key="index"
          class="bar-item"
        >
          <div class="bar-label">{{ item.label }}</div>
          <div class="bar-wrapper">
            <div class="bar-fill" :style="{ width: item.percentage + '%' }">
              <span class="bar-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 雷达图 -->
    <div v-else-if="component.type === 'radar'" class="radar-chart">
      <div class="chart-title">能力雷达图</div>
      <svg viewBox="0 0 200 200" class="radar-svg">
        <!-- 背景网格 -->
        <polygon
          v-for="level in 5"
          :key="'grid-' + level"
          :points="getRadarGridPoints(level)"
          class="radar-grid"
          :stroke-opacity="level * 0.15"
        />
        <!-- 轴线 -->
        <line
          v-for="(dim, index) in component.data.dimensions"
          :key="'axis-' + index"
          :x1="100"
          :y1="100"
          :x2="getRadarPoint(index, 100).x"
          :y2="getRadarPoint(index, 100).y"
          class="radar-axis"
        />
        <!-- 数据区域 -->
        <polygon
          :points="getRadarDataPoints()"
          class="radar-data"
        />
        <!-- 数据点 -->
        <circle
          v-for="(dim, index) in component.data.dimensions"
          :key="'point-' + index"
          :cx="getRadarPoint(index, dim.value).x"
          :cy="getRadarPoint(index, dim.value).y"
          r="4"
          class="radar-point"
        />
        <!-- 标签 -->
        <text
          v-for="(dim, index) in component.data.dimensions"
          :key="'label-' + index"
          :x="getRadarLabelPosition(index).x"
          :y="getRadarLabelPosition(index).y"
          class="radar-label"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {{ dim.dimension }}: {{ dim.value }}
        </text>
      </svg>
    </div>

    <!-- 饼状图 -->
    <div v-else-if="component.type === 'pie'" class="pie-chart">
      <div class="chart-title">数据分布</div>
      <svg viewBox="0 0 200 200" class="pie-svg">
        <g transform="translate(100, 100)">
          <path
            v-for="(item, index) in component.data.items"
            :key="index"
            :d="getPieSlicePath(item, index)"
            :fill="getPieColor(index)"
            class="pie-slice"
          />
        </g>
      </svg>
      <div class="pie-legend">
        <div
          v-for="(item, index) in component.data.items"
          :key="index"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: getPieColor(index) }"></span>
          <span class="legend-label">{{ item.label }}: {{ item.value }} ({{ item.percentage.toFixed(1) }}%)</span>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-else-if="component.type === 'progress'" class="progress-bar">
      <div class="progress-label">{{ component.data.label }}: {{ component.data.current }} / {{ component.data.max }}</div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: component.data.percentage + '%' }">
          <span class="progress-text">{{ component.data.percentage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div v-else-if="component.type === 'table'" class="data-table">
      <table>
        <thead>
          <tr>
            <th v-for="(header, index) in component.data.headers" :key="'header-' + index">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in component.data.rows" :key="'row-' + rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="'cell-' + rowIndex + '-' + cellIndex">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 卡片组件 -->
    <div v-else-if="component.type === 'card'" class="info-card" :class="'card-' + component.data.color">
      <div class="card-header">
        <span class="card-icon">{{ getCardIcon(component.data.color) }}</span>
        <span class="card-title">{{ component.data.title }}</span>
      </div>
      <div class="card-content">{{ component.data.content }}</div>
    </div>

    <!-- 统计卡片组件 -->
    <div v-else-if="component.type === 'stat'" class="stat-card">
      <div class="stat-value">{{ formatNumber(component.data.value) }}</div>
      <div class="stat-unit">{{ component.data.unit }}</div>
      <div class="stat-label">{{ component.data.label }}</div>
    </div>

    <!-- 开关组件 -->
    <div v-else-if="component.type === 'toggle'" class="toggle-switch">
      <div class="toggle-label">{{ component.data.label }}</div>
      <div class="toggle-indicator" :class="{ 'toggle-on': component.data.enabled }">
        <div class="toggle-dot"></div>
      </div>
      <div class="toggle-status">{{ component.data.enabled ? '已启用' : '已禁用' }}</div>
    </div>

    <!-- 列表组件 -->
    <div v-else-if="component.type === 'list'" class="item-list">
      <ul class="list-items">
        <li v-for="(item, index) in component.data.items" :key="index" class="list-item">
          <span class="list-bullet">{{ index + 1 }}</span>
          <span class="list-text">{{ item }}</span>
        </li>
      </ul>
    </div>

    <!-- 配置展示组件 -->
    <div v-else-if="component.type === 'config'" class="config-display">
      <div class="config-header">配置信息</div>
      <div class="config-items">
        <div v-for="(value, key) in component.data.config" :key="key" class="config-item">
          <span class="config-key">{{ key }}</span>
          <span class="config-value">{{ formatConfigValue(value) }}</span>
        </div>
      </div>
    </div>

    <!-- 自定义组件 -->
    <div v-else-if="component.type === 'custom'" class="custom-component-wrapper" :id="component.id">
      <div
        v-if="component.data && component.data.template"
        class="custom-component-container"
        v-html="renderCustomTemplate(component.data.template, component.data.props || {})"
        ref="customComponentContainer"
      ></div>
      <div v-else class="custom-component-placeholder">
        <pre v-if="component.data">{{ JSON.stringify(component.data, null, 2) }}</pre>
        <div v-else>自定义组件数据</div>
      </div>
    </div>

    <!-- 错误类型 -->
    <div v-else-if="component.type === 'error'" class="component-error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ component.data.message || '组件渲染失败' }}</div>
      <div v-if="component.data.params" class="error-details">
        <div class="error-detail-label">参数:</div>
        <pre class="error-detail-content">{{ JSON.stringify(component.data.params, null, 2) }}</pre>
      </div>
    </div>

    <!-- 未知组件类型 -->
    <div v-else class="unknown-component">
      <div class="unknown-component-message">未知组件类型: {{ component.type }}</div>
    </div>
  </div>
</template>

<script>
import { styleInterface, generateStyleObject, generateStyleString } from '../utils/styleInterface.js'
import { getComponentAIInterface } from '../utils/componentAIInterface.js'

export default {
  name: 'ComponentRenderer',
  props: {
    component: {
      type: Object,
      required: true
    },
    aiService: {
      type: Object,
      default: null
    },
    storageManager: {
      type: Object,
      default: null
    },
    isPreview: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      styleElement: null,
      styleInterface: styleInterface,
      componentAIInterface: null,
      aiTriggers: new Map()
    }
  },
  watch: {
    'component.data.style': {
      handler(newStyle) {
        this.updateCustomStyle(newStyle)
      },
      immediate: true
    },
    'component.type': {
      handler(newType) {
        if (newType === 'custom') {
          this.$nextTick(() => {
            this.setupAITriggers()
          })
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.updateCustomStyle(this.component?.data?.style)
    this.componentAIInterface = getComponentAIInterface()
    if (this.component.type === 'custom') {
      this.$nextTick(() => {
        this.setupAITriggers()
      })
    }
  },
  beforeUnmount() {
    this.removeCustomStyle()
    this.cleanupAITriggers()
  },
  methods: {

    // 设置 AI 触发器
    setupAITriggers() {
      this.cleanupAITriggers()

      if (!this.componentAIInterface || this.component.type !== 'custom') {
        return
      }

      const container = this.$refs.customComponentContainer
      if (!container) return

      // 查找所有带有 data-ai-request 属性的元素
      const requestElements = container.querySelectorAll('[data-ai-request]')
      requestElements.forEach((element, index) => {
        const requestId = element.getAttribute('data-ai-request') || `request-${this.component.id}-${index}`
        const promptSource = element.getAttribute('data-ai-prompt') || ''
        const onSuccess = element.getAttribute('data-ai-on-success')
        const onError = element.getAttribute('data-ai-on-error')

        // 创建触发器
        const trigger = this.componentAIInterface.createRequestTrigger(requestId, {
          prompt: this.resolvePrompt(promptSource),
          onSuccess: onSuccess ? (result, id) => this.handleAIResult(element, result, onSuccess) : null,
          onError: onError ? (error, id) => this.handleAIError(element, error, onError) : null
        })

        this.aiTriggers.set(requestId, trigger)

        // 绑定点击事件
        element.addEventListener('click', () => {
          trigger.execute()
        })
      })

      // 查找所有带有 data-ai-image 属性的元素
      const imageElements = container.querySelectorAll('[data-ai-image]')
      imageElements.forEach((element, index) => {
        const requestId = element.getAttribute('data-ai-image') || `image-${this.component.id}-${index}`
        const promptSource = element.getAttribute('data-ai-prompt') || ''
        const negativePromptSource = element.getAttribute('data-ai-negative-prompt') || ''
        const onSuccess = element.getAttribute('data-ai-on-success')
        const onError = element.getAttribute('data-ai-on-error')
        const onProgress = element.getAttribute('data-ai-on-progress')

        // 读取参数
        const steps = element.getAttribute('data-ai-steps')
        const width = element.getAttribute('data-ai-width')
        const height = element.getAttribute('data-ai-height')
        const cfgScale = element.getAttribute('data-ai-cfg-scale')
        const sampler = element.getAttribute('data-ai-sampler')
        const model = element.getAttribute('data-ai-model')
        const size = element.getAttribute('data-ai-size')

        // 创建触发器
        const trigger = this.componentAIInterface.createImageTrigger(requestId, {
          prompt: this.resolvePrompt(promptSource),
          negativePrompt: this.resolvePrompt(negativePromptSource),
          steps: steps ? parseInt(steps) : null,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          cfgScale: cfgScale ? parseFloat(cfgScale) : null,
          sampler: sampler || null,
          model: model || null,
          size: size || null,
          onSuccess: onSuccess ? (result, id) => this.handleAIImageResult(element, result, onSuccess) : null,
          onError: onError ? (error, id) => this.handleAIError(element, error, onError) : null,
          onProgress: onProgress ? (value, id) => this.handleAIProgress(element, value, onProgress) : null
        })

        this.aiTriggers.set(requestId, trigger)

        // 绑定点击事件
        element.addEventListener('click', () => {
          trigger.execute()
        })
      })
    },

    // 解析提示词（支持从 props 中获取）
    resolvePrompt(promptSource) {
      if (!promptSource) return ''

      // 如果是变量引用（如 {{ prompt }}），从 props 中获取
      const match = promptSource.match(/^{{\s*(\w+)\s*}}$/)
      if (match) {
        const varName = match[1]
        return this.component.data.props?.[varName] || promptSource
      }

      return promptSource
    },

    // 处理 AI 请求结果
    handleAIResult(element, result, callbackName) {
      // 更新元素内容
      if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        element.textContent = result || '完成'
      } else {
        element.textContent = result
      }

      // 如果有回调函数，执行它
      if (callbackName && window[callbackName]) {
        window[callbackName](result, element)
      }
    },

    // 处理 AI 图片结果
    handleAIImageResult(element, result, callbackName) {
      // 创建或更新图片元素
      let imgElement = element.querySelector('img')
      if (!imgElement) {
        imgElement = document.createElement('img')
        imgElement.alt = 'AI生成图片'
        imgElement.style.maxWidth = '100%'
        imgElement.style.borderRadius = '8px'
        element.appendChild(imgElement)
      }

      imgElement.src = result.imageUrl

      // 如果有回调函数，执行它
      if (callbackName && window[callbackName]) {
        window[callbackName](result, element)
      }
    },

    // 处理 AI 错误
    handleAIError(element, error, callbackName) {
      console.error('AI request error:', error)

      // 显示错误信息
      if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        element.textContent = '失败'
        element.style.color = 'red'
      } else {
        element.textContent = `错误: ${error}`
      }

      // 如果有回调函数，执行它
      if (callbackName && window[callbackName]) {
        window[callbackName](error, element)
      }
    },

    // 处理 AI 进度
    handleAIProgress(element, progress, callbackName) {
      // 更新进度显示
      if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        element.textContent = `生成中... ${Math.round(progress * 100)}%`
      }

      // 如果有回调函数，执行它
      if (callbackName && window[callbackName]) {
        window[callbackName](progress, element)
      }
    },

    // 清理 AI 触发器
    cleanupAITriggers() {
      this.aiTriggers.forEach((trigger, id) => {
        if (trigger.cancel) {
          trigger.cancel()
        }
      })
      this.aiTriggers.clear()
    },


    // 渲染自定义组件到 Shadow DOM
    renderCustomComponent() {
      if (!this.shadowRoot || !this.component.data || !this.component.data.template) {
        return
      }

      // 清空 Shadow DOM 内容（保留样式标签）
      const styleElements = this.shadowRoot.querySelectorAll('style')
      this.shadowRoot.innerHTML = ''
      styleElements.forEach(style => this.shadowRoot.appendChild(style))

      // 渲染模板
      const renderedHTML = this.renderCustomTemplate(this.component.data.template, this.component.data.props || {})

      // 创建内容容器
      const contentDiv = document.createElement('div')
      contentDiv.innerHTML = renderedHTML

      // 添加到 Shadow DOM
      this.shadowRoot.appendChild(contentDiv)

      // 如果有自定义样式，添加到 Shadow DOM
      if (this.component.data.style) {
        let processedStyle = this.component.data.style
        if (this.component.data.props) {
          Object.keys(this.component.data.props).forEach(key => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            processedStyle = processedStyle.replace(regex, this.component.data.props[key])
          })
        }

        const customStyle = document.createElement('style')
        customStyle.textContent = processedStyle
        this.shadowRoot.appendChild(customStyle)
      }
    },

    // 更新自定义组件样式
    updateCustomStyle(style) {
      // 先移除旧的样式
      this.removeCustomStyle()

      // 如果有新样式，创建并添加
      if (style && this.component.type === 'custom') {
        // 替换样式中的模板变量
        let processedStyle = style
        if (this.component.data.props) {
          Object.keys(this.component.data.props).forEach(key => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            processedStyle = processedStyle.replace(regex, this.component.data.props[key])
          })
        }

        const styleElement = document.createElement('style')
        styleElement.textContent = processedStyle
        styleElement.setAttribute('data-component-style', this.component.type)
        document.head.appendChild(styleElement)
        this.styleElement = styleElement
      }
    },

    // 移除自定义组件样式
    removeCustomStyle() {
      if (this.styleElement) {
        document.head.removeChild(this.styleElement)
        this.styleElement = null
      }
    },

    // 渲染自定义组件模板
    renderCustomTemplate(template, props) {
      if (!template) return ''

      let rendered = template

      // 创建样式上下文对象
      const styleContext = generateStyleObject()
      const styleVars = {
        $styles: styleContext,
        $theme: styleContext.theme,
        $isDark: styleContext.isDark,
        $isLight: styleContext.isLight,
        $colors: {
          bgPrimary: styleContext.bgColorPrimary,
          bgSecondary: styleContext.bgColorSecondary,
          bgTertiary: styleContext.bgColorTertiary,
          textPrimary: styleContext.textColorPrimary,
          textSecondary: styleContext.textColorSecondary,
          textTertiary: styleContext.textColorTertiary,
          primary: styleContext.primaryColor,
          secondary: styleContext.secondaryColor,
          gradient: styleContext.gradient,
          success: styleContext.successColor,
          warning: styleContext.warningColor,
          danger: styleContext.dangerColor,
          border: styleContext.borderColor
        },
        $fonts: {
          family: styleContext.fontFamily,
          size: styleContext.fontSize
        },
        $sizes: {
          borderRadius: styleContext.borderRadius
        },
        $effects: {
          shadow: styleContext.shadow
        }
      }

      // 创建一个包含所有 props 属性和样式上下文的函数参数
      const propKeys = Object.keys(props)
      const styleKeys = Object.keys(styleVars)
      const allKeys = [...propKeys, ...styleKeys]
      const allValues = [...propKeys.map(k => props[k]), ...styleKeys.map(k => styleVars[k])]

      // 1. 处理 :style 绑定
      // 格式：:style="{ width: percent + '%' }"
      rendered = rendered.replace(/:style="([^"]+)"/g, (match, styleExpression) => {
        try {
          // 创建一个安全的函数来计算样式表达式
          // 将 props 和样式上下文中的所有属性作为独立变量传递
          const styleFunc = new Function(...allKeys, `return ${styleExpression}`)
          const styleObj = styleFunc(...allValues)
          
          // 将样式对象转换为内联样式字符串
          if (typeof styleObj === 'object' && styleObj !== null) {
            const styleStr = Object.entries(styleObj)
              .map(([key, value]) => {
                // 转换驼峰命名为连字符命名
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
                return `${cssKey}: ${value}`
              })
              .join('; ')
            return `style="${styleStr}"`
          }
          return ''
        } catch (error) {
          console.error('解析 :style 失败:', error)
          return ''
        }
      })

      // 2. 处理 :class 绑定
      // 格式：:class="{ active: isActive }" 或 :class="className"
      rendered = rendered.replace(/:class="([^"]+)"/g, (match, classExpression) => {
        try {
          const classFunc = new Function(...allKeys, `return ${classExpression}`)
          const classValue = classFunc(...allValues)
          
          let className = ''
          if (typeof classValue === 'string') {
            className = classValue
          } else if (typeof classValue === 'object' && classValue !== null) {
            // 对象格式：{ active: true, disabled: false }
            className = Object.entries(classValue)
              .filter(([_, value]) => value)
              .map(([key, _]) => key)
              .join(' ')
          } else if (Array.isArray(classValue)) {
            // 数组格式：['class1', 'class2']
            className = classValue.join(' ')
          }
          
          return className ? `class="${className}"` : ''
        } catch (error) {
          console.error('解析 :class 失败:', error)
          return ''
        }
      })

      // 3. 处理其他属性绑定，如 :href、:src 等
      rendered = rendered.replace(/:([a-zA-Z-]+)="([^"]+)"/g, (match, attrName, expression) => {
        try {
          const attrFunc = new Function(...allKeys, `return ${expression}`)
          const value = attrFunc(...allValues)
          return `${attrName}="${value}"`
        } catch (error) {
          console.error(`解析 :${attrName} 失败:`, error)
          return ''
        }
      })

      // 4. 处理 v-if 指令
      // 格式：v-if="condition"
      rendered = rendered.replace(/v-if="([^"]+)"/g, (match, condition) => {
        try {
          const conditionFunc = new Function(...allKeys, `return ${condition}`)
          const result = conditionFunc(...allValues)
          return result ? 'v-if-true' : 'v-if-false'
        } catch (error) {
          console.error('解析 v-if 失败:', error)
          return 'v-if-false'
        }
      })

      // 移除 v-if-false 的元素
      rendered = rendered.replace(/<[^>]*v-if-false[^>]*>[\s\S]*?<\/[^>]*v-if-false[^>]*>/g, '')
      rendered = rendered.replace(/<[^>]*v-if-false[^>]*\/>/g, '')

      // 清理 v-if-true 标记
      rendered = rendered.replace(/v-if-true/g, '')

      // 5. 处理 v-for 指令
      // 支持多种格式：
      // - v-for="(item, index) in items" - 遍历数组
      // - v-for="item in items" - 遍历数组（不需要索引）
      // - v-for="(value, key) in object" - 遍历对象
      // - v-for="(value, key, index) in object" - 遍历对象（带索引）
      const vForRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*v-for="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g
      rendered = rendered.replace(vForRegex, (match, tagName, forExpression, content) => {
        try {
          // 解析 v-for 表达式
          const forMatch = forExpression.match(/\(([^,]+)(?:,\s*([^,]+))?(?:,\s*([^)]+))?\)\s+in\s+(.+)/)
          
          if (!forMatch) {
            // 尝试简单格式：v-for="item in items"
            const simpleMatch = forExpression.match(/(\w+)\s+in\s+(.+)/)
            if (!simpleMatch) return match
            
            const [, itemVar, arrayExpr] = simpleMatch
            return this.renderVForSimple(itemVar, null, arrayExpr, content, allKeys, allValues, { ...props, ...styleVars })
          }

          const [, itemVar, indexOrKeyVar, indexVar, sourceExpr] = forMatch
          
          const sourceFunc = new Function(...allKeys, `return ${sourceExpr}`)
          const source = sourceFunc(...allValues)
          
          if (!source) return match

          // 判断是数组还是对象
          if (Array.isArray(source)) {
            return this.renderVForArray(itemVar, indexOrKeyVar, source, content, allKeys, allValues, { ...props, ...styleVars })
          } else if (typeof source === 'object' && source !== null) {
            return this.renderVForObject(itemVar, indexOrKeyVar, indexVar, source, content, allKeys, allValues, { ...props, ...styleVars })
          }

          return match
        } catch (error) {
          console.error('解析 v-for 失败:', error)
          return match
        }
      })

      // 6. 最后处理普通的 {{ variable }} 变量替换和表达式
      // 使用更智能的正则表达式来匹配所有 {{ ... }} 模式
      rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
        try {
          // 去除空白字符
          const trimmedExpr = expression.trim()

          // 创建完整的上下文对象
          const fullContext = { ...props, ...styleVars }

          // 检查是否是简单的变量名
          if (fullContext.hasOwnProperty(trimmedExpr)) {
            return fullContext[trimmedExpr]
          }

          // 如果是表达式，使用 Function 计算
          // 首先检查表达式中使用的所有变量
          const usedVars = []
          Object.keys(fullContext).forEach(key => {
            if (trimmedExpr.includes(key)) {
              usedVars.push(key)
            }
          })

          // 如果没有使用任何变量，可能是纯表达式或 Math 函数调用
          if (usedVars.length === 0) {
            // 检查是否是 Math 函数调用
            if (trimmedExpr.startsWith('Math.')) {
              const mathFunc = new Function(`return ${trimmedExpr}`)
              return mathFunc()
            }
            return match // 保持原样
          }

          // 创建函数来计算表达式
          const func = new Function(...usedVars, `return ${trimmedExpr}`)
          const values = usedVars.map(key => fullContext[key])
          const result = func(...values)

          return result
        } catch (error) {
          console.error('解析表达式失败:', trimmedExpr, error)
          return match // 出错时保持原样
        }
      })

      return rendered
    },

    // 渲染简单的 v-for（不带索引）
    renderVForSimple(itemVar, indexVar, arrayExpr, content, propKeys, propValues, props) {
      const arrayFunc = new Function(...propKeys, `return ${arrayExpr}`)
      const array = arrayFunc(...propValues)

      if (!Array.isArray(array)) return content

      return array.map((item) => {
        let itemContent = content

        // 创建一个包含 item 和所有 props 的上下文
        const context = {
          ...props,
          item: item
        }

        // 替换所有 {{ ... }} 表达式
        itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
          try {
            const trimmedExpr = expression.trim()

            // 检查是否是简单的变量名
            if (context.hasOwnProperty(trimmedExpr)) {
              return context[trimmedExpr]
            }

            // 如果是表达式，使用 Function 计算
            const usedVars = []
            Object.keys(context).forEach(key => {
              if (trimmedExpr.includes(key)) {
                usedVars.push(key)
              }
            })

            if (usedVars.length === 0) {
              // 检查是否是 Math 函数调用
              if (trimmedExpr.startsWith('Math.')) {
                const mathFunc = new Function(`return ${trimmedExpr}`)
                return mathFunc()
              }
              return match
            }

            const func = new Function(...usedVars, `return ${trimmedExpr}`)
            const values = usedVars.map(key => context[key])
            const result = func(...values)

            return result
          } catch (error) {
            console.error('解析表达式失败:', expression, error)
            return match
          }
        })

        return itemContent
      }).join('')
    },

    // 渲染数组的 v-for
    renderVForArray(itemVar, indexVar, array, content, propKeys, propValues, props) {
      return array.map((item, index) => {
        let itemContent = content

        // 创建一个包含 item、index 和所有 props 的上下文
        const context = {
          ...props,
          item: item,
          index: index
        }

        // 替换所有 {{ ... }} 表达式
        itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
          try {
            const trimmedExpr = expression.trim()

            // 检查是否是简单的变量名
            if (context.hasOwnProperty(trimmedExpr)) {
              return context[trimmedExpr]
            }

            // 检查是否是 item 的属性访问
            if (trimmedExpr.startsWith('item.') && typeof item === 'object' && item !== null) {
              const propPath = trimmedExpr.substring(5)
              // 支持嵌套属性访问，如 item.name 或 item.user.name
              const value = propPath.split('.').reduce((obj, key) => obj && obj[key], item)
              return value !== undefined ? value : match
            }

            // 如果是表达式，使用 Function 计算
            const usedVars = []
            Object.keys(context).forEach(key => {
              if (trimmedExpr.includes(key)) {
                usedVars.push(key)
              }
            })

            if (usedVars.length === 0) {
              // 检查是否是 Math 函数调用
              if (trimmedExpr.startsWith('Math.')) {
                const mathFunc = new Function(`return ${trimmedExpr}`)
                return mathFunc()
              }
              return match
            }

            const func = new Function(...usedVars, `return ${trimmedExpr}`)
            const values = usedVars.map(key => context[key])
            const result = func(...values)

            return result
          } catch (error) {
            console.error('解析表达式失败:', expression, error)
            return match
          }
        })

        return itemContent
      }).join('')
    },

    // 渲染对象的 v-for
    renderVForObject(valueVar, keyVar, indexVar, object, content, propKeys, propValues, props) {
      return Object.entries(object).map(([key, value], index) => {
        let itemContent = content

        // 创建一个包含 value、key、index 和所有 props 的上下文
        const context = {
          ...props,
          value: value,
          key: key,
          index: index
        }

        // 替换所有 {{ ... }} 表达式
        itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
          try {
            const trimmedExpr = expression.trim()

            // 检查是否是简单的变量名
            if (context.hasOwnProperty(trimmedExpr)) {
              return context[trimmedExpr]
            }

            // 检查是否是 value 的属性访问
            if (trimmedExpr.startsWith('value.') && typeof value === 'object' && value !== null) {
              const propPath = trimmedExpr.substring(6)
              const val = propPath.split('.').reduce((obj, k) => obj && obj[k], value)
              return val !== undefined ? val : match
            }

            // 如果是表达式，使用 Function 计算
            const usedVars = []
            Object.keys(context).forEach(k => {
              if (trimmedExpr.includes(k)) {
                usedVars.push(k)
              }
            })

            if (usedVars.length === 0) {
              // 检查是否是 Math 函数调用
              if (trimmedExpr.startsWith('Math.')) {
                const mathFunc = new Function(`return ${trimmedExpr}`)
                return mathFunc()
              }
              return match
            }

            const func = new Function(...usedVars, `return ${trimmedExpr}`)
            const values = usedVars.map(k => context[k])
            const result = func(...values)

            return result
          } catch (error) {
            console.error('解析表达式失败:', expression, error)
            return match
          }
        })

        return itemContent
      }).join('')
    },
    
    // 雷达图计算方法
    getRadarPoint(index, value) {
      const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
      const radius = (value / 100) * 80
      return {
        x: 100 + radius * Math.cos(angle),
        y: 100 + radius * Math.sin(angle)
      }
    },
    getRadarGridPoints(level) {
      const points = []
      for (let i = 0; i < 5; i++) {
        const point = this.getRadarPoint(i, level * 20)
        points.push(`${point.x},${point.y}`)
      }
      return points.join(' ')
    },
    getRadarDataPoints() {
      const points = []
      this.component.data.dimensions.forEach((dim, index) => {
        const point = this.getRadarPoint(index, dim.value)
        points.push(`${point.x},${point.y}`)
      })
      return points.join(' ')
    },
    getRadarLabelPosition(index) {
      const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
      const radius = 95
      return {
        x: 100 + radius * Math.cos(angle),
        y: 100 + radius * Math.sin(angle)
      }
    },
    // 饼状图计算方法
    getPieSlicePath(item, index) {
      const startAngle = this.getPieStartAngle(index)
      const endAngle = startAngle + (item.percentage / 100) * Math.PI * 2
      const radius = 80

      const x1 = Math.cos(startAngle) * radius
      const y1 = Math.sin(startAngle) * radius
      const x2 = Math.cos(endAngle) * radius
      const y2 = Math.sin(endAngle) * radius

      const largeArcFlag = item.percentage > 50 ? 1 : 0

      return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    },
    getPieStartAngle(index) {
      let angle = 0
      for (let i = 0; i < index; i++) {
        angle += (this.component.data.items[i].percentage / 100) * Math.PI * 2
      }
      return angle - Math.PI / 2
    },
    getPieColor(index) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#FF6F61'
      ]
      return colors[index % colors.length]
    },
    
    // 卡片组件方法
    getCardIcon(color) {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      }
      return icons[color] || 'ℹ️'
    },
    
    // 统计卡片方法
    formatNumber(value) {
      if (typeof value !== 'number') return value
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M'
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K'
      }
      return value.toLocaleString()
    },
    
    // 配置展示方法
    formatConfigValue(value) {
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      } else if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    }
  }
}
</script>

<style>
/* 使用 @scope 规则实现样式隔离 */
@scope (.component-renderer) {
  /* 根容器样式 */
  :scope {
    margin: 16px 0;
    padding: 16px;
    background: var(--component-bg, rgba(255, 255, 255, 0.05));
    border-radius: 12px;
    border: 1px solid var(--component-border, rgba(255, 255, 255, 0.1));

    /* 基础样式 */
    box-sizing: border-box;
    font-family: var(--font-family, system-ui);
    font-size: var(--font-size, 14px);
    line-height: 1.5;
    color: var(--text-color, #333);
    text-align: center;

    /* 布局相关 - 宽度100%，高度自适应内容 */
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    align-self: flex-start;
    position: relative;

    /* 使用 CSS containment 优化性能 */
    contain: layout style paint;

    /* 隔离样式上下文 */
    isolation: isolate;
  }

  /* 预览模式：移除外边距和内边距，由父容器控制 */
  :scope.preview-mode {
    margin: 0;
    padding: 0;
  }

  /* 确保所有内部元素使用正确的盒模型 */
  * {
    box-sizing: border-box;
  }

  /* 重置可能继承的样式 */
  div, span, p, h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding: 0;
  }

  img, svg {
    display: block;
    max-width: 100%;
  }

  /* 恢复特定元素的默认显示方式 */
  span, a, label, b, strong, i, em, code {
    display: inline;
  }

  div, p, h1, h2, h3, h4, h5, h6, ul, ol, li, table, tr, td, th, img, svg, canvas, video, iframe, picture, hr, br, blockquote, pre {
    display: block;
  }

  img, svg, canvas, video, iframe, picture {
    max-width: 100%;
    height: auto;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  ul, ol {
    list-style-position: inside;
  }

  li {
    display: list-item;
  }

  hr {
    border: 0;
    border-top: 1px solid currentColor;
    margin: 8px 0;
  }

  h1 { font-size: 2em; font-weight: 600; }
  h2 { font-size: 1.5em; font-weight: 600; }
  h3 { font-size: 1.25em; font-weight: 600; }
  h4 { font-size: 1.1em; font-weight: 600; }
  h5 { font-size: 1em; font-weight: 600; }
  h6 { font-size: 0.9em; font-weight: 600; }

  code {
    font-family: 'Courier New', Courier, monospace;
    padding: 2px 4px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
    font-size: 0.9em;
  }

  pre {
    font-family: 'Courier New', Courier, monospace;
    padding: 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  a {
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
  }

  a:hover {
    color: #004499;
  }

  blockquote {
    margin: 12px 0;
    padding: 8px 12px;
    border-left: 4px solid #ddd;
    background: rgba(0, 0, 0, 0.02);
    color: #666;
  }

  input, textarea, select, button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    cursor: pointer;
  }

  input[type="checkbox"], input[type="radio"] {
    width: 16px;
    height: 16px;
    vertical-align: middle;
  }
}

/* 恢复特定元素的默认显示方式 */
.component-renderer :deep(span),
.component-renderer :deep(a),
.component-renderer :deep(label),
.component-renderer :deep(b),
.component-renderer :deep(strong),
.component-renderer :deep(i),
.component-renderer :deep(em) {
  display: inline;
}

.component-renderer :deep(img),
.component-renderer :deep(svg),
.component-renderer :deep(canvas),
.component-renderer :deep(video),
.component-renderer :deep(iframe),
.component-renderer :deep(picture) {
  display: block;
  max-width: 100%;
  height: auto;
}

.component-renderer :deep(table) {
  display: table;
  border-collapse: collapse;
  width: 100%;
}

.component-renderer :deep(tr) {
  display: table-row;
}

.component-renderer :deep(td),
.component-renderer :deep(th) {
  display: table-cell;
  vertical-align: middle;
}

.component-renderer :deep(ul),
.component-renderer :deep(ol) {
  display: block;
  list-style-position: inside;
}

.component-renderer :deep(li) {
  display: list-item;
}

.component-renderer :deep(br) {
  display: inline-block;
  content: '';
  line-height: 0;
}

.component-renderer :deep(hr) {
  display: block;
  border: 0;
  border-top: 1px solid currentColor;
  margin: 8px 0;
}

/* 重置表单元素 */
.component-renderer :deep(input),
.component-renderer :deep(textarea),
.component-renderer :deep(select),
.component-renderer :deep(button) {
  display: inline-block;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  cursor: pointer;
}

.component-renderer :deep(input[type="checkbox"]),
.component-renderer :deep(input[type="radio"]) {
  display: inline-block;
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

/* 重置标题元素 */
.component-renderer :deep(h1),
.component-renderer :deep(h2),
.component-renderer :deep(h3),
.component-renderer :deep(h4),
.component-renderer :deep(h5),
.component-renderer :deep(h6) {
  display: block;
  font-weight: 600;
  margin: 0;
  padding: 0;
  line-height: 1.3;
}

.component-renderer :deep(h1) { font-size: 2em; }
.component-renderer :deep(h2) { font-size: 1.5em; }
.component-renderer :deep(h3) { font-size: 1.25em; }
.component-renderer :deep(h4) { font-size: 1.1em; }
.component-renderer :deep(h5) { font-size: 1em; }
.component-renderer :deep(h6) { font-size: 0.9em; }

/* 重置段落和文本 */
.component-renderer :deep(p),
.component-renderer :deep(div) {
  display: block;
  margin: 0;
  padding: 0;
}

.component-renderer :deep(code),
.component-renderer :deep(pre) {
  font-family: 'Courier New', Courier, monospace;
}

.component-renderer :deep(code) {
  display: inline;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  font-size: 0.9em;
}

.component-renderer :deep(pre) {
  display: block;
  padding: 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 重置链接 */
.component-renderer :deep(a) {
  color: #0066cc;
  text-decoration: underline;
  cursor: pointer;
}

.component-renderer :deep(a:hover) {
  color: #004499;
}

/* 重置引用 */
.component-renderer :deep(blockquote) {
  display: block;
  margin: 12px 0;
  padding: 8px 12px;
  border-left: 4px solid #ddd;
  background: rgba(0, 0, 0, 0.02);
  color: #666;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-color, #333);
  text-align: center;
}

/* 柱状图样式 */
.bar-chart {
  padding: 8px;
  display: inline-block;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.bar-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  min-width: 80px;
  font-size: 13px;
  color: var(--text-color, #333);
  text-align: right;
}

.bar-wrapper {
  flex: 1;
  height: 32px;
  background: var(--bar-track-bg, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  line-height: 0; /* 防止行高影响高度 */
}

.bar-fill {
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 6px;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  line-height: 32px; /* 明确设置行高以匹配高度 */
}

.bar-value {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 雷达图样式 */
.radar-chart {
  padding: 8px;
}

.radar-svg {
  width: 100%;
  max-width: 300px;
  height: auto;
  margin: 0 auto;
  display: block;
}

.radar-grid {
  fill: none;
  stroke: var(--text-color, #333);
  stroke-width: 1;
}

.radar-axis {
  stroke: var(--text-color, #333);
  stroke-width: 1;
  opacity: 0.3;
}

.radar-data {
  fill: var(--primary-color, #667eea);
  fill-opacity: 0.3;
  stroke: var(--primary-color, #667eea);
  stroke-width: 2;
}

.radar-point {
  fill: var(--primary-color, #667eea);
  stroke: white;
  stroke-width: 2;
}

.radar-label {
  font-size: 11px;
  fill: var(--text-color, #333);
}

/* 饼状图样式 */
.pie-chart {
  padding: 8px;
}

.pie-svg {
  width: 150px;
  height: 150px;
  margin: 0 auto 16px;
  display: block;
}

.pie-slice {
  transition: transform 0.2s ease;
  cursor: pointer;
}

.pie-slice:hover {
  transform: scale(1.05);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-color, #333);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 进度条样式 */
.progress-bar {
  padding: 8px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;
}

.progress-label {
  font-size: 13px;
  color: var(--text-color, #333);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.progress-track {
  height: 24px;
  width: 100%;
  background: var(--progress-track-bg, rgba(0, 0, 0, 0.05));
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  line-height: 0; /* 防止行高影响高度 */
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 12px;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 24px; /* 明确设置行高以匹配高度 */
}

.progress-text {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 表格样式 */
.data-table {
  padding: 8px;
  overflow-x: auto;
  width: 100%;
  text-align: left;
}

.data-table table {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid var(--table-border, rgba(0, 0, 0, 0.1));
}

.data-table th {
  background: var(--table-header-bg, rgba(0, 0, 0, 0.05));
  font-weight: 600;
  color: var(--text-color, #333);
}

.data-table td {
  color: var(--text-color, #333);
}

.data-table tr:hover {
  background: var(--table-hover-bg, rgba(0, 0, 0, 0.02));
}

/* 自定义组件样式 - 温和的隔离 */
.custom-component-wrapper {
  padding: 8px;

  /* 基础样式 */
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-family, system-ui);
  font-size: var(--font-size, 14px);
  line-height: 1.5;
  color: var(--text-color, #333);

  /* 使用 CSS containment */
  contain: layout style paint;

  /* 隔离样式上下文 */
  isolation: isolate;
}

/* 确保自定义组件内的元素使用正确的行高 */
.custom-component-wrapper * {
  line-height: inherit !important;
}

.custom-component-container {
  border-radius: 8px;
  overflow: hidden;

  /* 基础样式 */
  display: block;
  box-sizing: border-box;
  font-family: var(--font-family, system-ui);
  font-size: var(--font-size, 14px);
  line-height: 1.5;
  color: var(--text-color, #333);
  width: 100%;

  /* 使用 CSS containment */
  contain: layout style paint;

  /* 隔离样式上下文 */
  isolation: isolate;
}

/* 确保自定义组件内的元素使用正确的盒模型 */
.custom-component-container :deep(*) {
  box-sizing: border-box;
}

/* 重置可能继承的样式 */
.custom-component-container :deep(div),
.custom-component-container :deep(p),
.custom-component-container :deep(h1),
.custom-component-container :deep(h2),
.custom-component-container :deep(h3),
.custom-component-container :deep(h4),
.custom-component-container :deep(h5),
.custom-component-container :deep(h6) {
  margin: 0;
  padding: 0;
}

.custom-component-container :deep(img),
.custom-component-container :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}

.custom-component-placeholder {
  padding: 16px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 8px;
  text-align: center;
  color: var(--text-secondary, #666);
}

.custom-component-placeholder pre {
  text-align: left;
  font-size: 12px;
  overflow-x: auto;
}

/* 错误样式 */
.component-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  color: #ff4444;
  font-size: 13px;
}

/* 卡片组件样式 */
.info-card {
  padding: 16px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 12px;
  border-left: 4px solid;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  text-align: left;
}

.card-info {
  border-left-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.card-success {
  border-left-color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
}

.card-warning {
  border-left-color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.card-error {
  border-left-color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 18px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.card-content {
  font-size: 13px;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

/* 统计卡片样式 */
.stat-card {
  padding: 20px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 12px;
  color: white;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-unit {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

/* 开关组件样式 */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 8px;
  text-align: left;
}

.toggle-label {
  font-size: 14px;
  color: var(--text-color, #333);
  flex: 1;
}

.toggle-indicator {
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s ease;
}

.toggle-indicator.toggle-on {
  background: #2ecc71;
}

.toggle-dot {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.3s ease;
}

.toggle-indicator.toggle-on .toggle-dot {
  left: 22px;
}

.toggle-status {
  font-size: 12px;
  color: var(--text-secondary, #666);
  min-width: 50px;
}

/* 列表组件样式 */
.item-list {
  padding: 8px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.list-item:hover {
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.1));
}

.list-bullet {
  width: 24px;
  height: 24px;
  background: var(--primary-color, #667eea);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.list-text {
  font-size: 14px;
  color: var(--text-color, #333);
  flex: 1;
}

/* 配置展示组件样式 */
.config-display {
  padding: 16px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 12px;
  text-align: left;
}

.config-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #333);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.08));
  border-radius: 6px;
}

.config-key {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color, #667eea);
  min-width: 100px;
}

.config-value {
  font-size: 13px;
  color: var(--text-color, #333);
  font-family: 'Courier New', monospace;
  flex: 1;
  word-break: break-all;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .component-renderer {
    --component-bg: rgba(255, 255, 255, 0.05);
    --component-border: rgba(255, 255, 255, 0.1);
    --text-color: #e0e0e0;
    --bar-track-bg: rgba(255, 255, 255, 0.1);
    --progress-track-bg: rgba(255, 255, 255, 0.1);
    --table-border: rgba(255, 255, 255, 0.1);
    --table-header-bg: rgba(255, 255, 255, 0.1);
    --table-hover-bg: rgba(255, 255, 255, 0.05);
  }
}

/* 亮色主题适配 */
@media (prefers-color-scheme: light) {
  .component-renderer {
    --component-bg: rgba(0, 0, 0, 0.02);
    --component-border: rgba(0, 0, 0, 0.1);
    --text-color: #333;
    --bar-track-bg: rgba(0, 0, 0, 0.05);
    --progress-track-bg: rgba(0, 0, 0, 0.05);
    --table-border: rgba(0, 0, 0, 0.1);
    --table-header-bg: rgba(0, 0, 0, 0.05);
    --table-hover-bg: rgba(0, 0, 0, 0.02);
  }
}

/* 错误类型样式 */
.component-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 0, 0, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 0, 0, 0.2);
  color: #ff4444;
  font-size: 13px;
  text-align: center;
}

.error-icon {
  font-size: 32px;
}

.error-message {
  font-weight: 600;
}

.error-details {
  width: 100%;
  text-align: left;
  margin-top: 8px;
}

.error-detail-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #ff4444;
}

.error-detail-content {
  background: rgba(255, 0, 0, 0.1);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>