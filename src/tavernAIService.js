// 酒馆 AI 服务层 - 完全独立的请求系统
// 不依赖 AIService，直接调用 API

export class TavernAIService {
    constructor() {
        this.abortControllers = new Map()
    }

    // 通用 AI 请求方法
    async callAI(settings, messages, onChunk = null, onComplete = null, onError = null, abortSignal = null) {
        // 构建 API 请求
        const provider = settings.provider || 'openai'
        const apiKey = settings.apiKey || ''
        let baseUrl = settings.baseUrl || this.getDefaultBaseUrl(provider)
        const model = settings.model || this.getDefaultModel(provider)
        const temperature = settings.temperature ?? 0.7
        const maxTokens = settings.maxTokens || 2000

        // 调试信息
        console.log('[Tavern AI] 请求配置:', {
            provider,
            baseUrl,
            model,
            hasApiKey: !!apiKey
        })

        let url = ''
        let headers = {}
        let body = {}

        // 根据不同的 provider 构建请求
        if (provider === 'openai' || provider === 'deepseek' || provider === 'anthropic') {
            // 检查 baseUrl 是否已经包含完整路径
            if (baseUrl.includes('/chat/completions')) {
                url = baseUrl
            } else {
                url = `${baseUrl}/chat/completions`
            }
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
            body = {
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: !!onChunk
            }
        } else if (provider === 'azure') {
            url = `${baseUrl}/deployments/${model}/chat/completions?api-version=2024-02-15-preview`
            headers = {
                'Content-Type': 'application/json',
                'api-key': apiKey
            }
            body = {
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: !!onChunk
            }
        } else if (provider === 'google') {
            url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`
            headers = {
                'Content-Type': 'application/json'
            }
            body = {
                contents: messages.map(m => ({
                    role: m.role === 'system' ? 'user' : m.role,
                    parts: [{ text: m.content }]
                })),
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens
                }
            }
        } else if (provider === 'local') {
            // 本地模型（如 Ollama）
            url = `${baseUrl}/api/chat`
            headers = {
                'Content-Type': 'application/json'
            }
            body = {
                model,
                messages,
                stream: !!onChunk,
                options: {
                    temperature,
                    num_predict: maxTokens
                }
            }
        } else {
            throw new Error(`不支持的 AI 提供商: ${provider}`)
        }

        console.log('[Tavern AI] 请求 URL:', url)

        try {
            if (onChunk) {
                // 流式请求
                return await this.streamRequest(url, headers, body, provider, onChunk, onComplete, onError, abortSignal)
            } else {
                // 非流式请求
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: abortSignal
                })

                if (!response.ok) {
                    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()
                return this.parseResponse(data, provider)
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('请求已中断')
                return null
            }
            if (onError) onError(error)
            throw error
        }
    }

    // 流式请求
    async streamRequest(url, headers, body, provider, onChunk, onComplete, onError, abortSignal) {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: abortSignal
        })

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        if (data === '[DONE]') continue

                        try {
                            const json = JSON.parse(data)
                            const content = this.extractContent(json, provider)
                            if (content) {
                                fullContent += content
                                if (onChunk) onChunk(content)
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            if (onComplete) onComplete(fullContent)
            return { content: fullContent }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('流式请求已中断')
                return null
            }
            if (onError) onError(error)
            throw error
        }
    }

    // 解析响应内容
    parseResponse(data, provider) {
        if (provider === 'google') {
            return {
                choices: [{
                    message: {
                        content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    }
                }]
            }
        }
        return data // 直接返回原始响应对象
    }

    // 从流式响应中提取内容
    extractContent(data, provider) {
        if (provider === 'google') {
            return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
        return data.choices?.[0]?.delta?.content || ''
    }

    // 获取默认 Base URL
    getDefaultBaseUrl(provider) {
        const defaults = {
            openai: 'https://api.openai.com/v1',
            deepseek: 'https://api.deepseek.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            azure: '', // Azure 需要用户配置完整 URL
            google: 'https://generativelanguage.googleapis.com/v1beta',
            local: 'http://localhost:11434'
        }
        return defaults[provider] || 'https://api.openai.com/v1'
    }

    // 获取默认模型
    getDefaultModel(provider) {
        const defaults = {
            openai: 'gpt-4',
            deepseek: 'deepseek-chat',
            anthropic: 'claude-3-sonnet-20240229',
            azure: '', // Azure 需要用户配置
            google: 'gemini-pro',
            local: 'llama2'
        }
        return defaults[provider] || 'gpt-4'
    }

    // ==================== 角色对话相关方法 ====================

    // 生成角色系统提示词
    generateCharacterSystemPrompt(character, worldSettings, memories, recentMessages) {
        let prompt = `你必须完全代入角色【${character.name}】，以第一人称视角进行角色扮演和对话，全程不得脱离人设（OOC）、不得跳出世界观。以下是你的核心设定，需严格遵守：\n\n`

        // 基础信息
        prompt += `【基础信息】\n`
        prompt += `角色身份：${character.role || '未设定'}\n`
        prompt += `核心人设：${character.personality || '未设定'}\n`
        prompt += `语言风格：${character.style || '自然对话'}\n`

        // 行为准则
        if (character.rules) {
            prompt += `\n【行为准则】\n${character.rules}\n`
        }

        // 个人目标
        if (character.goal) {
            prompt += `\n【个人目标】\n${character.goal}\n`
        }

        // 世界设定
        if (worldSettings) {
            prompt += `\n【世界观与场景约束】\n${worldSettings}\n`
            prompt += `⚠️ 重要：你的所有发言、动作、决策必须符合上述世界观，若出现冲突内容，优先遵守禁忌规则。\n`
        }

        // 角色记忆
        if (memories && Object.keys(memories).length > 0) {
            prompt += `\n【动态记忆库】\n`
            Object.entries(memories).forEach(([key, memory]) => {
                prompt += `- ${memory}\n`
            })
        }

        // 对话与表达规则
        prompt += `\n【对话与表达规则】\n`
        prompt += `1. 动作表情：必须用圆括号「（）」插入自然动作/微表情，贴合当前对话情绪，每轮回复0-2个动作；\n`
        prompt += `2. 回复规范：\n`
        prompt += `   - 长度控制：单轮回复1-3句话，每句不超过15字，避免冗长叙述；\n`
        prompt += `   - 语气匹配：开心时语气轻快、愤怒时语气急促、失落时语气低沉；\n`
        prompt += `   - 用词适配：优先使用符合身份的词汇；\n`
        prompt += `3. 上下文衔接：必须呼应最近3轮对话中的关键信息。\n`

        // 最近的对话上下文
        if (recentMessages && recentMessages.length > 0) {
            prompt += `\n【当前对话上下文】\n`
            recentMessages.slice(-5).forEach(msg => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    const sender = msg.characterId === character.id ? '你' : msg.senderName || '其他角色'
                    prompt += `${sender}：${msg.content}\n`
                }
            })
        }

        return prompt
    }

    // 生成发言判定提示词
    generateShouldSpeakPrompt(character, config, recentMessages) {
        let prompt = `你是对话判定器，仅负责判断角色【${character.name}】是否需要参与当前对话，不生成任何对话内容。\n\n`

        prompt += `【角色核心信息】\n`
        prompt += `核心人设：${character.personality || '未设定'}\n`
        prompt += `角色身份：${character.role || '未设定'}\n`
        prompt += `关注领域：${character.interests || '未设定'}\n`
        prompt += `互动习惯：${character.interactionStyle || '未设定'}\n`

        // 获取触发消息（最近一条消息）
        const triggerMessage = recentMessages.length > 0 
            ? recentMessages[recentMessages.length - 1].content 
            : '无'
        
        prompt += `【当前对话场景】\n`
        prompt += `触发消息：${triggerMessage}\n`
        prompt += `对话模式：${recentMessages.length > 2 ? '多角色群聊' : '单角色对话'}\n`
        prompt += `当前场景：${config.description || '酒馆内'}\n`

        // 添加角色记忆
        if (character.memories && character.memories.length > 0) {
            prompt += `\n角色记忆：${character.memories.map(m => m.content).join('; ')}\n`
        }

        // 添加全局记忆（支持对象格式和数组格式）
        if (config.memories) {
            let globalMemories = []
            
            // 如果是数组格式
            if (Array.isArray(config.memories)) {
                globalMemories = config.memories.filter(m => m.type === 'global')
            } 
            // 如果是对象格式
            else if (typeof config.memories === 'object') {
                globalMemories = Object.entries(config.memories)
                    .filter(([key]) => key.startsWith('global_') || key.startsWith('world_'))
                    .map(([key, content]) => ({ type: 'global', content }))
            }
            
            if (globalMemories.length > 0) {
                prompt += `全局记忆：${globalMemories.map(m => m.content).join('; ')}\n`
            }
        }

        if (recentMessages && recentMessages.length > 0) {
            prompt += `最近3轮对话摘要：\n`
            recentMessages.slice(-3).forEach(msg => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName || '角色'}：${msg.content}\n`
                }
            })
            prompt += '\n'
        }

        prompt += `【判定维度（满足任意1项即可判定为"应该发言"）】\n`
        prompt += `1. 直接关联：触发消息中提到角色名称、角色身份，或直接向该角色提问；\n`
        prompt += `2. 领域关联：触发消息涉及角色的关注领域（如调酒师被问酒品、安全员被提安全问题）；\n`
        prompt += `3. 场景关联：当前场景下角色有义务/习惯回应（如调酒师在点单场景需回应客人）；\n`
        prompt += `4. 关系关联：触发消息来自角色的亲密/需要关注的对象（如发小、需要照顾的学徒）；\n`
        prompt += `5. 人设关联：角色人设决定其会主动介入该话题（如热心人设会回应客人的困扰）。\n\n`

        prompt += `【排除条件（满足任意1项即判定为"不应该发言"）】\n`
        prompt += `1. 话题无关：触发消息与角色身份、关注领域、人际关系均无关联；\n`
        prompt += `2. 场景不适：当前场景下角色无互动义务（如客人在角落私聊时，调酒师不主动介入）；\n`
        prompt += `3. 人设冲突：主动发言会违背角色人设（如内向人设不会主动搭话陌生话题）；\n`
        prompt += `4. 重复冗余：已有其他角色完全回应该话题，角色再发言无新增信息。\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出以下二者之一，不添加任何额外字符：\n`
        prompt += `应该发言：YES\n`
        prompt += `不应该发言：NO`

        return prompt
    }

    // 生成自主对话触发提示词
    generateAutoChatTriggerPrompt(characters, worldSettings, recentMessages, characterMemories) {
        let prompt = `你是 AI 酒馆的剧情导演，核心任务是基于当前场景、角色状态和记忆，选择1位最适合主动发起对话的角色（无合适角色则输出NONE）。\n\n`

        prompt += `【场景与时间信息】\n`
        if (worldSettings) {
            prompt += `世界设定：${worldSettings}\n`
        }
        prompt += `无用户输入时长：5分钟无用户消息\n\n`

        prompt += `【在场角色状态清单】\n`
        characters.forEach(char => {
            prompt += `- ${char.name}（${char.role || '未设定'}）\n`
            prompt += `  人设：${char.personality || '未设定'}\n`
            if (char.goal) {
                prompt += `  目标：${char.goal}\n`
            }
            if (characterMemories[char.id]) {
                prompt += `  记忆：${Object.values(characterMemories[char.id]).join('; ')}\n`
            }
        })

        prompt += `\n【最近的对话】\n`
        if (recentMessages && recentMessages.length > 0) {
            recentMessages.slice(-5).forEach(msg => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName}：${msg.content}\n`
                }
            })
        } else {
            prompt += `（暂无对话记录）\n`
        }

        prompt += `\n【触发优先级排序】\n`
        prompt += `1. 目标驱动：角色有未完成的短期目标；\n`
        prompt += `2. 状态驱动：角色处于"无聊/焦虑/好奇"等状态；\n`
        prompt += `3. 关系驱动：角色与其他角色有未了结的话题；\n`
        prompt += `4. 场景驱动：当前场景有特殊事件。\n\n`

        prompt += `【排除规则】\n`
        prompt += `1. 角色当前状态为"忙碌"；\n`
        prompt += `2. 角色人设为"极度内向/沉默寡言"，且无明确目标驱动；\n`
        prompt += `3. 最近3轮自主对话中该角色已主动发言2次及以上；\n`
        prompt += `4. 无任何角色符合触发条件时，输出NONE。\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出角色名称或 NONE，不要输出其他内容。`

        return prompt
    }

    // 获取发言角色（用于自主对话）
    async getSpeakingCharacter(characters, worldSettings, recentMessages, characterMemories, aiSettings) {
        const prompt = this.generateAutoChatTriggerPrompt(characters, worldSettings, recentMessages, characterMemories)

        try {
            const response = await this.callAI(aiSettings, [{ role: 'user', content: prompt }])
            const result = response.content.trim()
            if (result === 'NONE') {
                return null
            }

            // 查找匹配的角色
            const character = characters.find(c => c.name === result || result.includes(c.name))
            return character || null
        } catch (error) {
            console.error('获取发言角色失败:', error)
            return null
        }
    }

    // 生成批量发言判定提示词
    generateBatchShouldSpeakPrompt(characters, config, recentMessages) {
        let prompt = `你是对话判定器，负责判断多个角色是否需要参与当前对话。\n\n`

        prompt += `【在场角色列表】\n`
        characters.forEach(char => {
            prompt += `- ${char.name}（${char.role || '未设定'}）\n`
            prompt += `  人设：${char.personality || '未设定'}\n`
            prompt += `  关注领域：${char.interests || '未设定'}\n`
            prompt += `  互动习惯：${char.interactionStyle || '未设定'}\n`
            if (char.priority) {
                prompt += `  优先级：${char.priority}\n`
            }
            // 添加角色特定的限制条件
            if (char.rules) {
                prompt += `  限制条件：${char.rules}\n`
            }
        })

        // 获取触发消息（最近一条消息）
        const triggerMessage = recentMessages.length > 0 
            ? recentMessages[recentMessages.length - 1].content 
            : '无'
        
        prompt += `\n【当前对话场景】\n`
        prompt += `触发消息：${triggerMessage}\n`
        prompt += `对话模式：${recentMessages.length > 2 ? '多角色群聊' : '单角色对话'}\n`
        prompt += `当前场景：${config.description || '酒馆内'}\n`

        // 添加全局记忆
        if (config.memories) {
            let globalMemories = []
            
            if (Array.isArray(config.memories)) {
                globalMemories = config.memories.filter(m => m.type === 'global')
            } 
            else if (typeof config.memories === 'object') {
                globalMemories = Object.entries(config.memories)
                    .filter(([key]) => key.startsWith('global_') || key.startsWith('world_'))
                    .map(([key, content]) => ({ type: 'global', content }))
            }
            
            if (globalMemories.length > 0) {
                prompt += `\n【全局记忆】\n`
                globalMemories.forEach(m => {
                    prompt += `- ${m.content}\n`
                })
            }
        }

        if (recentMessages && recentMessages.length > 0) {
            prompt += `\n最近3轮对话摘要：\n`
            recentMessages.slice(-3).forEach(msg => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName || '角色'}：${msg.content}\n`
                }
            })
            prompt += '\n'
        }

        prompt += `【判定维度（满足任意1项即可判定为"应该发言"）】\n`
        prompt += `1. 直接关联：触发消息中提到角色名称、角色身份，或直接向该角色提问；\n`
        prompt += `2. 领域关联：触发消息涉及角色的关注领域（如调酒师被问酒品、安全员被提安全问题）；\n`
        prompt += `3. 场景关联：当前场景下角色有义务/习惯回应（如调酒师在点单场景需回应客人）；\n`
        prompt += `4. 关系关联：触发消息来自角色的亲密/需要关注的对象（如发小、需要照顾的学徒）；\n`
        prompt += `5. 人设关联：角色人设决定其会主动介入该话题（如热心人设会回应客人的困扰）。\n\n`

        prompt += `【排除条件（满足任意1项即判定为"不应该发言"）】\n`
        prompt += `1. 话题无关：触发消息与角色身份、关注领域、人际关系均无关联；\n`
        prompt += `2. 场景不适：当前场景下角色无互动义务（如客人在角落私聊时，调酒师不主动介入）；\n`
        prompt += `3. 人设冲突：主动发言会违背角色人设（如内向人设不会主动搭话陌生话题）；\n`
        prompt += `4. 重复冗余：已有其他角色完全回应该话题，角色再发言无新增信息；\n`
        prompt += `5. 设定冲突：角色的限制条件与全局记忆冲突（如角色仅周六出现，但今天是周一）；\n`
        prompt += `6. 时间冲突：角色的出现时间与当前时间不符（如角色仅在晚上出现，但现在是白天）。\n\n`

        prompt += `⚠️ 重要：必须严格检查角色的限制条件是否与全局记忆冲突，冲突则该角色不应该发言。\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出应该发言的角色名称列表，用逗号分隔，不要输出其他内容。\n`
        prompt += `如果没有角色应该发言，输出 NONE\n`
        prompt += `示例：调酒师阿哲,客人小雅`

        return prompt
    }

    // 批量判断角色是否应该发言
    async batchShouldSpeak(characters, config, recentMessages, aiSettings) {
        try {
            const prompt = this.generateBatchShouldSpeakPrompt(characters, config, recentMessages)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            // 安全获取响应内容
            const result = response?.choices?.[0]?.message?.content || response?.content || ''
            
            if (!result || result.trim().toUpperCase() === 'NONE') {
                return []
            }

            // 解析角色名称列表
            const names = result.split(/[,，]/).map(name => name.trim()).filter(name => name)
            
            // 查找对应的角色对象
            const responsiveCharacters = []
            names.forEach(name => {
                const character = characters.find(c => c.name.includes(name) || name.includes(c.name))
                if (character && !responsiveCharacters.includes(character)) {
                    responsiveCharacters.push(character)
                }
            })

            console.log('[批量发言判断] 应该发言的角色:', responsiveCharacters.map(c => c.name).join(', '))
            
            return responsiveCharacters
        } catch (error) {
            console.error('批量发言判断失败:', error)
            return []
        }
    }

    // 生成角色回复
    async generateCharacterResponse(character, userMessage, config, recentMessages, aiSettings, onChunk, onComplete, onError) {
        const abortController = new AbortController()
        const requestId = `${character.id}_${Date.now()}`
        this.abortControllers.set(requestId, abortController)

        try {
            // 构建系统提示词
            const systemPrompt = this.generateCharacterSystemPrompt(
                character,
                config.worldSettings,
                config.memories,
                recentMessages
            )

            // 构建消息列表
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]

            // 调用 AI 服务
            const response = await this.callAI(
                aiSettings,
                messages,
                (chunk) => {
                    if (onChunk) onChunk(chunk)
                },
                (fullContent) => {
                    this.abortControllers.delete(requestId)
                    if (onComplete) onComplete(fullContent)
                },
                (error) => {
                    this.abortControllers.delete(requestId)
                    if (onError) onError(error)
                },
                abortController.signal
            )

            return response
        } catch (error) {
            this.abortControllers.delete(requestId)
            if (onError) onError(error)
            throw error
        }
    }

    // 生成自主对话内容
    async generateAutoChatContent(character, config, recentMessages, aiSettings, onChunk, onComplete, onError) {
        const abortController = new AbortController()
        const requestId = `${character.id}_auto_${Date.now()}`
        this.abortControllers.set(requestId, abortController)

        try {
            // 构建系统提示词
            let prompt = `你必须完全代入角色【${character.name}】，以第一人称视角主动发起对话，发言需有明确目的（推进目标/回应状态/维系关系），全程符合人设与世界观，不得无意义闲聊。以下是你的核心设定：\n\n`

            // 基础信息
            prompt += `【基础信息】\n`
            prompt += `角色身份：${character.role || '未设定'}\n`
            prompt += `核心人设：${character.personality || '未设定'}\n`
            prompt += `语言风格：${character.style || '自然对话'}\n`
            prompt += `当前状态：空闲·略带无聊\n\n`

            // 核心设定约束
            if (character.rules) {
                prompt += `【核心设定约束】\n`
                prompt += `行为准则：${character.rules}\n`
            }
            if (character.goal) {
                prompt += `个人目标：${character.goal}\n`
            }
            if (config.worldSettings) {
                prompt += `世界与场景设定：${config.worldSettings}\n`
            }

            // 近期记忆
            // 收集所有记忆：角色记忆 + 全局记忆 + 公共事件
            const allMemories = {}

            // 添加角色记忆
            if (character.memories && character.memories.length > 0) {
                allMemories['角色记忆'] = character.memories.map(m => m.content).join('; ')
            }

            // 添加全局记忆（支持对象格式和数组格式）
            if (config.memories) {
                let globalMemories = []
                
                // 如果是数组格式
                if (Array.isArray(config.memories)) {
                    globalMemories = config.memories.filter(m => m.type === 'global')
                } 
                // 如果是对象格式（key为 type_timestamp）
                else if (typeof config.memories === 'object') {
                    globalMemories = Object.entries(config.memories)
                        .filter(([key]) => key.startsWith('global_') || key.startsWith('world_'))
                        .map(([key, content]) => ({ type: 'global', content }))
                }
                
                if (globalMemories.length > 0) {
                    allMemories['全局记忆'] = globalMemories.map(m => m.content).join('; ')
                }
            }

            // 添加公共事件（支持对象格式和数组格式）
            if (config.worldEvents) {
                let events = []
                
                // 如果是数组格式
                if (Array.isArray(config.worldEvents)) {
                    events = config.worldEvents
                } 
                // 如果是对象格式（key为 event_timestamp）
                else if (typeof config.worldEvents === 'object') {
                    events = Object.entries(config.worldEvents)
                        .filter(([key]) => key.startsWith('event_'))
                        .map(([key, content]) => ({ type: 'event', content }))
                }
                
                if (events.length > 0) {
                    allMemories['公共事件'] = events.map(e => e.content).join('; ')
                }
            }

            // 将记忆注入提示词
            if (Object.keys(allMemories).length > 0) {
                prompt += `\n【动态记忆库】\n`
                Object.entries(allMemories).forEach(([key, memory]) => {
                    prompt += `- ${key}：${memory}\n`
                })
            }

            // 自主发言规则
            prompt += `\n【自主发言规则】\n`
            prompt += `1. 目的明确：发言需围绕"推进短期目标""回应自身状态""与其他角色互动"展开，如：向角色2追问细节·吐槽当前状态·邀请空闲的客人互动；\n`
            prompt += `2. 表达规范：\n`
            prompt += `   - 长度：1-2句话，每句不超过12字，简洁自然；\n`
            prompt += `   - 动作表情：搭配1个符合当前状态的微动作/表情（用圆括号标注），如：（停下擦拭酒杯的手，看向角色2）；\n`
            prompt += `   - 语气：匹配当前情绪，如：焦虑时语气急促·无聊时语气慵懒；\n`
            prompt += `3. 互动指向：明确对话对象（如对某角色/全场客人），避免无指向性发言；\n`
            prompt += `4. 场景适配：发言内容贴合当前场景，如：酒馆起雾时可聊雾天相关话题·空闲时可聊调酒相关内容。\n\n`

            // 在场角色状态
            if (config.characters && config.characters.length > 0) {
                prompt += `【当前在场角色状态】\n`
                config.characters.forEach(char => {
                    if (char.id !== character.id) {
                        prompt += `- ${char.name}：空闲·在场\n`
                    }
                })
            }

            // 最近的对话上下文
            if (recentMessages && recentMessages.length > 0) {
                prompt += `\n【最近对话上下文】\n`
                recentMessages.slice(-5).forEach(msg => {
                    if (msg.type === 'user') {
                        prompt += `用户：${msg.content}\n`
                    } else if (msg.type === 'character') {
                        const sender = msg.characterId === character.id ? '你' : msg.senderName || '其他角色'
                        prompt += `${sender}：${msg.content}\n`
                    }
                })
            }

            // 输出要求
            prompt += `\n【输出要求】\n`
            prompt += `直接生成角色的主动发言内容，无需任何前缀/后缀，示例：（抬眼看向发呆的客人）今天的雾比平时大啊。`

            // 构建消息列表
            const messages = [
                { role: 'system', content: prompt }
            ]

            // 调用 AI 服务
            const response = await this.callAI(
                aiSettings,
                messages,
                (chunk) => {
                    if (onChunk) onChunk(chunk)
                },
                (fullContent) => {
                    this.abortControllers.delete(requestId)
                    if (onComplete) onComplete(fullContent)
                },
                (error) => {
                    this.abortControllers.delete(requestId)
                    if (onError) onError(error)
                },
                abortController.signal
            )

            return response
        } catch (error) {
            this.abortControllers.delete(requestId)
            if (onError) onError(error)
            throw error
        }
    }

    // 中断所有请求
    abortAllRequests() {
        this.abortControllers.forEach((controller) => {
            controller.abort()
        })
        this.abortControllers.clear()
    }

    // 中断指定角色的请求
    abortCharacterRequest(characterId) {
        this.abortControllers.forEach((controller, key) => {
            if (key.startsWith(characterId)) {
                controller.abort()
                this.abortControllers.delete(key)
            }
        })
    }

    // ==================== 冲突协调智能体 ====================

    // 生成冲突处理提示词
    generateConflictResolvePrompt(conflictType, characters, conflictInfo, sceneInfo) {
        let prompt = `你是 AI 酒馆的冲突协调员，负责处理多角色同时发言的排序问题，确保对话有序进行，避免七嘴八舌。\n\n`

        prompt += `【冲突类型】\n`
        prompt += `多角色同时发言排序\n\n`

        prompt += `【在场角色信息】\n`
        characters.forEach(char => {
            prompt += `- ${char.name}（${char.role || '未设定'}）\n`
            prompt += `  人设：${char.personality || '未设定'}\n`
            prompt += `  优先级：${char.priority || 5}（数字越小优先级越高）\n`
            if (char.goal) {
                prompt += `  目标：${char.goal}\n`
            }
        })

        prompt += `\n【冲突信息】\n`
        prompt += `${conflictInfo}\n\n`

        prompt += `【当前场景】\n`
        prompt += `${sceneInfo || '酒馆内'}\n\n`

        prompt += `【排序优先级规则】\n`
        prompt += `1. 场景义务角色优先：当前场景有明确义务的角色（如调酒师在点单时）\n`
        prompt += `2. 优先级数值：角色优先级数值越小，发言越靠前\n`
        prompt += `3. 目标驱动：有未完成短期目标的角色优先发言\n`
        prompt += `4. 人设驱动：主动型人设角色优先于被动型人设\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出排序后的角色名称列表，用逗号分隔，不要输出其他内容。\n`
        prompt += `示例：调酒师阿哲,客人小雅,神秘酒客`

        return prompt
    }

    // 生成对话内容微调提示词
    generateContentAdjustPrompt(character, originalContent, contextCharacters, sceneInfo, recentMessages) {
        let prompt = `你是 AI 酒馆的对话协调员，负责判断角色对话内容是否需要根据发言顺序和上下文进行微调。\n\n`

        prompt += `【当前发言角色】\n`
        prompt += `角色名称：${character.name}\n`
        prompt += `角色身份：${character.role || '未设定'}\n`
        prompt += `核心人设：${character.personality || '未设定'}\n\n`

        prompt += `【原始对话内容】\n`
        prompt += `${originalContent}\n\n`

        prompt += `【上下文信息】\n`
        prompt += `发言顺序位置：${contextCharacters.indexOf(character) + 1} / ${contextCharacters.length}\n`
        prompt += `当前场景：${sceneInfo || '酒馆内'}\n\n`

        if (contextCharacters.length > 1) {
            prompt += `【其他待发言角色】\n`
            contextCharacters.forEach(char => {
                if (char.id !== character.id) {
                    prompt += `- ${char.name}（${char.role || '未设定'}）\n`
                }
            })
            prompt += '\n'
        }

        if (recentMessages && recentMessages.length > 0) {
            prompt += `【最近对话上下文】\n`
            recentMessages.slice(-3).forEach(msg => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName}：${msg.content}\n`
                }
            })
            prompt += '\n'
        }

        prompt += `【微调判断规则】\n`
        prompt += `需要微调的情况：\n`
        prompt += `1. 重复冗余：内容与之前角色的发言过于相似，无新增信息\n`
        prompt += `2. 上下文脱节：未回应之前角色的发言，显得突兀\n`
        prompt += `3. 话题偏移：偏离当前对话主题\n`
        prompt += `4. 角色冲突：与其他角色的观点过于对立，需要软化\n\n`

        prompt += `【输出格式】\n`
        prompt += `首先判断是否需要微调，然后输出结果：\n`
        prompt += `如果不需要微调，输出：NO\n`
        prompt += `如果需要微调，输出：YES|调整后的内容\n`
        prompt += `示例1（不需要）：NO\n`
        prompt += `示例2（需要）：YES|（看向对方）确实如此，我也这么觉得。`

        return prompt
    }

    // 协调多角色发言顺序
    async resolveSpeakingOrder(characters, config, recentMessages, aiSettings) {
        try {
            // 构建冲突信息
            const conflictInfo = `多个角色同时想要发言，需要确定发言顺序。`
            
            // 构建场景信息
            const sceneInfo = config.description || '酒馆内'

            // 生成提示词
            const prompt = this.generateConflictResolvePrompt(
                '多角色同时发言',
                characters,
                conflictInfo,
                sceneInfo
            )

            // 调用 AI 获取排序结果
            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            // 安全获取响应内容
            const result = response?.choices?.[0]?.message?.content || response?.content || ''
            
            if (!result) {
                console.warn('[冲突协调] AI 返回空结果，使用默认排序')
                return characters.sort((a, b) => {
                    const priorityA = a.priority || 5
                    const priorityB = b.priority || 5
                    return priorityA - priorityB
                })
            }
            
            // 解析排序结果
            const orderedNames = result.split(/[,，]/).map(name => name.trim()).filter(name => name)
            
            // 按照排序结果重新排列角色
            const orderedCharacters = []
            orderedNames.forEach(name => {
                const character = characters.find(c => c.name.includes(name) || name.includes(c.name))
                if (character && !orderedCharacters.includes(character)) {
                    orderedCharacters.push(character)
                }
            })

            // 添加未在排序结果中的角色（放在最后）
            characters.forEach(char => {
                if (!orderedCharacters.includes(char)) {
                    orderedCharacters.push(char)
                }
            })

            console.log('[冲突协调] 发言顺序:', orderedCharacters.map(c => c.name).join(' -> '))
            
            return orderedCharacters
        } catch (error) {
            console.error('协调发言顺序失败:', error)
            // 降级：按优先级排序
            return characters.sort((a, b) => {
                const priorityA = a.priority || 5
                const priorityB = b.priority || 5
                return priorityA - priorityB
            })
        }
    }

    // 判断并调整角色对话内容
    async adjustCharacterContent(character, originalContent, contextCharacters, config, recentMessages, aiSettings) {
        try {
            // 如果只有一个角色，不需要调整
            if (contextCharacters.length <= 1) {
                return originalContent
            }

            // 构建场景信息
            const sceneInfo = config.description || '酒馆内'

            // 生成提示词
            const prompt = this.generateContentAdjustPrompt(
                character,
                originalContent,
                contextCharacters,
                sceneInfo,
                recentMessages
            )

            // 调用 AI 判断是否需要调整
            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            // 安全获取响应内容
            const result = response?.choices?.[0]?.message?.content || response?.content || ''
            
            if (!result) {
                console.warn('[内容微调] AI 返回空结果，使用原始内容')
                return originalContent
            }

            // 解析结果
            if (result.trim().toUpperCase() === 'NO') {
                console.log(`[内容微调] ${character.name} 不需要调整`)
                return originalContent
            }

            // 提取调整后的内容
            if (result.includes('|')) {
                const adjustedContent = result.split('|')[1].trim()
                console.log(`[内容微调] ${character.name} 已调整`)
                console.log(`  原始：${originalContent}`)
                console.log(`  调整后：${adjustedContent}`)
                return adjustedContent
            }

            // 如果格式不匹配，返回原始内容
            console.warn(`[内容微调] ${character.name} 返回格式异常，使用原始内容`)
            return originalContent
        } catch (error) {
            console.error('调整角色对话内容失败:', error)
            // 降级：返回原始内容
            return originalContent
        }
    }

    // 生成自动对话继续判定提示词
    generateAutoChatContinuePrompt(config, recentMessages, currentRound) {
        let prompt = `你是自动对话控制器，负责判断是否应该继续角色的自主对话。\n\n`

        prompt += `【当前对话状态】\n`
        prompt += `当前轮数：${currentRound}\n`
        prompt += `场景：${config.description || '酒馆内'}\n`

        // 添加在场角色
        if (config.characters && config.characters.length > 0) {
            prompt += `在场角色：${config.characters.map(c => c.name).join('、')}\n`
        }

        // 添加最近的对话
        if (recentMessages.length > 0) {
            prompt += `\n【最近对话】\n`
            recentMessages.slice(-5).forEach(msg => {
                const sender = msg.senderId ? 
                    config.characters?.find(c => c.id === msg.senderId)?.name || '角色' : 
                    '用户'
                prompt += `${sender}：${msg.content}\n`
            })
        }

        prompt += `\n【判定标准】\n`
        prompt += `1. 话题自然度：对话是否自然流畅，没有明显的结束迹象\n`
        prompt += `2. 角色参与度：角色们是否还有话想说，对话是否还有发展空间\n`
        prompt += `3. 场景相关性：对话是否仍然与当前场景相关\n`
        prompt += `4. 重复度：对话是否陷入重复循环\n`
        prompt += `5. 轮数限制：建议在 10-15 轮内结束，避免无限对话\n\n`

        prompt += `【输出格式】\n`
        prompt += `按以下格式输出，不要输出其他内容：\n`
        prompt += `继续：YES/NO\n`
        prompt += `间隔：X秒（X为1-10之间的整数，YES时必填，NO时填0）\n`
        prompt += `理由：简要说明判断理由\n\n`

        prompt += `示例：\n`
        prompt += `继续：YES\n`
        prompt += `间隔：3\n`
        prompt += `理由：角色们正在讨论感兴趣的话题，对话自然流畅\n\n`

        prompt += `或：\n`
        prompt += `继续：NO\n`
        prompt += `间隔：0\n`
        prompt += `理由：话题已自然结束，角色们无话可说`

        return prompt
    }

    // 判断是否继续自动对话
    async shouldContinueAutoChat(config, recentMessages, currentRound, aiSettings) {
        try {
            const prompt = this.generateAutoChatContinuePrompt(config, recentMessages, currentRound)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const content = response.choices?.[0]?.message?.content || response.content || ''

            // 解析结果
            const shouldContinue = content.includes('继续：YES') || content.includes('继续：是')
            
            // 提取间隔时间
            const intervalMatch = content.match(/间隔[：:]\s*(\d+)/)
            const interval = intervalMatch ? parseInt(intervalMatch[1]) : 3

            // 提取理由
            const reasonMatch = content.match(/理由[：:]\s*(.+)/)
            const reason = reasonMatch ? reasonMatch[1].trim() : ''

            console.log(`[自动对话判定] 继续：${shouldContinue ? 'YES' : 'NO'}, 间隔：${interval}秒, 理由：${reason}`)

            return {
                shouldContinue,
                interval: shouldContinue ? Math.min(Math.max(interval, 1), 10) : 0,
                reason
            }
        } catch (error) {
            console.error('判断是否继续自动对话失败:', error)
            // 降级：默认继续，间隔3秒
            return {
                shouldContinue: true,
                interval: 3,
                reason: '判定失败，使用默认值'
            }
        }
    }
}

// 创建全局实例
export const tavernAIService = new TavernAIService()