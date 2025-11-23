// 本地存储管理模块
export class StorageManager {
    constructor() {
        this.agentsKey = 'ai_agents'
        this.conversationsKey = 'ai_conversations'
        this.settingsKey = 'ai_settings'
    }

    // 智能体管理
    getAgents() {
        try {
            const agents = localStorage.getItem(this.agentsKey)
            return agents ? JSON.parse(agents) : []
        } catch (error) {
            console.error('获取智能体列表失败:', error)
            return []
        }
    }

    saveAgents(agents) {
        try {
            localStorage.setItem(this.agentsKey, JSON.stringify(agents))
            return true
        } catch (error) {
            console.error('保存智能体列表失败:', error)
            return false
        }
    }

    addAgent(agent) {
        const agents = this.getAgents()
        agent.id = this.generateId()
        agent.createdAt = new Date().toISOString()
        agent.updatedAt = new Date().toISOString()
        agents.push(agent)
        return this.saveAgents(agents) ? agent : null
    }

    updateAgent(agentId, updates) {
        const agents = this.getAgents()
        const index = agents.findIndex(a => a.id === agentId)
        if (index !== -1) {
            agents[index] = { ...agents[index], ...updates, updatedAt: new Date().toISOString() }
            return this.saveAgents(agents)
        }
        return false
    }

    deleteAgent(agentId) {
        const agents = this.getAgents().filter(a => a.id !== agentId)
        return this.saveAgents(agents)
    }

    // 对话管理
    getConversations(agentId) {
        try {
            const conversations = localStorage.getItem(this.conversationsKey)
            const allConversations = conversations ? JSON.parse(conversations) : {}
            return allConversations[agentId] || []
        } catch (error) {
            console.error('获取对话历史失败:', error)
            return []
        }
    }

    // 智能体上下文管理
    getAgentContext(agentId) {
        try {
            const contexts = localStorage.getItem('ai_agent_contexts')
            const allContexts = contexts ? JSON.parse(contexts) : {}
            return allContexts[agentId] || {}
        } catch (error) {
            console.error('获取智能体上下文失败:', error)
            return {}
        }
    }

    saveAgentContext(agentId, context) {
        try {
            const contexts = JSON.parse(localStorage.getItem('ai_agent_contexts') || '{}')
            contexts[agentId] = context
            localStorage.setItem('ai_agent_contexts', JSON.stringify(contexts))
            return true
        } catch (error) {
            console.error('保存智能体上下文失败:', error)
            return false
        }
    }

    clearAgentContext(agentId) {
        try {
            const contexts = JSON.parse(localStorage.getItem('ai_agent_contexts') || '{}')
            delete contexts[agentId]
            localStorage.setItem('ai_agent_contexts', JSON.stringify(contexts))
            return true
        } catch (error) {
            console.error('清除智能体上下文失败:', error)
            return false
        }
    }

    saveConversations(agentId, conversations) {
        try {
            const allConversations = JSON.parse(localStorage.getItem(this.conversationsKey) || '{}')
            allConversations[agentId] = conversations
            localStorage.setItem(this.conversationsKey, JSON.stringify(allConversations))
            return true
        } catch (error) {
            console.error('保存对话历史失败:', error)
            return false
        }
    }

    addMessage(agentId, message) {
        const conversations = this.getConversations(agentId)
        message.id = this.generateId()
        message.timestamp = new Date().toISOString()
        // 确保消息有图像相关字段
        if (!message.imageData) {
            message.imageData = null
        }
        if (!message.isGeneratingImage) {
            message.isGeneratingImage = false
        }
        if (!message.imageProgress) {
            message.imageProgress = 0
        }
        conversations.push(message)
        
        // 限制对话历史长度，防止localStorage溢出
        // 保留最近的200条消息（可根据需要调整）
        const MAX_CONVERSATIONS = 200
        if (conversations.length > MAX_CONVERSATIONS) {
            // 保留最新的消息
            conversations.splice(0, conversations.length - MAX_CONVERSATIONS)
        }
        
        const success = this.saveConversations(agentId, conversations)
        
        // 如果保存失败（可能是因为localStorage配额超了），尝试进一步减少历史记录
        if (!success) {
            // 进一步减少到100条消息
            const reducedConversations = conversations.slice(-100)
            const reducedSuccess = this.saveConversations(agentId, reducedConversations)
            
            if (!reducedSuccess) {
                // 如果仍然失败，尝试只保留最近的50条
                const minimalConversations = conversations.slice(-50)
                const minimalSuccess = this.saveConversations(agentId, minimalConversations)
                
                if (!minimalSuccess) {
                    console.error('保存对话历史失败，localStorage已满')
                    return null
                }
            }
        }
        
        // 成功保存后，返回消息
        if (success) {
            return message
        } else {
            // 如果原始保存失败但减少后成功，返回消息
            return conversations[conversations.length - 1]
        }
    }

