/**
 * 智能体组件系统
 * 支持智能体在对话中调用可配置的组件
 */

// 组件注册表
const componentRegistry = {}

/**
 * 参数类型定义
 */
export const PARAM_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object'
}

/**
 * 注册组件
 * @param {string} name - 组件名称
 * @param {Object} config - 组件配置
 */
export function registerComponent(name, config) {
  componentRegistry[name] = {
    name,
    description: config.description || '',
    params: config.params || [],
    render: config.render || null,
    example: config.example || ''
  }
}

/**
 * 获取组件
 * @param {string} name - 组件名称
 * @returns {Object|null} 组件配置
 */
export function getComponent(name) {
  console.log('getComponent 被调用:', name, '当前注册的组件:', Object.keys(componentRegistry))
  return componentRegistry[name] || null
}

/**
 * 获取所有组件
 * @returns {Array} 所有组件数组
 */
export function getAllComponents() {
  const components = Object.values(componentRegistry)
  console.log('[getAllComponents] 组件注册表:', componentRegistry)
  console.log('[getAllComponents] 返回的组件:', components)
  return components
}

/**
 * 生成组件使用说明
 * @returns {string} 组件使用说明文本
 */
export function generateComponentUsageGuide() {
  const components = getAllComponents()
  let guide = '\n\n=== 可用组件列表 ===\n'
  guide += '你可以在回复中使用以下组件来丰富内容展示。使用格式：@<!组件名~参数1,参数2,...>\n\n'

  components.forEach(comp => {
    guide += `【${comp.name}】\n`
    guide += `描述：${comp.description}\n`
    if (comp.params.length > 0) {
      guide += `参数：${comp.params.map(p => p.name).join(', ')}\n`
      comp.params.forEach(p => {
        guide += `  - ${p.name}: ${p.description}${p.required ? ' (必填)' : ''}\n`
      })
    }
    guide += `示例：@<!${comp.name}${comp.example ? '~' + comp.example : ''}>\n\n`
  })

  return guide
}

/**
 * 生成提示词组件引用说明
 * @returns {Object} 组件引用说明
 */
export function generatePromptComponentGuide() {
  const components = getAllComponents()
  return {
    syntax: '在提示词中使用 <组件名称> 来引用组件，该组件的使用说明会自动添加到你的提示词中',
    components: components.map(comp => ({
      name: comp.name,
      description: comp.description,
      params: comp.params,
      example: comp.example
    }))
  }
}

/**
 * 解析消息中的组件调用
 * @param {string} message - 消息内容
 * @returns {Array} 解析后的组件调用列表
 */
export function parseComponentCalls(message) {
  const componentCalls = []
  const regex = /@<!(\w+)~([^>]*)>/g
  let match

  while ((match = regex.exec(message)) !== null) {
    const componentName = match[1]
    const paramsString = match[2]
    
    // 获取组件定义以了解参数类型
    const component = getComponent(componentName)
    
    // 检查组件是否定义了参数类型
    const hasTypeDefinitions = component?.params?.some(p => p.type)
    
    let parsedParams
    if (hasTypeDefinitions) {
      // 如果组件定义了参数类型，使用类型感知的解析
      parsedParams = parseParams(paramsString, component?.params || [])
    } else {
      // 否则使用简单的逗号分割（兼容旧格式）
      parsedParams = paramsString ? paramsString.split(',').map(p => p.trim()) : []
    }
    
    componentCalls.push({
      fullMatch: match[0],
      componentName,
      params: parsedParams,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return componentCalls
}

/**
 * 根据参数定义解析参数值
 * @param {string} paramsString - 参数字符串
 * @param {Array} paramDefinitions - 参数定义数组
 * @returns {Array} 解析后的参数值数组
 */
function parseParams(paramsString, paramDefinitions) {
  if (!paramsString) return []
  
  // 使用更智能的分隔符处理，支持嵌套结构
  const params = smartSplit(paramsString, ',')
  
  return params.map((param, index) => {
    const definition = paramDefinitions[index]
    
    if (!definition) {
      // 没有定义的类型，默认作为字符串处理
      return parseValue(param, PARAM_TYPES.STRING)
    }
    
    return parseValue(param, definition.type || PARAM_TYPES.STRING)
  })
}

/**
 * 智能分割字符串，处理嵌套结构
 * @param {string} str - 要分割的字符串
 * @param {string} separator - 分隔符
 * @returns {Array} 分割后的数组
 */
function smartSplit(str, separator) {
  const result = []
  let current = ''
  let depth = 0
  let inString = false
  let stringChar = ''
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    
    // 处理字符串
    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inString) {
        inString = true
        stringChar = char
        current += char
      } else if (char === stringChar) {
        inString = false
        current += char
      } else {
        current += char
      }
    } else if (inString) {
      current += char
    } else if (char === '[' || char === '{') {
      depth++
      current += char
    } else if (char === ']' || char === '}') {
      depth--
      current += char
    } else if (char === separator && depth === 0) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    result.push(current.trim())
  }
  
  return result
}

