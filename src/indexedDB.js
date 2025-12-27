// IndexedDB 管理类 - 用于存储聊天历史
export class ConversationDB {
    constructor() {
        this.dbName = 'AIConversationDB'
        this.dbVersion = 2
        this.storeName = 'conversations'
        this.db = null
        this.useLocalStorage = false
        this.conversationsKey = 'ai_conversations_fallback'
        this.imagesKey = 'ai_images_fallback'
        this.avatarsKey = 'ai_avatars_fallback'
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

        // 尝试删除旧版本的数据库
        try {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName)
            await new Promise((resolve, reject) => {
                deleteRequest.onsuccess = () => {
                    console.log('旧版 IndexedDB 已删除')
                    resolve()
                }
                deleteRequest.onerror = () => {
                    console.warn('删除旧版 IndexedDB 失败，可能不存在')
                    resolve()
                }
            })
        } catch (error) {
            console.warn('删除旧版 IndexedDB 时出错:', error)
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
}

// 创建全局实例
export const conversationDB = new ConversationDB()