    clearConversation(agentId) {
        const success1 = this.saveConversations(agentId, [])
        const success2 = this.clearAgentContext(agentId)
        return success1 && success2
    }

    // 设置管理
    getSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey)
            const defaultSettings = {
                apiType: 'local', // 'local' 或 'network'
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: '',
                modelName: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 1000,
                                // 对话设置
                wordByWordOutput: false,
                showTokens: false,
                showThinkingTime: false,
                enableFormatting: true,
                contextLength: 50, // 上下文长度限制，默认为50条消息
                // 聊天记录清理设置
                autoClearConversations: false, // 是否自动清理对话记录
                autoClearDays: 3, // 自动清理多少天前的对话记录
                // SD图像生成设置
                sdBaseUrl: 'http://127.0.0.1:7860',
                sdModel: '',
                sdSteps: 20,
                sdNegativePrompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                sdPositivePrompt: 'best quality, masterpiece',
                sdCfgScale: 4.5,
                sdWidth: 600,
                sdHeight: 1000,
                sdSampler: 'DPM++ 2M Karras',
                // 样式设置
                theme: 'light', // 'light' 或 'dark'
                primaryColor: '#ec4899', // 主色调
                secondaryColor: '#3b82f6', // 副色调
                gradientColor1: '#ec4899', // 渐变色1
                gradientColor2: '#3b82f6', // 渐变色2
                fontSize: 'medium', // 'small', 'medium', 'large'
                borderRadius: 'medium', // 'small', 'medium', 'large'
                animationSpeed: 'normal', // 'fast', 'normal', 'slow'
                enableAnimations: true, // 是否启用动画
                messageBubbleStyle: 'default', // 'default', 'rounded', 'minimal'
                chatLayout: 'standard', // 'standard', 'compact', 'expanded'
                colorMode: 'single', // 'single', 'dual', 'gradient'
                // 流光效果设置
                enableShineEffect: true, // 是否启用流光效果
                shineColor: '#ec4899', // 流光颜色
                shineSpeed: 'normal', // 'fast', 'normal', 'slow'
                shineOpacity: 0.4, // 流光透明度 (0-1)
                // 通知设置
                notificationBorderMode: 'none', // 边框模式：'none', 'left', 'right', 'full'
                notificationDuration: 3 // 滞留时间（秒）
            }

            if (settings) {
                const parsedSettings = JSON.parse(settings)
                // 确保数值参数为正确类型
                parsedSettings.temperature = Number(parsedSettings.temperature) || 0.7
                parsedSettings.maxTokens = Number(parsedSettings.maxTokens) || 1000
                // 确保清理设置参数为正确类型
                parsedSettings.autoClearDays = Number(parsedSettings.autoClearDays) || 3
                return parsedSettings
            }

            return defaultSettings
        } catch (error) {
            console.error('获取设置失败:', error)
            return {}
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings))
            return true
        } catch (error) {
            console.error('保存设置失败:', error)
            return false
        }
    }

    // 工具函数
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    // 清理旧的对话历史以释放空间（可选功能，不自动执行）
    cleanupOldConversations() {
        // 此功能已移除，不再自动清理对话历史
        // 如果需要清理功能，可通过手动清理或自动清理设置来控制
        console.log('自动清理功能已移除，对话历史长度不受限制');
    }

    // 自动清理过期的对话记录
    autoCleanupConversations() {
        try {
            const settings = this.getSettings()
            // 如果未启用自动清理，直接返回
            if (!settings.autoClearConversations) {
                return
            }

            // 获取过期时间（毫秒）
            const expireTime = Date.now() - (settings.autoClearDays * 24 * 60 * 60 * 1000)
            const allConversations = JSON.parse(localStorage.getItem(this.conversationsKey) || '{}')
            let hasChanges = false

            // 遍历所有智能体的对话记录
            for (const agentId in allConversations) {
                const conversations = allConversations[agentId]
                // 过滤掉过期的对话记录
                const filteredConversations = conversations.filter(conversation => {
                    // 如果消息有时间戳，检查是否过期
                    if (conversation.timestamp) {
                        const messageTime = new Date(conversation.timestamp).getTime()
                        return messageTime > expireTime
                    }
                    // 如果没有时间戳，默认保留
                    return true
                })

                // 如果有过期记录被清理
                if (filteredConversations.length !== conversations.length) {
                    allConversations[agentId] = filteredConversations
                    hasChanges = true
                }
            }

            // 如果有变化，保存更新后的对话记录
            if (hasChanges) {
                localStorage.setItem(this.conversationsKey, JSON.stringify(allConversations))
                console.log('自动清理过期对话记录完成')
            }
        } catch (error) {
            console.error('自动清理对话记录失败:', error)
        }
    }

    // 手动清理所有对话记录
    manualCleanupAllConversations() {
        try {
            const allConversations = JSON.parse(localStorage.getItem(this.conversationsKey) || '{}')
            const agents = this.getAgents()
            let cleanedCount = 0

            // 遍历所有智能体
            for (const agent of agents) {
                if (allConversations[agent.id] && allConversations[agent.id].length > 0) {
                    // 清空该智能体的对话记录
                    allConversations[agent.id] = []
                    cleanedCount++
                }
            }

            // 保存更新后的对话记录
            localStorage.setItem(this.conversationsKey, JSON.stringify(allConversations))
            console.log(`手动清理了 ${cleanedCount} 个智能体的对话记录`)
            return cleanedCount
        } catch (error) {
            console.error('手动清理所有对话记录失败:', error)
            return 0
        }
    }

    // 获取当前存储使用量
    getStorageSize() {
        let total = 0
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length + key.length) * 2
            }
        }
        return total
    }

    // 获取存储配额（估计值）
    getStorageQuota() {
        // 通常浏览器限制为5-10MB
        return 5 * 1024 * 1024 // 5MB
    }

    // 检查并执行自动清理（建议在应用启动时调用）
    checkAndAutoCleanup() {
        try {
            // 检查是否需要执行自动清理（只在每天首次启动时执行）
            const today = new Date().toDateString()
            const lastCleanupDate = localStorage.getItem('last_cleanup_date')

            if (lastCleanupDate !== today) {
                this.autoCleanupConversations()
                localStorage.setItem('last_cleanup_date', today)
            }
        } catch (error) {
            console.error('检查并执行自动清理失败:', error)
        }
    }

    // 导出所有数据（全局设置）
    exportData() {
        const data = {
            agents: this.getAgents(),
            conversations: JSON.parse(localStorage.getItem(this.conversationsKey) || '{}'),
            agentContexts: JSON.parse(localStorage.getItem('ai_agent_contexts') || '{}'),
            settings: this.getSettings(),
            exportTime: new Date().toISOString(),
            exportType: 'full_backup'
        }
        return JSON.stringify(data, null, 2)
    }

    // 导出单个智能体（仅基本信息）
    exportSingleAgent(agentId) {
        try {
            const agents = this.getAgents()
            const agent = agents.find(a => a.id === agentId)

            if (!agent) {
                throw new Error('智能体不存在')
            }

            // 仅导出智能体的基本信息和聊天记录
            const data = {
                agent: {
                    id: agent.id,
                    name: agent.name,
                    avatar: agent.avatar,
                    scenario: agent.scenario,
                    prompt: agent.prompt,
                    keyPoints: agent.keyPoints,
                    createdAt: agent.createdAt,
                    updatedAt: agent.updatedAt
                },
                conversations: this.getConversations(agentId),
                exportTime: new Date().toISOString(),
                exportType: 'single_agent'
            }

            return JSON.stringify(data, null, 2)
        } catch (error) {
            console.error('导出单个智能体失败:', error)
            throw error
        }
    }

    // 导入单个智能体
    importSingleAgent(jsonData) {
        try {
            const data = JSON.parse(jsonData)

            if (!data.agent) {
                throw new Error('导入数据格式不正确')
            }

            // 生成新的智能体ID以避免冲突
            const newAgent = {
                ...data.agent,
                id: this.generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // 添加智能体
            const agents = this.getAgents()
            agents.push(newAgent)
            this.saveAgents(agents)

            // 保存对话历史
            if (data.conversations && data.conversations.length > 0) {
                this.saveConversations(newAgent.id, data.conversations)
            }

            return newAgent
        } catch (error) {
            console.error('导入单个智能体失败:', error)
            throw error
        }
    }

    // 导入数据
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData)

            if (data.agents) {
                this.saveAgents(data.agents)
            }

            if (data.conversations) {
                localStorage.setItem(this.conversationsKey, JSON.stringify(data.conversations))
            }

            if (data.agentContexts) {
                localStorage.setItem('ai_agent_contexts', JSON.stringify(data.agentContexts))
            }

            if (data.settings) {
                this.saveSettings(data.settings)
            }

            return true
        } catch (error) {
            console.error('导入数据失败:', error)
            return false
        }
    }
}