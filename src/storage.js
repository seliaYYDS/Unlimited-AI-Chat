// 本地存储管理模块
import { conversationDB } from './indexedDB.js'

export class StorageManager {
    constructor() {
        this.agentsKey = 'ai_agents'
        this.conversationsKey = 'ai_conversations'
        this.settingsKey = 'ai_settings'
        // 初始化 IndexedDB
        this.initIndexedDB()
    }

    // 初始化 IndexedDB
    async initIndexedDB() {
        try {
            await conversationDB.init()
            console.log('IndexedDB 初始化成功')
        } catch (error) {
            console.error('IndexedDB 初始化失败:', error)
        }
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

    async deleteAgent(agentId) {
        // 删除智能体
        const agents = this.getAgents().filter(a => a.id !== agentId)
        const success = this.saveAgents(agents)

        if (success) {
            // 同时清理该智能体的对话记录（使用 IndexedDB）
            try {
                await conversationDB.deleteAgentConversations(agentId)
            } catch (error) {
                console.error('删除智能体对话记录失败:', error)
            }

            // 清理该智能体的图片数据
            try {
                await conversationDB.deleteAgentImages(agentId)
            } catch (error) {
                console.error('删除智能体图片数据失败:', error)
            }

            // 清理该智能体的上下文
            this.clearAgentContext(agentId)

            // 清理该智能体的记忆
            this.clearAgentMemory(agentId)
        }

        return success
    }

    // 对话管理 - 使用 IndexedDB
    async getConversations(agentId) {
        try {
            return await conversationDB.getConversations(agentId)
        } catch (error) {
            console.error('获取对话历史失败:', error)
            return []
        }
    }

    // 同步版本的获取对话方法（用于兼容旧代码）
    getConversationsSync(agentId) {
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

    // 智能体记忆管理
    getAgentMemory(agentId) {
        try {
            const memories = localStorage.getItem('ai_agent_memories')
            const allMemories = memories ? JSON.parse(memories) : {}
            return allMemories[agentId] || null
        } catch (error) {
            console.error('获取智能体记忆失败:', error)
            return null
        }
    }

    saveAgentMemory(agentId, memoryContent) {
        try {
            const memories = JSON.parse(localStorage.getItem('ai_agent_memories') || '{}')
            memories[agentId] = {
                content: memoryContent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
            localStorage.setItem('ai_agent_memories', JSON.stringify(memories))
            return true
        } catch (error) {
            console.error('保存智能体记忆失败:', error)
            return false
        }
    }

    updateAgentMemory(agentId, memoryContent) {
        try {
            const memories = JSON.parse(localStorage.getItem('ai_agent_memories') || '{}')
            if (memories[agentId]) {
                memories[agentId].content = memoryContent
                memories[agentId].updatedAt = new Date().toISOString()
                localStorage.setItem('ai_agent_memories', JSON.stringify(memories))
                return true
            }
            return false
        } catch (error) {
            console.error('更新智能体记忆失败:', error)
            return false
        }
    }

    clearAgentMemory(agentId) {
        try {
            const memories = JSON.parse(localStorage.getItem('ai_agent_memories') || '{}')
            delete memories[agentId]
            localStorage.setItem('ai_agent_memories', JSON.stringify(memories))
            return true
        } catch (error) {
            console.error('清除智能体记忆失败:', error)
            return false
        }
    }

    // 获取所有智能体记忆（用于管理界面）
    getAllAgentMemories() {
        try {
            const memories = localStorage.getItem('ai_agent_memories')
            return memories ? JSON.parse(memories) : {}
        } catch (error) {
            console.error('获取所有智能体记忆失败:', error)
            return {}
        }
    }

    async saveConversations(agentId, conversations) {
        try {
            return await conversationDB.saveConversations(agentId, conversations)
        } catch (error) {
            console.error('保存对话历史失败:', error)
            return false
        }
    }

    async addMessage(agentId, message) {
        try {
            return await conversationDB.addMessage(agentId, message)
        } catch (error) {
            console.error('添加消息失败:', error)
            return null
        }
    }

    async clearConversation(agentId) {
        try {
            const success1 = await conversationDB.clearConversation(agentId)
            const success2 = this.clearAgentContext(agentId)
            return success1 && success2
        } catch (error) {
            console.error('清空对话历史失败:', error)
            return false
        }
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
                autoTheme: false, // 是否自动切换主题
                theme: 'light', // 'light' 或 'dark'
                primaryColor: '#ec4899', // 主色调
                secondaryColor: '#3b82f6', // 副色调
                gradientColor1: '#ec4899', // 渐变色1
                gradientColor2: '#3b82f6', // 渐变色2
                fontFamily: 'system-ui', // 字体设置
                enableSecondaryFont: false, // 是否启用副字体
                secondaryFontFamily: 'system-ui', // 副字体设置
                fontSize: 'medium', // 'small', 'medium', 'large'
                borderRadius: 'medium', // 'small', 'medium', 'large'
                animationSpeed: 'normal', // 'fast', 'normal', 'slow'
                enableAnimations: true, // 是否启用动画
                messageBubbleStyle: 'default', // 'default', 'rounded', 'minimal'
                chatLayout: 'standard', // 'standard', 'compact', 'expanded'
                colorMode: 'single', // 'single', 'dual', 'gradient', 'advanced-gradient'
                // 高级渐变模式设置
                gradientDirection: '135deg', // 渐变方向
                gradientColorCount: 3, // 渐变颜色数量
                advancedGradientColors: ['#ec4899', '#3b82f6', '#10b981'], // 高级渐变颜色数组
                customGradientAngle: 135, // 自定义渐变角度
                // 流光效果设置
                enableShineEffect: true, // 是否启用流光效果
                shineColor: '#ec4899', // 流光颜色
                shineSpeed: 'normal', // 'fast', 'normal', 'slow'
                shineOpacity: 0.4, // 流光透明度 (0-1)
                // 通知设置
                notificationBorderMode: 'none', // 边框模式：'none', 'left', 'right', 'full'
                notificationDuration: 3, // 滞留时间（秒）
                // 弹窗背景设置
                modalBackdropBlur: true, // 是否启用弹窗背景模糊
                modalBackdropBlurAmount: 8, // 模糊程度 (0-20)
                modalBackdropOpacity: 0.5, // 背景暗化程度 (0.1-1.0)
                // 音乐播放器设置
                enableMusicPlayerNotifications: true, // 是否启用音乐播放器弹窗通知
                musicApiUrl: 'https://zm.i9mr.com', // 音乐API服务器地址
                // 灵动岛设置
                enableDynamicIslandMusicInfo: true, // 是否在灵动岛显示音乐信息
                enableDynamicIslandLyrics: false, // 是否在灵动岛显示歌词
                // 自定义主题设置
                customThemes: [], // 用户自定义的主题列表
                currentThemeId: null, // 当前使用的主题ID（预制主题或自定义主题）
                // 主题颜色配置（全局配色）
                themeColors: {
                    bgPrimary: '#ffffff',
                    bgSecondary: '#f8f9fa',
                    bgTertiary: '#e9ecef',
                    bgHover: '#f1f3f4',
                    textPrimary: '#1a1a1a',
                    textSecondary: '#6c757d',
                    textTertiary: '#adb5bd',
                    borderColor: '#dee2e6',
                    borderLight: '#e9ecef',
                    shadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    shadowLg: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }
            }

            if (settings) {
                const parsedSettings = JSON.parse(settings)
                
                // 确保数值参数为正确类型
                parsedSettings.temperature = Number(parsedSettings.temperature) || 0.7
                parsedSettings.maxTokens = Number(parsedSettings.maxTokens) || 1000
                // 确保清理设置参数为正确类型
                parsedSettings.autoClearDays = Number(parsedSettings.autoClearDays) || 3
                // 确保高级渐变模式参数为正确类型
                parsedSettings.gradientColorCount = Number(parsedSettings.gradientColorCount) || 3
                parsedSettings.customGradientAngle = Number(parsedSettings.customGradientAngle) || 135
                // 确保高级渐变颜色数组存在
                if (!parsedSettings.advancedGradientColors || !Array.isArray(parsedSettings.advancedGradientColors)) {
                    parsedSettings.advancedGradientColors = ['#ec4899', '#3b82f6', '#10b981']
                }
                
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
    async autoCleanupConversations() {
        try {
            const settings = this.getSettings()
            // 如果未启用自动清理，直接返回
            if (!settings.autoClearConversations) {
                return
            }

            await conversationDB.autoCleanupConversations(settings.autoClearDays)
        } catch (error) {
            console.error('自动清理对话记录失败:', error)
        }
    }

    // 手动清理所有对话记录
    async manualCleanupAllConversations() {
        try {
            const agents = this.getAgents()
            const agentIds = agents.map(agent => agent.id)
            const cleanedCount = await conversationDB.manualCleanupAllConversations(agentIds)
            console.log(`手动清理了 ${cleanedCount} 个智能体的对话记录`)
            return cleanedCount
        } catch (error) {
            console.error('手动清理所有对话记录失败:', error)
            return 0
        }
    }

    // 获取当前存储使用量
    async getStorageSize() {
        let total = 0

        // 计算 localStorage 使用量
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length + key.length) * 2
            }
        }

        // 计算 IndexedDB 使用量
        try {
            const indexedDBSize = await conversationDB.getStorageSize()
            total += indexedDBSize
        } catch (error) {
            console.error('获取 IndexedDB 存储大小失败:', error)
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
    async exportData() {
        try {
            const conversations = await conversationDB.getAllConversations()

            const data = {
                agents: this.getAgents(),
                conversations: conversations,
                agentContexts: JSON.parse(localStorage.getItem('ai_agent_contexts') || '{}'),
                agentMemories: this.getAllAgentMemories(),
                settings: this.getSettings(),
                exportTime: new Date().toISOString(),
                exportType: 'full_backup'
            }
            return JSON.stringify(data, null, 2)
        } catch (error) {
            console.error('导出数据失败:', error)
            throw error
        }
    }

    // 导出单个智能体（仅基本信息）
    async exportSingleAgent(agentId) {
        try {
            const agents = this.getAgents()
            const agent = agents.find(a => a.id === agentId)

            if (!agent) {
                throw new Error('智能体不存在')
            }

            // 仅导出智能体的基本信息和聊天记录
            const conversations = await conversationDB.getConversations(agentId)

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
                conversations: conversations,
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
    async importSingleAgent(jsonData) {
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

            // 保存对话历史（使用 IndexedDB）
            if (data.conversations && data.conversations.length > 0) {
                await conversationDB.saveConversations(newAgent.id, data.conversations)
            }

            return newAgent
        } catch (error) {
            console.error('导入单个智能体失败:', error)
            throw error
        }
    }

    // 导入数据
    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData)

            if (data.agents) {
                this.saveAgents(data.agents)
            }

            if (data.conversations) {
                await conversationDB.saveAllConversations(data.conversations)
            }

            if (data.agentContexts) {
                localStorage.setItem('ai_agent_contexts', JSON.stringify(data.agentContexts))
            }

            if (data.agentMemories) {
                localStorage.setItem('ai_agent_memories', JSON.stringify(data.agentMemories))
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

    // 头像管理
    async saveAvatar(agentId, imageData, avatarType = 'image') {
        try {
            return await conversationDB.saveAvatar(agentId, imageData, avatarType)
        } catch (error) {
            console.error('保存头像失败:', error)
            return false
        }
    }

    async getAvatar(agentId) {
        try {
            return await conversationDB.getAvatar(agentId)
        } catch (error) {
            console.error('获取头像失败:', error)
            return null
        }
    }

    async deleteAvatar(agentId) {
        try {
            return await conversationDB.deleteAvatar(agentId)
        } catch (error) {
            console.error('删除头像失败:', error)
            return false
        }
    }

    // 压缩图片
    async compressImage(file, maxWidth = 200, maxHeight = 200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            
            reader.onload = (e) => {
                const img = new Image()
                
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let width = img.width
                    let height = img.height
                    
                    // 计算缩放比例
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height)
                        width *= ratio
                        height *= ratio
                    }
                    
                    canvas.width = width
                    canvas.height = height
                    
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)
                    
                    // 压缩并转换为 base64
                    canvas.toBlob((blob) => {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                            resolve(e.target.result)
                        }
                        reader.onerror = reject
                        reader.readAsDataURL(blob)
                    }, 'image/jpeg', quality)
                }
                
                img.onerror = reject
                img.src = e.target.result
            }
            
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    // 自定义主题管理
    getCustomThemes() {
        try {
            const settings = this.getSettings()
            return settings.customThemes || []
        } catch (error) {
            console.error('获取自定义主题失败:', error)
            return []
        }
    }

