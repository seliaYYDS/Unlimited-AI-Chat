/**
 * 工具注册表
 * 管理所有可用的工具定义，支持Function Calling
 */

// 工具定义
export const TOOL_DEFINITIONS = {
  webSearch: {
    name: 'webSearch',
    description: '搜索互联网以获取最新信息。当用户询问以下内容时使用此工具：当前时间、今日天气、最新新闻、实时价格、技术资讯、体育赛事结果等任何需要实时数据的查询。不要用于查询历史事实、定义或一般性知识。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询词，应该简洁明确。例如："北京今天天气"、"最新科技新闻"、"iPhone 15价格"'
        }
      },
      required: ['query']
    },
    execute: async (params) => {
      return await executeWebSearch(params.query)
    }
  }
}

// 工具注册表类
export class ToolRegistry {
  constructor() {
    this.tools = new Map()
    this.registerDefaultTools()
  }

  // 注册默认工具
  registerDefaultTools() {
    Object.entries(TOOL_DEFINITIONS).forEach(([name, tool]) => {
      this.registerTool(name, tool)
    })
  }

  // 注册工具
  registerTool(name, tool) {
    this.tools.set(name, tool)
  }

  // 获取工具
  getTool(name) {
    return this.tools.get(name)
  }

  // 获取所有工具
  getAllTools() {
    return Array.from(this.tools.values())
  }

  // 获取工具的OpenAI格式定义
  getOpenAITools() {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  // 检查工具是否存在
  hasTool(name) {
    return this.tools.has(name)
  }

  // 执行工具
  async executeTool(name, params) {
    const tool = this.getTool(name)
    if (!tool) {
      throw new Error(`工具 "${name}" 不存在`)
    }

    if (!tool.execute) {
      throw new Error(`工具 "${name}" 没有执行函数`)
    }

    try {
      const result = await tool.execute(params)
      return {
        success: true,
        result
      }
    } catch (error) {
      console.error(`工具 "${name}" 执行失败:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 执行网络搜索
async function executeWebSearch(query) {
  console.log(`[Tool Registry] ========== 开始执行网络搜索 ==========`)
  console.log(`[Tool Registry] 搜索查询:`, query)

  try {
    // 使用支持CORS的搜索API
    const searchResults = await fetchSearchResults(query)
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`[Tool Registry] 搜索未返回任何结果`)
      return {
        query,
        results: `未找到与"${query}"相关的搜索结果`,
        count: 0,
        sources: []
      }
    }

    console.log(`[Tool Registry] 搜索找到 ${searchResults.length} 个结果`)

    // 格式化并返回结果
    const formattedResults = searchResults.map((item, index) =>
      `[来源${index + 1}]\n标题: ${item.title}\n内容: ${item.content}\n链接: ${item.url}`
    ).join('\n\n')

    const result = {
      query,
      results: formattedResults,
      count: searchResults.length,
      sources: searchResults.map(r => ({ title: r.title, url: r.url }))
    }

    console.log(`[Tool Registry] ========== 网络搜索完成 ==========`)
    return result

  } catch (error) {
    console.error(`[Tool Registry] 网络搜索错误:`, error)
    console.error(`[Tool Registry] 错误详情:`, error.message, error.stack)
    
    return {
      query,
      results: `搜索"${query}"时遇到问题：${error.message}。请稍后重试或尝试其他关键词。`,
      count: 0,
      sources: []
    }
  }
}

// 使用支持CORS的搜索API获取结果
async function fetchSearchResults(query) {
  // 尝试多个搜索API，按优先级顺序
  const searchProviders = [
    {
      name: 'Google Programmable Search',
      fetch: fetchGoogleSearch
    },
    {
      name: 'Bing Search API',
      fetch: fetchBingSearch
    },
    {
      name: 'DuckDuckGo',
      fetch: fetchDuckDuckGoSearch
    }
  ]

  for (const provider of searchProviders) {
    try {
      console.log(`[Tool Registry] 尝试使用 ${provider.name}`)
      const results = await provider.fetch(query)
      
      if (results && results.length > 0) {
        console.log(`[Tool Registry] ${provider.name} 搜索成功，找到 ${results.length} 个结果`)
        return results
      }
    } catch (error) {
      console.error(`[Tool Registry] ${provider.name} 搜索失败:`, error.message)
      continue
    }
  }

  console.log(`[Tool Registry] 所有搜索API均失败`)
  return []
}

// Google Programmable Search API（需要API密钥）
async function fetchGoogleSearch(query) {
  try {
    // 检查是否配置了Google API密钥
    const apiKey = localStorage.getItem('google_search_api_key')
    const searchEngineId = localStorage.getItem('google_search_engine_id')

    if (!apiKey || !searchEngineId) {
      console.log(`[Tool Registry] 未配置Google搜索API密钥，跳过`)
      return []
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Google搜索API请求失败: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return []
    }

    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      content: item.snippet || ''
    }))

  } catch (error) {
    console.error(`[Tool Registry] Google搜索失败:`, error)
    return []
  }
}

// Bing Search API（需要API密钥）
async function fetchBingSearch(query) {
  try {
    // 检查是否配置了Bing API密钥
    const apiKey = localStorage.getItem('bing_search_api_key')

    if (!apiKey) {
      console.log(`[Tool Registry] 未配置Bing搜索API密钥，跳过`)
      return []
    }

    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`

    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`Bing搜索API请求失败: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.webPages || !data.webPages.value || data.webPages.value.length === 0) {
      return []
    }

    return data.webPages.value.map(item => ({
      title: item.name,
      url: item.url,
      content: item.snippet || ''
    }))

  } catch (error) {
    console.error(`[Tool Registry] Bing搜索失败:`, error)
    return []
  }
}

// DuckDuckGo Instant Answer API（无需API密钥，支持CORS）
async function fetchDuckDuckGoSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=0`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo搜索请求失败: ${response.status}`)
    }

    const data = await response.json()
    const results = []

    // 添加即时答案
    if (data.Abstract && data.AbstractText) {
      results.push({
        title: data.Heading || '即时答案',
        url: data.AbstractURL || 'https://duckduckgo.com',
        content: data.AbstractText
      })
    }

    // 添加相关主题
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 4).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.substring(0, 100),
            url: topic.FirstURL,
            content: topic.Text
          })
        }
      })
    }

    return results

  } catch (error) {
    console.error(`[Tool Registry] DuckDuckGo搜索失败:`, error)
    return []
  }
}

// 导出单例实例
export const toolRegistry = new ToolRegistry()