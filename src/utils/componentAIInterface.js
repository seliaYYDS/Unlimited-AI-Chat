/**
 * 组件AI接口工具类
 * 为自定义组件提供AI请求和AI绘画功能
 */

export class ComponentAIInterface {
  constructor(aiService, storageManager) {
    this.aiService = aiService
    this.storageManager = storageManager
    this.activeRequests = new Map()
  }

  /**
   * 从设置中获取AI配置
   * @returns {Object} AI配置对象
   */
  getAIConfig() {
    console.log('[ComponentAIInterface] getAIConfig 开始执行')
    const settings = this.storageManager.getSettings()
    console.log('[ComponentAIInterface] 获取到的设置:', settings)

    const config = {
      provider: settings.currentProvider || 'openai',
      apiKey: settings.apiKey || '',
      model: settings.model || 'gpt-3.5-turbo',
      apiEndpoint: settings.apiEndpoint || '',
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 2000,
      topP: settings.topP || 1,
      frequencyPenalty: settings.frequencyPenalty || 0,
      presencePenalty: settings.presencePenalty || 0
    }

    console.log('[ComponentAIInterface] 返回的 AI 配置:', config)
    return config
  }

  /**
   * 从设置中获取AI绘画配置
   * @returns {Object} AI绘画配置对象
   */
  getAIImageConfig() {
    console.log('[ComponentAIInterface] getAIImageConfig 开始执行')
    const settings = this.storageManager.getSettings()
    console.log('[ComponentAIInterface] 获取到的设置:', settings)

    const imageGenProvider = settings.imageGenProvider || 'sdapi'
    console.log('[ComponentAIInterface] imageGenProvider:', imageGenProvider)

    let config

    if (imageGenProvider === 'network') {
      // 网络AI绘画（如硅基流动）
      config = {
        provider: settings.networkImageProvider || 'siliconflow',
        apiKey: settings.networkImageApiKey || '',
        model: settings.networkImageModel || 'Qwen/Qwen-Image',
        width: settings.sdWidth || 1024,
        height: settings.sdHeight || 1024,
        steps: settings.sdSteps || 20,
        cfgScale: settings.sdCfgScale || 7,
        positivePrompt: settings.sdPositivePrompt || '',
        negativePrompt: settings.sdNegativePrompt || ''
      }
    } else {
      // SD API（Stable Diffusion）
      config = {
        provider: 'stable-diffusion',
        apiUrl: settings.sdApiUrl || 'http://127.0.0.1:7860',
        model: settings.sdModel || '',
        steps: settings.sdSteps || 20,
        cfgScale: settings.sdCfgScale || 7,
        width: settings.sdWidth || 512,
        height: settings.sdHeight || 512,
        sampler: settings.sdSampler || 'Euler a',
        positivePrompt: settings.sdPositivePrompt || '',
        negativePrompt: settings.sdNegativePrompt || ''
      }
    }

    console.log('[ComponentAIInterface] 返回的 AI 绘画配置:', config)
    return config
  }

  /**
   * 创建AI请求触发器
   * @param {string} requestId - 请求ID
   * @param {Object} options - 请求选项
   * @param {string} options.prompt - 提示词
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onProgress - 进度回调（流式输出）
   * @returns {Object} 触发器对象
   */
  createRequestTrigger(requestId, options = {}) {
    // 保存对 this 的引用，以便在 trigger 对象的方法中使用
    const self = this

    const {
      prompt = '',
      onSuccess = null,
      onError = null,
      onProgress = null
    } = options

    const trigger = {
      id: requestId,
      prompt,
      isPending: false,
      isLoading: false,
      error: null,
      result: null,

      /**
       * 执行AI请求
       * @returns {Promise} 请求Promise
       */
      async execute() {
        console.log(`[ComponentAIInterface] execute 开始执行: ${requestId}`)
        console.log(`[ComponentAIInterface] 当前状态:`, {
          isPending: this.isPending,
          isLoading: this.isLoading,
          prompt: this.prompt
        })

        if (this.isPending || this.isLoading) {
          console.warn(`[ComponentAIInterface] Request ${requestId} is already in progress`)
          return
        }

        this.isLoading = true
        this.error = null
        this.result = null

        console.log(`[ComponentAIInterface] 开始获取 AI 配置`)
        const config = self.getAIConfig()
        console.log(`[ComponentAIInterface] AI 配置:`, {
          provider: config.provider,
          model: config.model,
          hasApiKey: !!config.apiKey,
          apiEndpoint: config.apiEndpoint
        })

        try {
          // 创建一个临时的 agent 对象用于 sendMessage
          const tempAgent = {
            id: 'component-ai',
            name: 'Component AI',
            prompt: '',
            skills: []
          }

          console.log(`[ComponentAIInterface] 构建消息:`, prompt)

          // 使用 sendMessage 方法
          const response = await self.aiService.sendMessage(
            tempAgent,
            prompt,
            [],
            onProgress ? (chunk) => {
              onProgress(chunk, requestId)
            } : null
          )

          this.result = response
          console.log(`[ComponentAIInterface] AI 请求完成:`, response)
          if (onSuccess) onSuccess(response, requestId)
        } catch (error) {
          console.error(`[ComponentAIInterface] AI 请求失败:`, error)
          this.error = error.message || 'AI请求失败'
          if (onError) onError(error, requestId)
        } finally {
          this.isLoading = false
          console.log(`[ComponentAIInterface] execute 执行完成: ${requestId}`)
        }
      },

      /**
       * 取消请求
       */
      cancel() {
        // TODO: 实现请求取消
        this.isLoading = false
      }
    }

    return trigger
  }