    addCustomTheme(theme) {
        try {
            const settings = this.getSettings()
            const customThemes = settings.customThemes || []
            
            // 生成唯一ID
            theme.id = this.generateId()
            theme.createdAt = new Date().toISOString()
            theme.isCustom = true
            
            customThemes.push(theme)
            settings.customThemes = customThemes
            
            this.saveSettings(settings)
            return theme
        } catch (error) {
            console.error('添加自定义主题失败:', error)
            return null
        }
    }

    updateCustomTheme(themeId, updates) {
        try {
            const settings = this.getSettings()
            const customThemes = settings.customThemes || []
            const index = customThemes.findIndex(t => t.id === themeId)
            
            if (index !== -1) {
                customThemes[index] = { ...customThemes[index], ...updates, updatedAt: new Date().toISOString() }
                settings.customThemes = customThemes
                this.saveSettings(settings)
                return true
            }
            return false
        } catch (error) {
            console.error('更新自定义主题失败:', error)
            return false
        }
    }

    deleteCustomTheme(themeId) {
        try {
            const settings = this.getSettings()
            const customThemes = settings.customThemes || []
            const filteredThemes = customThemes.filter(t => t.id !== themeId)
            
            if (filteredThemes.length !== customThemes.length) {
                settings.customThemes = filteredThemes
                
                // 如果删除的是当前使用的主题，清除当前主题ID
                if (settings.currentThemeId === themeId) {
                    settings.currentThemeId = null
                }
                
                this.saveSettings(settings)
                return true
            }
            return false
        } catch (error) {
            console.error('删除自定义主题失败:', error)
            return false
        }
    }

