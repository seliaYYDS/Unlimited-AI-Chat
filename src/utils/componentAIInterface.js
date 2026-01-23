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
    const settings = this.storageManager.getSettings()
    return {
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
  }

  /**
   * 从设置中获取AI绘画配置
   * @returns {Object} AI绘画配置对象
   */
  getAIImageConfig() {
    const settings = this.storageManager.getSettings()
    const useNetworkImage = settings.useNetworkImage || false

    if (useNetworkImage) {
      // 网络AI绘画
      return {
        provider: settings.networkImageProvider || 'openai',
        apiKey: settings.networkImageApiKey || '',
        model: settings.networkImageModel || 'dall-e-3',
        size: settings.imageSize || '1024x1024'
      }
    } else {
      // Stable Diffusion
      return {
        provider: 'stable-diffusion',
        apiUrl: settings.sdApiUrl || 'http://127.0.0.1:7860',
        model: settings.sdModel || '',
        steps: settings.sdSteps || 20,
        cfgScale: settings.sdCfgScale || 7,
        width: settings.sdWidth || 512,
        height: settings.sdHeight || 512,
        sampler: settings.sdSampler || 'Euler a',
        negativePrompt: settings.sdNegativePrompt || ''
      }
    }
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
        if (this.isPending || this.isLoading) {
          console.warn(`Request ${requestId} is already in progress`)
          return
        }

        this.isLoading = true
        this.error = null
        this.result = null

        const config = this.getAIConfig()

        try {
          // 构建消息
          const messages = [
            { role: 'user', content: prompt }
          ]

          // 如果有进度回调，使用流式输出
          if (onProgress) {
            const fullResponse = await this.aiService.streamChat(
              messages,
              {
                provider: config.provider,
                apiKey: config.apiKey,
                model: config.model,
                apiEndpoint: config.apiEndpoint,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                frequencyPenalty: config.frequencyPenalty,
                presencePenalty: config.presencePenalty
              },
              (chunk) => {
                onProgress(chunk, requestId)
              }
            )

            this.result = fullResponse
            if (onSuccess) onSuccess(fullResponse, requestId)
          } else {
            // 普通请求
            const response = await this.aiService.chat(
              messages,
              {
                provider: config.provider,
                apiKey: config.apiKey,
                model: config.model,
                apiEndpoint: config.apiEndpoint,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                frequencyPenalty: config.frequencyPenalty,
                presencePenalty: config.presencePenalty
              }
            )

            this.result = response
            if (onSuccess) onSuccess(response, requestId)
          }
        } catch (error) {
          this.error = error.message || 'AI请求失败'
          if (onError) onError(error, requestId)
        } finally {
          this.isLoading = false
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
        if (this.isPending || this.isLoading) {
          console.warn(`Image request ${requestId} is already in progress`)
          return
        }

        this.isLoading = true
        this.error = null
        this.result = null
        this.progress = 0

        // 获取AI配置
        const config = self.getAIImageConfig()

        try {
          if (config.provider === 'stable-diffusion') {
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
            if (onSuccess) onSuccess(imageResult, requestId)
          } else {
            // 网络AI绘画（OpenAI DALL-E等）
            const imageResult = await self.generateWithNetworkAPI({
              ...config,
              prompt,
              size: size !== null ? size : config.size,
              ...extraParams
            })

            this.result = imageResult
            if (onSuccess) onSuccess(imageResult, requestId)
          }
        } catch (error) {
          this.error = error.message || 'AI绘画失败'
          if (onError) onError(error, requestId)
        } finally {
          this.isLoading = false
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
      size = '1024x1024'
    } = params

    let apiUrl, headers, body

    if (provider === 'openai') {
      apiUrl = 'https://api.openai.com/v1/images/generations'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
      body = {
        model: model || 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size
      }
    } else {
      throw new Error(`Unsupported image generation provider: ${provider}`)
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const imageUrl = data.data[0].url

    return {
      type: provider,
      imageUrl: imageUrl,
      params: body
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