/**
 * 根据类型解析值
 * @param {string} value - 字符串值
 * @param {string} type - 参数类型
 * @returns {*} 解析后的值
 */
function parseValue(value, type) {
  switch (type) {
    case PARAM_TYPES.NUMBER:
      const num = parseFloat(value)
      return isNaN(num) ? null : num
      
    case PARAM_TYPES.BOOLEAN:
      if (value.toLowerCase() === 'true' || value === '1') return true
      if (value.toLowerCase() === 'false' || value === '0') return false
      return null
      
    case PARAM_TYPES.ARRAY:
      // 尝试解析 JSON 数组
      try {
        if (value.startsWith('[') && value.endsWith(']')) {
          return JSON.parse(value)
        }
        // 否则按逗号分割
        return value.split(',').map(v => v.trim())
      } catch (e) {
        return [value]
      }
      
    case PARAM_TYPES.OBJECT:
      // 尝试解析 JSON 对象
      try {
        if (value.startsWith('{') && value.endsWith('}')) {
          return JSON.parse(value)
        }
        // 尝试解析键值对格式：key1:value1,key2:value2
        const obj = {}
        const pairs = value.split(',')
        pairs.forEach(pair => {
          const [key, val] = pair.split(':').map(v => v.trim())
          if (key) {
            obj[key] = val
          }
        })
        return obj
      } catch (e) {
        return null
      }
      
    case PARAM_TYPES.STRING:
    default:
      // 移除字符串两端的引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1)
      }
      return value
  }
}

/**
 * 解析提示词中的组件引用（简化语法）
 * @param {string} prompt - 提示词内容
 * @returns {Array} 引用的组件名称列表
 */
export function parseComponentReferences(prompt) {
  const references = []
  const regex = /<(\w+)>/g
  let match

  while ((match = regex.exec(prompt)) !== null) {
    const componentName = match[1]
    if (getComponent(componentName)) {
      references.push({
        name: componentName,
        fullMatch: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })
    }
  }

  return references
}

/**
 * 渲染组件
 * @param {string} componentName - 组件名称
 * @param {Array} params - 参数数组
 * @returns {Object|null} 渲染结果 { type, data }
 */
export function renderComponent(componentName, params) {
  console.log('renderComponent 被调用:', componentName, params)
  
  const component = getComponent(componentName)
  console.log('获取到的组件:', component)
  
  if (!component || !component.render) {
    console.warn('组件不存在或没有 render 方法:', componentName)
    return null
  }

  try {
    const result = component.render(params)
    console.log('组件渲染结果:', result)
    return result
  } catch (error) {
    console.error(`组件 ${componentName} 渲染失败:`, error)
    return null
  }
}

// ==================== 内置组件 ====================

/**
 * 柱状图组件
 * 参数：标签,值1,值2,... (例如：月份,10,20,30)
 */
