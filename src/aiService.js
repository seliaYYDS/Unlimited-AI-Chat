// AI模型服务兼容层 - 增强版本
export class AIService {
    constructor(storageManager) {
        this.storageManager = storageManager
        this.requestQueue = []
        this.activeRequests = new Map()
        this.maxConcurrentRequests = 3 // 最大并发请求数

        // 支持的API提供商配置
        this.apiProviders = {
            openai: {
                name: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1',
                chatEndpoint: '/chat/completions',
                models: [
                    'gpt-4', 'gpt-4-32k', 'gpt-4-turbo', 'gpt-4-vision-preview',
                    'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-instruct'
                ],
                authHeader: 'Bearer',
                defaultModel: 'gpt-3.5-turbo'
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1',
                chatEndpoint: '/chat/completions',
                models: ['deepseek-chat', 'deepseek-coder'],
                authHeader: 'Bearer',
                defaultModel: 'deepseek-chat'
            },
            anthropic: {
                name: 'Anthropic',
                baseUrl: 'https://api.anthropic.com/v1',
                chatEndpoint: '/messages',
                models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                authHeader: 'x-api-key',
                defaultModel: 'claude-3-sonnet-20240229'
            },
            azure: {
                name: 'Azure OpenAI',
                baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
                chatEndpoint: '/chat/completions',
                models: ['gpt-4', 'gpt-35-turbo'],
                authHeader: 'api-key',
                defaultModel: 'gpt-35-turbo'
            },
            google: {
                name: 'Google Gemini',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                chatEndpoint: '/models/{model}:generateContent',
                models: ['gemini-pro', 'gemini-pro-vision'],
                authHeader: 'x-goog-api-key',
                defaultModel: 'gemini-pro'
            },
            local: {
                name: '本地部署',
                baseUrl: 'http://localhost:8080/v1',
                chatEndpoint: '/chat/completions',
                models: ['local-model'],
                authHeader: 'Bearer',
                defaultModel: 'local-model'
            }
        }
    }

    // 发送消息到AI模型 - 支持并发请求
    async sendMessage(agent, message, conversationHistory = [], onProgress = null) {
        const requestId = this.generateRequestId()

        return new Promise((resolve, reject) => {
            const request = {
                id: requestId,
                agent,
                message,
                conversationHistory,
                onProgress,
                resolve,
                reject,
                timestamp: Date.now()
            }

            this.requestQueue.push(request)
            this.processQueue()
        })
    }

