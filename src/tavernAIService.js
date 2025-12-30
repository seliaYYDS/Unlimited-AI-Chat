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
    generateCharacterSystemPrompt(character, worldSettings, memories, recentMessages, config = null) {
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

        // 在场角色信息
        if (config && config.characters && config.characters.length > 0) {
            const otherCharacters = config.characters.filter(c => c.id !== character.id)
            if (otherCharacters.length > 0) {
                prompt += `\n【在场角色】\n`
                prompt += `注意：只有在满足特定条件时才与这些角色互动（详见"对话与表达规则"）\n`
                otherCharacters.forEach(char => {
                    let info = `- ${char.name}：${char.role || '未设定'}`
                    if (character.relationships && character.relationships[char.name]) {
                        const relation = character.relationships[char.name]
                        info += `（${relation}）`
                        // 标记密切关系
                        if (['上级', '下级', '亲密朋友', '家人', '夫妻', '父子', '母女', '兄弟', '姐妹'].includes(relation)) {
                            info += ` [密切关系]`
                        }
                    }
                    prompt += info + '\n'
                })
            }
        }

        // 用户人设信息
        if (config && config.userPersona) {
            const userPersona = config.userPersona
            prompt += `\n【用户人设】\n`
            if (userPersona.identity) {
                prompt += `用户身份：${userPersona.identity}\n`
            }
            if (userPersona.personality) {
                prompt += `用户性格：${userPersona.personality}\n`
            }
            if (userPersona.relationships) {
                prompt += `与角色的关系：${userPersona.relationships}\n`
            }
            if (userPersona.other) {
                prompt += `其他设定：${userPersona.other}\n`
            }
            prompt += `⚠️ 重要：你需要根据用户的身份、性格和与角色的关系来调整你的回复方式和语气。\n`
        }

        // 对话与表达规则
        prompt += `\n【对话与表达规则】\n`
        prompt += `1. 动作表情：必须用圆括号「（）」插入自然动作/微表情，贴合当前对话情绪，每轮回复0-2个动作；\n`
        prompt += `2. 回复规范：\n`
        prompt += `   - 长度控制：单轮回复1-3句话，每句不超过15字，避免冗长叙述；\n`
        prompt += `   - 语气匹配：开心时语气轻快、愤怒时语气急促、失落时语气低沉；\n`
        prompt += `   - 用词适配：优先使用符合身份的词汇；\n`
        prompt += `3. 上下文衔接：必须呼应最近3轮对话中的关键信息；\n`
        prompt += `4. 角色间互动（克制原则）：\n`
        prompt += `   - 不要主动与其他角色互动，除非满足以下条件之一：\n`
        prompt += `     a) 用户明确要求你与某个角色互动；\n`
        prompt += `     b) 你与某个角色关系密切（上级/下级/亲密朋友/家人）；\n`
        prompt += `     c) 当前对话中提到了与某个角色密切相关的话题；\n`
        prompt += `     d) 某个角色直接向你提问；\n`
        prompt += `     e) 某个角色在发言中提到你；\n`
        prompt += `   - 如果不满足上述条件，只回应用户，不要与其他角色互动；\n`
        prompt += `   - 优先回应用户，保持对话的连贯性。\n`

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

        // 添加用户人设信息
        if (config.userPersona) {
            prompt += `\n【用户人设】\n`
            if (config.userPersona.identity) {
                prompt += `用户身份：${config.userPersona.identity}\n`
            }
            if (config.userPersona.personality) {
                prompt += `用户性格：${config.userPersona.personality}\n`
            }
            if (config.userPersona.relationships) {
                prompt += `与角色的关系：${config.userPersona.relationships}\n`
            }
            if (config.userPersona.other) {
                prompt += `其他设定：${config.userPersona.other}\n`
            }
            prompt += `⚠️ 重要：你需要根据用户的身份、性格和与角色的关系来调整发言判定。\n`
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
        prompt += `4. 关系关联：触发消息来自角色的亲密/需要关注的对象（如发小、需要照顾的学徒），或与用户关系密切；\n`
        prompt += `5. 人设关联：角色人设决定其会主动介入该话题（如热心人设会回应客人的困扰）；\n`
        prompt += `6. 用户关联：用户人设与角色关系密切，角色应该主动回应或关注。\n\n`

        prompt += `【排除条件（满足任意1项即判定为"不应该发言"）】\n`
        prompt += `1. 话题无关：触发消息与角色身份、关注领域、人际关系均无关联；\n`
        prompt += `2. 场景不适：当前场景下角色无互动义务（如客人在角落私聊时，调酒师不主动介入）；\n`
        prompt += `3. 人设冲突：主动发言会违背角色人设（如内向人设不会主动搭话陌生话题）；\n`
        prompt += `4. 重复冗余：已有其他角色完全回应该话题，角色再发言无新增信息；\n`
        prompt += `5. 关系疏远：与用户关系疏远，且话题与角色职责无关。\n\n`

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
        let prompt = `你是对话判定器，负责判断多个角色是否需要参与当前对话，并智能选择最合适的角色发言。\n\n`

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
            // 添加角色关系（如果有）
            if (char.relationships && Object.keys(char.relationships).length > 0) {
                prompt += `  角色关系：${Object.entries(char.relationships).map(([name, rel]) => `${name}(${rel})`).join('、')}\n`
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

        // 添加用户人设信息
        if (config.userPersona) {
            prompt += `\n【用户人设】\n`
            if (config.userPersona.identity) {
                prompt += `用户身份：${config.userPersona.identity}\n`
            }
            if (config.userPersona.personality) {
                prompt += `用户性格：${config.userPersona.personality}\n`
            }
            if (config.userPersona.relationships) {
                prompt += `与角色的关系：${config.userPersona.relationships}\n`
            }
            if (config.userPersona.other) {
                prompt += `其他设定：${config.userPersona.other}\n`
            }
            prompt += `⚠️ 重要：你需要根据用户的身份、性格和与角色的关系来调整发言判定和选择。\n`
        }

        if (recentMessages && recentMessages.length > 0) {
            prompt += `\n【完整对话上下文】\n`
            recentMessages.slice(-5).forEach((msg, index) => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName || '角色'}：${msg.content}\n`
                }
            })
            prompt += '\n'
        }

        prompt += `【智能选择原则】\n`
        prompt += `1. 最优匹配：当多个角色都能回应时，选择最符合触发消息意图的角色\n`
        prompt += `2. 角色分工：考虑角色的职责分工，避免职责重叠（如：服务员负责迎宾，老板负责管理）\n`
        prompt += `3. 上下文连贯：如果之前已有角色在回应，其他角色除非有新信息补充，否则不应打断\n`
        prompt += `4. 优先级考虑：优先级高的角色在职责重叠时优先发言\n`
        prompt += `5. 关系影响：考虑角色间关系，如上级/下级、亲密/疏远会影响发言顺序\n`
        prompt += `6. 用户关系：考虑与用户的关系，如熟人、陌生人、常客等会影响发言倾向\n\n`

        prompt += `【判定维度（满足任意1项即可判定为"应该发言"）】\n`
        prompt += `1. 直接关联：触发消息中提到角色名称、角色身份，或直接向该角色提问；\n`
        prompt += `2. 领域关联：触发消息涉及角色的关注领域（如调酒师被问酒品、安全员被提安全问题）；\n`
        prompt += `3. 场景关联：当前场景下角色有义务/习惯回应（如服务员在顾客进门时需欢迎）；\n`
        prompt += `4. 关系关联：触发消息来自角色的亲密/需要关注的对象（如发小、需要照顾的学徒），或与用户关系密切；\n`
        prompt += `5. 人设关联：角色人设决定其会主动介入该话题（如热心人设会回应客人的困扰）；\n`
        prompt += `6. 用户关联：用户人设与角色关系密切，角色应该主动回应或关注。\n\n`

        prompt += `【排除条件（满足任意1项即判定为"不应该发言"）】\n`
        prompt += `1. 话题无关：触发消息与角色身份、关注领域、人际关系均无关联；\n`
        prompt += `2. 场景不适：当前场景下角色无互动义务（如客人在角落私聊时，服务员不主动介入）；\n`
        prompt += `3. 人设冲突：主动发言会违背角色人设（如内向人设不会主动搭话陌生话题）；\n`
        prompt += `4. 重复冗余：已有其他角色完全回应该话题，且该角色无法提供新信息；\n`
        prompt += `5. 职责重叠：其他角色更适合回应（如顾客说"有人吗"，服务员比老板更适合回应）；\n`
        prompt += `6. 设定冲突：角色的限制条件与全局记忆冲突（如角色仅周六出现，但今天是周一）；\n`
        prompt += `7. 时间冲突：角色的出现时间与当前时间不符（如角色仅在晚上出现，但现在是白天）；\n`
        prompt += `8. 简单附和：角色只能表达简单的赞同、确认等，无法提供实质性内容；\n`
        prompt += `9. 对话完整：当前对话已经自然结束，没有未完成的问题、请求或话题；\n`
        prompt += `10. 无需补充：最近的发言已经完整回应了用户的问题或需求，没有遗漏；\n`
        prompt += `11. 关系疏远：与用户关系疏远，且话题与角色职责无关。\n\n`

        prompt += `【补充对话的严格标准】\n`
        prompt += `只有在以下情况之一时，角色才应该补充发言：\n`
        prompt += `1. 有未回答的问题：上一条消息中包含问题，但未被回应；\n`
        prompt += `2. 有未完成的请求：上一条消息中包含请求，但未被满足；\n`
        prompt += `3. 有需要澄清的信息：对话中存在模糊或需要进一步说明的内容；\n`
        prompt += `4. 有新的重要信息：角色掌握其他角色不知道的重要信息，需要补充；\n`
        prompt += `5. 有需要回应的反问：上一条消息包含反问，需要回应。\n\n`
        prompt += `以下情况绝对不应该补充发言：\n`
        prompt += `1. 简单的"是"、"好的"、"明白"等附和性发言；\n`
        prompt += `2. 重复之前已经说过的内容；\n`
        prompt += `3. 与当前话题无关的闲聊；\n`
        prompt += `4. 对话已经自然结束，没有继续的必要。\n\n`

        prompt += `⚠️ 重要：\n`
        prompt += `- 必须严格检查角色的限制条件是否与全局记忆冲突，冲突则该角色不应该发言\n`
        prompt += `- 当多个角色都能回应时，只选择最合适的1-2个角色发言，避免全体刷屏\n`
        prompt += `- 优先选择职责最匹配、优先级最高、关系最相关的角色\n`
        prompt += `- 补充对话必须严格遵循"补充对话的严格标准"，避免不必要的发言\n`
        prompt += `- 宁可不补充，也不要让角色进行无意义的附和发言\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出应该发言的角色名称列表（按优先级排序），用逗号分隔，不要输出其他内容。\n`
        prompt += `如果没有角色应该发言，输出 NONE\n`
        prompt += `示例1：服务员小美\n`
        prompt += `示例2：服务员小美,老板张三\n`
        prompt += `示例3：NONE`

        return prompt
    }

    // 生成补充对话判定提示词（更严格的判断标准，但鼓励角色间互动）
    generateSupplementPrompt(characters, config, recentMessages) {
        let prompt = `你是补充对话判定器，负责判断在当前对话结束后，是否有角色需要补充发言。\n\n`

        prompt += `【在场角色列表】\n`
        characters.forEach(char => {
            prompt += `- ${char.name}（${char.role || '未设定'}）\n`
            prompt += `  人设：${char.personality || '未设定'}\n`
            if (char.relationships && Object.keys(char.relationships).length > 0) {
                prompt += `  角色关系：${Object.entries(char.relationships).map(([name, rel]) => `${name}(${rel})`).join('、')}\n`
            }
        })

        // 添加用户人设信息
        if (config.userPersona) {
            prompt += `\n【用户人设】\n`
            if (config.userPersona.identity) {
                prompt += `用户身份：${config.userPersona.identity}\n`
            }
            if (config.userPersona.personality) {
                prompt += `用户性格：${config.userPersona.personality}\n`
            }
            if (config.userPersona.relationships) {
                prompt += `与角色的关系：${config.userPersona.relationships}\n`
            }
            if (config.userPersona.other) {
                prompt += `其他设定：${config.userPersona.other}\n`
            }
            prompt += `⚠️ 重要：你需要根据用户的身份、性格和与角色的关系来调整补充发言判定。\n`
        }

        prompt += `\n【最近对话上下文】\n`
        if (recentMessages && recentMessages.length > 0) {
            recentMessages.slice(-5).forEach((msg, index) => {
                if (msg.type === 'user') {
                    prompt += `用户：${msg.content}\n`
                } else if (msg.type === 'character') {
                    prompt += `${msg.senderName || '角色'}：${msg.content}\n`
                }
            })
        } else {
            prompt += `（暂无对话记录）\n`
        }
        prompt += '\n'

        prompt += `【核心判定原则】\n`
        prompt += `优先级排序：回答用户问题 > 回答角色问题 > 提供补充信息 > 保持对话连贯性\n`
        prompt += `补充发言应该以服务用户对话为核心，同时积极回应其他角色的明确提问\n`
        prompt += `考虑与用户的关系亲密度，关系密切的角色应更积极地回应\n\n`

        prompt += `【应该补充发言的情况（按优先级排序）】\n`
        prompt += `【高优先级 - 必须回应】\n`
        prompt += `1. 回答用户问题：用户提出的问题未被完全回答，需要补充说明或提供更多细节\n`
        prompt += `2. 回答角色问题：其他角色明确向该角色提问，必须回应（优先级仅次于回答用户问题）\n`
        prompt += `3. 用户请求未完成：用户的请求需要多个角色配合完成，该角色需要补充行动\n\n`

        prompt += `【中优先级 - 可以补充】\n`
        prompt += `4. 角色间直接互动：上一条消息中明确提到某个角色（如"角色B有人找你"），该角色应该回应\n`
        prompt += `5. 有未回答的问题：上一条消息中包含问题，但未被回应\n`
        prompt += `6. 有未完成的请求：上一条消息中包含请求，但未被满足\n`
        prompt += `7. 有需要澄清的信息：对话中存在模糊或需要进一步说明的内容\n`
        prompt += `8. 有新的重要信息：角色掌握其他角色不知道的重要信息，需要补充\n`
        prompt += `9. 有需要回应的反问：上一条消息包含反问，需要回应\n\n`

        prompt += `【低优先级 - 谨慎补充】\n`
        prompt += `10. 对话延续：当前对话可以自然延续，该角色有相关话题可以补充\n`
        prompt += `11. 场景互动：当前场景下该角色有义务/习惯进行互动（如服务员主动询问客人需求）\n\n`

        prompt += `【绝对不应该补充发言的情况】\n`
        prompt += `1. 简单的"是"、"好的"、"明白"等附和性发言\n`
        prompt += `2. 重复之前已经说过的内容\n`
        prompt += `3. 与当前话题无关的闲聊\n`
        prompt += `4. 对话已经自然结束，没有继续的必要\n`
        prompt += `5. 只是表达赞同或确认，没有新信息补充\n`
        prompt += `6. 只是打招呼或客套话\n`
        prompt += `7. 只是表达情绪或感想，没有实质性内容\n`
        prompt += `8. 只是泛泛地提到某个角色，但没有明确的互动意图（如"今天大家都很好"）\n`
        prompt += `9. 只是描述场景或状态，没有需要回应的内容\n`
        prompt += `10. 用户问题已被完整回答，无需补充\n`
        prompt += `11. 与用户关系疏远，且话题与角色职责无关\n\n`

        prompt += `【角色间互动的判定标准】\n`
        prompt += `以下情况算作"角色明确提问"，必须回应：\n`
        prompt += `- 直接提问："服务员，你知道...吗？" "厨师，这道菜怎么做？"\n`
        prompt += `- 询问意见："大家觉得这个提议怎么样？" "老板，您怎么看？"\n`
        prompt += `- 请求确认："这个可以吗？" "这样处理对吗？"\n`
        prompt += `- 请求帮助："能帮我一下吗？" "需要你的配合"\n\n`

        prompt += `以下情况不算"明确提问"，可以不回应：\n`
        prompt += `- 泛泛提及："今天大家都很好"\n`
        prompt += `- 场景描述："客人们都在用餐"\n`
        prompt += `- 一般陈述："我们这里服务很好"\n`
        prompt += `- 简单问候："大家好"\n`
        prompt += `- 自言自语或感叹："真不错啊"\n\n`

        prompt += `【判定原则】\n`
        prompt += `1. 用户优先：回答用户问题永远是最高优先级\n`
        prompt += `2. 积极互动：当其他角色明确提问时，应该积极回应，保持对话生动\n`
        prompt += `3. 关系考虑：考虑与用户的关系亲密度，关系密切的角色应更积极地回应\n`
        prompt += `4. 必须有实质内容：补充内容必须对对话有实质性的推进或澄清作用\n`
        prompt += `5. 最多选择1-2个角色补充发言\n`
        prompt += `6. 如果对话已经自然结束，必须输出NONE\n`
        prompt += `7. 宁可不补充，也不要让角色进行无意义的附和发言\n\n`

        prompt += `【输出格式】\n`
        prompt += `仅输出应该补充发言的角色名称，不要输出其他内容。\n`
        prompt += `如果没有角色需要补充发言，输出 NONE\n\n`

        prompt += `【示例说明】\n`
        prompt += `示例1（角色间互动）\n`
        prompt += `角色A：老板，客人说今天账单有问题\n`
        prompt += `→ 应该补充：老板（因为被直接提到且有具体事由）\n\n`

        prompt += `示例2（角色间提问）\n`
        prompt += `角色A：服务员，你知道客人点的菜是什么吗？\n`
        prompt += `→ 应该补充：服务员（因为被直接提问）\n\n`

        prompt += `示例3（不应该补充）\n`
        prompt += `角色A：今天大家都很好\n`
        prompt += `→ 不应该补充：NONE（只是泛泛提到，没有明确互动意图）\n\n`

        prompt += `示例4（不应该补充）\n`
        prompt += `角色A：好的，我明白了\n`
        prompt += `→ 不应该补充：NONE（只是简单的附和）\n\n`

        prompt += `示例5（不应该补充）\n`
        prompt += `角色A：今天天气真不错\n`
        prompt += `→ 不应该补充：NONE（对话已经自然结束）\n\n`

        prompt += `示例6（应该补充）\n`
        prompt += `角色A：服务员小美，客人说菜太咸了\n`
        prompt += `→ 应该补充：服务员小美（被明确提到且有具体问题需要回应）\n\n`

        prompt += `最终输出示例：\n`
        prompt += `服务员小美\n`
        prompt += `或：NONE`

        return prompt
    }

    // 批量判断角色是否应该发言
    async batchShouldSpeak(characters, config, recentMessages, aiSettings, isSupplement = false) {
        try {
            // 根据是否为补充对话模式选择不同的提示词
            let prompt;
            if (isSupplement) {
                prompt = this.generateSupplementPrompt(characters, config, recentMessages)
            } else {
                prompt = this.generateBatchShouldSpeakPrompt(characters, config, recentMessages)
            }

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

            // 补充对话模式：最多返回1个角色
            if (isSupplement) {
                if (responsiveCharacters.length > 1) {
                    console.log(`[补充对话] 限制为1个角色`)
                    responsiveCharacters.length = 1
                }
                console.log('[补充对话] 应该补充发言的角色:', responsiveCharacters.map(c => c.name).join(', '))
            } else {
                // 普通模式：最多返回2个角色
                const maxSpeakers = 2
                if (responsiveCharacters.length > maxSpeakers) {
                    console.log(`[批量发言判断] 限制发言角色数从 ${responsiveCharacters.length} 到 ${maxSpeakers}`)
                    responsiveCharacters.length = maxSpeakers
                }
                console.log('[批量发言判断] 应该发言的角色:', responsiveCharacters.map(c => c.name).join(', '))
            }
            
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
                recentMessages,
                config
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

            // 用户人设信息
            if (config && config.userPersona) {
                const userPersona = config.userPersona
                prompt += `\n【用户人设】\n`
                if (userPersona.identity) {
                    prompt += `用户身份：${userPersona.identity}\n`
                }
                if (userPersona.personality) {
                    prompt += `用户性格：${userPersona.personality}\n`
                }
                if (userPersona.relationships) {
                    prompt += `与角色的关系：${userPersona.relationships}\n`
                }
                if (userPersona.other) {
                    prompt += `其他设定：${userPersona.other}\n`
                }
                prompt += `⚠️ 重要：你需要根据用户的身份、性格和与角色的关系来调整你的回复方式和语气。\n`
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
            prompt += `1. 互动克制：不要主动与其他角色互动，除非满足以下条件之一：\n`
            prompt += `   - 用户明确要求你与某个角色互动（如："你去叫一下服务员"）；\n`
            prompt += `   - 你与某个角色关系密切（如：上级/下级、亲密朋友、家人）；\n`
            prompt += `   - 当前对话中提到了与某个角色密切相关的话题；\n`
            prompt += `   - 某个角色直接向你提问或提到你；\n`
            prompt += `2. 优先回应用户：如果没有满足上述条件，优先回应用户，不要主动与其他角色互动；\n`
            prompt += `3. 目的明确：发言需围绕"回应用户""推进短期目标""回应自身状态"展开；\n`
            prompt += `4. 表达规范：\n`
            prompt += `   - 长度：1-2句话，每句不超过12字，简洁自然；\n`
            prompt += `   - 动作表情：搭配1个符合当前状态的微动作/表情（用圆括号标注），如：（看向服务员）；\n`
            prompt += `   - 语气：匹配当前情绪，如：焦虑时语气急促·无聊时语气慵懒；\n`
            prompt += `5. 互动指向：明确对话对象，优先回应用户，避免无指向性发言；\n`
            prompt += `6. 场景适配：发言内容贴合当前场景，如：酒馆起雾时可聊雾天相关话题·空闲时可聊调酒相关内容。\n\n`

            prompt += `【角色间互动条件（必须满足之一）】\n`
            prompt += `1. 用户明确要求：用户说"你去叫一下服务员"→ 可以与服务员互动；\n`
            prompt += `2. 关系密切：与某个角色是上级/下级/亲密朋友/家人→ 可以主动互动；\n`
            prompt += `3. 话题相关：对话中提到了某个角色的专业领域或职责→ 可以互动；\n`
            prompt += `4. 直接提问：某个角色直接向你提问→ 必须回应；\n`
            prompt += `5. 被提到：某个角色在发言中提到你→ 应该回应。\n\n`

            prompt += `【角色间互动示例】\n`
            prompt += `示例1（用户要求）：用户说"你去叫一下服务员"→ （看向服务员）老板叫你过去一下。\n`
            prompt += `示例2（关系密切）：与老板是上下级关系→ （看向老板）老板，今天的菜卖得怎么样？\n`
            prompt += `示例3（话题相关）：对话中提到厨师→ （看向厨师）厨师，这道菜需要重新做吗？\n`
            prompt += `示例4（直接提问）：服务员问你今天的菜卖得怎么样→ 还不错，比昨天好。\n`
            prompt += `示例5（被提到）：老板提到你→ （看向老板）老板，我在。\n`
            prompt += `示例6（回复用户）：用户说"我要点菜"→ 好的，请稍等。\n\n`

            // 在场角色状态
            if (config.characters && config.characters.length > 0) {
                prompt += `【当前在场角色状态】\n`
                prompt += `注意：只有在满足特定条件时才与这些角色互动（详见"自主发言规则"）\n`
                config.characters.forEach(char => {
                    if (char.id !== character.id) {
                        let status = '空闲·在场'
                        if (char.relationships && character.relationships && char.relationships[character.name]) {
                            const relation = char.relationships[character.name]
                            status += `（${relation}）`
                            // 标记密切关系
                            if (['上级', '下级', '亲密朋友', '家人', '夫妻', '父子', '母女', '兄弟', '姐妹'].includes(relation)) {
                                status += ` [密切关系]`
                            }
                        }
                        prompt += `- ${char.name}：${status}·身份：${char.role || '未设定'}\n`
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
            prompt += `1. 直接生成角色的发言内容，无需任何前缀/后缀；\n`
            prompt += `2. 优先与其他角色互动，不要只关注用户；\n`
            prompt += `3. 如果对话中其他角色提到你，必须回应；\n`
            prompt += `4. 发言内容要自然流畅，符合人设和场景。\n\n`

            prompt += `【发言示例】\n`
            prompt += `示例1（向其他角色提问）：（看向服务员）小美，今天的菜卖得怎么样？\n`
            prompt += `示例2（回应其他角色）：老板说得对，确实如此。\n`
            prompt += `示例3（回复用户）：好的，我这就去处理。\n`
            prompt += `示例4（主动发起）：今天天气不错，要不要去外面透透气？\n`
            prompt += `示例5（分享信息）：刚才有个客人说菜太咸了。\n\n`

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

    // 生成对话总结提示词
    generateSummaryPrompt(config, messages, memoryType, character = null) {
        let prompt = `你是对话记忆总结员，从对话中提取关键信息点生成简洁记忆。\n\n`

        if (memoryType === 'character' && character) {
            prompt += `【角色】${character.name}\n`
        }

        prompt += `【对话内容】\n`
        messages.forEach(msg => {
            if (msg.type === 'user') {
                prompt += `用户：${msg.content}\n`
            } else if (msg.type === 'character') {
                const sender = msg.senderName || '角色'
                prompt += `${sender}：${msg.content}\n`
            }
        })

        prompt += `\n【总结要求】\n`
        prompt += `1. 仅提取对话中的具体信息点（事件、事实、决策、关系等）\n`
        prompt += `2. 不要重复角色的人设、性格、语言风格等固有属性\n`
        prompt += `3. 不要添加任何描述性文字或解释\n`
        prompt += `4. 使用简洁的陈述句，每条信息用分号分隔\n`
        prompt += `5. 总字数控制在80字以内\n\n`

        prompt += `【示例】\n`
        prompt += `输入：角色A说"我今天去了市场，买了些苹果，还遇到了老朋友B"\n`
        prompt += `输出：去过市场买苹果；遇到老朋友B\n\n`

        prompt += `【输出】\n`
        prompt += `直接输出总结内容，不要任何前缀后缀。`

        return prompt
    }

    // 总结对话生成记忆
    async summarizeConversation(config, messages, aiSettings, memoryType = 'global', character = null) {
        try {
            if (!messages || messages.length === 0) {
                console.warn('[对话总结] 没有可总结的对话记录')
                return null
            }

            const prompt = this.generateSummaryPrompt(config, messages, memoryType, character)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const summary = response.choices?.[0]?.message?.content || response.content || ''

            if (!summary || summary.trim().length === 0) {
                console.warn('[对话总结] AI 返回空内容')
                return null
            }

            console.log(`[对话总结] ${memoryType === 'global' ? '全局' : character?.name} 记忆已生成:`, summary)
            
            return summary.trim()
        } catch (error) {
            console.error('总结对话失败:', error)
            throw error
        }
    }

    // ==================== AI内容生成方法 ====================

    // 生成世界设定提示词
    generateWorldSettingsPrompt(existingSettings = '', userHint = '') {
        let prompt = `你是世界设定创作专家，负责创建或优化酒馆场景的世界观设定。\n\n`

        if (existingSettings && existingSettings.trim()) {
            prompt += `【现有世界设定】\n${existingSettings}\n\n`
            prompt += `【任务】\n请对上述现有世界设定进行补充和优化，使其更加丰富和完整。优化时应：\n`
            prompt += `1. 保留原有的核心设定和特色元素\n`
            prompt += `2. 补充缺失的细节，如地理环境、社会结构、文化特色等\n`
            prompt += `3. 深化设定内涵，使世界观更加立体\n`
            prompt += `4. 保持原设定的风格和基调\n\n`
        } else {
            prompt += `【任务】\n请为酒馆场景创建一个完整的、富有想象力的世界设定。设定应包括：\n`
            prompt += `1. 场景名称和地理位置\n`
            prompt += `2. 历史背景和文化特色\n`
            prompt += `3. 社会体系和权力结构\n`
            prompt += `4. 物理法则和特殊规则（如有）\n`
            prompt += `5. 重要地点或地标\n`
            prompt += `6. 潜在的冲突和矛盾\n\n`
        }

        if (userHint && userHint.trim()) {
            prompt += `【用户提供的参考信息】\n${userHint}\n\n`
            prompt += `请在生成设定时参考上述用户提供的参考信息。\n\n`
        }

        prompt += `【输出要求】\n`
        prompt += `1. 直接输出世界设定内容，不要任何前缀或后缀\n`
        prompt += `2. 使用清晰的结构和分段\n`
        prompt += `3. 设定要具体、生动，有画面感\n`
        prompt += `4. 避免过于抽象或空泛的描述\n`
        prompt += `5. 总字数控制在200-500字之间\n\n`

        prompt += `【示例】\n`
        prompt += `落风镇位于魔兽森林边缘，是被遗忘之地最后的文明据点。镇上只有一家酒馆"避风港"，来往客人多是猎人、佣兵和逃犯。小镇实行松散的自治制度，由几位资深冒险者组成的"长老会"维持秩序。这里没有明确的法律，只有一条不成文的规矩：在酒馆内不得动武。落风镇的特殊之处在于，每当满月之夜，森林深处会传来神秘的歌声，据说那是上古精灵的呼唤，吸引着无数冒险者深入探索。`

        return prompt
    }

    // 生成世界设定
    async generateWorldSettings(existingSettings = '', userHint = '', aiSettings) {
        try {
            const prompt = this.generateWorldSettingsPrompt(existingSettings, userHint)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const result = response.choices?.[0]?.message?.content || response.content || ''

            if (!result || result.trim().length === 0) {
                console.warn('[世界设定生成] AI 返回空内容')
                return null
            }

            console.log('[世界设定生成] 生成成功:', result.trim())
            
            return result.trim()
        } catch (error) {
            console.error('生成世界设定失败:', error)
            throw error
        }
    }

    // 生成角色信息提示词
    generateCharacterInfoPrompt(characterInfo = {}, worldSettings = '', hint = '') {
        let prompt = `你是角色设定创作专家，负责创建或优化角色的详细人设信息。\n\n`

        if (worldSettings && worldSettings.trim()) {
            prompt += `【世界设定】\n${worldSettings}\n\n`
        }

        const hasExistingInfo = characterInfo.name || characterInfo.role || characterInfo.personality || 
                               characterInfo.style || characterInfo.rules || characterInfo.goal || 
                               characterInfo.relationships

        if (hasExistingInfo) {
            prompt += `【现有角色信息】\n`
            if (characterInfo.name) prompt += `角色名称：${characterInfo.name}\n`
            if (characterInfo.role) prompt += `角色身份：${characterInfo.role}\n`
            if (characterInfo.personality) prompt += `核心人设：${characterInfo.personality}\n`
            if (characterInfo.style) prompt += `语言风格：${characterInfo.style}\n`
            if (characterInfo.rules) prompt += `行为准则：${characterInfo.rules}\n`
            if (characterInfo.goal) prompt += `个人目标：${characterInfo.goal}\n`
            if (characterInfo.relationships) prompt += `角色关系：${characterInfo.relationships}\n\n`
            
            prompt += `【任务】\n请基于上述现有角色信息和世界设定，对角色设定进行补充和优化。优化时应：\n`
            prompt += `1. 保留原有的核心人设和特色\n`
            prompt += `2. 补充缺失的设定细节\n`
            prompt += `3. 深化角色个性，使其更加立体\n`
            prompt += `4. 确保角色设定符合世界观\n\n`
        } else {
            prompt += `【任务】\n请基于世界设定创建一个全新的、富有特色的角色设定。设定应包括：\n`
            prompt += `1. 角色名称（有特色的姓名）\n`
            prompt += `2. 角色身份（符合世界观的职业或社会地位）\n`
            prompt += `3. 核心人设（性格特点、价值观、信念）\n`
            prompt += `4. 语言风格（说话方式、口头禅、语气）\n`
            prompt += `5. 行为准则（做事的原则和底线）\n`
            prompt += `6. 个人目标（短期或长期目标）\n`
            prompt += `7. 角色关系（与其他角色的关系）\n\n`
        }

        if (hint && hint.trim()) {
            prompt += `【用户提供的参考信息】\n${hint}\n\n`
            prompt += `请在创建或优化角色时参考上述用户提供的参考信息。\n\n`
        }

        prompt += `【输出要求】\n`
        prompt += `请按照以下JSON格式输出角色信息，不要添加任何其他文字：\n\n`
        prompt += `{\n`
        prompt += `  "name": "角色名称",\n`
        prompt += `  "role": "角色身份",\n`
        prompt += `  "personality": "核心人设",\n`
        prompt += `  "style": "语言风格",\n`
        prompt += `  "rules": "行为准则",\n`
        prompt += `  "goal": "个人目标",\n`
        prompt += `  "relationships": "角色关系"\n`
        prompt += `}\n\n`

        return prompt
    }

    // 生成/优化角色信息
    async generateCharacterInfo(characterInfo = {}, worldSettings = '', aiSettings, hint = '') {
        try {
            const prompt = this.generateCharacterInfoPrompt(characterInfo, worldSettings, hint)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const result = response.choices?.[0]?.message?.content || response.content || ''

            if (!result || result.trim().length === 0) {
                console.warn('[角色信息生成] AI 返回空内容')
                return null
            }

            // 尝试解析JSON
            let characterData
            try {
                // 提取JSON部分（可能被包裹在其他文本中）
                const jsonMatch = result.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    characterData = JSON.parse(jsonMatch[0])
                } else {
                    characterData = JSON.parse(result)
                }
            } catch (e) {
                console.warn('[角色信息生成] JSON解析失败，尝试手动解析')
                // 如果JSON解析失败，尝试从文本中提取信息
                characterData = {
                    name: characterInfo.name || '未命名角色',
                    role: characterInfo.role || '未设定',
                    personality: characterInfo.personality || result,
                    style: characterInfo.style || '自然对话',
                    rules: characterInfo.rules || '',
                    goal: characterInfo.goal || '',
                    relationships: characterInfo.relationships || ''
                }
            }

            console.log('[角色信息生成] 生成成功:', characterData)
            
            return characterData
        } catch (error) {
            console.error('生成角色信息失败:', error)
            throw error
        }
    }

    // 生成随机角色提示词
    generateRandomCharacterPrompt(worldSettings = '', hint = '') {
        let prompt = `你是角色创作专家，负责基于世界设定创建全新的随机角色。\n\n`

        if (worldSettings && worldSettings.trim()) {
            prompt += `【世界设定】\n${worldSettings}\n\n`
        }

        prompt += `【任务】\n请基于世界设定创建一个全新的、富有特色的角色。这个角色应该：\n`
        prompt += `1. 符合世界观和场景设定\n`
        prompt += `2. 有明确的身份和职业\n`
        prompt += `3. 有鲜明的个性和人设\n`
        prompt += `4. 有独特的语言风格\n`
        prompt += `5. 有明确的个人目标或动机\n\n`

        if (hint && hint.trim()) {
            prompt += `【用户提供的参考信息】\n${hint}\n\n`
            prompt += `请在创建角色时参考上述用户提供的参考信息。\n\n`
        }

        prompt += `【输出要求】\n`
        prompt += `请按照以下JSON格式输出角色信息，不要添加任何其他文字：\n\n`
        prompt += `{\n`
        prompt += `  "name": "角色名称",\n`
        prompt += `  "role": "角色身份",\n`
        prompt += `  "personality": "核心人设",\n`
        prompt += `  "style": "语言风格",\n`
        prompt += `  "rules": "行为准则",\n`
        prompt += `  "goal": "个人目标",\n`
        prompt += `  "relationships": "角色关系（如果没有可以留空）"\n`
        prompt += `}\n\n`

        prompt += `【示例】\n`
        prompt += `{\n`
        prompt += `  "name": "艾琳娜",\n`
        prompt += `  "role": "流浪歌手",\n`
        prompt += `  "personality": "自由奔放，热爱冒险，对陌生人友善但保持警惕，喜欢用歌声表达情感",\n`
        prompt += `  "style": "说话带诗意，喜欢用比喻，语气温柔但有力量，经常哼唱旋律",\n`
        prompt += `  "rules": "不向任何人透露自己的过去；不参与任何阵营斗争；保护弱者",\n`
        prompt += `  "goal": "寻找失散的妹妹，收集各地的民谣",\n`
        prompt += `  "relationships": ""\n`
        prompt += `}\n`

        return prompt
    }

    // 生成随机角色
    async generateRandomCharacter(worldSettings = '', hint = '', aiSettings) {
        try {
            const prompt = this.generateRandomCharacterPrompt(worldSettings, hint)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const result = response.choices?.[0]?.message?.content || response.content || ''

            if (!result || result.trim().length === 0) {
                console.warn('[随机角色生成] AI 返回空内容')
                return null
            }

            // 尝试解析JSON
            let characterData
            try {
                // 提取JSON部分（可能被包裹在其他文本中）
                const jsonMatch = result.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    characterData = JSON.parse(jsonMatch[0])
                } else {
                    characterData = JSON.parse(result)
                }
            } catch (e) {
                console.warn('[随机角色生成] JSON解析失败，尝试手动解析')
                // 如果JSON解析失败，返回基本信息
                characterData = {
                    name: '未命名角色',
                    role: '未设定',
                    personality: result,
                    style: '自然对话',
                    rules: '',
                    goal: '',
                    relationships: ''
                }
            }

            // 添加头像（默认）
            characterData.avatar = characterData.avatar || '👤'
            characterData.id = characterData.id || Date.now().toString()

            console.log('[随机角色生成] 生成成功:', characterData)
            
            return characterData
        } catch (error) {
            console.error('生成随机角色失败:', error)
            throw error
        }
    }

    // 生成用户人设提示词
    generateUserPersonaPrompt(existingPersona = {}, worldSettings = '', hint = '') {
        let prompt = `你是人设创作专家，负责创建或优化用户的角色人设。\n\n`

        if (worldSettings && worldSettings.trim()) {
            prompt += `【世界设定】\n${worldSettings}\n\n`
        }

        const hasExistingInfo = existingPersona.identity || existingPersona.personality || 
                               existingPersona.relationships || existingPersona.other

        if (hasExistingInfo) {
            prompt += `【现有用户人设】\n`
            if (existingPersona.identity) prompt += `用户身份：${existingPersona.identity}\n`
            if (existingPersona.personality) prompt += `用户性格：${existingPersona.personality}\n`
            if (existingPersona.relationships) prompt += `与角色的关系：${existingPersona.relationships}\n`
            if (existingPersona.other) prompt += `其他设定：${existingPersona.other}\n\n`
            
            prompt += `【任务】\n请基于上述现有用户人设和世界设定，对人设进行补充和优化。优化时应：\n`
            prompt += `1. 保留原有的核心设定\n`
            prompt += `2. 补充缺失的细节\n`
            prompt += `3. 深化人设，使其更加立体\n`
            prompt += `4. 确保人设符合世界观\n\n`
        } else {
            prompt += `【任务】\n请基于世界设定创建一个完整的用户人设。人设应包括：\n`
            prompt += `1. 用户身份（在世界中的角色）\n`
            prompt += `2. 用户性格（性格特点、价值观）\n`
            prompt += `3. 与角色的关系（与各个角色的关系）\n`
            prompt += `4. 其他设定（特殊能力、背景故事等）\n\n`
        }

        if (hint && hint.trim()) {
            prompt += `【用户提供的参考信息】\n${hint}\n\n`
            prompt += `请在创建或优化用户人设时参考上述用户提供的参考信息。\n\n`
        }

        prompt += `【输出要求】\n`
        prompt += `请按照以下JSON格式输出用户人设信息，不要添加任何其他文字：\n\n`
        prompt += `{\n`
        prompt += `  "identity": "用户身份",\n`
        prompt += `  "personality": "用户性格",\n`
        prompt += `  "relationships": "与角色的关系",\n`
        prompt += `  "other": "其他设定"\n`
        prompt += `}\n\n`

        return prompt
    }

    // 生成/优化用户人设
    async generateUserPersona(existingPersona = {}, worldSettings = '', aiSettings, hint = '') {
        try {
            const prompt = this.generateUserPersonaPrompt(existingPersona, worldSettings, hint)

            const response = await this.callAI(
                aiSettings,
                [{ role: 'user', content: prompt }],
                null,
                null,
                null,
                null
            )

            const result = response.choices?.[0]?.message?.content || response.content || ''

            if (!result || result.trim().length === 0) {
                console.warn('[用户人设生成] AI 返回空内容')
                return null
            }

            // 尝试解析JSON
            let personaData
            try {
                // 提取JSON部分（可能被包裹在其他文本中）
                const jsonMatch = result.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    personaData = JSON.parse(jsonMatch[0])
                } else {
                    personaData = JSON.parse(result)
                }
            } catch (e) {
                console.warn('[用户人设生成] JSON解析失败，尝试手动解析')
                // 如果JSON解析失败，返回基本信息
                personaData = {
                    identity: existingPersona.identity || '未设定',
                    personality: result,
                    relationships: existingPersona.relationships || '',
                    other: existingPersona.other || ''
                }
            }

            console.log('[用户人设生成] 生成成功:', personaData)
            
            return personaData
        } catch (error) {
            console.error('生成用户人设失败:', error)
            throw error
        }
    }
}

// 创建全局实例
export const tavernAIService = new TavernAIService()