<template>
  <div class="tavern-chat">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="scene-info">
        <h2 class="scene-title">{{ config.name }}</h2>
        <p class="scene-description">{{ config.description || '暂无场景描述' }}</p>
        <p v-if="aiStatus" class="ai-status">{{ aiStatus }}</p>
      </div>
      <div class="chat-controls">
        <button
          class="control-btn sidebar-toggle"
          :class="{ 'shine-effect': styleSettings.enableShineEffect }"
          @click="$emit('toggle-sidebar')"
          title="切换侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          侧边栏
        </button>
        <button
          class="control-btn"
          :class="{ 'active': autoMode, 'shine-effect': styleSettings.enableShineEffect }"
          @click="toggleAutoMode"
          title="自动对话模式"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          自动对话
        </button>
        <button
          class="control-btn"
          :class="{ 'shine-effect': styleSettings.enableShineEffect }"
          @click="showClearConfirm = true"
          title="清空对话"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 16h4v2h-4zm0-8h7v2h-6zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/>
          </svg>
          清空
        </button>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <div v-if="showClearConfirm" class="confirm-overlay" @click.self="showClearConfirm = false">
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>确认清空对话</h3>
          <button class="close-btn" @click="showClearConfirm = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="confirm-body">
          <p>确定要清空所有对话记录吗？此操作不可恢复。</p>
        </div>
        <div class="confirm-footer">
          <button class="confirm-btn cancel" @click="showClearConfirm = false">取消</button>
          <button class="confirm-btn danger" @click="confirmClearChat">确认清空</button>
        </div>
      </div>
    </div>

    <!-- Chat Messages -->
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>开始酒馆对话</h3>
        <p>选择角色或输入消息开始互动</p>
        <div v-if="config.characters && config.characters.length > 0" class="characters-preview">
          <div
            v-for="character in config.characters"
            :key="character.id"
            class="character-preview-item"
            @click="selectCharacter(character)"
          >
            <span class="character-avatar">{{ character.avatar || '👤' }}</span>
            <span class="character-name">{{ character.name }}</span>
          </div>
        </div>
      </div>

      <div v-else class="messages-container">
        <!-- 系统通知区域 -->
        <div v-if="systemNotifications.length > 0" class="system-notifications">
          <div
            v-for="(notification, index) in systemNotifications"
            :key="index"
            class="system-notification"
          >
            {{ notification }}
          </div>
        </div>

        <div
          v-for="(message, index) in messages"
          :key="message.id"
          :class="['message', message.type, {
            'user': message.type === 'user',
            'assistant': message.type === 'character',
            'system': message.type === 'system'
          }]"
        >
          <!-- 角色消息 -->
          <div v-if="message.type === 'character'" class="message-avatar">
            <div class="avatar assistant">
              {{ getCharacterAvatar(message.characterId) }}
            </div>
          </div>

          <div v-if="message.type === 'character'" class="message-content-wrapper">
            <div class="message-content">
              <div class="message-sender">{{ getCharacterName(message.characterId) }}</div>
              <div class="message-text">{{ message.content }}</div>
            </div>
            <div class="message-time">
              {{ formatTime(message.timestamp) }}
            </div>
            <div class="message-actions">
              <button class="action-btn copy-btn" @click="copyMessage(message)" title="复制消息">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 用户消息 -->
          <div v-if="message.type === 'user'" class="message-avatar">
            <div class="avatar user">你</div>
          </div>

          <div v-if="message.type === 'user'" class="message-content-wrapper">
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
            </div>
            <div class="message-time">
              {{ formatTime(message.timestamp) }}
            </div>
            <div class="message-actions">
              <button class="action-btn copy-btn" @click="copyMessage(message)" title="复制消息">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              </button>
              <span class="action-divider">|</span>
              <button class="action-btn edit-btn" @click="editMessage(message)" title="编辑消息">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 系统消息 -->
          <div v-if="message.type === 'system'" class="system-message-content">
            {{ message.content }}
          </div>
        </div>

        <!-- 自动对话中提示 -->
        <div v-if="autoMode && isAutoGenerating" class="message assistant typing-message">
          <div class="message-avatar">
            <div class="avatar assistant">💭</div>
          </div>
          <div class="message-content-wrapper">
            <div class="message-content typing">
              <div class="typing-indicator">
                <span>角色互动中</span>
                <div class="typing-dots">
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Input -->
    <div class="chat-input-area">
      <!-- 输入提示框 -->
      <div v-if="showInputHint" class="input-hint">
        <div
          v-for="(item, index) in hintItems"
          :key="index"
          class="hint-item"
          :class="{ 'selected': index === hintSelectedIndex }"
          @click="selectHintItem(item)"
        >
          <span class="hint-icon">{{ item.icon }}</span>
          <span class="hint-text">{{ item.text }}</span>
          <span v-if="item.description" class="hint-description">{{ item.description }}</span>
        </div>
      </div>

      <div class="input-header">
        <div class="target-selector">
          <CustomDropdown
            v-model="selectedTarget"
            :options="targetOptions"
          />
          <button
            class="action-link"
            :class="{ 'shine-effect': styleSettings.enableShineEffect }"
            @click="insertCommand"
          >
            @
          </button>
        </div>
      </div>
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          class="chat-input"
          placeholder="输入消息或使用 @角色名 发送给特定角色..."
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="inputMessage += '\n'"
          @keydown.up.prevent="navigateHint(-1)"
          @keydown.down.prevent="navigateHint(1)"
          @keydown.esc.prevent="hideInputHint"
          @input="handleInput"
          rows="1"
          ref="chatInput"
        ></textarea>
        <button
          class="send-btn"
          :class="{ 'shine-effect': styleSettings.enableShineEffect }"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isAutoGenerating"
          title="发送消息"
        >
          <span class="send-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </span>
        </button>      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue';