    // 生成唯一请求ID
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // 处理请求队列
    async processQueue() {
        // 如果已达到最大并发数或队列为空，则返回
        if (this.activeRequests.size >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return
        }

        // 从队列中取出下一个请求
        const request = this.requestQueue.shift()
        this.activeRequests.set(request.id, request)

        try {
            const settings = this.storageManager.getSettings()
            const startTime = Date.now()
            let thinkingTime = 0

            let response
            if (settings.apiType === 'network') {
                if (settings.wordByWordOutput && request.onProgress) {
                    // 流式输出模式
                    response = await this.sendToNetworkAPIStream(request.agent, request.message, request.conversationHistory, settings, request.onProgress)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, settings, thinkingTime)
                } else {
                    // 普通模式
                    response = await this.sendToNetworkAPI(request.agent, request.message, request.conversationHistory, settings)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, settings, thinkingTime)
                }
            } else {
                if (settings.wordByWordOutput && request.onProgress) {
                    // 本地模型的流式输出
                    response = await this.sendToLocalModelStream(request.agent, request.message, request.conversationHistory, settings, request.onProgress)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, settings, thinkingTime)
                } else {
                    // 普通模式
                    response = await this.sendToLocalModel(request.agent, request.message, request.conversationHistory, settings)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, settings, thinkingTime)
                }
            }

            request.resolve(response)
        } catch (error) {
            request.reject(error)
        } finally {
            this.activeRequests.delete(request.id)
            // 继续处理队列中的下一个请求
            this.processQueue()
        }
    }

    // 取消指定请求
    cancelRequest(requestId) {
        // 从队列中移除
        const queueIndex = this.requestQueue.findIndex(req => req.id === requestId)
        if (queueIndex !== -1) {
            this.requestQueue.splice(queueIndex, 1)
        }

        // 从活跃请求中移除
        if (this.activeRequests.has(requestId)) {
            this.activeRequests.delete(requestId)
        }
    }

    // 获取当前请求状态
    getRequestStatus() {
        return {
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests.size,
            maxConcurrent: this.maxConcurrentRequests
        }
    }

    // 网络API流式调用
    async sendToNetworkAPIStream(agent, message, conversationHistory, settings, onProgress) {
        const { apiEndpoint, apiKey, modelName, temperature, maxTokens } = settings

        // 验证基本配置
        if (!apiEndpoint) {
            throw new Error('❌ 请配置API端点')
        }

        if (!apiKey) {
            throw new Error('❌ 请配置API密钥')
        }

        // 检测API提供商
        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)

        // 构建请求体，启用流式输出
        const requestBody = this.buildRequestBody(agent, message, conversationHistory, settings, provider)
        requestBody.stream = true

        console.log(`[AI Service] 发送流式网络API请求:`, {
            provider,
            url: fullUrl,
            model: modelName,
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            requestBodyMessages: requestBody.messages ? requestBody.messages.length : 'N/A'
        });

        // 构建请求头
        const headers = this.buildRequestHeaders(apiKey, provider)

        console.log(`🔍 发送流式请求到: ${fullUrl}`)

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorInfo = await this.parseErrorResponse(response, provider)
                throw new Error(errorInfo)
            }

            // 处理流式响应 - 添加内存保护
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullResponse = ''
            let buffer = ''
            let chunkCount = 0
            const MAX_RESPONSE_LENGTH = 10000 // 限制响应长度
            const MAX_CHUNKS = 1000 // 限制最大chunk数量

            let lastUpdateTime = 0
            const UPDATE_INTERVAL = 50 // 最小更新间隔(ms)

            while (true) {
                const { done, value } = await reader.read()
                if (done || chunkCount >= MAX_CHUNKS) break

                chunkCount++
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')

                // 保留最后一行（可能不完整）
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6))
                            const content = this.parseStreamResponseContent(data, provider)
                            if (content && fullResponse.length < MAX_RESPONSE_LENGTH) {
                                fullResponse += content

                                // 使用节流控制更新频率
                                const now = Date.now()
                                if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                                    onProgress(fullResponse)
                                    lastUpdateTime = now
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            // 确保最终文本完整显示
            onProgress(fullResponse)

            return fullResponse

        } catch (error) {
            console.error('💥 网络API流式调用失败:', error)
            throw error
        }
    }

    // 网络API调用 - 增强版本
    async sendToNetworkAPI(agent, message, conversationHistory, settings) {
        const { apiEndpoint, apiKey, modelName, temperature, maxTokens } = settings

        // 验证基本配置
        if (!apiEndpoint) {
            throw new Error('❌ 请配置API端点')
        }

        if (!apiKey) {
            throw new Error('❌ 请配置API密钥')
        }

        // 验证API端点格式
        try {
            new URL(apiEndpoint)
        } catch {
            throw new Error('❌ API端点格式不正确，请输入有效的URL')
        }

        // 检测API提供商
        const provider = this.detectAPIProvider(apiEndpoint)

        // 构建完整的请求URL
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)

        // 构建请求体
        const requestBody = this.buildRequestBody(agent, message, conversationHistory, settings, provider)
        
        console.log(`[AI Service] 发送网络API请求:`, {
            provider,
            url: fullUrl,
            model: modelName,
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            requestBodyMessages: requestBody.messages ? requestBody.messages.length : 'N/A'
        });

        // 构建请求头
        const headers = this.buildRequestHeaders(apiKey, provider)

        console.log(`🔍 发送请求到: ${fullUrl}`)

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',                headers: headers,
                body: JSON.stringify(requestBody)
            })

            console.log(`📡 响应状态: ${response.status} ${response.statusText}`)

            if (!response.ok) {
                const errorInfo = await this.parseErrorResponse(response, provider)
                throw new Error(errorInfo)
            }

            const data = await response.json()
            console.log(`✅ 响应数据:`, data)

            // 解析响应内容
            const content = this.parseResponseContent(data, provider)

            if (!content) {
                throw new Error('❌ 无法解析API响应内容，请检查API配置和响应格式')
            }

            return content

        } catch (error) {
            console.error('💥 网络API调用失败:', error)

            // 提供更友好的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('🌐 网络连接失败，请检查：\n• API端点是否正确\n• 网络连接是否正常\n• 是否遇到CORS限制')
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('🌐 网络请求失败，可能原因：\n• API端点无法访问\n• 网络连接问题\n• 服务器暂时不可用')
            }

            throw error
        }
    }

    // 检测API提供商
    detectAPIProvider(apiEndpoint) {
        const endpoint = apiEndpoint.toLowerCase()

        if (endpoint.includes('openai.com')) {
            return 'openai'
        } else if (endpoint.includes('deepseek.com')) {
            return 'deepseek'
        } else if (endpoint.includes('anthropic.com')) {
            return 'anthropic'
        } else if (endpoint.includes('azure.com') || endpoint.includes('openai.azure.com')) {
            return 'azure'
        } else if (endpoint.includes('googleapis.com') || endpoint.includes('generativelanguage.googleapis.com')) {
            return 'google'
        } else if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
            return 'local'
        } else {
            return 'custom'
        }
    }

    // 构建请求URL
    buildRequestUrl(apiEndpoint, provider) {
        if (provider === 'custom') {
            return apiEndpoint
        }

        const providerConfig = this.apiProviders[provider]
        if (!providerConfig) {
            return apiEndpoint
        }

        // 如果用户提供了完整的端点，直接使用
        if (apiEndpoint.includes(providerConfig.chatEndpoint)) {
            return apiEndpoint
        }

        // 否则构建完整URL
        return apiEndpoint.endsWith('/')
            ? `${apiEndpoint}${providerConfig.chatEndpoint.substring(1)}`
            : `${apiEndpoint}${providerConfig.chatEndpoint}`
    }

    // 构建请求体
    buildRequestBody(agent, message, conversationHistory, settings, provider) {
        const { modelName, temperature, maxTokens } = settings
        const messages = this.buildMessages(agent, message, conversationHistory, settings)

        // 确保数值参数为数字类型
        const tempValue = Number(temperature) || 0.7
        const maxTokensValue = Number(maxTokens) || 1000

        // 基础请求体
        let requestBody = {
            model: modelName,
            messages: messages,
            temperature: tempValue,
            max_tokens: maxTokensValue,
            stream: false
        }

        // 提供商特定配置
        switch (provider) {
            case 'anthropic':
                requestBody = {
                    model: modelName,
                    messages: messages,
                    max_tokens: maxTokensValue,
                    temperature: tempValue
                }
                break

            case 'google':
                requestBody = {
                    contents: messages.map(msg => ({
                        parts: [{ text: msg.content }],
                        role: msg.role === 'user' ? 'user' : 'model'
                    }))
                }
                break

            case 'azure':
                // Azure使用api-version参数
                requestBody.api_version = '2023-12-01-preview'
                break
        }

        return requestBody
    }

    // 构建请求头
    buildRequestHeaders(apiKey, provider) {
        const headers = {
            'Content-Type': 'application/json'
        }

        const providerConfig = this.apiProviders[provider]
        if (providerConfig && apiKey) {
            headers[providerConfig.authHeader === 'x-api-key' ? 'x-api-key' : 'Authorization'] =
                providerConfig.authHeader === 'x-api-key' ? apiKey : `${providerConfig.authHeader} ${apiKey}`
        }

        // 特殊头部
        switch (provider) {
            case 'anthropic':
                headers['anthropic-version'] = '2023-06-01'
                break
        }

        return headers
    }

    // 解析错误响应
    async parseErrorResponse(response, provider) {
        let errorMessage = `❌ API请求失败: ${response.status} ${response.statusText}`

        try {
            const errorData = await response.json()
            console.log('🔍 错误响应数据:', errorData)

            if (errorData.error && errorData.error.message) {
                errorMessage = `❌ ${errorData.error.message}`
            } else if (errorData.message) {
                errorMessage = `❌ ${errorData.message}`
            } else if (errorData.detail) {
                errorMessage = `❌ ${errorData.detail}`
            }

            // 常见错误代码处理
            if (response.status === 401) {
                errorMessage += '\n🔑 认证失败，请检查API密钥是否正确'
            } else if (response.status === 403) {
                errorMessage += '\n🚫 权限不足，请检查API密钥权限'
            } else if (response.status === 404) {
                errorMessage += '\n🔍 资源未找到，请检查API端点是否正确'
            } else if (response.status === 429) {
                errorMessage += '\n⏰ 请求频率超限，请稍后重试'
            } else if (response.status >= 500) {
                errorMessage += '\n🔧 服务器内部错误，请稍后重试'
            }

        } catch {
            // 如果无法解析错误响应，使用默认错误信息
            console.warn('⚠️ 无法解析错误响应')
        }

        return errorMessage
    }

    // 解析流式响应内容
    parseStreamResponseContent(data, provider) {
        // 兼容不同API提供商的流式响应格式
        switch (provider) {
            case 'openai':
            case 'deepseek':
            case 'azure':
            case 'local':
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                    return data.choices[0].delta.content
                }
                break

            case 'anthropic':
                if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                    return data.delta.text
                }
                break

            case 'google':
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text
                }
                break

            case 'custom':
                // 尝试多种常见格式
                if (data.choices?.[0]?.delta?.content) {
                    return data.choices[0].delta.content
                } else if (data.delta?.content) {
                    return data.delta.content
                } else if (data.content) {
                    return data.content
                }
                break
        }

        return null
    }

    // 解析响应内容
    parseResponseContent(data, provider) {
        console.log('🔍 解析响应数据:', data)

        // 兼容不同API提供商的响应格式
        switch (provider) {
            case 'openai':
            case 'deepseek':
            case 'azure':
            case 'local':
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content
                }
                break

            case 'anthropic':
                if (data.content && data.content[0] && data.content[0].text) {
                    return data.content[0].text
                }
                break

            case 'google':
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text
                }
                break

            case 'custom':
                // 尝试多种常见格式
                if (data.choices?.[0]?.message?.content) {
                    return data.choices[0].message.content
                } else if (data.content) {
                    return data.content
                } else if (data.result) {
                    return data.result
                } else if (data.text) {
                    return data.text
                }
                break
        }

        console.warn('⚠️ 未知的API响应格式:', data)
        return null
    }

    // 获取支持的模型列表
    getSupportedModels(apiEndpoint) {
        const provider = this.detectAPIProvider(apiEndpoint)
        const providerConfig = this.apiProviders[provider]

        if (providerConfig) {
            return providerConfig.models
        }

        // 对于自定义端点，返回通用模型列表
        return [
            'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
            'deepseek-chat', 'deepseek-coder',
            'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
            'gemini-pro', 'custom-model'
        ]
    }

    // 获取API提供商信息
    getAPIProviderInfo(apiEndpoint) {
        const provider = this.detectAPIProvider(apiEndpoint)
        return this.apiProviders[provider] || {
            name: '自定义API',
            models: ['custom-model']
        }
    }

    // 本地模型流式调用 - 优化版本
    async sendToLocalModelStream(agent, message, conversationHistory, settings, onProgress) {
        const messages = this.buildMessages(agent, message, conversationHistory, settings)

        console.log(`[AI Service] 发送流式本地模型请求:`, {
            model: 'local-model',
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            messagesUsed: messages.length
        });

        // 基于智能体配置生成回复
        const context = agent.prompt || ''
        const scenario = agent.scenario || ''
        const keyPoints = agent.keyPoints || ''

        let fullResponse = ''

        if (context.includes('助手') || context.includes('assistant')) {
            fullResponse = this.generateHelpfulResponse(message, context)
        } else if (context.includes('朋友') || context.includes('friend')) {
            fullResponse = this.generateFriendlyResponse(message, context)
        } else if (context.includes('专家') || context.includes('expert')) {
            fullResponse = this.generateExpertResponse(message, context)
        } else {
            fullResponse = this.generateDefaultResponse(message, context)
        }

        // 添加场景和要点信息
        if (scenario) {
            fullResponse = `[场景: ${scenario}] ${fullResponse}`
        }

        if (keyPoints) {
            fullResponse += `\n\n[要点提醒: ${keyPoints}]`
        }

        // 优化的流式输出 - 使用字符级输出，但减少更新频率
        let currentText = ''
        const chars = fullResponse.split('')
        let lastUpdateTime = 0
        const UPDATE_INTERVAL = 50 // 最小更新间隔(ms)

        for (let i = 0; i < chars.length; i++) {
            currentText += chars[i]

            // 使用节流控制更新频率
            const now = Date.now()
            if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                onProgress(currentText)
                lastUpdateTime = now
            }

            // 模拟网络延迟，但使用更合理的延迟时间
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 30))
        }

        // 确保最终文本完整显示
        if (currentText !== fullResponse) {
            onProgress(fullResponse)
        }

        return fullResponse
    }

    // 本地模型调用（模拟实现）
    async sendToLocalModel(agent, message, conversationHistory, settings) {
        const messages = this.buildMessages(agent, message, conversationHistory, settings)
        
        console.log(`[AI Service] 发送本地模型请求:`, {
            model: 'local-model',
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            messagesUsed: messages.length
        });

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

        // 基于智能体配置生成回复
        const context = agent.prompt || ''
        const scenario = agent.scenario || ''
        const keyPoints = agent.keyPoints || ''

        let response = ''

        if (context.includes('助手') || context.includes('assistant')) {
            response = this.generateHelpfulResponse(message, context)
        } else if (context.includes('朋友') || context.includes('friend')) {
            response = this.generateFriendlyResponse(message, context)
        } else if (context.includes('专家') || context.includes('expert')) {
            response = this.generateExpertResponse(message, context)
        } else {
            response = this.generateDefaultResponse(message, context)
        }

        // 添加场景和要点信息
        if (scenario) {
            response = `[场景: ${scenario}] ${response}`
        }

        if (keyPoints) {
            response += `\n\n[要点提醒: ${keyPoints}]`
        }

        return response
    }

    // 构建消息数组
    buildMessages(agent, currentMessage, conversationHistory, settings = null) {
        // 获取上下文长度限制，如果没有提供settings则使用默认值50
        const maxHistoryLength = settings && settings.contextLength ? settings.contextLength : 50
        
        // 限制对话历史长度，只取最近的消息
        const recentHistory = conversationHistory.slice(-maxHistoryLength)

        // 调试输出：显示截断前后的历史消息数量
        if (conversationHistory.length > maxHistoryLength) {
            console.log(`[AI Service] 消息历史已截断: ${conversationHistory.length} -> ${recentHistory.length} 条消息 (限制: ${maxHistoryLength})`);
        } else {
            console.log(`[AI Service] 消息历史未截断: ${conversationHistory.length} 条消息 (限制: ${maxHistoryLength})`);
        }

        const messages = []

        // 系统提示词
        if (agent.prompt) {
            messages.push({
                role: 'system',
                content: agent.prompt
            })
        }

        // 对话历史
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            })
        })

        // 当前消息
        messages.push({
            role: 'user',
            content: currentMessage
        })

        // 调试输出：显示构建的总消息数量
        console.log(`[AI Service] 构建的消息总数: ${messages.length} (系统消息: ${agent.prompt ? 1 : 0}, 历史消息: ${recentHistory.length}, 当前消息: 1)`);
        
        return messages
    }

    // 模拟回复生成函数
    generateHelpfulResponse(message, context) {
        const responses = [
            `我理解您的需求。${message} 这个问题可以从多个角度来分析。首先，我们需要考虑...`,
            `感谢您的提问。关于"${message}"，我的建议是...`,
            `这是一个很好的问题。让我为您详细解释一下${message}的相关内容...`,
            `我注意到您提到${message}。根据我的知识，这里有几个要点需要关注...`
        ]
        return responses[Math.floor(Math.random() * responses.length)]
    }

    generateFriendlyResponse(message, context) {
        const responses = [
            `哈哈，${message} 这个话题很有意思！我觉得...`,
            `朋友，关于${message}，我的看法是...`,
            `哇，${message} 这个话题我们得好好聊聊！`,
            `嘿，${message} 这个问题问得好！让我想想...`
        ]
        return responses[Math.floor(Math.random() * responses.length)]
    }

    generateExpertResponse(message, context) {
        const responses = [
            `从专业角度来看，${message} 涉及以下几个关键因素...`,
            `根据行业标准，${message} 的最佳实践是...`,
            `在专业领域内，${message} 通常遵循这样的原则...`,
            `作为专家，我认为${message} 的核心问题在于...`
        ]
        return responses[Math.floor(Math.random() * responses.length)]
    }

    generateDefaultResponse(message, context) {
        const responses = [
            `我收到了您的消息：${message}。让我思考一下如何回复...`,
            `关于"${message}"，我的想法是...`,
            `感谢您的消息。${message} 这个话题值得探讨...`,
            `我理解您说的是${message}。从我的角度来看...`
        ]
        return responses[Math.floor(Math.random() * responses.length)]
    }

    // 流式响应（可选功能）
    async *sendMessageStream(agent, message, conversationHistory = []) {
        const fullResponse = await this.sendMessage(agent, message, conversationHistory)

        // 模拟流式输出
        const words = fullResponse.split(' ')
        for (let i = 0; i < words.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
            yield words.slice(0, i + 1).join(' ')
        }
    }

    // 逐字输出 - 优化版本
    async outputWordByWord(response, onProgress, settings, thinkingTime) {
        let currentText = ''
        const chars = response.split('')
        let lastUpdateTime = 0
        const UPDATE_INTERVAL = 50 // 最小更新间隔(ms)
        let animationFrameId = null

        for (let i = 0; i < chars.length; i++) {
            currentText += chars[i]

            // 使用节流控制更新频率
            const now = Date.now()
            if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                // 使用 requestAnimationFrame 进行批量更新
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId)
                }

                animationFrameId = requestAnimationFrame(() => {
                    if (onProgress) {
                        const progressText = this.addResponseMetadata(currentText, settings, thinkingTime, true)
                        onProgress(progressText)
                    }
                })

                lastUpdateTime = now
            }

            // 模拟打字速度
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 30))
        }

        // 确保最终文本完整显示
        if (currentText !== response) {
            requestAnimationFrame(() => {
                if (onProgress) {
                    const progressText = this.addResponseMetadata(response, settings, thinkingTime, true)
                    onProgress(progressText)
                }
            })
        }

        return this.addResponseMetadata(response, settings, thinkingTime)
    }

    // 添加响应元数据
    addResponseMetadata(response, settings, thinkingTime, isPartial = false) {
        // 计算令牌数（简单估算：1个汉字≈2个token，1个英文单词≈1.3个token）
        const chineseChars = (response.match(/[\u4e00-\u9fa5]/g) || []).length
        const englishWords = (response.match(/\b[a-zA-Z]+\b/g) || []).length
        const otherChars = response.length - chineseChars - englishWords
        const estimatedTokens = Math.round(chineseChars * 2 + englishWords * 1.3 + otherChars * 0.5)

        // 创建元数据对象
        const metadata = {
            response: response,
            tokens: settings.showTokens && !isPartial ? estimatedTokens : null,
            thinkingTime: settings.showThinkingTime && !isPartial ? thinkingTime : null
        }

        return metadata
    }

    // 格式化思考时间
    formatThinkingTime(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`
        } else if (milliseconds < 60000) {
            return `${(milliseconds / 1000).toFixed(1)}s`
        } else {
            const minutes = Math.floor(milliseconds / 60000)
            const seconds = Math.floor((milliseconds % 60000) / 1000)
            return `${minutes}m ${seconds}s`
        }
    }

    // 生成推荐回复 - 支持并发请求
    async generateSuggestedReplies(agent, conversationHistory, settings) {
        const requestId = this.generateRequestId()

        return new Promise((resolve, reject) => {
            const request = {
                id: requestId,
                agent,
                conversationHistory,
                settings,
                resolve,
                reject,
                timestamp: Date.now(),
                type: 'suggestions'
            }

            this.requestQueue.push(request)
            this.processSuggestionQueue()
        })
    }

    // 处理推荐回复请求队列
    async processSuggestionQueue() {
        // 如果已达到最大并发数或队列为空，则返回
        if (this.activeRequests.size >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return
        }

        // 从队列中取出下一个推荐回复请求
        const suggestionRequest = this.requestQueue.find(req => req.type === 'suggestions')
        if (!suggestionRequest) {
            return
        }

        // 从队列中移除该请求
        const queueIndex = this.requestQueue.indexOf(suggestionRequest)
        this.requestQueue.splice(queueIndex, 1)
        this.activeRequests.set(suggestionRequest.id, suggestionRequest)

        try {
            // 构建推荐回复的提示词
            const suggestionPrompt = this.buildSuggestionPrompt(suggestionRequest.agent, suggestionRequest.conversationHistory)

            let suggestions
            if (suggestionRequest.settings.apiType === 'network') {
                suggestions = await this.generateNetworkSuggestions(suggestionPrompt, suggestionRequest.settings)
            } else {
                suggestions = await this.generateLocalSuggestions(suggestionPrompt, suggestionRequest.agent)
            }

            suggestionRequest.resolve(suggestions)
        } catch (error) {
            suggestionRequest.reject(error)
        } finally {
            this.activeRequests.delete(suggestionRequest.id)
            // 继续处理队列中的下一个请求
            this.processSuggestionQueue()
        }
    }

    // 构建推荐回复提示词
    buildSuggestionPrompt(agent, conversationHistory) {
        const lastUserMessage = conversationHistory
            .filter(msg => msg.role === 'assistant')
            .pop()

        const lastMessage = lastUserMessage ? lastUserMessage.content : '开始对话'
        const agentContext = agent.prompt || ''
        const agentScenario = agent.scenario || ''

        return `请基于以下对话上下文，为用户生成4个不同的推荐回复选项。

对话上下文：
- 智能体角色：${agentContext}
- 智能体最后消息："${lastMessage}"

要求：
1. 生成4个不同的回复选项，从用户的视角出发
2. 每个回复应该简洁明了，适合作为快速回复
3. 回复应该符合智能体的角色设定，但要以用户的口吻表达
4. 回复应该与对话上下文相关
5. 使用中文回复
6. 不要添加任何额外的说明或格式

请直接返回4个回复选项，每个选项用换行分隔，不要使用数字或项目符号。`
    }

    // 网络API生成推荐回复
    async generateNetworkSuggestions(suggestionPrompt, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: suggestionPrompt
                }
            ],
            temperature: 0.8, // 稍高的温度以获得多样性
            max_tokens: 200
        }

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`)
            }

            const data = await response.json()
            const content = this.parseResponseContent(data, provider)

            if (!content) {
                throw new Error('无法解析推荐回复')
            }

            return this.parseSuggestedReplies(content)
        } catch (error) {
            console.error('生成推荐回复失败:', error)
            throw error
        }
    }

    // 本地模型生成推荐回复
    async generateLocalSuggestions(suggestionPrompt, agent) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))

        const context = agent.prompt || ''
        const scenario = agent.scenario || ''

        // 基于智能体类型生成不同的推荐回复 - 从用户视角出发
        let suggestions = []

        if (context.includes('助手') || context.includes('assistant')) {
            suggestions = [
                '请帮我详细解释一下这个问题',
                '我想了解一些实用的建议',
                '这个问题可以从哪些角度分析？',
                '我需要更多的信息来理解这个问题'
            ]
        } else if (context.includes('朋友') || context.includes('friend')) {
            suggestions = [
                '哈哈，这个话题真有意思！',
                '朋友，我也有类似的想法',
                '哇，我们继续聊这个话题吧！',
                '嘿，这个问题我也很好奇'
            ]
        } else if (context.includes('专家') || context.includes('expert')) {
            suggestions = [
                '我想了解这个问题的专业观点',
                '请问这个领域的最佳实践是什么？',
                '从专业角度应该怎么看待这个问题？',
                '我想知道这个问题的核心要点'
            ]
        } else {
            suggestions = [
                '我明白了，让我想想',
                '谢谢分享，我的想法是...',
                '这个话题很有意思，继续说吧',
                '我收到了，让我回复一下'
            ]
        }

        // 添加场景相关的回复
        if (scenario) {
            suggestions = suggestions.map(suggestion =>
                `${suggestion} [${scenario}]`
            )
        }

        return suggestions
    }

    // 解析推荐回复
    parseSuggestedReplies(content) {
        // 按换行分割并清理
        const replies = content
            .split('\n')
            .map(reply => reply.trim())
            .filter(reply => reply.length > 0 && !reply.startsWith('回复') && !reply.match(/^\d+\./))

        // 如果解析出的回复少于4个，使用默认回复 - 从用户视角出发
        if (replies.length < 4) {
            const defaultReplies = [
                '我明白了',
                '谢谢分享',
                '这个话题很有意思',
                '让我想想'
            ]
            return defaultReplies.slice(0, 4)
        }

        return replies.slice(0, 4)
    }
}