/**
 * 智能体技能系统
 * 定义所有可用的技能及其配置
 */

// 技能定义
export const SKILL_DEFINITIONS = {
  longFormWriting: {
    id: 'longFormWriting',
    name: '长文写作',
    description: '擅长生成长篇内容，如文章、报告、故事等',
    icon: '📝',
    category: 'content',
    features: ['自动分段', '结构化输出', '多段落生成'],
    uiComponents: [] // 不需要特殊UI组件
  },
  realConversation: {
    id: 'realConversation',
    name: '真人对话',
    description: '模拟真实人类对话风格，更加自然流畅',
    icon: '💬',
    category: 'conversation',
    features: ['自然语言', '情感表达', '口语化'],
    uiComponents: [] // 不需要特殊UI组件
  },
  fileUpload: {
    id: 'fileUpload',
    name: '文件上传',
    description: '支持上传文件进行分析和处理',
    icon: '📁',
    category: 'tool',
    features: ['文件解析', '内容提取', '格式支持'],
    uiComponents: ['fileUploadButton'] // 需要在聊天界面添加文件上传按钮
  },
  codeWriting: {
    id: 'codeWriting',
    name: '代码编写',
    description: '擅长编写和优化各种编程语言的代码',
    icon: '💻',
    category: 'technical',
    features: ['多语言支持', '代码优化', '调试建议'],
    uiComponents: [] // 不需要特殊UI组件
  },
  webSearch: {
    id: 'webSearch',
    name: '网络搜索',
    description: '支持联网搜索实时信息',
    icon: '🌐',
    category: 'tool',
    features: ['实时搜索', '信息整合', '来源引用'],
    uiComponents: ['webSearchButton'] // 需要在聊天界面添加网络搜索按钮
  },
  imageGeneration: {
    id: 'imageGeneration',
    name: '图像生成',
    description: '支持生成图像内容',
    icon: '🎨',
    category: 'creative',
    features: ['提示词生成', '多风格支持', '参数调整'],
    uiComponents: ['imageGenerateButton'] // 需要在聊天界面添加图像生成按钮
  },
  dataAnalysis: {
    id: 'dataAnalysis',
    name: '数据分析',
    description: '擅长分析和处理数据，提供洞察',
    icon: '📊',
    category: 'technical',
    features: ['数据可视化', '统计分析', '趋势预测'],
    uiComponents: [] // 不需要特殊UI组件
  },
  translation: {
    id: 'translation',
    name: '多语言翻译',
    description: '支持多种语言之间的翻译',
    icon: '🌍',
    category: 'content',
    features: ['多语言支持', '上下文理解', '专业术语'],
    uiComponents: [] // 不需要特殊UI组件
  },
  userExpertise: {
    id: 'userExpertise',
    name: '用户专精',
    description: '根据用户个人偏好和专长领域提供个性化服务',
    icon: '👤',
    category: 'user',
    features: ['个性化理解', '偏好适配', '专属服务'],
    uiComponents: [] // 不需要特殊UI组件
  }
};

// 技能分类
export const SKILL_CATEGORIES = {
  content: {
    id: 'content',
    name: '内容创作',
    description: '与内容生成和处理相关的技能'
  },
  conversation: {
    id: 'conversation',
    name: '对话能力',
    description: '增强对话体验的技能'
  },
  tool: {
    id: 'tool',
    name: '工具能力',
    description: '提供额外工具和功能的技能'
  },
  technical: {
    id: 'technical',
    name: '技术能力',
    description: '技术相关的专业技能'
  },
  creative: {
    id: 'creative',
    name: '创意能力',
    description: '创意和艺术相关的技能'
  },
  user: {
    id: 'user',
    name: '用户相关',
    description: '与用户个人信息和偏好相关的技能'
  }
};

// 获取所有技能列表
export function getAllSkills() {
  return Object.values(SKILL_DEFINITIONS);
}

// 根据ID获取技能定义
export function getSkillById(skillId) {
  return SKILL_DEFINITIONS[skillId];
}

// 根据分类获取技能列表
export function getSkillsByCategory(categoryId) {
  return getAllSkills().filter(skill => skill.category === categoryId);
}

// 检查技能是否需要特殊UI组件
export function hasUIComponents(skillId) {
  const skill = getSkillById(skillId);
  return skill && skill.uiComponents && skill.uiComponents.length > 0;
}

// 获取技能所需的所有UI组件
export function getRequiredUIComponents(skillIds) {
  const components = new Set();
  skillIds.forEach(skillId => {
    const skill = getSkillById(skillId);
    if (skill && skill.uiComponents) {
      skill.uiComponents.forEach(comp => components.add(comp));
    }
  });
  return Array.from(components);
}

// 验证技能ID是否有效
export function isValidSkillId(skillId) {
  return skillId in SKILL_DEFINITIONS;
}

// 默认技能配置（新智能体默认启用的技能）
export const DEFAULT_SKILLS = ['realConversation', 'codeWriting'];

// 技能兼容性检查（某些技能可能不兼容）
export function checkSkillCompatibility(skillIds) {
  const incompatiblePairs = [
    // 如果有互不兼容的技能，在这里定义
    // 例如: ['skill1', 'skill2'] 表示这两个技能不能同时启用
  ];

  const issues = [];
  
  for (const [skill1, skill2] of incompatiblePairs) {
    if (skillIds.includes(skill1) && skillIds.includes(skill2)) {
      issues.push({
        type: 'incompatible',
        skills: [skill1, skill2],
        message: `技能 ${getSkillById(skill1).name} 和 ${getSkillById(skill2).name} 不能同时启用`
      });
    }
  }

  return {
    compatible: issues.length === 0,
    issues
  };
}