import CustomDropdown from './CustomDropdown.vue'
import { tavernDB } from '../tavernDB.js'
import { tavernAIService } from '../tavernAIService.js'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  styleSettings: {
    type: Object,
    default: () => ({})
  },
  aiSettings: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update-config', 'toggle-sidebar']);

// 消息列表
const messages = ref([]);

// 系统通知列表（不保存到历史）
const systemNotifications = ref([]);

// 初始化标志
let isInitializing = ref(true);

// 从 IndexedDB 加载消息
const loadMessages = async () => {
  if (!props.config?.id) return;
  try {
    const loaded = await tavernDB.getMessages(props.config.id);
    messages.value = loaded;
  } catch (error) {
    console.error('加载酒馆消息失败:', error);
    messages.value = [];
  }
};

// 保存消息到 IndexedDB
const saveMessages = async () => {
  if (!props.config?.id) return;
  try {
    await tavernDB.saveMessages(props.config.id, messages.value);
  } catch (error) {
    console.error('保存酒馆消息失败:', error);
  }
};

// 监听消息变化，自动保存（排除初始化加载的情况）
watch(messages, () => {
  if (!isInitializing.value) {
    saveMessages();
  }
}, { deep: true });

// 监听配置变化，加载对应的消息
watch(() => props.config?.id, async () => {
  isInitializing.value = true;
  await loadMessages();
  // 等待下一个 tick，确保消息已加载完成
  await nextTick();
  isInitializing.value = false;
});

