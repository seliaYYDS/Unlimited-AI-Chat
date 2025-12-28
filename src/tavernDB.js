// 酒馆 IndexedDB 管理类 - 用于存储酒馆配置和对话记录
export class TavernDB {
    constructor() {
        this.dbName = 'TavernDB'
        this.dbVersion = 1
        this.configStoreName = 'configs'
        this.messagesStoreName = 'messages'
        this.db = null
        this.useLocalStorage = false
        this.configsKey = 'tavern_configs_fallback'
        this.messagesKey = 'tavern_messages_fallback'
    }

    // 检查 IndexedDB 是否可用
    isIndexedDBAvailable() {
        return 'indexedDB' in window && window.indexedDB !== null
    }

    // 初始化数据库
    async init() {
        // 检查 IndexedDB 是否可用
        if (!this.isIndexedDBAvailable()) {
            console.warn('IndexedDB 不可用，将使用 localStorage 作为后备存储')
            this.useLocalStorage = true
            return true
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                console.error('IndexedDB 打开失败，将使用 localStorage 作为后备存储:', request.error)
                this.useLocalStorage = true
                resolve(true)
            }

            request.onsuccess = () => {
                this.db = request.result
                this.useLocalStorage = false
                console.log('TavernDB 初始化成功')
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                const oldVersion = event.oldVersion
                const newVersion = event.newVersion

                console.log(`TavernDB upgrading from version ${oldVersion} to ${newVersion}`)

                // 创建配置对象存储，使用 id 作为键
                if (!db.objectStoreNames.contains(this.configStoreName)) {
                    const configStore = db.createObjectStore(this.configStoreName, { keyPath: 'id' })
                    configStore.createIndex('id', 'id', { unique: true })
                    configStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                    console.log('创建 configs 对象存储，keyPath: id')
                }

                // 创建消息对象存储，使用 configId 作为键
                if (!db.objectStoreNames.contains(this.messagesStoreName)) {
                    const messageStore = db.createObjectStore(this.messagesStoreName, { keyPath: 'configId' })
                    messageStore.createIndex('configId', 'configId', { unique: true })
                    messageStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                    console.log('创建 messages 对象存储，keyPath: configId')
                }
            }
        })
    }

    // ==================== 配置管理 ====================

    // 获取所有配置
    async getAllConfigs() {
        if (this.useLocalStorage) {
            return this.getAllConfigsFromLocalStorage()
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.getAllConfigsFromLocalStorage()
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.configStoreName], 'readonly')
            const objectStore = transaction.objectStore(this.configStoreName)
            const request = objectStore.getAll()

            request.onerror = () => {
                console.error('获取所有配置失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                // 按 updatedAt 降序排序
                results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                resolve(results)
            }
        })
    }

    // 获取指定配置
    async getConfig(configId) {
        if (this.useLocalStorage) {
            return this.getConfigFromLocalStorage(configId)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.getConfigFromLocalStorage(configId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.configStoreName], 'readonly')
            const objectStore = transaction.objectStore(this.configStoreName)
            const request = objectStore.get(configId)

            request.onerror = () => {
                console.error('获取配置失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(request.result)
            }
        })
    }

    // 保存配置
    async saveConfig(config) {
        if (this.useLocalStorage) {
            return this.saveConfigToLocalStorage(config)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.saveConfigToLocalStorage(config)
        }

        // 清理配置数据，移除不可序列化的属性
        const cleanedConfig = this.cleanConfigData(config)

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.configStoreName], 'readwrite')
            const objectStore = transaction.objectStore(this.configStoreName)

            const data = {
                ...cleanedConfig,
                updatedAt: new Date().toISOString()
            }

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存配置失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(data)
            }
        })
    }

    // 清理配置数据，移除不可序列化的属性
    cleanConfigData(config) {
        // 使用 JSON 序列化/反序列化来彻底清理循环引用
        try {
            return JSON.parse(JSON.stringify(config, (key, value) => {
                // 跳过 Vue 内部属性
                if (key && key.startsWith('__v_')) {
                    return undefined
                }
                // 跳过函数和 undefined
                if (typeof value === 'function' || value === undefined) {
                    return undefined
                }
                return value
            }))
        } catch (error) {
            console.error('清理配置数据失败:', error)
            // 如果完全失败，返回基本配置
            return {
                id: config.id,
                name: config.name,
                icon: config.icon,
                description: config.description,
                worldSettings: config.worldSettings,
                characters: config.characters,
                memories: config.memories,
                createdAt: config.createdAt,
                updatedAt: new Date().toISOString()
            }
        }
    }

    // 删除配置
    async deleteConfig(configId) {
        if (this.useLocalStorage) {
            return this.deleteConfigFromLocalStorage(configId)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.deleteConfigFromLocalStorage(configId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.configStoreName], 'readwrite')
            const objectStore = transaction.objectStore(this.configStoreName)
            const request = objectStore.delete(configId)

            request.onerror = () => {
                console.error('删除配置失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                // 同时删除该配置的所有消息
                this.deleteMessagesByConfigId(configId)
                resolve(true)
            }
        })
    }

    // ==================== 消息管理 ====================

    // 获取指定配置的所有消息（参考 ConversationDB 的 getConversations）
    async getMessages(configId) {
        if (this.useLocalStorage) {
            return this.getMessagesFromLocalStorage(configId)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.getMessagesFromLocalStorage(configId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.messagesStoreName], 'readonly')
            const objectStore = transaction.objectStore(this.messagesStoreName)
            const request = objectStore.get(configId)

            request.onerror = () => {
                console.error('获取消息失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? result.messages : [])
            }
        })
    }

    // 保存指定配置的所有消息（参考 ConversationDB 的 saveConversations）
    async saveMessages(configId, messages) {
        console.log('saveMessages 被调用:', { configId, messagesLength: messages?.length });

        if (!configId) {
            console.error('saveMessages: configId 为空');
            return false;
        }

        if (this.useLocalStorage) {
            return this.saveMessagesToLocalStorage(configId, messages)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.saveMessagesToLocalStorage(configId, messages)
        }

        // 检查 messages 是否有效
        if (!messages || !Array.isArray(messages)) {
            console.warn('saveMessages: messages 参数无效')
            return false
        }

        // 使用 JSON 序列化/反序列化来彻底清理循环引用
        let cleanedMessages
        try {
            const jsonStr = JSON.stringify(messages)
            cleanedMessages = JSON.parse(jsonStr)
        } catch (error) {
            // 如果直接序列化失败，手动清理每个消息对象
            cleanedMessages = messages.map(msg => this.cleanMessageData(msg))
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.messagesStoreName], 'readwrite')
            const objectStore = transaction.objectStore(this.messagesStoreName)

            const data = {
                configId,
                messages: cleanedMessages,
                updatedAt: new Date().toISOString()
            }

            console.log('准备保存到 IndexedDB:', data);

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存消息失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                console.log(`saveMessages: 成功保存 ${cleanedMessages.length} 条消息`)
                resolve(true)
            }
        })
    }

    // 添加一条消息（参考 ConversationDB 的 addMessage）
    async addMessage(configId, message) {
        if (this.useLocalStorage) {
            return this.addMessageToLocalStorage(configId, message)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.addMessageToLocalStorage(configId, message)
        }

        return new Promise(async (resolve, reject) => {
            try {
                // 先获取现有对话
                const messages = await this.getMessages(configId)

                // 添加新消息
                message.id = message.id || this.generateId()
                message.timestamp = message.timestamp || new Date().toISOString()

                // 清理消息对象
                const cleanedMessage = this.cleanMessageData(message)

                messages.push(cleanedMessage)

                // 限制对话历史长度，防止IndexedDB过大
                const MAX_MESSAGES = 200
                if (messages.length > MAX_MESSAGES) {
                    messages.splice(0, messages.length - MAX_MESSAGES)
                }

                // 保存更新后的对话
                await this.saveMessages(configId, messages)
                console.log('addMessage: 消息已添加:', message.id)
                resolve(cleanedMessage)
            } catch (error) {
                console.error('添加消息失败:', error)
                reject(error)
            }
        })
    }

    // 清理消息数据，移除所有不可序列化的属性（参考 ConversationDB 的 cleanMessageObject）
    cleanMessageData(msg) {
        const cleaned = {}

        // 只保留基本数据类型的属性
        for (const key in msg) {
            if (msg.hasOwnProperty(key)) {
                const value = msg[key]

                // 跳过 Vue 内部属性
                if (key.startsWith('__v_')) {
                    continue
                }

                // 处理不同类型的值
                if (value === null || value === undefined) {
                    cleaned[key] = value
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    cleaned[key] = value
                } else if (typeof value === 'object') {
                    // 对于对象类型，尝试序列化
                    try {
                        JSON.stringify(value)
                        cleaned[key] = value
                    } catch (e) {
                        // 如果序列化失败，跳过这个属性
                        console.warn(`跳过不可序列化的属性: ${key}`)
                    }
                }
            }
        }

        return cleaned
    }

    // 删除指定配置的所有消息
    async deleteMessagesByConfigId(configId) {
        if (this.useLocalStorage) {
            return this.deleteMessagesFromLocalStorage(configId)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.deleteMessagesFromLocalStorage(configId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.messagesStoreName], 'readwrite')
            const objectStore = transaction.objectStore(this.messagesStoreName)
            const request = objectStore.delete(configId)

            request.onerror = () => {
                console.error('删除消息失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 获取最近 N 条消息（用于上下文）
    async getRecentMessages(configId, limit = 20) {
        const messages = await this.getMessages(configId)
        return messages.slice(-limit)
    }

    // ==================== localStorage 后备方法 ====================

    getAllConfigsFromLocalStorage() {
        try {
            const configs = localStorage.getItem(this.configsKey)
            return configs ? JSON.parse(configs) : []
        } catch (error) {
            console.error('从 localStorage 获取配置失败:', error)
            return []
        }
    }

    getConfigFromLocalStorage(configId) {
        try {
            const configs = this.getAllConfigsFromLocalStorage()
            return configs.find(c => c.id === configId) || null
        } catch (error) {
            console.error('从 localStorage 获取配置失败:', error)
            return null
        }
    }

    saveConfigToLocalStorage(config) {
        try {
            const configs = this.getAllConfigsFromLocalStorage()
            const index = configs.findIndex(c => c.id === config.id)
            const data = { ...config, updatedAt: new Date().toISOString() }

            if (index !== -1) {
                configs[index] = data
            } else {
                configs.push(data)
            }

            localStorage.setItem(this.configsKey, JSON.stringify(configs))
            return data
        } catch (error) {
            console.error('保存配置到 localStorage 失败:', error)
            return null
        }
    }

    deleteConfigFromLocalStorage(configId) {
        try {
            const configs = this.getAllConfigsFromLocalStorage()
            const filtered = configs.filter(c => c.id !== configId)
            localStorage.setItem(this.configsKey, JSON.stringify(filtered))
            this.deleteMessagesFromLocalStorage(configId)
            return true
        } catch (error) {
            console.error('从 localStorage 删除配置失败:', error)
            return false
        }
    }

    getMessagesFromLocalStorage(configId) {
        try {
            const allMessages = localStorage.getItem(this.messagesKey)
            const messages = allMessages ? JSON.parse(allMessages) : {}
            const configMessages = messages[configId] || []
            // 按 timestamp 升序排序
            configMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            return configMessages
        } catch (error) {
            console.error('从 localStorage 获取消息失败:', error)
            return []
        }
    }

    saveMessagesToLocalStorage(configId, messages) {
        try {
            const allMessages = localStorage.getItem(this.messagesKey)
            const messagesObj = allMessages ? JSON.parse(allMessages) : {}

            // 清理消息数据
            let cleanedMessages
            try {
                const jsonStr = JSON.stringify(messages)
                cleanedMessages = JSON.parse(jsonStr)
            } catch (error) {
                cleanedMessages = messages.map(msg => this.cleanMessageData(msg))
            }

            messagesObj[configId] = cleanedMessages
            localStorage.setItem(this.messagesKey, JSON.stringify(messagesObj))
            console.log(`saveMessagesToLocalStorage: 成功保存 ${cleanedMessages.length} 条消息`)
            return true
        } catch (error) {
            console.error('保存消息到 localStorage 失败:', error)
            return false
        }
    }

    addMessageToLocalStorage(configId, message) {
        try {
            const allMessages = localStorage.getItem(this.messagesKey)
            const messagesObj = allMessages ? JSON.parse(allMessages) : {}

            if (!messagesObj[configId]) {
                messagesObj[configId] = []
            }

            const data = {
                ...message,
                id: message.id || this.generateId(),
                timestamp: message.timestamp || new Date().toISOString()
            }

            messagesObj[configId].push(data)
            localStorage.setItem(this.messagesKey, JSON.stringify(messagesObj))
            console.log('addMessageToLocalStorage: 消息已添加:', data.id)
            return data
        } catch (error) {
            console.error('添加消息到 localStorage 失败:', error)
            return null
        }
    }

    deleteMessagesFromLocalStorage(configId) {
        try {
            const allMessages = localStorage.getItem(this.messagesKey)
            const messages = allMessages ? JSON.parse(allMessages) : {}
            delete messages[configId]
            localStorage.setItem(this.messagesKey, JSON.stringify(messages))
            return true
        } catch (error) {
            console.error('从 localStorage 删除消息失败:', error)
            return false
        }
    }

    // 工具函数：生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close()
            this.db = null
        }
    }
}

// 创建全局实例
export const tavernDB = new TavernDB()