    setCurrentThemeId(themeId) {
        try {
            const settings = this.getSettings()
            settings.currentThemeId = themeId
            this.saveSettings(settings)
            return true
        } catch (error) {
            console.error('设置当前主题ID失败:', error)
            return false
        }
    }

    getCurrentThemeId() {
        try {
            const settings = this.getSettings()
            return settings.currentThemeId || null
        } catch (error) {
            console.error('获取当前主题ID失败:', error)
            return null
        }
    }

    // 获取当前主题（包括预制主题和自定义主题）
    getCurrentTheme() {
        try {
            const settings = this.getSettings()
            const currentThemeId = settings.currentThemeId
            
            if (!currentThemeId) {
                // 如果没有设置主题ID，返回当前的颜色配置
                return {
                    id: null,
                    name: '自定义',
                    colorMode: settings.colorMode,
                    primaryColor: settings.primaryColor,
                    secondaryColor: settings.secondaryColor,
                    gradientColor1: settings.gradientColor1,
                    gradientColor2: settings.gradientColor2,
                    advancedGradientColors: settings.advancedGradientColors,
                    gradientDirection: settings.gradientDirection,
                    customGradientAngle: settings.customGradientAngle,
                    gradientColorCount: settings.gradientColorCount,
                    isCustom: true
                }
            }
            
            // 查找预制主题
            const presetThemes = [
                { id: 'ocean', name: '海洋', colorMode: 'dual', primaryColor: '#0ea5e9', secondaryColor: '#06b6d4', gradientColor1: '#0ea5e9', gradientColor2: '#06b6d4' },
                { id: 'forest', name: '森林', colorMode: 'dual', primaryColor: '#22c55e', secondaryColor: '#16a34a', gradientColor1: '#22c55e', gradientColor2: '#16a34a' },
                { id: 'violet', name: '紫罗兰', colorMode: 'dual', primaryColor: '#8b5cf6', secondaryColor: '#a78bfa', gradientColor1: '#8b5cf6', gradientColor2: '#a78bfa' },
                { id: 'sakura', name: '樱花', colorMode: 'dual', primaryColor: '#f472b6', secondaryColor: '#fb7185', gradientColor1: '#f472b6', gradientColor2: '#fb7185' },
                { id: 'sunset', name: '日落', colorMode: 'dual', primaryColor: '#f59e0b', secondaryColor: '#ef4444', gradientColor1: '#f59e0b', gradientColor2: '#ef4444' },
                { id: 'aurora', name: '极光', colorMode: 'gradient', primaryColor: '#06b6d4', secondaryColor: '#8b5cf6', gradientColor1: '#06b6d4', gradientColor2: '#8b5cf6' },
                { id: 'deepsea', name: '深海', colorMode: 'gradient', primaryColor: '#1e3a8a', secondaryColor: '#1e40af', gradientColor1: '#1e3a8a', gradientColor2: '#1e40af' },
                { id: 'autumn', name: '秋叶', colorMode: 'dual', primaryColor: '#f97316', secondaryColor: '#eab308', gradientColor1: '#f97316', gradientColor2: '#eab308' }
            ]
            
            const presetTheme = presetThemes.find(t => t.id === currentThemeId)
            if (presetTheme) {
                return { ...presetTheme, isCustom: false }
            }
            
            // 查找自定义主题
            const customThemes = settings.customThemes || []
            const customTheme = customThemes.find(t => t.id === currentThemeId)
            if (customTheme) {
                return { ...customTheme, isCustom: true }
            }
            
            // 如果找不到主题，返回当前颜色配置
            return {
                id: null,
                name: '自定义',
                colorMode: settings.colorMode,
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                gradientColor1: settings.gradientColor1,
                gradientColor2: settings.gradientColor2,
                advancedGradientColors: settings.advancedGradientColors,
                gradientDirection: settings.gradientDirection,
                customGradientAngle: settings.customGradientAngle,
                gradientColorCount: settings.gradientColorCount,
                isCustom: true
            }
        } catch (error) {
            console.error('获取当前主题失败:', error)
            return null
        }
    }
}