// 窗口大小检测
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 组件挂载时加载消息
onMounted(() => {
  loadMessages();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// 输入消息
const inputMessage = ref('');

// 选中的目标
const selectedTarget = ref('all');

// 目标选项
const targetOptions = computed(() => {
  const options = [{ value: 'all', label: '全体角色' }]
  if (props.config.characters) {
    props.config.characters.forEach(character => {
      options.push({ value: character.id, label: character.name })
    })
  }
  return options
})

// 输入提示相关
const showInputHint = ref(false);
const hintItems = ref([]);
const hintSelectedIndex = ref(0);
const hintTriggerChar = ref('');
const hintTriggerPosition = ref(0);

// 定义系统命令
const systemCommands = [
  { icon: '⏸️', text: '/打断', description: '停止当前自动对话' },
  { icon: '📝', text: '/修改记忆', description: '修改角色或全局记忆' },
  { icon: '🔚', text: '/结束会话', description: '结束当前对话会话' }
];

// 自动对话模式
const autoMode = ref(false);
const isAutoGenerating = ref(false);
const autoChatAbortController = ref(null);

// AI 状态显示
const aiStatus = ref('');

// 确认弹窗
const showClearConfirm = ref(false);

// 引用
const messagesContainer = ref(null);
const chatInput = ref(null);

// 获取角色头像
const getCharacterAvatar = (characterId) => {
  const character = props.config.characters?.find(c => c.id === characterId);
  return character?.avatar || '👤';
};

// 获取角色名称
const getCharacterName = (characterId) => {
  const character = props.config.characters?.find(c => c.id === characterId);
  return character?.name || '未知角色';
};

// 选择角色
const selectCharacter = (character) => {
  selectedTarget.value = character.id;
  chatInput.value?.focus();
};

// 处理输入事件，检测@或/触发提示
const handleInput = () => {
  const text = inputMessage.value;
  const cursorPosition = chatInput.value?.selectionStart || text.length;
  
  // 检查光标前一个字符是否是@或/
  if (cursorPosition > 0) {
    const charBeforeCursor = text[cursorPosition - 1];
    
    if (charBeforeCursor === '@') {
      showCharacterHint(cursorPosition);
    } else if (charBeforeCursor === '/') {
      showCommandHint(cursorPosition);
    } else {
      hideInputHint();
    }
  } else {
    hideInputHint();
  }
};

// 显示角色提示
const showCharacterHint = (position) => {
  hintTriggerChar.value = '@';
  hintTriggerPosition.value = position;
  hintSelectedIndex.value = 0;
  
  // 过滤角色列表
  hintItems.value = (props.config.characters || []).map(char => ({
    icon: char.avatar || '👤',
    text: char.name,
    description: char.role || '',
    type: 'character'
  }));
  
  showInputHint.value = true;
};

// 显示命令提示
const showCommandHint = (position) => {
  hintTriggerChar.value = '/';
  hintTriggerPosition.value = position;
  hintSelectedIndex.value = 0;
  
  hintItems.value = systemCommands.map(cmd => ({
    icon: cmd.icon,
    text: cmd.text,
    description: cmd.description,
    type: 'command'
  }));
  
  showInputHint.value = true;
};

// 隐藏输入提示
const hideInputHint = () => {
  showInputHint.value = false;
  hintItems.value = [];
  hintSelectedIndex.value = 0;
};

// 选择提示项
const selectHintItem = (item) => {
  if (!item) return;
  
  const text = inputMessage.value;
  const position = hintTriggerPosition.value;
  
  // 替换触发字符为选中的内容
  const newText = text.substring(0, position) + item.text + ' ' + text.substring(position);
  inputMessage.value = newText;
  
  // 移动光标到插入内容后面
  nextTick(() => {
    const newPosition = position + item.text.length + 1;
    chatInput.value?.setSelectionRange(newPosition, newPosition);
    chatInput.value?.focus();
  });
  
  hideInputHint();
};

// 导航提示项
const navigateHint = (direction) => {
  if (!showInputHint.value || hintItems.value.length === 0) return;
  
  hintSelectedIndex.value = (hintSelectedIndex.value + direction + hintItems.value.length) % hintItems.value.length;
};

// 插入@符号
const insertCommand = () => {
  const cursorPosition = chatInput.value?.selectionStart || inputMessage.value.length;
  const newText = inputMessage.value.substring(0, cursorPosition) + '@' + inputMessage.value.substring(cursorPosition);
  inputMessage.value = newText;
  
  nextTick(() => {
    chatInput.value?.focus();
    const newPosition = cursorPosition + 1;
    chatInput.value?.setSelectionRange(newPosition, newPosition);
  });
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  const message = inputMessage.value.trim();

  // 立即清除输入框内容
  inputMessage.value = '';
  hideInputHint();

  // 检查是否是命令
  if (message.startsWith('/')) {
    await handleCommand(message);
    return;
  }

  // 检查是否是@命令
  const atMatch = message.match(/^@(\S+)\s+(.+)$/);
  if (atMatch) {
    const targetName = atMatch[1];
    const content = atMatch[2];

    // 查找角色
    const character = props.config.characters?.find(c => c.name === targetName);
    if (character) {
      selectedTarget.value = character.id;
      // 检查是否是强制命令
      if (content.startsWith('强制') || content.startsWith('force')) {
        await handleForceCommand(character, content.replace(/^(强制|force)\s*/, ''));
      } else {
        await addUserMessage(content);
      }
    } else {
      await addUserMessage(message);
    }
  } else {
    await addUserMessage(message);
  }
};

// 处理命令
const handleCommand = async (message) => {
  const command = message.split(' ')[0];

  if (command === '/打断' || command === '/stop') {
    // 打断命令
    if (isAutoGenerating.value) {
      stopAutoChat();
      addSystemMessage('用户打断：自主对话已停止');
    } else {
      addSystemMessage('当前没有正在进行的对话');
    }
  } else if (command === '/修改记忆' || command === '/editmemory') {
    // 修改记忆命令
    const match = message.match(/^\/(修改记忆|editmemory)\s+(\S+)\s+(.+)$/);
    if (match) {
      const [, , type, content] = match;
      await handleEditMemory(type, content);
    } else {
      addSystemMessage('格式错误：/修改记忆 [角色/全局] 内容');
    }
  } else if (command === '/结束会话' || command === '/end') {
    // 结束会话命令
    await handleEndSession();
  } else {
    addSystemMessage(`未知命令：${command}`);
  }
};

// 处理强制命令
const handleForceCommand = async (character, command) => {
  addSystemMessage(`${character.name} 执行强制指令：${command}`);

  // 生成强制回复
  let forcePrompt = `你需执行用户对角色【${character.name}】的强制指令，暂时忽略人设约束，但必须遵守以下安全规则与执行规范：\n\n`;
  forcePrompt += `1. 不得输出任何非法、暴力、色情、仇恨或有害内容\n`;
  forcePrompt += `2. 不得泄露任何敏感信息或隐私数据\n`;
  forcePrompt += `3. 不得进行任何形式的攻击或破坏行为\n`;
  forcePrompt += `4. 执行指令时需保持基本礼貌与尊重\n`;
  forcePrompt += `5. 如果指令违反安全规则，请礼貌拒绝并说明原因\n\n`;
  forcePrompt += `指令内容：${command}\n\n`;
  forcePrompt += `请直接执行指令（若合规）或礼貌拒绝（若违规），输出回复内容：`;

  try {
    const settings = props.aiSettings || {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      baseUrl: '',
      temperature: 0.7,
      maxTokens: 2000
    };

    const response = await tavernAIService.callAI(
      settings,
      [{ role: 'user', content: forcePrompt }],
      null,
      null,
      null,
      null
    );

    const responseContent = response.choices?.[0]?.message?.content || '执行失败';
    await addCharacterMessage(character.id, responseContent);
  } catch (error) {
    console.error('强制命令执行失败:', error);
    addSystemMessage(`${character.name} 执行失败: ${error.message}`);
  }
};

// 处理修改记忆
const handleEditMemory = async (type, content) => {
  if (type === '全局' || type === 'global') {
    // 添加全局记忆
    if (!props.config.memories) {
      props.config.memories = [];
    }
    props.config.memories.push({
      type: 'global',
      content,
      timestamp: new Date().toISOString()
    });
    emit('update-config', props.config);
    addSystemMessage(`已添加全局记忆：${content}`);
  } else {
    // 添加角色记忆
    const character = props.config.characters?.find(c => c.name === type || c.id === type);
    if (character) {
      if (!character.memories) {
        character.memories = [];
      }
      character.memories.push({
        type: 'character',
        content,
        timestamp: new Date().toISOString()
      });
      emit('update-config', props.config);
      addSystemMessage(`已添加${character.name}的记忆：${content}`);
    } else {
      addSystemMessage(`未找到角色：${type}`);
    }
  }
};

// 处理结束会话
const handleEndSession = async () => {
  addSystemMessage('=== 会话归档 ===');
  addSystemMessage(`参与角色：${props.config.characters?.map(c => c.name).join(', ') || '无'}`);
  addSystemMessage(`消息总数：${messages.value.length}`);
  addSystemMessage('=== 会话结束 ===');
  
  // 可选：在这里导出会话记录
};

// 添加用户消息
const addUserMessage = async (content) => {
  const message = {
    id: Date.now().toString(),
    type: 'user',
    content,
    target: selectedTarget.value,
    timestamp: new Date().toISOString()
  };

  messages.value.push(message);
  await tavernDB.addMessage(props.config.id, message);
  scrollToBottom();

  // 触发角色回复
  if (!autoMode.value) {
    await triggerUserDrivenResponse(content);
  }
};

// 触发用户驱动对话
const triggerUserDrivenResponse = async (userMessage, targetCharacter = null) => {
  if (!props.config.characters || props.config.characters.length === 0) {
    return;
  }

  if (selectedTarget.value === 'all') {
    // 全体模式：批量判断哪些角色应该回复
    aiStatus.value = '🤔 正在分析哪些角色应该回复...';
    
    const settings = props.aiSettings || {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      baseUrl: '',
      temperature: 0.7,
      maxTokens: 2000
    };

    // 使用批量判断方法，一次请求完成所有判断
    const responsiveCharacters = await tavernAIService.batchShouldSpeak(
      props.config.characters,
      props.config,
      messages.value.slice(-10),
      settings
    );

    if (responsiveCharacters.length > 0) {
      // 如果只有一个角色，直接发言，不需要协调排序
      if (responsiveCharacters.length === 1) {
        const character = responsiveCharacters[0];
        aiStatus.value = `💬 ${character.name} 正在回复...`;
        await generateCharacterResponse(character, responsiveCharacters);
        aiStatus.value = '';
      } else {
        // 多个角色，需要协调排序
        aiStatus.value = '🔄 正在协调发言顺序...';
        
        const orderedCharacters = await tavernAIService.resolveSpeakingOrder(
          responsiveCharacters,
          props.config,
          messages.value.slice(-10),
          settings
        );

        // 让排序后的角色依次发言
        for (const character of orderedCharacters) {
          aiStatus.value = `💬 ${character.name} 正在回复...`;
          await generateCharacterResponse(character, orderedCharacters);
          
          // 角色之间有短暂间隔
          if (orderedCharacters.indexOf(character) < orderedCharacters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        aiStatus.value = '';
      }
    } else {
      aiStatus.value = '';
    }
  } else {
    // 指定角色模式
    const character = props.config.characters.find(c => c.id === selectedTarget.value);
    if (character) {
      aiStatus.value = `💬 ${character.name} 正在回复...`;
      await generateCharacterResponse(character, [character]);
      aiStatus.value = '';
    }
  }
};

// 添加角色消息
const addCharacterMessage = async (characterId, content) => {
  const character = props.config.characters?.find(c => c.id === characterId);
  const message = {
    id: Date.now().toString(),
    type: 'character',
    characterId,
    senderName: character?.name || '未知角色',
    content,
    timestamp: new Date().toISOString()
  };

  messages.value.push(message);
  await tavernDB.addMessage(props.config.id, message);
  scrollToBottom();
  return message;
};

// 添加系统消息
const addSystemMessage = (content) => {
  systemNotifications.value.push(content);
  // 3秒后自动移除通知
  setTimeout(() => {
    const index = systemNotifications.value.indexOf(content);
    if (index > -1) {
      systemNotifications.value.splice(index, 1);
    }
  }, 3000);
  scrollToBottom();
};

// 切换自动模式
const toggleAutoMode = () => {
  autoMode.value = !autoMode.value;
  if (autoMode.value) {
    addSystemMessage('自动对话模式已开启，角色将自主互动');
    startAutoChat();
  } else {
    addSystemMessage('自动对话模式已关闭');
    stopAutoChat();
  }
};

// 停止自动对话
const stopAutoChat = () => {
  if (autoChatAbortController.value) {
    autoChatAbortController.value.abort();
    autoChatAbortController.value = null;
  }
  isAutoGenerating.value = false;
};

// 开始自动对话
const startAutoChat = async () => {
  if (!autoMode.value || isAutoGenerating.value) return;
  if (!props.config.characters || props.config.characters.length === 0) {
    addSystemMessage('没有可用的角色');
    return;
  }

  isAutoGenerating.value = true;
  autoChatAbortController.value = new AbortController();

  try {
    const maxRounds = 15;
    let roundCount = 0;

    while (autoMode.value && roundCount < maxRounds) {
      roundCount++;

      aiStatus.value = `🤔 第 ${roundCount} 轮：正在分析哪些角色应该发言...`;
      
      // 使用批量判断方法，一次请求完成所有判断
      const settings = props.aiSettings || {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        baseUrl: '',
        temperature: 0.7,
        maxTokens: 2000
      };

      const responsiveCharacters = await tavernAIService.batchShouldSpeak(
        props.config.characters,
        props.config,
        messages.value.slice(-10),
        settings
      );

      if (responsiveCharacters.length === 0) {
        addSystemMessage('角色们暂时没有话想说，自主对话结束');
        break;
      }

      // 如果只有一个角色，直接发言，不需要协调排序
      if (responsiveCharacters.length === 1) {
        const character = responsiveCharacters[0];
        aiStatus.value = `💬 ${character.name} 正在发言...`;
        await generateCharacterResponse(character, responsiveCharacters);
      } else {
        // 多个角色，需要协调排序
        aiStatus.value = '🔄 正在协调发言顺序...';
        
        const orderedCharacters = await tavernAIService.resolveSpeakingOrder(
          responsiveCharacters,
          props.config,
          messages.value.slice(-10),
          settings
        );

        // 让排序后的角色依次发言
        for (const character of orderedCharacters) {
          if (!autoMode.value) break; // 检查是否被中断
          
          aiStatus.value = `💬 ${character.name} 正在发言...`;
          await generateCharacterResponse(character, orderedCharacters);
          
          // 角色之间有短暂间隔
          if (orderedCharacters.indexOf(character) < orderedCharacters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      // 判断是否继续对话
      if (roundCount < maxRounds) {
        aiStatus.value = '🤔 正在判断是否继续对话...';
        
        const decision = await tavernAIService.shouldContinueAutoChat(
          props.config,
          messages.value.slice(-10),
          roundCount,
          settings
        );

        if (!decision.shouldContinue) {
          addSystemMessage(`自主对话结束：${decision.reason}`);
          break;
        }

        // 根据AI判定的间隔时间等待
        aiStatus.value = `⏸️ 等待 ${decision.interval} 秒后继续...`;
        await new Promise(resolve => setTimeout(resolve, decision.interval * 1000));
      }
    }

    if (roundCount >= maxRounds) {
      addSystemMessage('自主对话已达到最大轮数，自动停止');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('自动对话失败:', error);
      addSystemMessage('自动对话失败: ' + error.message);
    }
  } finally {
    isAutoGenerating.value = false;
    autoChatAbortController.value = null;
  }
};

// 判断角色是否应该发言
const shouldCharacterSpeak = async (character) => {
  try {
    const settings = props.aiSettings || {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      baseUrl: '',
      temperature: 0.7,
      maxTokens: 2000
    };

    const recentMessages = messages.value.slice(-10);
    const prompt = tavernAIService.generateShouldSpeakPrompt(
      character,
      props.config,
      recentMessages
    );

    const response = await tavernAIService.callAI(
      settings,
      [{ role: 'user', content: prompt }],
      null,
      null,
      null,
      autoChatAbortController.value?.signal
    );

    const result = response.choices?.[0]?.message?.content?.toLowerCase() || '';
    console.log('发言判断结果:', result);
    // 检查输出格式：应该发言：YES 或 不应该发言：NO
    return result.includes('应该发言：yes') || result.includes('应该发言：是');
  } catch (error) {
    console.error('判断角色发言失败:', error);
    return false;
  }
};

// 生成角色回复
const generateCharacterResponse = async (character, contextCharacters = null) => {
  try {
    // 确保 aiSettings 有默认值
    const settings = props.aiSettings || {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      baseUrl: '',
      temperature: 0.7,
      maxTokens: 2000
    };

    const recentMessages = messages.value.slice(-20);

    let responseContent = '';
    await tavernAIService.generateAutoChatContent(
      character,
      props.config,
      recentMessages,
      settings,
      (chunk) => {
        responseContent += chunk;
        return responseContent;
      },
      null,
      null
    );

    if (responseContent) {
      // 如果提供了上下文角色列表，进行内容微调
      let finalContent = responseContent;
      if (contextCharacters && contextCharacters.length > 1) {
        finalContent = await tavernAIService.adjustCharacterContent(
          character,
          responseContent,
          contextCharacters,
          props.config,
          recentMessages,
          settings
        );
      }
      
      await addCharacterMessage(character.id, finalContent);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('生成角色回复失败:', error);
      addSystemMessage(`${character.name} 发言失败: ${error.message}`);
    }
  }
};

// 清空对话
const clearChat = async () => {
  messages.value = [];
  if (props.config?.id) {
    await tavernDB.deleteMessagesByConfigId(props.config.id);
  }
  addSystemMessage('对话已清空');
};

// 确认清空对话
const confirmClearChat = async () => {
  await clearChat();
  showClearConfirm.value = false;
};

// 复制消息
const copyMessage = (message) => {
  navigator.clipboard.writeText(message.content);
};

// 编辑消息
const editMessage = (message) => {
  inputMessage.value = message.content;
  chatInput.value?.focus();
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 监听角色变化，添加系统提示
watch(() => props.config.characters, (newCharacters) => {
  if (newCharacters && newCharacters.length > 0 && messages.value.length === 0) {
    addSystemMessage(`场景已加载，包含 ${newCharacters.length} 个角色`);
  }
}, { immediate: true });
</script>

<style scoped>
.tavern-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  height: 52px;
  min-height: 52px;
}

.scene-info {
  flex: 1;
  min-width: 0;
}

.scene-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-description {
  display: none;
}

.ai-status {
  display: block;
  font-size: 12px;
  color: var(--primary-color);
  margin-top: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.chat-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.control-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 侧边栏切换按钮 */
.sidebar-toggle {
  display: flex;
}

/* 流光效果 */
.shine-effect {
  position: relative;
  overflow: hidden;
}

.shine-effect::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s ease;
}

.shine-effect:hover::before {
  left: 100%;
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 14px;
  margin: 0 0 24px 0;
}

.characters-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.character-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.character-preview-item:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.character-avatar {
  font-size: 20px;
}

.character-name {
  font-size: 13px;
  font-weight: 500;
}

/* Messages Container */
.messages-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 100%;
  width: 100%;
  padding: 0 16px;
}

/* System Notifications */
.system-notifications {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 16px 0;
}

.system-notification {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: notificationFadeIn 0.3s ease;
  max-width: 80%;
  text-align: center;
}

@keyframes notificationFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Message */
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: messageSlideIn 0.3s ease;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.avatar.user {
  background: var(--primary-color);
}

.avatar.assistant {
  background: var(--secondary-color);
}

.message-content-wrapper {
  flex: 1;
  max-width: min(70%, 600px);
  min-width: 0;
}

.message.user .message-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-content {
  padding: 16px 20px;
  border-radius: var(--radius);
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  line-height: 1.5;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  animation: messageAppear 0.3s ease;
  max-width: 100%;
  box-sizing: border-box;
}

.message-sender {
  font-weight: 600;
  color: var(--secondary-color);
  margin-bottom: 8px;
  font-size: 14px;
}

.message-text {
  color: var(--text-primary);
}

.message.user .message-content {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.message.user .message-text {
  color: white;
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
  padding: 0 4px;
}

.message.user .message-time {
  text-align: right;
}

.message-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-top: 8px;
}

.message:hover .message-actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-divider {
  color: var(--text-tertiary);
  font-size: 12px;
}

.system-message-content {
  text-align: center;
  padding: 12px 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 14px;
  margin: 16px 0;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: var(--text-tertiary);
  border-radius: 50%;
  animation: typingBounce 1.4s ease-in-out infinite both;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes messageAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* System Message */
.system-message {
  justify-content: center;
}

/* Typing Indicator */
.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Input Area */
.chat-input-area {
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  position: relative;
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.target-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-selector label {
  font-size: 12px;
  color: var(--text-secondary);
}

.action-link {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--primary-color);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-link:hover {
  background: var(--primary-color);
  color: white;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  transition: all 0.3s ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  padding: 0;
}

.send-btn .send-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn .send-icon svg {
  width: 100%;
  height: 100%;
  color: white;
  stroke: white;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:disabled .send-icon svg {
  opacity: 0.7;
}

/* 确认弹窗 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.confirm-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.confirm-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.confirm-body {
  padding: 20px;
}

.confirm-body p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn.cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.confirm-btn.cancel:hover {
  background: var(--bg-hover);
}

.confirm-btn.danger {
  background: var(--danger-color);
  color: white;
}

.confirm-btn.danger:hover {
  background: #c0392b;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-header {
    padding: 8px 12px;
    height: 48px;
    min-height: 48px;
  }

  .scene-title {
    font-size: 14px;
  }

  .chat-controls {
    gap: 4px;
  }

  .control-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .chat-messages {
    padding: 16px 12px;
  }

  .messages-container {
    gap: 16px;
  }

  .message-avatar {
    width: 36px;
    height: 36px;
  }

  .avatar-emoji {
    font-size: 20px;
  }

  .message-content {
    padding: 10px 14px;
    font-size: 14px;
  }

  .character-preview-item {
    padding: 6px 12px;
    font-size: 12px;
  }

  .character-avatar {
    font-size: 18px;
  }

  .chat-input-area {
    padding: 12px 16px;
  }

  .input-header {
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .target-select {
    padding: 4px 6px;
    font-size: 11px;
  }

  .action-link {
    padding: 4px 8px;
    font-size: 11px;
  }

  .chat-input {
    padding: 10px 14px;
    font-size: 14px;
    min-height: 40px;
  }

  .send-btn {
    width: 40px;
    height: 40px;
  }

  .input-hint {
    max-height: 200px;
  }
}

/* 输入提示框样式 */
.input-hint {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-bottom: 8px;
  animation: fadeIn 0.2s ease;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.hint-item:last-child {
  border-bottom: none;
}

.hint-item:hover,
.hint-item.selected {
  background: var(--bg-hover);
}

.hint-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.hint-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.hint-description {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

</style>