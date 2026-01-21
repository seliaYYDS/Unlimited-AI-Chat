// IndexedDB 管理类 - 用于存储聊天历史
export class ConversationDB {
    constructor() {
        this.dbName = 'AIConversationDB'
        this.dbVersion = 4
        this.storeName = 'conversations'
        this.db = null
        this.useLocalStorage = false
        this.conversationsKey = 'ai_conversations_fallback'
        this.imagesKey = 'ai_images_fallback'
        this.avatarsKey = 'ai_avatars_fallback'
        this.chatSessionsKey = 'ai_chat_sessions_fallback'
        this.chatSessionMessagesKey = 'ai_chat_session_messages_fallback'
        this.customComponentsKey = 'ai_custom_components_fallback'
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
                console.log('[IndexedDB] 数据库打开成功，版本:', this.db.version)
                console.log('[IndexedDB] 所有对象存储:', Array.from(this.db.objectStoreNames))
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                const oldVersion = event.oldVersion
                const newVersion = event.newVersion

                console.log(`IndexedDB upgrading from version ${oldVersion} to ${newVersion}`)

                // 创建对话对象存储，使用 agentId 作为键
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'agentId' })
                    objectStore.createIndex('agentId', 'agentId', { unique: true })
                    objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                }

                // 创建图片对象存储，使用 messageId 作为键
                const imageStoreName = 'images'
                if (!db.objectStoreNames.contains(imageStoreName)) {
                    const imageStore = db.createObjectStore(imageStoreName, { keyPath: 'messageId' })
                    imageStore.createIndex('messageId', 'messageId', { unique: true })
                    imageStore.createIndex('agentId', 'agentId', { unique: false })
                    imageStore.createIndex('createdAt', 'createdAt', { unique: false })
                }

                // 创建头像对象存储，使用 agentId 作为键
                const avatarStoreName = 'avatars'
                if (!db.objectStoreNames.contains(avatarStoreName)) {
                    const avatarStore = db.createObjectStore(avatarStoreName, { keyPath: 'agentId' })
                    avatarStore.createIndex('agentId', 'agentId', { unique: true })
                    avatarStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                }

                // 创建对话会话对象存储，使用复合键 agentId_sessionId
                const sessionsStoreName = 'chatSessions'
                if (!db.objectStoreNames.contains(sessionsStoreName)) {
                    const sessionsStore = db.createObjectStore(sessionsStoreName, { keyPath: 'id' })
                    sessionsStore.createIndex('agentId', 'agentId', { unique: false })
                    sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                }

                // 创建对话会话消息对象存储，使用复合键 agentId_sessionId
                const sessionMessagesStoreName = 'chatSessionMessages'
                if (!db.objectStoreNames.contains(sessionMessagesStoreName)) {
                    const sessionMessagesStore = db.createObjectStore(sessionMessagesStoreName, { keyPath: 'id' })
                    sessionMessagesStore.createIndex('agentId', 'agentId', { unique: false })
                    sessionMessagesStore.createIndex('sessionId', 'sessionId', { unique: false })
                    sessionMessagesStore.createIndex('agentId_sessionId', ['agentId', 'sessionId'], { unique: true })
                }

                // 创建自定义组件对象存储，使用组件 ID 作为键
                const componentsStoreName = 'customComponents'
                console.log('[IndexedDB] 检查 customComponents 对象存储:', db.objectStoreNames.contains(componentsStoreName))
                if (!db.objectStoreNames.contains(componentsStoreName)) {
                    console.log('[IndexedDB] 创建 customComponents 对象存储')
                    const componentsStore = db.createObjectStore(componentsStoreName, { keyPath: 'id' })
                    componentsStore.createIndex('name', 'name', { unique: false })
                    componentsStore.createIndex('createdAt', 'createdAt', { unique: false })
                    componentsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                    console.log('[IndexedDB] customComponents 对象存储创建成功')
                } else {
                    console.log('[IndexedDB] customComponents 对象存储已存在')
                }
                
                console.log('[IndexedDB] 所有对象存储:', Array.from(db.objectStoreNames))
            }
        })
    }

    // 保存智能体头像
    async saveAvatar(agentId, imageData, avatarType = 'image') {
        if (this.useLocalStorage) {
            return this.saveAvatarToLocalStorage(agentId, imageData, avatarType)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveAvatarToLocalStorage(agentId, imageData, avatarType)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['avatars'], 'readwrite')
            const objectStore = transaction.objectStore('avatars')

            const data = {
                agentId,
                avatarData: imageData,
                avatarType: avatarType, // 'emoji', 'text', or 'image'
                updatedAt: new Date().toISOString()
            }

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存头像失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 获取智能体头像
    async getAvatar(agentId) {
        if (this.useLocalStorage) {
            return this.getAvatarFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getAvatarFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['avatars'], 'readonly')
            const objectStore = transaction.objectStore('avatars')
            const request = objectStore.get(agentId)

            request.onerror = () => {
                console.error('获取头像失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? { data: result.avatarData, type: result.avatarType } : null)
            }
        })
    }

    // 删除智能体头像
    async deleteAvatar(agentId) {
        if (this.useLocalStorage) {
            return this.deleteAvatarFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.deleteAvatarFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['avatars'], 'readwrite')
            const objectStore = transaction.objectStore('avatars')
            const request = objectStore.delete(agentId)

            request.onerror = () => {
                console.error('删除头像失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 获取指定智能体的对话历史
    async getConversations(agentId) {
        if (this.useLocalStorage) {
            return this.getConversationsFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getConversationsFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.get(agentId)

            request.onerror = () => {
                console.error('获取对话历史失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? result.messages : [])
            }
        })
    }

    // 保存指定智能体的对话历史
    async saveConversations(agentId, messages) {
        if (this.useLocalStorage) {
            return this.saveConversationsToLocalStorage(agentId, messages)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveConversationsToLocalStorage(agentId, messages)
        }

        // 使用 JSON 序列化/反序列化来彻底清理循环引用
        let cleanedMessages
        try {
            // 先尝试直接序列化，如果失败则使用深度清理
            const jsonStr = JSON.stringify(messages)
            cleanedMessages = JSON.parse(jsonStr)
        } catch (error) {
            // 如果直接序列化失败，手动清理每个消息对象
            cleanedMessages = messages.map(msg => this.cleanMessageObject(msg))
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)

            const data = {
                agentId,
                messages: cleanedMessages,
                updatedAt: new Date().toISOString()
            }

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存对话历史失败，降级到 localStorage:', request.error)
                // 降级到 localStorage
                this.useLocalStorage = true
                const result = this.saveConversationsToLocalStorage(agentId, messages)
                resolve(result)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 清理消息对象，移除所有不可序列化的属性
    cleanMessageObject(msg) {
        const cleaned = {}

        // 只保留基本数据类型的属性
        for (const key in msg) {
            if (msg.hasOwnProperty(key)) {
                const value = msg[key]

                // 跳过 Vue 内部属性
                if (key.startsWith('__v_')) {
                    continue
                }

                // 跳过图片数据（图片数据单独存储在 IndexedDB 中）
                if (key === 'imageData') {
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

    // 添加一条消息
    async addMessage(agentId, message) {
        if (this.useLocalStorage) {
            return this.addMessageToLocalStorage(agentId, message)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.addMessageToLocalStorage(agentId, message)
        }

        return new Promise(async (resolve, reject) => {
            try {
                // 先获取现有对话
                const conversations = await this.getConversations(agentId)

                // 添加新消息
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

                // 清理消息对象
                const cleanedMessage = this.cleanMessageObject(message)

                conversations.push(cleanedMessage)

                // 限制对话历史长度，防止IndexedDB过大
                const MAX_CONVERSATIONS = 200
                if (conversations.length > MAX_CONVERSATIONS) {
                    conversations.splice(0, conversations.length - MAX_CONVERSATIONS)
                }

                // 保存更新后的对话
                await this.saveConversations(agentId, conversations)
                resolve(cleanedMessage)
            } catch (error) {
                console.error('添加消息失败:', error)
                reject(error)
            }
        })
    }

    // 清空指定智能体的对话历史
    async clearConversation(agentId) {
        if (this.useLocalStorage) {
            return this.saveConversationsToLocalStorage(agentId, [])
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveConversationsToLocalStorage(agentId, [])
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.delete(agentId)

            request.onerror = () => {
                console.error('清空对话历史失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 删除指定智能体的对话记录
    async deleteAgentConversations(agentId) {
        return this.clearConversation(agentId)
    }

    // 获取所有智能体的对话记录（用于导出）
    async getAllConversations() {
        if (!this.db) {
            await this.init()
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.getAll()

            request.onerror = () => {
                console.error('获取所有对话记录失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                // 转换为与原 localStorage 格式兼容的对象
                const conversations = {}
                results.forEach(item => {
                    conversations[item.agentId] = item.messages
                })
                resolve(conversations)
            }
        })
    }

    // 批量保存对话记录（用于导入）
    async saveAllConversations(conversations) {
        if (!this.db) {
            await this.init()
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)

            let count = 0
            const total = Object.keys(conversations).length

            for (const [agentId, messages] of Object.entries(conversations)) {
                const data = {
                    agentId,
                    messages,
                    updatedAt: new Date().toISOString()
                }

                const request = objectStore.put(data)

                request.onsuccess = () => {
                    count++
                    if (count === total) {
                        resolve(true)
                    }
                }

                request.onerror = () => {
                    console.error('保存对话记录失败:', request.error)
                    reject(request.error)
                }
            }

            // 如果没有数据需要保存
            if (total === 0) {
                resolve(true)
            }
        })
    }

    // 自动清理过期的对话记录
    async autoCleanupConversations(expireDays) {
        if (!this.db) {
            await this.init()
        }

        const expireTime = Date.now() - (expireDays * 24 * 60 * 60 * 1000)

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.getAll()

            request.onerror = () => {
                console.error('自动清理对话记录失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                let cleanedCount = 0

                results.forEach(item => {
                    const filteredMessages = item.messages.filter(message => {
                        if (message.timestamp) {
                            const messageTime = new Date(message.timestamp).getTime()
                            return messageTime > expireTime
                        }
                        return true
                    })

                    // 如果有过期记录被清理
                    if (filteredMessages.length !== item.messages.length) {
                        const updateRequest = objectStore.put({
                            agentId: item.agentId,
                            messages: filteredMessages,
                            updatedAt: new Date().toISOString()
                        })

                        updateRequest.onsuccess = () => {
                            cleanedCount++
                        }
                    }
                })

                // 等待所有更新完成
                transaction.oncomplete = () => {
                    console.log(`自动清理了 ${cleanedCount} 个智能体的过期对话记录`)
                    resolve(cleanedCount)
                }
            }
        })
    }

    // 手动清理所有对话记录
    async manualCleanupAllConversations(agentIds) {
        if (!this.db) {
            await this.init()
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const objectStore = transaction.objectStore(this.storeName)

            let cleanedCount = 0
            const total = agentIds.length

            agentIds.forEach(agentId => {
                const request = objectStore.delete(agentId)

                request.onsuccess = () => {
                    cleanedCount++
                    if (cleanedCount === total) {
                        resolve(cleanedCount)
                    }
                }

                request.onerror = () => {
                    console.error('清理对话记录失败:', request.error)
                    reject(request.error)
                }
            })

            // 如果没有数据需要清理
            if (total === 0) {
                resolve(0)
            }
        })
    }

    // ==================== 图片存储相关方法 ====================

    // 保存生成的图片
    async saveImage(messageId, agentId, imageData) {
        if (this.useLocalStorage) {
            return this.saveImageToLocalStorage(messageId, agentId, imageData)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveImageToLocalStorage(messageId, agentId, imageData)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite')
            const objectStore = transaction.objectStore('images')

            const data = {
                messageId,
                agentId,
                imageData,
                createdAt: new Date().toISOString()
            }

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存图片失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 获取指定消息的图片
    async getImage(messageId) {
        if (this.useLocalStorage) {
            return this.getImageFromLocalStorage(messageId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getImageFromLocalStorage(messageId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly')
            const objectStore = transaction.objectStore('images')
            const request = objectStore.get(messageId)

            request.onerror = () => {
                console.error('获取图片失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? result.imageData : null)
            }
        })
    }

    // 获取指定智能体的所有图片
    async getAgentImages(agentId) {
        if (this.useLocalStorage) {
            return this.getAgentImagesFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getAgentImagesFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly')
            const objectStore = transaction.objectStore('images')
            const index = objectStore.index('agentId')
            const request = index.getAll(agentId)

            request.onerror = () => {
                console.error('获取智能体图片失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                resolve(results)
            }
        })
    }

    // 删除指定消息的图片
    async deleteImage(messageId) {
        if (this.useLocalStorage) {
            return this.deleteImageFromLocalStorage(messageId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.deleteImageFromLocalStorage(messageId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite')
            const objectStore = transaction.objectStore('images')
            const request = objectStore.delete(messageId)

            request.onerror = () => {
                console.error('删除图片失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 删除指定智能体的所有图片
    async deleteAgentImages(agentId) {
        if (this.useLocalStorage) {
            return this.deleteAgentImagesFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.deleteAgentImagesFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite')
            const objectStore = transaction.objectStore('images')
            const index = objectStore.index('agentId')
            const request = index.getAllKeys(agentId)

            request.onerror = () => {
                console.error('获取智能体图片ID失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const keys = request.result
                let deletedCount = 0

                if (keys.length === 0) {
                    resolve(0)
                    return
                }

                keys.forEach(key => {
                    const deleteRequest = objectStore.delete(key)

                    deleteRequest.onsuccess = () => {
                        deletedCount++
                        if (deletedCount === keys.length) {
                            resolve(deletedCount)
                        }
                    }

                    deleteRequest.onerror = () => {
                        console.error('删除图片失败:', deleteRequest.error)
                        reject(deleteRequest.error)
                    }
                })
            }
        })
    }

    // 获取存储使用量（估算值）
    async getStorageSize() {
        if (this.useLocalStorage) {
            return this.getStorageSizeFromLocalStorage()
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getStorageSizeFromLocalStorage()
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly')
            const objectStore = transaction.objectStore(this.storeName)
            const request = objectStore.getAll()

            request.onerror = () => {
                console.error('获取存储大小失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                let totalSize = 0

                results.forEach(item => {
                    // 估算 JSON 字符串的大小
                    const jsonString = JSON.stringify(item)
                    totalSize += jsonString.length * 2 // UTF-16 编码，每个字符占 2 字节
                })

                resolve(totalSize)
            }
        })
    }

    // ==================== localStorage 后备方法 ====================

    // 从 localStorage 获取对话历史
    getConversationsFromLocalStorage(agentId) {
        try {
            const conversations = localStorage.getItem(this.conversationsKey)
            const allConversations = conversations ? JSON.parse(conversations) : {}
            return allConversations[agentId] || []
        } catch (error) {
            console.error('从 localStorage 获取对话历史失败:', error)
            return []
        }
    }

    // 保存对话历史到 localStorage
    saveConversationsToLocalStorage(agentId, messages) {
        try {
            const conversations = JSON.parse(localStorage.getItem(this.conversationsKey) || '{}')
            conversations[agentId] = messages
            localStorage.setItem(this.conversationsKey, JSON.stringify(conversations))
            return true
        } catch (error) {
            console.error('保存对话历史到 localStorage 失败:', error)
            return false
        }
    }

    // 从 localStorage 获取图片
    getImageFromLocalStorage(messageId) {
        try {
            const images = localStorage.getItem(this.imagesKey)
            const allImages = images ? JSON.parse(images) : {}
            return allImages[messageId] || null
        } catch (error) {
            console.error('从 localStorage 获取图片失败:', error)
            return null
        }
    }

    // 保存图片到 localStorage
    saveImageToLocalStorage(messageId, agentId, imageData) {
        try {
            const images = JSON.parse(localStorage.getItem(this.imagesKey) || '{}')
            images[messageId] = {
                messageId,
                agentId,
                imageData,
                createdAt: new Date().toISOString()
            }
            localStorage.setItem(this.imagesKey, JSON.stringify(images))
            return true
        } catch (error) {
            console.error('保存图片到 localStorage 失败:', error)
            return false
        }
    }

    // 从 localStorage 获取存储使用量
    getStorageSizeFromLocalStorage() {
        let total = 0

        // 计算对话历史使用量
        const conversations = localStorage.getItem(this.conversationsKey)
        if (conversations) {
            total += conversations.length * 2
        }

        // 计算图片数据使用量
        const images = localStorage.getItem(this.imagesKey)
        if (images) {
            total += images.length * 2
        }

        // 计算头像数据使用量
        const avatars = localStorage.getItem(this.avatarsKey)
        if (avatars) {
            total += avatars.length * 2
        }

        return total
    }

    // localStorage 头像存储方法
    saveAvatarToLocalStorage(agentId, imageData, avatarType = 'image') {
        try {
            const avatars = JSON.parse(localStorage.getItem(this.avatarsKey) || '{}')
            avatars[agentId] = {
                avatarData: imageData,
                avatarType: avatarType,
                updatedAt: new Date().toISOString()
            }
            localStorage.setItem(this.avatarsKey, JSON.stringify(avatars))
            return true
        } catch (error) {
            console.error('保存头像到 localStorage 失败:', error)
            return false
        }
    }

    getAvatarFromLocalStorage(agentId) {
        try {
            const avatars = JSON.parse(localStorage.getItem(this.avatarsKey) || '{}')
            const avatar = avatars[agentId]
            return avatar ? { data: avatar.avatarData, type: avatar.avatarType } : null
        } catch (error) {
            console.error('从 localStorage 获取头像失败:', error)
            return null
        }
    }

    deleteAvatarFromLocalStorage(agentId) {
        try {
            const avatars = JSON.parse(localStorage.getItem(this.avatarsKey) || '{}')
            delete avatars[agentId]
            localStorage.setItem(this.avatarsKey, JSON.stringify(avatars))
            return true
        } catch (error) {
            console.error('从 localStorage 删除头像失败:', error)
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

    // ==================== 多对话模式存储方法 ====================

    // 获取指定智能体的所有对话会话
    async getChatSessions(agentId) {
        if (this.useLocalStorage) {
            return this.getChatSessionsFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getChatSessionsFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessions'], 'readonly')
            const objectStore = transaction.objectStore('chatSessions')
            const index = objectStore.index('agentId')
            const request = index.getAll(agentId)

            request.onerror = () => {
                console.error('获取对话会话列表失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const results = request.result
                // 按更新时间降序排序
                results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                resolve(results)
            }
        })
    }

    // 保存指定智能体的对话会话列表
    async saveChatSessions(agentId, sessions) {
        if (this.useLocalStorage) {
            return this.saveChatSessionsToLocalStorage(agentId, sessions)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveChatSessionsToLocalStorage(agentId, sessions)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessions'], 'readwrite')
            const objectStore = transaction.objectStore('chatSessions')

            // 先删除该智能体的所有会话
            const index = objectStore.index('agentId')
            const getAllRequest = index.getAllKeys(agentId)

            getAllRequest.onsuccess = () => {
                const keys = getAllRequest.result

                // 删除旧会话
                keys.forEach(key => {
                    objectStore.delete(key)
                })

                // 添加新会话
                let addedCount = 0
                const total = sessions.length

                if (total === 0) {
                    resolve(true)
                    return
                }

                sessions.forEach(session => {
                    const data = {
                        id: session.id,
                        agentId: agentId,
                        name: session.name,
                        updatedAt: session.updatedAt || new Date().toISOString()
                    }

                    const request = objectStore.put(data)

                    request.onsuccess = () => {
                        addedCount++
                        if (addedCount === total) {
                            resolve(true)
                        }
                    }

                    request.onerror = () => {
                        console.error('保存对话会话失败:', request.error)
                        reject(request.error)
                    }
                })
            }

            getAllRequest.onerror = () => {
                console.error('获取对话会话键失败:', getAllRequest.error)
                reject(getAllRequest.error)
            }
        })
    }

    // 获取指定会话的对话消息
    async getChatSessionMessages(agentId, sessionId) {
        if (this.useLocalStorage) {
            return this.getChatSessionMessagesFromLocalStorage(agentId, sessionId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getChatSessionMessagesFromLocalStorage(agentId, sessionId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessionMessages'], 'readonly')
            const objectStore = transaction.objectStore('chatSessionMessages')
            const index = objectStore.index('agentId_sessionId')
            const request = index.get([agentId, sessionId])

            request.onerror = () => {
                console.error('获取对话会话消息失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? result.messages : [])
            }
        })
    }

    // 保存指定会话的对话消息
    async saveChatSessionMessages(agentId, sessionId, messages) {
        if (this.useLocalStorage) {
            return this.saveChatSessionMessagesToLocalStorage(agentId, sessionId, messages)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveChatSessionMessagesToLocalStorage(agentId, sessionId, messages)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessionMessages'], 'readwrite')
            const objectStore = transaction.objectStore('chatSessionMessages')

            // 清理消息对象
            let cleanedMessages
            try {
                const jsonStr = JSON.stringify(messages)
                cleanedMessages = JSON.parse(jsonStr)
            } catch (error) {
                cleanedMessages = messages.map(msg => this.cleanMessageObject(msg))
            }

            const data = {
                id: `${agentId}_${sessionId}`,
                agentId: agentId,
                sessionId: sessionId,
                messages: cleanedMessages,
                updatedAt: new Date().toISOString()
            }

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('保存对话会话消息失败，降级到 localStorage:', request.error)
                // 降级到 localStorage
                this.useLocalStorage = true
                const result = this.saveChatSessionMessagesToLocalStorage(agentId, sessionId, messages)
                resolve(result)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // 删除指定会话
    async deleteChatSession(agentId, sessionId) {
        if (this.useLocalStorage) {
            return this.deleteChatSessionFromLocalStorage(agentId, sessionId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.deleteChatSessionFromLocalStorage(agentId, sessionId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessions', 'chatSessionMessages'], 'readwrite')

            // 删除会话记录
            const sessionsStore = transaction.objectStore('chatSessions')
            const deleteSessionRequest = sessionsStore.delete(sessionId)

            // 删除会话消息（使用游标）
            const messagesStore = transaction.objectStore('chatSessionMessages')
            const messagesIndex = messagesStore.index('agentId_sessionId')
            const keyRange = IDBKeyRange.only([agentId, sessionId])
            const messagesRequest = messagesIndex.openCursor(keyRange)

            messagesRequest.onsuccess = (event) => {
                const cursor = event.target.result
                if (cursor) {
                    cursor.delete()
                    cursor.continue()
                }
            }

            transaction.oncomplete = () => {
                resolve(true)
            }

            transaction.onerror = () => {
                console.error('删除对话会话失败:', transaction.error)
                reject(transaction.error)
            }
        })
    }

    // 清空指定智能体的所有对话会话
    async clearAllChatSessions(agentId) {
        if (this.useLocalStorage) {
            return this.clearAllChatSessionsFromLocalStorage(agentId)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.clearAllChatSessionsFromLocalStorage(agentId)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessions', 'chatSessionMessages'], 'readwrite')

            // 删除所有会话记录
            const sessionsStore = transaction.objectStore('chatSessions')
            const sessionsIndex = sessionsStore.index('agentId')
            const sessionsRequest = sessionsIndex.getAllKeys(agentId)

            // 删除所有会话消息
            const messagesStore = transaction.objectStore('chatSessionMessages')
            const messagesIndex = messagesStore.index('agentId')
            const messagesRequest = messagesIndex.getAllKeys(agentId)

            let deletedSessions = 0
            let deletedMessages = 0
            let totalSessions = 0
            let totalMessages = 0

            sessionsRequest.onsuccess = () => {
                const sessionKeys = sessionsRequest.result
                totalSessions = sessionKeys.length

                sessionKeys.forEach(key => {
                    const deleteRequest = sessionsStore.delete(key)
                    deleteRequest.onsuccess = () => {
                        deletedSessions++
                        checkComplete()
                    }
                })
            }

            messagesRequest.onsuccess = () => {
                const messageKeys = messagesRequest.result
                totalMessages = messageKeys.length

                messageKeys.forEach(key => {
                    const deleteRequest = messagesStore.delete(key)
                    deleteRequest.onsuccess = () => {
                        deletedMessages++
                        checkComplete()
                    }
                })
            }

            function checkComplete() {
                if (deletedSessions === totalSessions && deletedMessages === totalMessages) {
                    resolve(true)
                }
            }

            transaction.onerror = () => {
                console.error('清空对话会话失败:', transaction.error)
                reject(transaction.error)
            }
        })
    }

    // ==================== 多对话模式 localStorage 后备方法 ====================

    getChatSessionsFromLocalStorage(agentId) {
        try {
            const allSessions = localStorage.getItem(this.chatSessionsKey)
            const sessionsData = allSessions ? JSON.parse(allSessions) : {}
            return sessionsData[agentId] || []
        } catch (error) {
            console.error('从 localStorage 获取对话会话列表失败:', error)
            return []
        }
    }

    saveChatSessionsToLocalStorage(agentId, sessions) {
        try {
            const allSessions = JSON.parse(localStorage.getItem(this.chatSessionsKey) || '{}')
            allSessions[agentId] = sessions
            localStorage.setItem(this.chatSessionsKey, JSON.stringify(allSessions))
            return true
        } catch (error) {
            console.error('保存对话会话列表到 localStorage 失败:', error)
            return false
        }
    }

    getChatSessionMessagesFromLocalStorage(agentId, sessionId) {
        try {
            const allMessages = localStorage.getItem(this.chatSessionMessagesKey)
            const messagesData = allMessages ? JSON.parse(allMessages) : {}
            const key = `${agentId}_${sessionId}`
            return messagesData[key] || []
        } catch (error) {
            console.error('从 localStorage 获取对话会话消息失败:', error)
            return []
        }
    }

    saveChatSessionMessagesToLocalStorage(agentId, sessionId, messages) {
        try {
            const allMessages = JSON.parse(localStorage.getItem(this.chatSessionMessagesKey) || '{}')
            const key = `${agentId}_${sessionId}`
            allMessages[key] = messages
            localStorage.setItem(this.chatSessionMessagesKey, JSON.stringify(allMessages))
            return true
        } catch (error) {
            console.error('保存对话会话消息到 localStorage 失败:', error)
            return false
        }
    }

    deleteChatSessionFromLocalStorage(agentId, sessionId) {
        try {
            // 删除会话记录
            const allSessions = JSON.parse(localStorage.getItem(this.chatSessionsKey) || '{}')
            if (allSessions[agentId]) {
                allSessions[agentId] = allSessions[agentId].filter(s => s.id !== sessionId)
                localStorage.setItem(this.chatSessionsKey, JSON.stringify(allSessions))
            }

            // 删除会话消息
            const allMessages = JSON.parse(localStorage.getItem(this.chatSessionMessagesKey) || '{}')
            const key = `${agentId}_${sessionId}`
            delete allMessages[key]
            localStorage.setItem(this.chatSessionMessagesKey, JSON.stringify(allMessages))

            return true
        } catch (error) {
            console.error('从 localStorage 删除对话会话失败:', error)
            return false
        }
    }

    clearAllChatSessionsFromLocalStorage(agentId) {
        try {
            // 删除所有会话记录
            const allSessions = JSON.parse(localStorage.getItem(this.chatSessionsKey) || '{}')
            delete allSessions[agentId]
            localStorage.setItem(this.chatSessionsKey, JSON.stringify(allSessions))

            // 删除所有会话消息
            const allMessages = JSON.parse(localStorage.getItem(this.chatSessionMessagesKey) || '{}')
            Object.keys(allMessages).forEach(key => {
                if (key.startsWith(`${agentId}_`)) {
                    delete allMessages[key]
                }
            })
            localStorage.setItem(this.chatSessionMessagesKey, JSON.stringify(allMessages))

            return true
        } catch (error) {
            console.error('从 localStorage 清空对话会话失败:', error)
            return false
        }
    }

    // 获取所有智能体的多对话数据（用于导出）
    async getAllChatSessions() {
        if (this.useLocalStorage) {
            return this.getAllChatSessionsFromLocalStorage()
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.getAllChatSessionsFromLocalStorage()
        }

        return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['chatSessions', 'chatSessionMessages'], 'readonly')
        const sessionsStore = transaction.objectStore('chatSessions')
        const messagesStore = transaction.objectStore('chatSessionMessages')

        // 获取所有会话
        const sessionsRequest = sessionsStore.getAll()

        sessionsRequest.onerror = () => {
            console.error('获取所有对话会话失败:', sessionsRequest.error)
            reject(sessionsRequest.error)
        }

        sessionsRequest.onsuccess = () => {
            const sessions = sessionsRequest.result
            const result = {}

            // 为每个会话获取消息
            let loadedCount = 0
            const total = sessions.length

            if (total === 0) {
                resolve(result)
                return
            }

            sessions.forEach(session => {
                const agentId = session.agentId
                const sessionId = session.id

                if (!result[agentId]) {
                    result[agentId] = {
                        sessions: [],
                        messages: {}
                    }
                }

                // 添加会话信息
                result[agentId].sessions.push({
                    id: session.id,
                    name: session.name,
                    updatedAt: session.updatedAt
                })

                // 获取该会话的消息
                const messagesRequest = messagesStore.index('agentId_sessionId').get([agentId, sessionId])

                messagesRequest.onsuccess = () => {
                    const messageData = messagesRequest.result
                    if (messageData) {
                        result[agentId].messages[sessionId] = messageData.messages
                    }

                    loadedCount++
                    if (loadedCount === total) {
                        resolve(result)
                    }
                }

                messagesRequest.onerror = () => {
                    console.error(`获取会话 ${sessionId} 的消息失败:`, messagesRequest.error)
                    loadedCount++
                    if (loadedCount === total) {
                        resolve(result)
                    }
                }
            })
            }
        })
    }

    // localStorage 后备方法：获取所有多对话数据
    getAllChatSessionsFromLocalStorage() {
        try {
            const allSessions = localStorage.getItem(this.chatSessionsKey)
            const allMessages = localStorage.getItem(this.chatSessionMessagesKey)

            const sessionsData = allSessions ? JSON.parse(allSessions) : {}
            const messagesData = allMessages ? JSON.parse(allMessages) : {}

            const result = {}

        // 整理数据格式
        Object.keys(sessionsData).forEach(agentId => {
            result[agentId] = {
                sessions: sessionsData[agentId],
                messages: {}
            }

            // 获取该智能体所有会话的消息
            sessionsData[agentId].forEach(session => {
                const key = `${agentId}_${session.id}`
                if (messagesData[key]) {
                    result[agentId].messages[session.id] = messagesData[key]
                }
            })
        })

        return result
    } catch (error) {
        console.error('从 localStorage 获取所有多对话数据失败:', error)
        return {}
    }
    }

    // 批量保存多对话数据（用于导入）
    async saveAllChatSessions(chatSessionsData) {
        if (this.useLocalStorage) {
            return this.saveAllChatSessionsToLocalStorage(chatSessionsData)
        }

        if (!this.db) {
            await this.init()
        }

        // 如果初始化后降级到 localStorage
        if (this.useLocalStorage) {
            return this.saveAllChatSessionsToLocalStorage(chatSessionsData)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chatSessions', 'chatSessionMessages'], 'readwrite')
            const sessionsStore = transaction.objectStore('chatSessions')
            const messagesStore = transaction.objectStore('chatSessionMessages')

            let savedCount = 0
            let totalItems = 0

            // 计算需要保存的项目总数
            Object.keys(chatSessionsData).forEach(agentId => {
                const agentData = chatSessionsData[agentId]
                totalItems += agentData.sessions.length
                totalItems += Object.keys(agentData.messages).length
            })

            if (totalItems === 0) {
                resolve(true)
                return
            }

            // 保存每个智能体的数据
            Object.keys(chatSessionsData).forEach(agentId => {
                const agentData = chatSessionsData[agentId]

                // 保存会话列表
                agentData.sessions.forEach(session => {
                    const sessionData = {
                        id: session.id,
                        agentId: agentId,
                        name: session.name,
                        updatedAt: session.updatedAt
                    }

                    const sessionRequest = sessionsStore.put(sessionData)

                    sessionRequest.onsuccess = () => {
                        savedCount++
                        if (savedCount === totalItems) {
                            resolve(true)
                        }
                    }

                    sessionRequest.onerror = () => {
                        console.error('保存会话失败:', sessionRequest.error)
                        reject(sessionRequest.error)
                    }
                })

                // 保存会话消息
                Object.keys(agentData.messages).forEach(sessionId => {
                    const messages = agentData.messages[sessionId]
                    const messageData = {
                        id: `${agentId}_${sessionId}`,
                        agentId: agentId,
                        sessionId: sessionId,
                        messages: messages,
                        updatedAt: new Date().toISOString()
                    }

                    const messageRequest = messagesStore.put(messageData)

                    messageRequest.onsuccess = () => {
                        savedCount++
                        if (savedCount === totalItems) {
                            resolve(true)
                        }
                    }

                    messageRequest.onerror = () => {
                        console.error('保存会话消息失败:', messageRequest.error)
                        reject(messageRequest.error)
                    }
                })
            })
        })
    }

    // localStorage 后备方法：批量保存多对话数据
    saveAllChatSessionsToLocalStorage(chatSessionsData) {
        try {
            const allSessions = JSON.parse(localStorage.getItem(this.chatSessionsKey) || '{}')
            const allMessages = JSON.parse(localStorage.getItem(this.chatSessionMessagesKey) || '{}')

            // 合并数据
            Object.keys(chatSessionsData).forEach(agentId => {
                const agentData = chatSessionsData[agentId]

                // 保存会话列表
                allSessions[agentId] = agentData.sessions

                // 保存会话消息
                Object.keys(agentData.messages).forEach(sessionId => {
                    const key = `${agentId}_${sessionId}`
                    allMessages[key] = agentData.messages[sessionId]
                })
            })

            localStorage.setItem(this.chatSessionsKey, JSON.stringify(allSessions))
            localStorage.setItem(this.chatSessionMessagesKey, JSON.stringify(allMessages))

            return true
        } catch (error) {
            console.error('批量保存多对话数据到 localStorage 失败:', error)
            return false
        }
    }

    // ==================== 清除所有数据 ====================

    // 清除所有 IndexedDB 数据
    async clearAllIndexedDBData() {
        if (!this.db) {
            await this.init()
        }

        // 如果降级到 localStorage，跳过 IndexedDB 清除
        if (this.useLocalStorage) {
            console.log('IndexedDB 不可用，跳过清除')
            return true
        }

        return new Promise((resolve, reject) => {
            // 获取所有对象存储的名称
            const storeNames = [
                this.storeName, // conversations
                'images',
                'avatars',
                'chatSessions',
                'chatSessionMessages'
            ]

            let clearedCount = 0
            const totalStores = storeNames.length

            // 逐个清除每个对象存储
            storeNames.forEach(storeName => {
                try {
                    const transaction = this.db.transaction([storeName], 'readwrite')
                    const objectStore = transaction.objectStore(storeName)
                    const request = objectStore.clear()

                    request.onsuccess = () => {
                        console.log(`已清除对象存储: ${storeName}`)
                        clearedCount++
                        if (clearedCount === totalStores) {
                            resolve(true)
                        }
                    }

                    request.onerror = () => {
                        console.error(`清除对象存储失败: ${storeName}`, request.error)
                        reject(request.error)
                    }
                } catch (error) {
                    console.error(`清除对象存储时出错: ${storeName}`, error)
                    clearedCount++
                    if (clearedCount === totalStores) {
                        resolve(true)
                    }
                }
            })
        })
    }

    // 清除所有 localStorage 数据
    clearAllLocalStorageData() {
        try {
            // 清除对话历史
            localStorage.removeItem(this.conversationsKey)

            // 清除图片数据
            localStorage.removeItem(this.imagesKey)

            // 清除头像数据
            localStorage.removeItem(this.avatarsKey)

            // 清除对话会话数据
            localStorage.removeItem(this.chatSessionsKey)

            // 清除对话会话消息数据
            localStorage.removeItem(this.chatSessionMessagesKey)

            console.log('已清除所有 localStorage 数据')
            return true
        } catch (error) {
            console.error('清除 localStorage 数据失败:', error)
            return false
        }
    }

    // 删除整个 IndexedDB 数据库（包括版本标识）
    async deleteDatabase() {
        if (!this.isIndexedDBAvailable()) {
            console.log('IndexedDB 不可用，跳过数据库删除')
            return true
        }

        // 关闭当前数据库连接
        if (this.db) {
            this.db.close()
            this.db = null
        }

        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName)

            deleteRequest.onsuccess = () => {
                console.log(`已删除 IndexedDB 数据库: ${this.dbName}`)
                resolve(true)
            }

            deleteRequest.onerror = () => {
                console.error('删除 IndexedDB 数据库失败:', deleteRequest.error)
                reject(deleteRequest.error)
            }

            deleteRequest.onblocked = () => {
                console.warn('删除 IndexedDB 数据库被阻塞，请关闭所有连接')
            }
        })
    }

    // 清除所有数据（IndexedDB + localStorage）
    async clearAllData() {
        console.log('开始清除所有数据...')

        // 清除 IndexedDB 数据
        const indexedDBCleared = await this.clearAllIndexedDBData()

        // 清除 localStorage 数据
        const localStorageCleared = this.clearAllLocalStorageData()

        console.log('数据清除完成:', {
            indexedDB: indexedDBCleared,
            localStorage: localStorageCleared
        })

        return indexedDBCleared && localStorageCleared
    }

    // ==================== 自定义组件管理 ====================

    // 保存自定义组件
    async saveCustomComponent(component) {
        console.log('[IndexedDB] 开始保存自定义组件:', component)
        
        if (this.useLocalStorage) {
            console.log('[IndexedDB] 使用 localStorage 保存')
            return this.saveCustomComponentToLocalStorage(component)
        }

        if (!this.db) {
            console.log('[IndexedDB] 数据库未初始化，正在初始化...')
            await this.init()
        }

        if (this.useLocalStorage) {
            console.log('[IndexedDB] 初始化后降级到 localStorage')
            return this.saveCustomComponentToLocalStorage(component)
        }

        console.log('[IndexedDB] 数据库已初始化，使用 IndexedDB 保存')
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customComponents'], 'readwrite')
            const objectStore = transaction.objectStore('customComponents')

            const data = {
                id: component.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
                name: component.name,
                description: component.description || '',
                code: component.code || '',
                createdAt: component.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            console.log('[IndexedDB] 准备保存的数据:', data)

            const request = objectStore.put(data)

            request.onerror = () => {
                console.error('[IndexedDB] 保存自定义组件失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                console.log('[IndexedDB] 自定义组件保存成功:', data)
                resolve(data)
            }
        })
    }

    // 获取所有自定义组件
    async getAllCustomComponents() {
        console.log('[IndexedDB] 开始获取所有自定义组件')
        
        if (this.useLocalStorage) {
            console.log('[IndexedDB] 使用 localStorage 获取')
            return this.getAllCustomComponentsFromLocalStorage()
        }

        if (!this.db) {
            console.log('[IndexedDB] 数据库未初始化，正在初始化...')
            await this.init()
        }

        if (this.useLocalStorage) {
            console.log('[IndexedDB] 初始化后降级到 localStorage')
            return this.getAllCustomComponentsFromLocalStorage()
        }

        console.log('[IndexedDB] 数据库已初始化，使用 IndexedDB 获取')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customComponents'], 'readonly')
            const objectStore = transaction.objectStore('customComponents')
            const request = objectStore.getAll()

            request.onerror = () => {
                console.error('[IndexedDB] 获取自定义组件失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                console.log('[IndexedDB] 获取到的自定义组件:', request.result)
                resolve(request.result || [])
            }
        })
    }

    // 获取单个自定义组件
    async getCustomComponent(id) {
        if (this.useLocalStorage) {
            return this.getCustomComponentFromLocalStorage(id)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.getCustomComponentFromLocalStorage(id)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customComponents'], 'readonly')
            const objectStore = transaction.objectStore('customComponents')
            const request = objectStore.get(id)

            request.onerror = () => {
                console.error('获取自定义组件失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(request.result || null)
            }
        })
    }

    // 删除自定义组件
    async deleteCustomComponent(id) {
        if (this.useLocalStorage) {
            return this.deleteCustomComponentFromLocalStorage(id)
        }

        if (!this.db) {
            await this.init()
        }

        if (this.useLocalStorage) {
            return this.deleteCustomComponentFromLocalStorage(id)
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customComponents'], 'readwrite')
            const objectStore = transaction.objectStore('customComponents')
            const request = objectStore.delete(id)

            request.onerror = () => {
                console.error('删除自定义组件失败:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                resolve(true)
            }
        })
    }

    // ==================== localStorage 后备存储 ====================

    // 保存自定义组件到 localStorage
    saveCustomComponentToLocalStorage(component) {
        try {
            const components = this.getAllCustomComponentsFromLocalStorage()
            const existingIndex = components.findIndex(c => c.id === component.id)

            const data = {
                id: component.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
                name: component.name,
                description: component.description || '',
                code: component.code || '',
                createdAt: component.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            if (existingIndex !== -1) {
                components[existingIndex] = data
            } else {
                components.push(data)
            }

            localStorage.setItem('custom_components', JSON.stringify(components))
            return Promise.resolve(data)
        } catch (error) {
            console.error('保存自定义组件到 localStorage 失败:', error)
            return Promise.reject(error)
        }
    }

    // 从 localStorage 获取所有自定义组件
    getAllCustomComponentsFromLocalStorage() {
        try {
            const data = localStorage.getItem('custom_components')
            return data ? JSON.parse(data) : []
        } catch (error) {
            console.error('从 localStorage 获取自定义组件失败:', error)
            return []
        }
    }

    // 从 localStorage 获取单个自定义组件
    getCustomComponentFromLocalStorage(id) {
        try {
            const components = this.getAllCustomComponentsFromLocalStorage()
            return components.find(c => c.id === id) || null
        } catch (error) {
            console.error('从 localStorage 获取自定义组件失败:', error)
            return null
        }
    }

    // 从 localStorage 删除自定义组件
    deleteCustomComponentFromLocalStorage(id) {
        try {
            const components = this.getAllCustomComponentsFromLocalStorage()
            const filtered = components.filter(c => c.id !== id)
            localStorage.setItem('custom_components', JSON.stringify(filtered))
            return Promise.resolve(true)
        } catch (error) {
            console.error('从 localStorage 删除自定义组件失败:', error)
            return Promise.reject(error)
        }
    }
}

// 创建全局实例
export const conversationDB = new ConversationDB()