  /**
   * 创建AI绘画触发器
   * @param {string} requestId - 请求ID
   * @param {Object} options - 请求选项
   * @param {string} options.prompt - 提示词
   * @param {string} options.negativePrompt - 负面提示词
   * @param {number} options.steps - 采样步数（仅Stable Diffusion）
   * @param {number} options.width - 图片宽度
   * @param {number} options.height - 图片高度
   * @param {number} options.cfgScale - CFG Scale（仅Stable Diffusion）
   * @param {string} options.sampler - 采样器名称（仅Stable Diffusion）
   * @param {string} options.model - 模型名称（仅Stable Diffusion）
   * @param {string} options.size - 图片尺寸（仅网络API，如 '1024x1024'）
   * @param {Object} options.extraParams - 额外参数
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onProgress - 进度回调
   * @returns {Object} 触发器对象
   */
  createImageTrigger(requestId, options = {}) {
    // 保存对 this 的引用，以便在 trigger 对象的方法中使用
    const self = this

    const {
      prompt = '',
      positivePrompt = null,
      negativePrompt = '',
      steps = null,
      width = null,
      height = null,
      cfgScale = null,
      sampler = null,
      model = null,
      size = null,
      extraParams = {},
      onSuccess = null,
      onError = null,
      onProgress = null
    } = options

    const trigger = {
      id: requestId,
      prompt,
      positivePrompt,
      negativePrompt,
      steps,
      width,
      height,
      cfgScale,
      sampler,
      model,
      size,
      isPending: false,
      isLoading: false,
      error: null,
      result: null,
      progress: 0,

      /**
       * 执行AI绘画
       * @returns {Promise} 请求Promise
       */
      async execute() {
        console.log(`[ComponentAIInterface] execute image 开始执行: ${requestId}`)
        console.log(`[ComponentAIInterface] 当前状态:`, {
          isPending: this.isPending,
          isLoading: this.isLoading,
          prompt: this.prompt,
          negativePrompt: this.negativePrompt
        })

        if (this.isPending || this.isLoading) {
          console.warn(`[ComponentAIInterface] Image request ${requestId} is already in progress`)
          return
        }

        this.isLoading = true
        this.error = null
        this.result = null
        this.progress = 0

        console.log(`[ComponentAIInterface] 开始获取 AI 绘画配置`)
        // 获取AI配置
        const config = self.getAIImageConfig()
        console.log(`[ComponentAIInterface] AI 绘画配置:`, {
          provider: config.provider,
          hasApiKey: !!config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model
        })

        try {
          if (config.provider === 'stable-diffusion') {
            console.log(`[ComponentAIInterface] 使用 Stable Diffusion 绘画`)
            // Stable Diffusion 绘画
            const imageResult = await self.generateWithStableDiffusion({
              ...config,
              prompt,
              negativePrompt,
              steps: steps !== null ? steps : config.steps,
              width: width !== null ? width : config.width,
              height: height !== null ? height : config.height,
              cfgScale: cfgScale !== null ? cfgScale : config.cfgScale,
              sampler: sampler !== null ? sampler : config.sampler,
              model: model !== null ? model : config.model,
              ...extraParams,
              onProgress: (value) => {
                this.progress = value
                if (onProgress) onProgress(value, requestId)
              }
            })

            this.result = imageResult
            console.log(`[ComponentAIInterface] Stable Diffusion 绘画完成:`, imageResult)
            if (onSuccess) onSuccess(imageResult, requestId)
          } else {
            console.log(`[ComponentAIInterface] 使用网络 API 绘画: ${config.provider}`)
            // 网络AI绘画（硅基流动、OpenAI DALL-E等）
            const imageResult = await self.generateWithNetworkAPI({
              ...config,
              prompt,
              width: width !== null ? width : config.width,
              height: height !== null ? height : config.height,
              steps: steps !== null ? steps : config.steps,
              cfgScale: cfgScale !== null ? cfgScale : config.cfgScale,
              positivePrompt: positivePrompt !== null ? positivePrompt : config.positivePrompt,
              negativePrompt: negativePrompt !== null ? negativePrompt : config.negativePrompt,
              model: model !== null ? model : config.model,
              ...extraParams,
              onProgress: (value) => {
                this.progress = value
                if (onProgress) onProgress(value, requestId)
              }
            })

            this.result = imageResult
            console.log(`[ComponentAIInterface] 网络 API 绘画完成:`, imageResult)
            if (onSuccess) onSuccess(imageResult, requestId)
          }
        } catch (error) {
          console.error(`[ComponentAIInterface] AI 绘画失败:`, error)
          this.error = error.message || 'AI绘画失败'
          if (onError) onError(error, requestId)
        } finally {
          this.isLoading = false
          console.log(`[ComponentAIInterface] execute image 执行完成: ${requestId}`)
        }
      },

      /**
       * 取消请求
       */
      cancel() {
        this.isLoading = false
      }
    }

    return trigger
  }

