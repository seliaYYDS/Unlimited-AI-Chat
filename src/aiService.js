// AI模型服务兼容层 - 增强版本
import { toolRegistry } from './utils/toolRegistry.js'

export class AIService {
    constructor(storageManager) {
        this.storageManager = storageManager
        this.requestQueue = []
        this.activeRequests = new Map()
        this.maxConcurrentRequests = 3 // 最大并发请求数
        this.toolRegistry = toolRegistry

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
                recommendedModels: ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
                authHeader: 'Bearer',
                defaultModel: 'gpt-3.5-turbo',
                supportsCustomModel: true
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1',
                chatEndpoint: '/chat/completions',
                models: ['deepseek-chat', 'deepseek-reasoner'],
                recommendedModels: ['deepseek-chat'],
                authHeader: 'Bearer',
                defaultModel: 'deepseek-chat',
                supportsCustomModel: true
            },
            anthropic: {
                name: 'Anthropic',
                baseUrl: 'https://api.anthropic.com/v1',
                chatEndpoint: '/messages',
                models: [
                    'claude-3-haiku-20240307',
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-haiku-20241022',
                    'claude-3-opus-20240229',
                    'claude-3-sonnet-20240229'
                ],
                recommendedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
                authHeader: 'x-api-key',
                defaultModel: 'claude-3-5-sonnet-20241022',
                supportsCustomModel: true
            },
            azure: {
                name: 'Azure OpenAI',
                baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
                chatEndpoint: '/chat/completions',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-35-turbo'],
                recommendedModels: ['gpt-4o', 'gpt-4o-mini'],
                authHeader: 'api-key',
                defaultModel: 'gpt-4o',
                supportsCustomModel: true
            },
            google: {
                name: 'Google Gemini',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                chatEndpoint: '/models/{model}:generateContent',
                models: [
                    'gemini-1.5-pro',
                    'gemini-1.5-flash',
                    'gemini-pro',
                    'gemini-pro-vision'
                ],
                recommendedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
                authHeader: 'x-goog-api-key',
                defaultModel: 'gemini-1.5-pro',
                supportsCustomModel: true
            },
            siliconflow: {
                name: '硅基流动',
                baseUrl: 'https://api.siliconflow.cn/v1',
                chatEndpoint: '/chat/completions',
                models: [
                    // Qwen 系列
                    'Qwen/Qwen2.5-7B-Instruct',
                    'Qwen/Qwen2.5-14B-Instruct',
                    'Qwen/Qwen2.5-32B-Instruct',
                    'Qwen/Qwen2.5-72B-Instruct',
                    'Qwen/Qwen2.5-72B-Instruct-128K',
                    'Qwen/Qwen2-7B-Instruct',
                    'Qwen/Qwen3-8B',
                    'Qwen/Qwen3-14B',
                    'Qwen/Qwen3-30B-A3B',
                    'Qwen/Qwen3-32B',
                    'Qwen/Qwen3-235B-A22B',
                    'Qwen/Qwen3-30B-A3B-Instruct-2507',
                    'Qwen/Qwen3-235B-A22B-Instruct-2507',
                    'Qwen/Qwen3-235B-A22B-Thinking-2507',
                    'Qwen/Qwen3-30B-A3B-Thinking-2507',
                    'Qwen/Qwen3-Next-80B-A3B-Instruct',
                    'Qwen/Qwen3-Next-80B-A3B-Thinking',
                    'Qwen/Qwen3-Coder-30B-A3B-Instruct',
                    'Qwen/Qwen3-Coder-480B-A35B-Instruct',
                    'Qwen/Qwen2.5-Coder-7B-Instruct',
                    'Qwen/Qwen2.5-Coder-32B-Instruct',
                    'Qwen/QwQ-32B',
                    'Qwen/QVQ-72B-Preview',
                    'Tongyi-Zhiwen/QwenLong-L1-32B',
                    
                    // DeepSeek 系列
                    'deepseek-ai/DeepSeek-V3',
                    'deepseek-ai/DeepSeek-V2.5',
                    'deepseek-ai/DeepSeek-V3.1-Terminus',
                    'deepseek-ai/DeepSeek-V3.2',
                    'deepseek-ai/DeepSeek-R1',
                    'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
                    'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
                    'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
                    'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
                    
                    // GLM 系列
                    'THUDM/glm-4-9b-chat',
                    'THUDM/GLM-4-9b-0414',
                    'THUDM/GLM-4-32B-0414',
                    'THUDM/GLM-4.1V-9B-Thinking',
                    'THUDM/GLM-Z1-9B-0414',
                    'THUDM/GLM-Z1-32B-0414',
                    'THUDM/GLM-Z1-Rumination-32B-0414',
                    'zai-org/GLM-4.5',
                    'zai-org/GLM-4.5-Air',
                    'zai-org/GLM-4.5V',
                    'zai-org/GLM-4.6',
                    'zai-org/GLM-4.6V',
                    
                    // ERNIE 系列
                    'baidu/ERNIE-4.5-21B-A3B-Paddle',
                    'baidu/ERNIE-4.5-300B-A47B',
                    'baidu/ERNIE-4.5-VL-28B-A3B-Paddle',
                    'baidu/ERNIE-4.5-VL-424B-A47B-Paddle',
                    
                    // Kimi 系列
                    'moonshotai/Kimi-Dev-72B',
                    'moonshotai/Kimi-K2-Instruct-0905',
                    'moonshotai/Kimi-K2-Thinking',
                    
                    // MiniMax 系列
                    'MiniMaxAI/MiniMax-M1-80k',
                    'MiniMaxAI/MiniMax-M2',
                    
                    // 其他 LLM 模型
                    'ascend-tribe/pangu-pro-moe',
                    'stepfun-ai/step3',
                    'internlm/internlm2_5-7b-chat',
                    'ByteDance-Seed/Seed-OSS-36B-Instruct',
                    'SeedLLM/Seed-Rice-7B',
                    'tencent/Hunyuan-A13B-Instruct',
                    'tencent/Hunyuan-MT-7B',
                    'inclusionAI/Ling-mini-2.0',
                    'inclusionAI/Ling-flash-2.0',
                    'inclusionAI/Ring-flash-2.0',
                    'Kwaipilot/KAT-Dev'
                ],
                recommendedModels: [
                    'Qwen/Qwen2.5-7B-Instruct', // 推荐：轻量级，速度快
                    'Qwen/Qwen2.5-72B-Instruct', // 推荐：性能均衡
                    'deepseek-ai/DeepSeek-V3', // 推荐：最新版本，性能优秀
                    'deepseek-ai/DeepSeek-R1', // 推荐：推理能力强
                    'THUDM/glm-4-9b-chat', // 推荐：轻量级，中文优秀
                    'moonshotai/Kimi-Dev-72B' // 推荐：长文本能力强
                ],
                authHeader: 'Bearer',
                defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
                supportsCustomModel: true
            },
            local: {
                name: '本地部署',
                baseUrl: 'http://localhost:8080/v1',
                chatEndpoint: '/chat/completions',
                models: ['local-model'],
                authHeader: 'Bearer',
                defaultModel: 'local-model',
                supportsCustomModel: true
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

            console.log(`[AI Service] 开始处理请求 - 智能体: ${request.agent.name}, ID: ${request.agent.id}`)

            // 获取智能体记忆并添加到对话历史中
            let enhancedConversationHistory = [...request.conversationHistory]
            
            // 获取智能体记忆
            const agentMemory = this.storageManager.getAgentMemory(request.agent.id)
            console.log(`[AI Service] 获取智能体记忆:`, {
                agentId: request.agent.id,
                hasMemory: !!agentMemory,
                memoryLength: agentMemory?.content?.length || 0,
                conversationHistoryLength: enhancedConversationHistory.length
            })

            // 检查对话历史中是否已经包含记忆系统消息
            const hasMemoryMessage = enhancedConversationHistory.some(
                msg => msg.role === 'system' && msg.content && msg.content.includes('智能体记忆')
            )
            console.log(`[AI Service] 对话历史中是否已包含记忆消息:`, hasMemoryMessage)

            // 如果智能体有记忆且对话历史中还没有记忆消息，则注入记忆
            if (agentMemory && agentMemory.content && agentMemory.content.trim() && !hasMemoryMessage) {
                const memorySystemMessage = {
                    role: 'system',
                    content: `智能体记忆（用于提供上下文信息）:\n${agentMemory.content}\n\n请基于以上记忆内容与用户进行自然的对话，不要明确提及这些记忆信息。`
                }
                enhancedConversationHistory.unshift(memorySystemMessage)
                console.log(`[AI Service] 已注入智能体记忆到对话历史开头`, {
                    memoryContentLength: agentMemory.content.length,
                    newHistoryLength: enhancedConversationHistory.length
                })
            } else if (hasMemoryMessage) {
                console.log(`[AI Service] 对话历史中已存在记忆消息，跳过注入`)
            } else if (!agentMemory || !agentMemory.content) {
                console.log(`[AI Service] 智能体无记忆内容，跳过注入`)
            }

            // 合并设置：智能体级别的设置优先于全局设置
            const mergedSettings = this.mergeAgentSettings(settings, request.agent)
            console.log(`[AI Service] 使用设置:`, {
                hasCustomApi: !!request.agent.useCustomApi,
                apiType: mergedSettings.apiType,
                apiEndpoint: mergedSettings.apiEndpoint ? '已配置' : '未配置',
                modelName: mergedSettings.modelName
            })

            let response
            if (mergedSettings.apiType === 'network') {
                if (mergedSettings.wordByWordOutput && request.onProgress) {
                    // 流式输出模式
                    response = await this.sendToNetworkAPIStream(request.agent, request.message, enhancedConversationHistory, mergedSettings, request.onProgress)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, mergedSettings, thinkingTime)
                } else {
                    // 普通模式
                    response = await this.sendToNetworkAPI(request.agent, request.message, enhancedConversationHistory, mergedSettings)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, mergedSettings, thinkingTime)
                }
            } else {
                if (mergedSettings.wordByWordOutput && request.onProgress) {
                    // 本地模型的流式输出
                    response = await this.sendToLocalModelStream(request.agent, request.message, enhancedConversationHistory, mergedSettings, request.onProgress)
                    thinkingTime = Date.now() - startTime
                    response = this.addResponseMetadata(response, mergedSettings, thinkingTime)
                } else {
                    // 普通模式
                    response = await this.sendToLocalModel(request.agent, request.message, enhancedConversationHistory, mergedSettings)
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
            throw new Error('请配置API端点')
        }

        if (!apiKey) {
            throw new Error('请配置API密钥')
        }

        // 检测API提供商
        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)

        // 检查是否需要启用工具调用
        const enableTools = agent.skills && agent.skills.includes('webSearch')
        console.log(`[AI Service] 流式请求 - 工具调用检查:`, {
            agentName: agent.name,
            hasSkills: !!agent.skills,
            skills: agent.skills,
            enableTools
        })

        // 构建请求体，启用流式输出
        const requestBody = this.buildRequestBody(agent, message, conversationHistory, settings, provider, enableTools)
        requestBody.stream = true

        console.log(`[AI Service] 发送流式网络API请求:`, {
            provider,
            url: fullUrl,
            model: modelName,
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            requestBodyMessages: requestBody.messages ? requestBody.messages.length : 'N/A',
            enableTools,
            hasTools: !!requestBody.tools,
            toolsCount: requestBody.tools ? requestBody.tools.length : 0
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

            // 处理流式响应 - 使用动态长度控制
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullResponse = ''
            let fullReasoning = ''
            let buffer = ''
            let chunkCount = 0
            // 根据 maxTokens 计算最大响应长度（估算：1 token ≈ 4 字符）
            const MAX_RESPONSE_LENGTH = (maxTokens || 2000) * 4
            const MAX_CHUNKS = 10000 // 大幅增加 chunk 数量限制

            console.log(`[AI Service] 流式输出长度控制:`, {
                maxTokens,
                MAX_RESPONSE_LENGTH,
                MAX_CHUNKS
            })

            let lastUpdateTime = 0
            const UPDATE_INTERVAL = 50 // 最小更新间隔(ms)

            // 用于收集令牌数信息
            let totalTokens = null

            // 用于收集工具调用信息
            let toolCallsBuffer = null
            let hasToolCalls = false

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

                            // 提取令牌数信息（硅基流动在每个chunk中都提供）
                            if (data.usage && data.usage.total_tokens) {
                                totalTokens = data.usage.total_tokens
                            }

                            // 检查是否有工具调用
                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                const delta = data.choices[0].delta

                                // 检查tool_calls
                                if (delta.tool_calls) {
                                    console.log(`[AI Service] 流式响应中检测到工具调用:`, delta.tool_calls)
                                    hasToolCalls = true

                                    if (!toolCallsBuffer) {
                                        toolCallsBuffer = []
                                    }

                                    // 处理工具调用数据
                                    delta.tool_calls.forEach((tc, index) => {
                                        if (!toolCallsBuffer[index]) {
                                            toolCallsBuffer[index] = {
                                                id: tc.id,
                                                type: tc.type,
                                                function: {
                                                    name: tc.function?.name || '',
                                                    arguments: tc.function?.arguments || ''
                                                }
                                            }
                                        } else {
                                            // 追加参数
                                            if (tc.function?.arguments) {
                                                toolCallsBuffer[index].function.arguments += tc.function.arguments
                                            }
                                        }
                                    })
                                }
                            }

                            const parsed = this.parseStreamResponseContent(data, provider)
                            if (parsed) {
                                // 处理内容
                                if (parsed.content && fullResponse.length < MAX_RESPONSE_LENGTH) {
                                    fullResponse += parsed.content
                                }
                                // 处理思考内容（限制为总长度的 30%）
                                const MAX_REASONING_LENGTH = Math.floor(MAX_RESPONSE_LENGTH * 0.3)
                                if (parsed.reasoning_content && fullReasoning.length < MAX_REASONING_LENGTH) {
                                    fullReasoning += parsed.reasoning_content
                                }

                                // 使用节流控制更新频率
                                const now = Date.now()
                                if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                                    // 使用特殊标记分隔思考内容和普通内容
                                    const combinedResponse = fullReasoning ? 
                                        `__REASONING_START__${fullReasoning}__REASONING_END__${fullResponse}` : 
                                        fullResponse
                                    onProgress(combinedResponse)
                                    lastUpdateTime = now
                                }
                            }
                        } catch (e) {
                            console.warn(`[AI Service] 解析流式数据失败:`, e)
                        }
                    }
                }
            }

            // 如果检测到工具调用，处理工具调用
            if (hasToolCalls && toolCallsBuffer && toolCallsBuffer.length > 0) {
                console.log(`[AI Service] 流式响应完成，检测到 ${toolCallsBuffer.length} 个工具调用`)
                console.log(`[AI Service] 工具调用详情:`, toolCallsBuffer)

                // 构建完整的工具调用响应
                const toolCallsResponse = {
                    choices: [{
                        message: {
                            role: 'assistant',
                            content: fullResponse || null,
                            tool_calls: toolCallsBuffer
                        }
                    }]
                }

                return await this.handleToolCalls(agent, message, conversationHistory, settings, provider, toolCallsResponse)
            }

            // 确保最终文本完整显示
            const combinedResponse = fullReasoning ? 
                `__REASONING_START__${fullReasoning}__REASONING_END__${fullResponse}` : 
                fullResponse
            onProgress(combinedResponse)

            console.log(`[AI Service] 流式输出完成:`, {
                总chunk数: chunkCount,
                响应长度: fullResponse.length,
                思考内容长度: fullReasoning.length,
                总长度: combinedResponse.length,
                最大限制: MAX_RESPONSE_LENGTH,
                令牌数: totalTokens
            })

            // 返回响应和令牌数
            return {
                response: combinedResponse,
                tokens: totalTokens
            }

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
            throw new Error('请配置API端点')
        }

        if (!apiKey) {
            throw new Error('请配置API密钥')
        }

        // 验证API端点格式
        try {
            new URL(apiEndpoint)
        } catch {
            throw new Error('API端点格式不正确，请输入有效的URL')
        }

        // 检测API提供商
        const provider = this.detectAPIProvider(apiEndpoint)

        // 构建完整的请求URL
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)

        // 检查是否需要启用工具调用（智能体有网络搜索技能）
        const enableTools = agent.skills && agent.skills.includes('webSearch')

        // 构建请求体
        const requestBody = this.buildRequestBody(agent, message, conversationHistory, settings, provider, enableTools)

        console.log(`[AI Service] 发送网络API请求:`, {
            provider,
            url: fullUrl,
            model: modelName,
            messageLength: message.length,
            conversationHistoryLength: conversationHistory.length,
            requestBodyMessages: requestBody.messages ? requestBody.messages.length : 'N/A',
            enableTools,
            hasTools: !!requestBody.tools
        });

        // 构建请求头
        const headers = this.buildRequestHeaders(apiKey, provider)

        console.log(`🔍 发送请求到: ${fullUrl}`)

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            })

            console.log(`📡 响应状态: ${response.status} ${response.statusText}`)

            if (!response.ok) {
                const errorInfo = await this.parseErrorResponse(response, provider)
                throw new Error(errorInfo)
            }

            const data = await response.json()
            console.log(`✅ 响应数据:`, data)

            // 检查是否有工具调用
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.tool_calls) {
                console.log(`[AI Service] 检测到工具调用请求`)
                return await this.handleToolCalls(agent, message, conversationHistory, settings, provider, data)
            }

            // 解析响应内容
            const parsed = this.parseResponseContent(data, provider)

            if (!parsed) {
                throw new Error('无法解析API响应内容，请检查API配置和响应格式')
            }

            // 提取令牌数
            const tokens = data.usage ? data.usage.total_tokens : null

            // 使用特殊标记分隔思考内容和普通内容
            const combinedResponse = parsed.reasoning_content ? 
                `__REASONING_START__${parsed.reasoning_content}__REASONING_END__${parsed.content}` : 
                parsed.content

            // 返回响应和令牌数
            return {
                response: combinedResponse,
                tokens: tokens
            }

        } catch (error) {
            console.error('💥 网络API调用失败:', error)

            // 提供更友好的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查：\n• API端点是否正确\n• 网络连接是否正常\n• 是否遇到CORS限制')
            }

            if (error.message.includes('Failed to fetch')) {
                throw new Error('网络请求失败，可能原因：\n• API端点无法访问\n• 网络连接问题\n• 服务器暂时不可用')
            }

            throw error
        }
    }

    // 处理工具调用
    async handleToolCalls(agent, message, conversationHistory, settings, provider, responseData) {
        const toolCalls = responseData.choices[0].message.tool_calls
        console.log(`[AI Service] ========== 开始处理工具调用 ==========`)
        console.log(`[AI Service] 检测到 ${toolCalls.length} 个工具调用`)
        console.log(`[AI Service] 工具调用详情:`, JSON.stringify(toolCalls, null, 2))

        // 构建新的消息历史，包含工具调用请求
        const newConversationHistory = [
            ...conversationHistory,
            { role: 'user', content: message },
            responseData.choices[0].message
        ]

        console.log(`[AI Service] 新的消息历史长度: ${newConversationHistory.length}`)

        // 执行所有工具调用
        const toolResults = []
        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i]
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)

            console.log(`[AI Service] ---------- 执行工具 ${i + 1}/${toolCalls.length} ----------`)
            console.log(`[AI Service] 工具名称: ${functionName}`)
            console.log(`[AI Service] 工具参数:`, functionArgs)

            try {
                console.log(`[AI Service] 调用工具注册表执行工具...`)
                const result = await this.toolRegistry.executeTool(functionName, functionArgs)

                console.log(`[AI Service] 工具执行结果:`, result)
                console.log(`[AI Service] 工具执行成功: ${functionName}`)

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: functionName,
                    content: JSON.stringify(result)
                })
            } catch (error) {
                console.error(`[AI Service] 工具执行失败: ${functionName}`, error)
                console.error(`[AI Service] 错误详情:`, error.message, error.stack)

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: functionName,
                    content: JSON.stringify({ error: error.message })
                })
            }
        }

        console.log(`[AI Service] 所有工具执行完成，共 ${toolResults.length} 个结果`)
        console.log(`[AI Service] 工具结果:`, toolResults)

        // 将工具结果添加到消息历史
        const updatedConversationHistory = [
            ...newConversationHistory,
            ...toolResults
        ]

        console.log(`[AI Service] 更新后的消息历史长度: ${updatedConversationHistory.length}`)

        // 再次调用API，让模型基于工具结果生成最终回复
        console.log(`[AI Service] ========== 基于工具结果生成最终回复 ==========`)

        const { apiEndpoint, apiKey, modelName, temperature, maxTokens } = settings
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)

        console.log(`[AI Service] 请求URL: ${fullUrl}`)
        console.log(`[AI Service] 请求模型: ${modelName}`)

        const requestBody = this.buildRequestBody(agent, '', updatedConversationHistory, settings, provider, false)
        const headers = this.buildRequestHeaders(apiKey, provider)

        console.log(`[AI Service] 请求体:`, JSON.stringify(requestBody, null, 2))

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            })

            console.log(`[AI Service] 最终响应状态: ${response.status} ${response.statusText}`)

            if (!response.ok) {
                const errorInfo = await this.parseErrorResponse(response, provider)
                console.error(`[AI Service] 最终请求失败:`, errorInfo)
                throw new Error(errorInfo)
            }

            const data = await response.json()
            console.log(`[AI Service] 最终响应数据:`, data)

            const content = this.parseResponseContent(data, provider)
            console.log(`[AI Service] 解析后的内容:`, content)
            console.log(`[AI Service] ========== 工具调用流程完成 ==========`)

            return content
        } catch (error) {
            console.error(`[AI Service] 最终请求异常:`, error)
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
        } else if (endpoint.includes('siliconflow.cn')) {
            return 'siliconflow'
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

        buildRequestBody(agent, message, conversationHistory, settings, provider, enableTools = false) {

            const { modelName, temperature, maxTokens } = settings

    

            const messages = this.buildMessages(agent, message, conversationHistory, settings)

    

            // 确保数值参数为数字类型

            const tempValue = Number(temperature) || 0.7

            

            // 智能 maxTokens 调整机制

            let maxTokensValue = Number(maxTokens) || 2000

            

            // 获取模型的上下文窗口大小

            const modelContextWindow = this.getModelContextWindow(modelName)

            

            // 计算当前请求的实际 token 消耗

            let requestTokens = 0

            messages.forEach(msg => {

                requestTokens += this.estimateTokens(msg.content || '')

            })

            

            // 计算可用于输出的 token 预算（保留 30% 缓冲）

            const outputTokenBudget = Math.floor((modelContextWindow - requestTokens) * 0.7)

            

            // 如果用户设置的 maxTokens 超出模型的实际能力，自动调整

            if (maxTokensValue > outputTokenBudget) {

                console.log(`[AI Service] 智能调整 maxTokens:`, {

                    用户设置: maxTokensValue,

                    模型上下文窗口: modelContextWindow,

                    请求token数: requestTokens,

                    输出token预算: outputTokenBudget,

                    调整后: outputTokenBudget

                });

                maxTokensValue = outputTokenBudget

            }

            

            // 确保 maxTokens 不低于最小值 100

            

                        maxTokensValue = Math.max(100, maxTokensValue)

            

            

            

                        // 根据服务商限制 maxTokens 的最大值

            

                        const providerMaxTokensLimits = {

            

                            deepseek: 8192,

            

                            anthropic: 4096,

            

                            openai: 4096,

            

                            azure: 4096,

            

                            google: 8192

            

                        }

            

            

            

                        if (providerMaxTokensLimits[provider]) {

            

                            maxTokensValue = Math.min(maxTokensValue, providerMaxTokensLimits[provider])

            

                            console.log(`[AI Service] 应用服务商 maxTokens 限制:`, {

            

                                服务商: provider,

            

                                限制: providerMaxTokensLimits[provider],

            

                                最终值: maxTokensValue

            

                            })

            

                        }

    

            // 基础请求体

            let requestBody = {

                model: modelName,

                messages: messages,

                temperature: tempValue,

                max_tokens: maxTokensValue,

                stream: false

            }

        // 如果启用了工具且智能体有网络搜索技能，添加工具定义
        if (enableTools && agent.skills && agent.skills.includes('webSearch')) {
            const tools = this.toolRegistry.getOpenAITools()
            if (tools.length > 0) {
                requestBody.tools = tools
                requestBody.tool_choice = 'auto' // 让模型自动决定是否使用工具
            }
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
                // Anthropic也支持工具调用
                if (enableTools && agent.skills && agent.skills.includes('webSearch')) {
                    const tools = this.toolRegistry.getOpenAITools()
                    if (tools.length > 0) {
                        requestBody.tools = tools
                    }
                }
                break

            case 'google':
                requestBody = {
                    contents: messages.map(msg => ({
                        parts: [{ text: msg.content }],
                        role: msg.role === 'user' ? 'user' : 'model'
                    }))
                }
                // Gemini的函数调用格式不同
                if (enableTools && agent.skills && agent.skills.includes('webSearch')) {
                    requestBody.tools = this.toolRegistry.getAllTools().map(tool => ({
                        functionDeclarations: [{
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters
                        }]
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
        let errorMessage = `API请求失败: ${response.status} ${response.statusText}`

        try {
            const errorData = await response.json()
            console.log('🔍 错误响应数据:', errorData)

            if (errorData.error && errorData.error.message) {
                errorMessage = `${errorData.error.message}`
                        } else if (errorData.message) {
                            errorMessage = `${errorData.message}`
                        } else if (errorData.detail) {
                            errorMessage = `${errorData.detail}`            }

            // 常见错误代码处理
            if (response.status === 401) {
                errorMessage += '\n认证失败，请检查API密钥是否正确'
            } else if (response.status === 403) {
                errorMessage += '\n权限不足，请检查API密钥权限'
            } else if (response.status === 404) {
                errorMessage += '\n资源未找到，请检查API端点是否正确'
            } else if (response.status === 429) {
                errorMessage += '\n请求频率超限，请稍后重试'
            } else if (response.status >= 500) {
                errorMessage += '\n服务器内部错误，请稍后重试'
            }

        } catch {
            // 如果无法解析错误响应，使用默认错误信息
            console.warn('⚠️ 无法解析错误响应')
        }

        return errorMessage
    }

    // 解析流式响应内容
    parseStreamResponseContent(data, provider) {
        console.log('🔍 解析流式数据:', data)

        // 兼容不同API提供商的流式响应格式
        switch (provider) {
            case 'openai':
            case 'deepseek':
            case 'azure':
            case 'local':
            case 'siliconflow':
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                    const delta = data.choices[0].delta
                    // 返回包含内容和思考内容的对象
                    return {
                        content: delta.content || '',
                        reasoning_content: delta.reasoning_content || ''
                    }
                }
                break

            case 'anthropic':
                if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                    return {
                        content: data.delta.text,
                        reasoning_content: ''
                    }
                }
                break

            case 'google':
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return {
                        content: data.candidates[0].content.parts[0].text,
                        reasoning_content: ''
                    }
                }
                break

            case 'custom':
                // 尝试多种常见格式
                if (data.choices?.[0]?.delta) {
                    const delta = data.choices[0].delta
                    return {
                        content: delta.content || '',
                        reasoning_content: delta.reasoning_content || ''
                    }
                } else if (data.delta?.content) {
                    return {
                        content: data.delta.content,
                        reasoning_content: data.delta.reasoning_content || ''
                    }
                } else if (data.content) {
                    return {
                        content: data.content,
                        reasoning_content: ''
                    }
                }
                break
        }

        return {
            content: '',
            reasoning_content: ''
        }
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

                case 'siliconflow':

                    if (data.choices && data.choices[0] && data.choices[0].message) {

                        const message = data.choices[0].message

                        return {

                            content: message.content || '',

                            reasoning_content: message.reasoning_content || ''

                        }

                    }

                    break

    

                case 'anthropic':

                    if (data.content && data.content[0] && data.content[0].text) {

                        return {

                            content: data.content[0].text,

                            reasoning_content: ''

                        }

                    }

                    break

    

                case 'google':

                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {

                        return {

                            content: data.candidates[0].content.parts[0].text,

                            reasoning_content: ''

                        }

                    }

                    break

    

                case 'custom':

                    // 尝试多种常见格式

                    if (data.choices?.[0]?.message) {

                        const message = data.choices[0].message

                        return {

                            content: message.content || '',

                            reasoning_content: message.reasoning_content || ''

                        }

                    } else if (data.content) {

                        return {

                            content: data.content,

                            reasoning_content: ''

                        }

                    } else if (data.result) {

                        return {

                            content: data.result,

                            reasoning_content: ''

                        }

                    } else if (data.text) {

                        return {

                            content: data.text,

                            reasoning_content: ''

                        }

                    }

                    break

            }

    

            console.warn('⚠️ 未知的API响应格式:', data)

            return {

                content: '',

                reasoning_content: ''

            }

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
        
        // 获取最大输出 token 数，用于计算上下文预算
        const maxOutputTokens = settings && settings.maxTokens ? settings.maxTokens : 2000
        
        // 估算模型的上下文窗口大小（保守估计）
        // OpenAI GPT-4: 128K, GPT-3.5: 16K, DeepSeek: 128K, Claude: 200K
        const modelContextWindow = this.getModelContextWindow(settings?.modelName || 'gpt-3.5-turbo')
        
        // 计算可用的上下文 token 预算（保留 20% 缓冲）
        const contextBudget = Math.floor(modelContextWindow * 0.8) - maxOutputTokens
        
        // 估算系统提示词的 token 数
        const systemPromptTokens = agent.prompt ? this.estimateTokens(agent.prompt) : 0
        
        // 估算当前消息的 token 数
        const currentMessageTokens = this.estimateTokens(currentMessage)
        
        // 计算可用于历史消息的 token 预算
        const historyTokenBudget = contextBudget - systemPromptTokens - currentMessageTokens
        
        // 限制对话历史长度，只取最近的消息
        let recentHistory = conversationHistory.slice(-maxHistoryLength)
        
        // 如果历史消息的 token 数超出预算，进行智能截断
        let historyTokens = 0
        const truncatedHistory = []
        
        // 从最新的消息开始倒序遍历，确保保留最新的对话
        for (let i = recentHistory.length - 1; i >= 0; i--) {
            const msg = recentHistory[i]
            const msgTokens = this.estimateTokens(msg.content || '')
            
            // 如果添加这条消息会超出预算，跳过
            if (historyTokens + msgTokens > historyTokenBudget) {
                continue
            }
            
            truncatedHistory.unshift(msg)
            historyTokens += msgTokens
        }
        
        recentHistory = truncatedHistory

        // 调试输出：显示截断前后的历史消息数量和 token 数
        if (conversationHistory.length > recentHistory.length) {
            console.log(`[AI Service] 消息历史已截断:`, {
                原始消息数: conversationHistory.length,
                截断后消息数: recentHistory.length,
                消息数限制: maxHistoryLength,
                模型上下文窗口: modelContextWindow,
                上下文预算: contextBudget,
                系统提示词token: systemPromptTokens,
                当前消息token: currentMessageTokens,
                历史消息token预算: historyTokenBudget,
                实际历史消息token: historyTokens
            });
        } else {
            console.log(`[AI Service] 消息历史未截断:`, {
                消息数: conversationHistory.length,
                消息数限制: maxHistoryLength,
                实际历史消息token: historyTokens,
                历史消息token预算: historyTokenBudget
            });
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
            const messageObj = {
                role: msg.role,
                content: msg.content
            }

            // 保留工具消息的tool_call_id字段
            if (msg.tool_call_id) {
                messageObj.tool_call_id = msg.tool_call_id
            }

            // 保留工具调用的其他字段
            if (msg.tool_calls) {
                messageObj.tool_calls = msg.tool_calls
            }

            messages.push(messageObj)
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
        // 处理对象响应（包含 response 和 tokens）
        let responseText = response
        let tokens = null

        if (typeof response === 'object' && response !== null) {
            responseText = response.response || ''
            tokens = response.tokens || null
        }

        // 如果没有令牌数，进行估算
        if (!tokens) {
            tokens = this.estimateTokens(responseText)
        }

        // 创建元数据对象
        const metadata = {
            response: responseText,
            tokens: settings.showTokens && !isPartial ? tokens : null,
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
            const parsed = this.parseResponseContent(data, provider)

            if (!parsed || !parsed.content) {
                throw new Error('无法解析推荐回复')
            }

            return this.parseSuggestedReplies(parsed.content)
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

    // 翻译文本
    async translateText(text, agent, conversationHistory, settings, targetLanguage = 'en') {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        // 语言映射
        const languageMap = {
            'en': '英语',
            'zh': '中文',
            'ja': '日语',
            'ko': '韩语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语',
            'ru': '俄语'
        }

        const targetLanguageName = languageMap[targetLanguage] || '英语'

        const prompt = `请将以下文本翻译成${targetLanguageName}，保持原文的语气和风格。

原文：
${text}

要求：
1. 准确翻译原文含义为${targetLanguageName}
2. 保持原文的语气和风格
3. 不要添加任何额外的说明或格式
4. 直接返回翻译结果`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
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
            const parsed = this.parseResponseContent(data, provider)
            return parsed.content ? parsed.content.trim() : ''
        } catch (error) {
            console.error('翻译失败:', error)
            throw error
        }
    }

    // 扩写文本
    async expandText(text, agent, conversationHistory, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const prompt = `请对以下文本进行扩写，使其更加详细和丰富。

原文：
${text}

要求：
1. 扩写内容应该与原文主题相关
2. 增加更多的细节、例子和解释
3. 保持原文的核心观点和语气
4. 扩写后的内容应该自然流畅
5. 不要添加任何额外的说明或格式
6. 直接返回扩写结果`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
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
            const parsed = this.parseResponseContent(data, provider)
            return parsed.content ? parsed.content.trim() : ''
        } catch (error) {
            console.error('扩写失败:', error)
            throw error
        }
    }

    // 优化文本
    async optimizeText(text, agent, conversationHistory, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const prompt = `请对以下文本进行优化，使其更加清晰、准确和有说服力。

原文：
${text}

要求：
1. 改进语言表达，使其更加清晰流畅
2. 修正语法错误和用词不当
3. 增强逻辑性和说服力
4. 保持原文的核心观点和意图
5. 优化后的内容应该简洁有力
6. 不要添加任何额外的说明或格式
7. 直接返回优化结果`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.5,
            max_tokens: 1500
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
            const parsed = this.parseResponseContent(data, provider)
            return parsed.content ? parsed.content.trim() : ''
        } catch (error) {
            console.error('优化失败:', error)
            throw error
        }
    }

    // 生成配色方案
    async generateColorScheme(prompt, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const colorPrompt = `请根据用户提供的意象"${prompt}"，生成一组和谐的配色方案。

要求：
1. 返回2个十六进制颜色值（格式如 #FF5733）
2. 颜色应该和谐搭配，适合作为UI主题色
3. 颜色要有足够的对比度，确保可读性
4. 只返回JSON格式，不要添加任何其他文字
5. JSON格式：{"color1": "#RRGGBB", "color2": "#RRGGBB"}

示例：
{"color1": "#FF6B6B", "color2": "#4ECDC4"}`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: colorPrompt
                }
            ],
            temperature: 0.8,
            max_tokens: 100
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
            const parsed = this.parseResponseContent(data, provider)

            if (!parsed || !parsed.content) {
                throw new Error('无法解析配色方案')
            }

            const content = parsed.content

            // 尝试解析JSON
            try {
                const colorScheme = JSON.parse(content.trim())
                // 验证颜色格式
                if (colorScheme.color1 && colorScheme.color2 && 
                    /^#[0-9A-F]{6}$/i.test(colorScheme.color1) && 
                    /^#[0-9A-F]{6}$/i.test(colorScheme.color2)) {
                    return colorScheme
                } else {
                    throw new Error('配色格式不正确')
                }
            } catch (parseError) {
                // 如果解析失败，尝试从文本中提取颜色
                const colorMatches = content.match(/#[0-9A-F]{6}/gi)
                if (colorMatches && colorMatches.length >= 2) {
                    return {
                        color1: colorMatches[0],
                        color2: colorMatches[1]
                    }
                } else {
                    throw new Error('无法从响应中提取有效颜色')
                }
            }
        } catch (error) {
            console.error('生成配色方案失败:', error)
            throw error
        }
    }

    // 本地模型生成配色方案（模拟实现）
    async generateLocalColorScheme(prompt) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800))

        // 基于关键词生成预设配色
        const colorSchemes = {
            '海洋': { color1: '#006994', color2: '#00D9FF' },
            '森林': { color1: '#2D5016', color2: '#73A942' },
            '日落': { color1: '#FF6B35', color2: '#F7931E' },
            '夜晚': { color1: '#2C3E50', color2: '#3498DB' },
            '春天': { color1: '#52C234', color2: '#A8E063' },
            '秋天': { color1: '#D84315', color2: '#FF8A65' },
            '糖果': { color1: '#FF6B9D', color2: '#C44569' },
            '科技': { color1: '#00BCD4', color2: '#3F51B5' },
            '温暖': { color1: '#FF5722', color2: '#FFC107' },
            '清凉': { color1: '#00ACC1', color2: '#26C6DA' }
        }

        // 检查提示词中是否包含关键词
        for (const [keyword, colors] of Object.entries(colorSchemes)) {
            if (prompt.includes(keyword)) {
                return colors
            }
        }

        // 如果没有匹配的关键词，返回随机配色
        const defaultSchemes = [
            { color1: '#FF6B6B', color2: '#4ECDC4' },
            { color1: '#A8E6CF', color2: '#FFD3B6' },
            { color1: '#FF8B94', color2: '#A8D8EA' },
            { color1: '#C7CEEA', color2: '#FFDAC1' },
            { color1: '#B2E1D4', color2: '#FFAAA5' }
        ]

        return defaultSchemes[Math.floor(Math.random() * defaultSchemes.length)]
    }

    // 生成高级渐变配色方案
    async generateAdvancedColorScheme(prompt, colorCount, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const advancedColorPrompt = `请根据用户提供的意象"${prompt}"，生成一组${colorCount}个颜色的和谐渐变配色方案。

要求：
1. 返回${colorCount}个十六进制颜色值（格式如 #FF5733）
2. 颜色应该和谐搭配，适合作为渐变主题色
3. 颜色之间要有良好的过渡效果
4. 只返回JSON格式，不要添加任何其他文字
5. JSON格式：{"colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB", ...]}

示例（3色）：
{"colors": ["#FF6B6B", "#4ECDC4", "#45B7D1"]}`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: advancedColorPrompt
                }
            ],
            temperature: 0.8,
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
            const parsed = this.parseResponseContent(data, provider)

            if (!parsed || !parsed.content) {
                throw new Error('无法解析高级配色方案')
            }

            const content = parsed.content

            // 尝试解析JSON
            try {
                const colorScheme = JSON.parse(content.trim())
                if (colorScheme.colors && Array.isArray(colorScheme.colors) && colorScheme.colors.length >= colorCount) {
                    // 验证颜色格式
                    const validColors = colorScheme.colors.slice(0, colorCount).filter(color => /^#[0-9A-F]{6}$/i.test(color))
                    if (validColors.length === colorCount) {
                        return validColors
                    }
                }
                throw new Error('配色格式不正确')
            } catch (parseError) {
                // 如果解析失败，尝试从文本中提取颜色
                const colorMatches = content.match(/#[0-9A-F]{6}/gi)
                if (colorMatches && colorMatches.length >= colorCount) {
                    return colorMatches.slice(0, colorCount)
                } else {
                    throw new Error('无法从响应中提取有效颜色')
                }
            }
        } catch (error) {
            console.error('生成高级配色方案失败:', error)
            throw error
        }
    }

    // 本地模型生成高级渐变配色方案（模拟实现）
    async generateLocalAdvancedColorScheme(prompt, colorCount) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

        // 基于关键词生成预设配色
        const advancedColorSchemes = {
            '海洋': ['#006994', '#00A8CC', '#00D9FF', '#7FDBFF', '#B3E5FC'],
            '森林': ['#2D5016', '#4A7C2E', '#73A942', '#8BC34A', '#A8E063'],
            '日落': ['#FF6B35', '#F7931E', '#FFC107', '#FFD54F', '#FFE082'],
            '夜晚': ['#2C3E50', '#34495E', '#3498DB', '#5DADE2', '#85C1E2'],
            '春天': ['#52C234', '#66BB6A', '#4CAF50', '#8BC34A', '#A8E063'],
            '秋天': ['#D84315', '#E64A19', '#FF8A65', '#FFAB91', '#FFCCBC'],
            '糖果': ['#FF6B9D', '#C44569', '#F8B500', '#FF6B6B', '#C44569'],
            '科技': ['#00BCD4', '#3F51B5', '#2196F3', '#03A9F4', '#00ACC1'],
            '温暖': ['#FF5722', '#FF7043', '#FF8A65', '#FFAB91', '#FFC107'],
            '清凉': ['#00ACC1', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2']
        }

        // 检查提示词中是否包含关键词
        for (const [keyword, colors] of Object.entries(advancedColorSchemes)) {
            if (prompt.includes(keyword)) {
                return colors.slice(0, colorCount)
            }
        }

        // 如果没有匹配的关键词，生成随机配色
        const baseColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
        const shuffled = baseColors.sort(() => 0.5 - Math.random())
        return shuffled.slice(0, colorCount)
    }

    // 生成全局主题配色方案（网络API）
    async generateThemeColorScheme(prompt, settings) {
        const { apiEndpoint, apiKey, modelName } = settings

        if (!apiEndpoint || !apiKey) {
            throw new Error('请配置API端点和密钥')
        }

        const provider = this.detectAPIProvider(apiEndpoint)
        const fullUrl = this.buildRequestUrl(apiEndpoint, provider)
        const headers = this.buildRequestHeaders(apiKey, provider)

        const themeColorPrompt = `请根据用户提供的意象"${prompt}"，生成一组完整的UI主题配色方案。

要求：
1. 返回5个十六进制颜色值（格式如 #FF5733）
2. 包含：主背景色、次背景色、主文字色、次文字色、边框色
3. 颜色应该和谐搭配，确保良好的可读性和对比度
4. 只返回JSON格式，不要添加任何其他文字
5. JSON格式：{"bgPrimary": "#RRGGBB", "bgSecondary": "#RRGGBB", "textPrimary": "#RRGGBB", "textSecondary": "#RRGGBB", "borderColor": "#RRGGBB"}

示例：
{"bgPrimary": "#1a1a1a", "bgSecondary": "#2d2d2d", "textPrimary": "#ffffff", "textSecondary": "#b0b0b0", "borderColor": "#404040"}`

        const requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: themeColorPrompt
                }
            ],
            temperature: 0.8,
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
            const parsed = this.parseResponseContent(data, provider)

            if (!parsed || !parsed.content) {
                throw new Error('无法解析主题配色方案')
            }

            const content = parsed.content

            // 尝试解析JSON
            try {
                const themeColors = JSON.parse(content.trim())
                // 验证颜色格式
                const requiredFields = ['bgPrimary', 'bgSecondary', 'textPrimary', 'textSecondary', 'borderColor']
                const isValid = requiredFields.every(field =>
                    themeColors[field] && /^#[0-9A-F]{6}$/i.test(themeColors[field])
                )

                if (isValid) {
                    // 补充其他必需的颜色字段
                    return {
                        bgPrimary: themeColors.bgPrimary,
                        bgSecondary: themeColors.bgSecondary,
                        bgTertiary: this.adjustBrightness(themeColors.bgSecondary, 0.1),
                        bgHover: this.adjustBrightness(themeColors.bgSecondary, 0.05),
                        textPrimary: themeColors.textPrimary,
                        textSecondary: themeColors.textSecondary,
                        textTertiary: this.adjustBrightness(themeColors.textSecondary, 0.3),
                        borderColor: themeColors.borderColor,
                        borderLight: this.adjustBrightness(themeColors.borderColor, 0.2),
                        shadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                        shadowLg: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }
                } else {
                    throw new Error('主题配色格式不正确')
                }
            } catch (parseError) {
                // 如果解析失败，尝试从文本中提取颜色
                const colorMatches = content.match(/#[0-9A-F]{6}/gi)
                if (colorMatches && colorMatches.length >= 5) {
                    return {
                        bgPrimary: colorMatches[0],
                        bgSecondary: colorMatches[1],
                        bgTertiary: this.adjustBrightness(colorMatches[1], 0.1),
                        bgHover: this.adjustBrightness(colorMatches[1], 0.05),
                        textPrimary: colorMatches[2],
                        textSecondary: colorMatches[3],
                        textTertiary: this.adjustBrightness(colorMatches[3], 0.3),
                        borderColor: colorMatches[4],
                        borderLight: this.adjustBrightness(colorMatches[4], 0.2),
                        shadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                        shadowLg: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }
                } else {
                    throw new Error('无法从响应中提取有效颜色')
                }
            }
        } catch (error) {
            console.error('生成主题配色方案失败:', error)
            throw error
        }
    }

    // 本地模型生成主题配色方案（模拟实现）
    async generateLocalThemeColorScheme(prompt) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

        // 基于关键词生成预设主题配色
        const themeColorSchemes = {
            '海洋': {
                bgPrimary: '#0f172a',
                bgSecondary: '#1e293b',
                bgTertiary: '#334155',
                bgHover: '#1e3a5f',
                textPrimary: '#f1f5f9',
                textSecondary: '#cbd5e1',
                textTertiary: '#94a3b8',
                borderColor: '#475569',
                borderLight: '#64748b'
            },
            '森林': {
                bgPrimary: '#14532d',
                bgSecondary: '#166534',
                bgTertiary: '#15803d',
                bgHover: '#14532d',
                textPrimary: '#f0fdf4',
                textSecondary: '#bbf7d0',
                textTertiary: '#86efac',
                borderColor: '#22c55e',
                borderLight: '#4ade80'
            },
            '日落': {
                bgPrimary: '#1c1917',
                bgSecondary: '#292524',
                bgTertiary: '#44403c',
                bgHover: '#78350f',
                textPrimary: '#fef7ed',
                textSecondary: '#fed7aa',
                textTertiary: '#fdba74',
                borderColor: '#ea580c',
                borderLight: '#f97316'
            },
            '夜晚': {
                bgPrimary: '#0a0a0a',
                bgSecondary: '#1a1a1a',
                bgTertiary: '#2a2a2a',
                bgHover: '#333333',
                textPrimary: '#ffffff',
                textSecondary: '#b0b0b0',
                textTertiary: '#808080',
                borderColor: '#404040',
                borderLight: '#505050'
            },
            '春天': {
                bgPrimary: '#f0fdf4',
                bgSecondary: '#dcfce7',
                bgTertiary: '#bbf7d0',
                bgHover: '#86efac',
                textPrimary: '#14532d',
                textSecondary: '#166534',
                textTertiary: '#15803d',
                borderColor: '#22c55e',
                borderLight: '#4ade80'
            },
            '秋天': {
                bgPrimary: '#fef7ed',
                bgSecondary: '#fed7aa',
                bgTertiary: '#fdba74',
                bgHover: '#fb923c',
                textPrimary: '#7c2d12',
                textSecondary: '#9a3412',
                textTertiary: '#c2410c',
                borderColor: '#ea580c',
                borderLight: '#f97316'
            },
            '紫罗兰': {
                bgPrimary: '#2e1065',
                bgSecondary: '#4c1d95',
                bgTertiary: '#5b21b6',
                bgHover: '#6d28d9',
                textPrimary: '#faf5ff',
                textSecondary: '#e9d5ff',
                textTertiary: '#d8b4fe',
                borderColor: '#7c3aed',
                borderLight: '#8b5cf6'
            },
            '樱花': {
                bgPrimary: '#fff1f2',
                bgSecondary: '#ffe4e6',
                bgTertiary: '#fecdd3',
                bgHover: '#fda4af',
                textPrimary: '#881337',
                textSecondary: '#9f1239',
                textTertiary: '#be123c',
                borderColor: '#f43f5e',
                borderLight: '#fb7185'
            },
            '科技': {
                bgPrimary: '#0c4a6e',
                bgSecondary: '#075985',
                bgTertiary: '#0369a1',
                bgHover: '#0284c7',
                textPrimary: '#f0f9ff',
                textSecondary: '#bae6fd',
                textTertiary: '#7dd3fc',
                borderColor: '#0ea5e9',
                borderLight: '#38bdf8'
            },
            '极光': {
                bgPrimary: '#0f172a',
                bgSecondary: '#1e293b',
                bgTertiary: '#334155',
                bgHover: '#1e3a5f',
                textPrimary: '#f0f9ff',
                textSecondary: '#bae6fd',
                textTertiary: '#7dd3fc',
                borderColor: '#0ea5e9',
                borderLight: '#38bdf8'
            }
        }

        // 检查提示词中是否包含关键词
        for (const [keyword, colors] of Object.entries(themeColorSchemes)) {
            if (prompt.includes(keyword)) {
                return {
                    ...colors,
                    shadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    shadowLg: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }
            }
        }

        // 如果没有匹配的关键词，生成随机主题配色
        const isDark = Math.random() > 0.5
        const baseHue = Math.floor(Math.random() * 360)

        const generateColor = (hue, saturation, lightness) => {
            return this.hslToHex(hue, saturation, lightness)
        }

        return {
            bgPrimary: generateColor(baseHue, 30, isDark ? 10 : 95),
            bgSecondary: generateColor(baseHue, 25, isDark ? 20 : 90),
            bgTertiary: generateColor(baseHue, 20, isDark ? 30 : 85),
            bgHover: generateColor(baseHue, 25, isDark ? 25 : 88),
            textPrimary: generateColor(baseHue, 10, isDark ? 95 : 10),
            textSecondary: generateColor(baseHue, 15, isDark ? 75 : 40),
            textTertiary: generateColor(baseHue, 20, isDark ? 60 : 60),
            borderColor: generateColor(baseHue, 25, isDark ? 40 : 70),
            borderLight: generateColor(baseHue, 20, isDark ? 50 : 65),
            shadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            shadowLg: '0 10px 40px rgba(0, 0, 0, 0.15)'
        }
    }

    // 辅助方法：调整颜色亮度
    adjustBrightness(color, amount) {
        const hex = color.replace('#', '')
        const num = parseInt(hex, 16)
        const r = Math.min(255, Math.max(0, Math.floor((num >> 16) * (1 + amount))))
        const g = Math.min(255, Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 + amount))))
        const b = Math.min(255, Math.max(0, Math.floor((num & 0x0000FF) * (1 + amount))))
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }

    // 辅助方法：HSL转Hex
    hslToHex(h, s, l) {
        s /= 100
        l /= 100
        const a = s * Math.min(l, 1 - l)
        const f = n => {
            const k = (n + h / 30) % 12
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
            return Math.round(255 * color).toString(16).padStart(2, '0')
        }
        return `#${f(0)}${f(8)}${f(4)}`
    }

    // 估算文本的 token 数（改进版）
    estimateTokens(text) {
        if (!text || typeof text !== 'string') {
            return 0
        }

        // 更精确的 token 估算算法
        // 基于实际统计：中文平均 1.5-2 tokens/字符，英文平均 0.75 tokens/单词
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
        const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length
        const numbers = (text.match(/\b\d+\b/g) || []).length
        const punctuation = (text.match(/[^\w\s]/g) || []).length
        const whitespace = (text.match(/\s/g) || []).length
        const otherChars = text.length - chineseChars - englishWords * 5 - numbers * 3 - punctuation - whitespace

        // 计算估算的 token 数
        const chineseTokens = chineseChars * 1.8
        const englishTokens = englishWords * 1.3
        const numberTokens = numbers * 1.5
        const punctuationTokens = punctuation * 0.5
        const whitespaceTokens = whitespace * 0.3
        const otherTokens = otherChars * 0.5

        return Math.round(chineseTokens + englishTokens + numberTokens + punctuationTokens + whitespaceTokens + otherTokens)
    }

    // 获取模型的上下文窗口大小
    getModelContextWindow(modelName) {
        const model = modelName.toLowerCase()
        
        // GPT-4 系列
        if (model.includes('gpt-4-turbo') || model.includes('gpt-4-1106')) {
            return 128000
        } else if (model.includes('gpt-4-32k')) {
            return 32768
        } else if (model.includes('gpt-4')) {
            return 8192
        }
        
        // GPT-3.5 系列
        if (model.includes('gpt-3.5-turbo-16k')) {
            return 16384
        } else if (model.includes('gpt-3.5-turbo')) {
            return 16384
        }
        
        // DeepSeek 系列
        if (model.includes('deepseek')) {
            return 128000
        }
        
        // Claude 系列
        if (model.includes('claude-3-opus')) {
            return 200000
        } else if (model.includes('claude-3-sonnet')) {
            return 200000
        } else if (model.includes('claude-3-haiku')) {
            return 200000
        } else if (model.includes('claude-2')) {
            return 100000
        }
        
        // Gemini 系列
        if (model.includes('gemini-pro')) {
            return 32768
        }
        
        // Qwen 系列（通义千问）
        if (model.includes('qwen')) {
            if (model.includes('128k') || model.includes('long')) {
                return 128000
            } else if (model.includes('32k')) {
                return 32768
            } else {
                return 8192
            }
        }
        
        // GLM 系列（智谱）
        if (model.includes('glm')) {
            return 128000
        }
        
        // Kimi 系列（月之暗面）
        if (model.includes('kimi')) {
            return 128000
        }
        
        // 硅基流动模型
        if (model.includes('siliconflow') || model.includes('/')) {
            // 默认支持 128K 上下文
            return 128000
        }
        
        // 默认值（保守估计）
        return 8192
    }

    // 合并智能体设置和全局设置
    mergeAgentSettings(globalSettings, agent) {
        // 如果智能体没有单独设置，直接返回全局设置
        if (!agent || !agent.useCustomApi) {
            return { ...globalSettings }
        }

        // 智能体有单独设置，合并设置（智能体设置优先）
        const merged = { ...globalSettings }

        // 如果智能体配置了自定义 API，使用智能体的配置
        if (agent.useCustomApi) {
            // 使用智能体的自定义 API 配置
            merged.apiType = 'network'
            
            // 根据服务商自动设置默认端点
            const endpointMap = {
                openai: 'https://api.openai.com/v1/chat/completions',
                deepseek: 'https://api.deepseek.com/v1/chat/completions',
                anthropic: 'https://api.anthropic.com/v1/messages',
                azure: '',
                google: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
            }
            
            // API 端点优先使用智能体的配置，否则根据服务商自动设置
            merged.apiEndpoint = agent.customApiEndpoint || endpointMap[agent.customApiProvider] || globalSettings.apiEndpoint
            
            // API 密钥优先使用智能体的配置，否则使用全局设置
            merged.apiKey = agent.customApiKey || globalSettings.apiKeys?.[agent.customApiProvider] || globalSettings.apiKey
            
            // 模型名称优先使用智能体的配置，否则使用全局设置
            merged.modelName = agent.customModelName || globalSettings.modelName
        }

        return merged
    }
}