registerComponent('bar', {
  description: '显示柱状图，用于比较不同类别的数据',
  params: [
    { name: 'label', description: '数据标签（如：月份、产品名）', required: true, type: PARAM_TYPES.STRING },
    { name: 'values', description: '数值列表，用逗号分隔', required: true, type: PARAM_TYPES.ARRAY }
  ],
  example: '月份,10,20,30,40,50',
  render: (params) => {
    // 兼容新旧两种参数格式
    let label, values
    
    if (Array.isArray(params[0]) && params.length === 2) {
      // 新格式：[label, [values]]
      label = params[0]
      values = params[1]
    } else if (Array.isArray(params)) {
      // 旧格式：[label, value1, value2, ...]
      label = params[0]
      values = params.slice(1)
    } else {
      return { type: 'error', data: '无效的参数格式' }
    }

    if (!label || !values || values.length === 0) {
      return { type: 'error', data: '柱状图至少需要标签和数值' }
    }

    // 转换为数值数组
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v))

    if (numericValues.length === 0) {
      return { type: 'error', data: '无效的数值参数' }
    }

    const maxValue = Math.max(...numericValues)
    const data = numericValues.map((v, i) => ({
      label: `${label} ${i + 1}`,
      value: v,
      percentage: maxValue > 0 ? (v / maxValue * 100) : 0
    }))

    return {
      type: 'bar',
      data: {
        label,
        values: data,
        maxValue
      }
    }
  }
})

/**
 * 雷达图组件
 * 参数：维度1,维度2,维度3,维度4,维度5,数值1,数值2,数值3,数值4,数值5
 * 例如：速度,力量,防御,智力,敏捷,80,70,60,90,75
 */
registerComponent('radar', {
  description: '显示雷达图，用于展示多维度数据对比',
  params: [
    { name: 'dimensions', description: '维度名称列表（5个维度）', required: true, type: PARAM_TYPES.ARRAY },
    { name: 'values', description: '各维度的数值（0-100）', required: true, type: PARAM_TYPES.ARRAY }
  ],
  example: '速度,力量,防御,智力,敏捷,80,70,60,90,75',
  render: (params) => {
    // 兼容新旧两种参数格式
    let dimensions, values
    
    if (Array.isArray(params[0]) && Array.isArray(params[1])) {
      // 新格式：[[dimensions], [values]]
      dimensions = params[0]
      values = params[1]
    } else if (Array.isArray(params) && params.length >= 10) {
      // 旧格式：[dim1, dim2, dim3, dim4, dim5, val1, val2, val3, val4, val5]
      dimensions = params.slice(0, 5)
      values = params.slice(5, 10)
    } else {
      return { type: 'error', data: '雷达图需要5个维度名称和5个数值' }
    }

    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v))

    if (numericValues.length !== 5) {
      return { type: 'error', data: '需要提供5个有效的数值' }
    }

    const data = dimensions.map((dim, i) => ({
      dimension: dim,
      value: Math.min(100, Math.max(0, numericValues[i]))
    }))

    return {
      type: 'radar',
      data: {
        dimensions: data
      }
    }
  }
})

/**
 * 饼状图组件
 * 参数：标签1,数值1,标签2,数值2,...
 * 例如：苹果,30,香蕉,20,橙子,25
 */
registerComponent('pie', {
  description: '显示饼状图，用于展示各部分占比',
  params: [
    { name: 'data', description: '标签和数值交替，成对出现', required: true, type: PARAM_TYPES.ARRAY }
  ],
  example: '苹果,30,香蕉,20,橙子,25,葡萄,25',
  render: (params) => {
    // 兼容新旧两种参数格式
    let data
    
    if (Array.isArray(params[0])) {
      // 新格式：[[label1, value1, label2, value2, ...]]
      data = params[0]
    } else if (Array.isArray(params)) {
      // 旧格式：[label1, value1, label2, value2, ...]
      data = params
    } else {
      return { type: 'error', data: '无效的参数格式' }
    }

    if (data.length < 2 || data.length % 2 !== 0) {
      return { type: 'error', data: '饼状图需要成对的参数：标签,数值' }
    }

    const items = []
    let total = 0

    for (let i = 0; i < data.length; i += 2) {
      const label = data[i]
      const value = parseFloat(data[i + 1])

      if (!isNaN(value) && value > 0) {
        items.push({ label, value })
        total += value
      }
    }

    if (items.length === 0) {
      return { type: 'error', data: '无效的数据参数' }
    }

    // 计算百分比
    const pieData = items.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total * 100) : 0
    }))

    return {
      type: 'pie',
      data: {
        items: pieData,
        total
      }
    }
  }
})