  /**
   * 使用Stable Diffusion生成图片
   * @param {Object} params - 参数
   * @returns {Promise} 图片结果
   */
  async generateWithStableDiffusion(params) {
    const {
      apiUrl,
      model,
      prompt,
      negativePrompt = '',
      steps = 20,
      cfgScale = 7,
      width = 512,
      height = 512,
      sampler = 'Euler a',
      onProgress = null
    } = params

    const payload = {
      prompt: prompt,
      negative_prompt: negativePrompt,
      steps: steps,
      cfg_scale: cfgScale,
      width: width,
      height: height,
      sampler_name: sampler
    }

    if (model) {
      payload.override_settings = {
        sd_model_checkpoint: model
      }
    }

    const response = await fetch(`${apiUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Stable Diffusion API error: ${response.statusText}`)
    }

    const data = await response.json()

    // 解析base64图片
    const base64Image = data.images[0]
    const imageUrl = `data:image/png;base64,${base64Image}`

    return {
      type: 'stable-diffusion',
      imageUrl: imageUrl,
      base64: base64Image,
      params: payload
    }
  }

  /**
   * 使用网络API生成图片
   * @param {Object} params - 参数
   * @returns {Promise} 图片结果
   */
  async generateWithNetworkAPI(params) {
    const {
      provider,
      apiKey,
      model,
      prompt,
      width = 1024,
      height = 1024,
      steps = 20,
      cfgScale = 7,
      positivePrompt = '',
      negativePrompt = '',
      onProgress = null
    } = params

    let apiUrl, headers, body

    // 构建完整的提示词
    const fullPrompt = positivePrompt ? `${positivePrompt}, ${prompt}` : prompt

    if (provider === 'siliconflow') {
      // 硅基流动图像生成
      apiUrl = 'https://api.siliconflow.cn/v1/images/generations'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
      body = {
        model: model || 'Qwen/Qwen-Image',
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        image_size: `${width}x${height}`,
        steps: steps,
        cfg_scale: cfgScale
      }
    } else if (provider === 'openai') {
      // OpenAI DALL-E
      apiUrl = 'https://api.openai.com/v1/images/generations'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
      body = {
        model: model || 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: `${width}x${height}`
      }
    } else {
      throw new Error(`Unsupported image generation provider: ${provider}`)
    }

    // 更新进度 - 开始生成
    if (onProgress) onProgress(10)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || 'Unknown error'
      throw new Error(`API error: ${response.statusText} - ${errorMessage}`)
    }

    // 更新进度 - 正在处理
    if (onProgress) onProgress(50)

    const data = await response.json()

    // 更新进度 - 完成
    if (onProgress) onProgress(100)

    // 返回图片 URL
    if (data.data && data.data.length > 0) {
      const imageUrl = data.data[0].url
      // 将 URL 转换为 base64
      const imageResponse = await fetch(imageUrl)
      const blob = await imageResponse.blob()
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      return {
        type: provider,
        imageUrl: imageUrl,
        base64: base64Image,
        params: body
      }
    } else {
      throw new Error('Network API returned empty image data')
    }
  }

  /**
   * 清理所有活动请求
   */
  cleanup() {
    this.activeRequests.forEach((trigger, id) => {
      if (trigger.cancel) {
        trigger.cancel()
      }
    })
    this.activeRequests.clear()
  }
}

// 创建全局实例
let globalComponentAIInterface = null

/**
 * 初始化组件AI接口
 * @param {Object} aiService - AI服务实例
 * @param {Object} storageManager - 存储管理器实例
 */
export function initComponentAIInterface(aiService, storageManager) {
  if (!globalComponentAIInterface) {
    globalComponentAIInterface = new ComponentAIInterface(aiService, storageManager)
  }
  return globalComponentAIInterface
}

/**
 * 获取组件AI接口实例
 * @returns {ComponentAIInterface|null} 组件AI接口实例
 */
export function getComponentAIInterface() {
  return globalComponentAIInterface
}

export default ComponentAIInterface