/**
 * 进度条组件
 * 参数：当前值,最大值,标签
 * 例如：75,100,完成度
 */
registerComponent('progress', {
  description: '显示进度条，用于展示任务完成进度',
  params: [
    { name: 'current', description: '当前值', required: true, type: PARAM_TYPES.NUMBER },
    { name: 'max', description: '最大值', required: true, type: PARAM_TYPES.NUMBER },
    { name: 'label', description: '进度标签', required: false, type: PARAM_TYPES.STRING, defaultValue: '进度' }
  ],
  example: '75,100,完成度',
  render: (params) => {
    // 兼容新旧两种参数格式
    let current, max, label
    
    if (typeof params[0] === 'number' && typeof params[1] === 'number') {
      // 新格式：[current, max, label]
      current = params[0]
      max = params[1]
      label = params[2] || '进度'
    } else if (Array.isArray(params) && params.length >= 2) {
      // 旧格式：[current, max, label]
      current = parseFloat(params[0])
      max = parseFloat(params[1])
      label = params[2] || '进度'
    } else {
      return { type: 'error', data: '进度条需要当前值和最大值' }
    }

    if (isNaN(current) || isNaN(max) || max <= 0) {
      return { type: 'error', data: '无效的数值参数' }
    }

    const percentage = Math.min(100, Math.max(0, (current / max * 100)))

    return {
      type: 'progress',
      data: {
        current,
        max,
        percentage,
        label
      }
    }
  }
})

/**
 * 表格组件
 * 参数：列1,列2,列3|行1列1,行1列2,行1列3|行2列1,行2列2,行2列3
 * 例如：姓名,年龄,城市|张三,25,北京|李四,30,上海
 */
registerComponent('table', {
  description: '显示表格，用于展示结构化数据',
  params: [
    { name: 'headers', description: '表头，用逗号分隔', required: true, type: PARAM_TYPES.ARRAY },
    { name: 'rows', description: '数据行，每行用|分隔，列用逗号分隔', required: true, type: PARAM_TYPES.ARRAY }
  ],
  example: '姓名,年龄,城市|张三,25,北京|李四,30,上海|王五,28,广州',
  render: (params) => {
    // 兼容新旧两种参数格式
    let allParams
    
    if (typeof params[0] === 'string') {
      // 新格式：["headers,row1,row2,..."]
      allParams = params[0]
    } else if (Array.isArray(params)) {
      // 旧格式：[headers, row1, row2, ...]
      allParams = params.join(',')
    } else {
      return { type: 'error', data: '无效的参数格式' }
    }

    const parts = allParams.split('|')

    if (parts.length < 2) {
      return { type: 'error', data: '表格需要至少1行数据' }
    }

    const headers = parts[0].split(',').map(h => h.trim())
    const rows = parts.slice(1).map(row => row.split(',').map(cell => cell.trim()))

    // 验证每行的列数是否一致
    const columnCount = headers.length
    const validRows = rows.filter(row => row.length === columnCount)

    if (validRows.length === 0) {
      return { type: 'error', data: '数据行的列数必须与表头一致' }
    }

    return {
      type: 'table',
      data: {
        headers,
        rows: validRows
      }
    }
  }
})

/**
 * 卡片组件 - 展示字符串参数
 * 参数：标题,内容,颜色
 * 例如：重要通知,请注意系统维护时间,warning
 */
registerComponent('card', {
  description: '显示信息卡片，用于突出显示重要信息',
  params: [
    { 
      name: 'title', 
      description: '卡片标题', 
      type: PARAM_TYPES.STRING, 
      required: true 
    },
    { 
      name: 'content', 
      description: '卡片内容', 
      type: PARAM_TYPES.STRING, 
      required: true 
    },
    { 
      name: 'color', 
      description: '卡片颜色主题（info/success/warning/error）', 
      type: PARAM_TYPES.STRING, 
      defaultValue: 'info' 
    }
  ],
  example: '重要通知,系统将于今晚进行维护,warning',
  render: (params) => {
    if (params.length < 2) {
      return { type: 'error', data: '卡片需要标题和内容' }
    }

    const title = params[0] || '标题'
    const content = params[1] || ''
    const color = params[2] || 'info'

    const validColors = ['info', 'success', 'warning', 'error']
    const colorTheme = validColors.includes(color) ? color : 'info'

    return {
      type: 'card',
      data: {
        title,
        content,
        color: colorTheme
      }
    }
  }
})

/**
 * 统计卡片组件 - 展示数值参数
 * 参数：数值,标签,单位
 * 例如：1250,今日访问量,次
 */
registerComponent('stat', {
  description: '显示统计数值卡片，用于展示关键指标',
  params: [
    { 
      name: 'value', 
      description: '统计数值', 
      type: PARAM_TYPES.NUMBER, 
      required: true 
    },
    { 
      name: 'label', 
      description: '数值标签', 
      type: PARAM_TYPES.STRING, 
      required: true 
    },
    { 
      name: 'unit', 
      description: '数值单位', 
      type: PARAM_TYPES.STRING, 
      defaultValue: '' 
    }
  ],
  example: '1250,今日访问量,次',
  render: (params) => {
    if (params.length < 2) {
      return { type: 'error', data: '统计卡片需要数值和标签' }
    }

    const value = params[0] || 0
    const label = params[1] || '统计'
    const unit = params[2] || ''

    return {
      type: 'stat',
      data: {
        value,
        label,
        unit
      }
    }
  }
})

/**
 * 开关组件 - 展示布尔参数
 * 参数：状态,标签
 * 例如：true,启用自动更新
 */
registerComponent('toggle', {
  description: '显示开关状态，用于表示启用/禁用状态',
  params: [
    { 
      name: 'enabled', 
      description: '是否启用（true/false）', 
      type: PARAM_TYPES.BOOLEAN, 
      required: true 
    },
    { 
      name: 'label', 
      description: '开关标签', 
      type: PARAM_TYPES.STRING, 
      required: true 
    }
  ],
  example: 'true,启用自动更新',
  render: (params) => {
    if (params.length < 2) {
      return { type: 'error', data: '开关需要状态和标签' }
    }

    const enabled = params[0] !== false
    const label = params[1] || '开关'

    return {
      type: 'toggle',
      data: {
        enabled,
        label
      }
    }
  }
})

/**
 * 列表组件 - 展示数组参数
 * 参数：列表项1,列表项2,列表项3
 * 例如：完成需求分析,编写代码,测试功能,部署上线
 */
registerComponent('list', {
  description: '显示列表，用于展示多个项目',
  params: [
    { 
      name: 'items', 
      description: '列表项数组', 
      type: PARAM_TYPES.ARRAY, 
      required: true 
    }
  ],
  example: '完成需求分析,编写代码,测试功能,部署上线',
  render: (params) => {
    // 兼容新旧两种参数格式
    let items
    
    if (Array.isArray(params[0])) {
      // 新格式：[[item1, item2, ...]]
      items = params[0]
    } else if (Array.isArray(params)) {
      // 旧格式：[item1, item2, ...]
      items = params
    } else {
      return { type: 'error', data: '无效的参数格式' }
    }

    if (items.length === 0) {
      return { type: 'error', data: '列表需要至少一个项目' }
    }

    return {
      type: 'list',
      data: {
        items: items.filter(item => item && String(item).trim())
      }
    }
  }
})

/**
 * 配置展示组件 - 展示对象参数
 * 参数：配置对象（JSON格式或键值对格式）
 * 例如：{"name":"app","version":"1.0","enabled":true} 或 name:app,version:1.0,enabled:true
 */
registerComponent('config', {
  description: '显示配置信息，用于展示键值对数据',
  params: [
    { 
      name: 'config', 
      description: '配置对象（JSON或键值对格式）', 
      type: PARAM_TYPES.OBJECT, 
      required: true 
    }
  ],
  example: 'name:app,version:1.0,enabled:true',
  render: (params) => {
    const config = params[0]

    if (!config || typeof config !== 'object') {
      return { type: 'error', data: '配置需要有效的对象格式' }
    }

    return {
      type: 'config',
      data: {
        config
      }
    }
  }
})

export default {
  registerComponent,
  getComponent,
  getAllComponents,
  generateComponentUsageGuide,
  parseComponentCalls,
  renderComponent,
  PARAM_TYPES
}