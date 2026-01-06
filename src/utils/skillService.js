/**
 * 技能服务模块
 * 处理技能的具体实现逻辑
 */

import { getSkillById } from './skills.js'

export class SkillService {
  constructor() {
    this.activeSkills = new Map()
  }

  // 初始化智能体的技能
  initializeAgentSkills(agent) {
    if (!agent || !agent.skills) {
      return
    }

    this.activeSkills.clear()

    agent.skills.forEach(skillId => {
      const skill = getSkillById(skillId)
      if (skill) {
        this.activeSkills.set(skillId, {
          ...skill,
          enabled: true
        })
      }
    })

    console.log(`智能体 "${agent.name}" 的技能已初始化:`, Array.from(this.activeSkills.keys()))
  }

  // 获取当前启用的技能列表
  getEnabledSkills() {
    return Array.from(this.activeSkills.values()).filter(skill => skill.enabled)
  }

  // 检查是否启用某个技能
  isSkillEnabled(skillId) {
    const skill = this.activeSkills.get(skillId)
    return skill && skill.enabled
  }

  // 处理技能相关的消息增强
  async enhanceMessageWithSkills(message, skillIds) {
    let enhancedMessage = message

    // 如果有长文写作技能，可以在这里添加提示
    if (skillIds.includes('longFormWriting')) {
      enhancedMessage = `[长文写作模式]\n${enhancedMessage}\n\n请以结构化、分段的方式生成详细内容。`
    }

    // 如果有真人对话技能，可以在这里添加提示
    if (skillIds.includes('realConversation')) {
      enhancedMessage = `[真人对话模式]\n${enhancedMessage}\n\n请以自然、流畅、口语化的方式回复，像真人一样交流。`
    }

    // 如果有代码编写技能，可以在这里添加提示
    if (skillIds.includes('codeWriting')) {
      enhancedMessage = `[代码编写模式]\n${enhancedMessage}\n\n请提供清晰、规范的代码，并添加必要的注释。`
    }

    // 如果有数据分析技能，可以在这里添加提示
    if (skillIds.includes('dataAnalysis')) {
      enhancedMessage = `[数据分析模式]\n${enhancedMessage}\n\n请提供深入的数据分析，包括统计信息、趋势和洞察。`
    }

    // 如果有翻译技能，可以在这里添加提示
    if (skillIds.includes('translation')) {
      enhancedMessage = `[翻译模式]\n${enhancedMessage}\n\n请在回复时考虑多语言支持和上下文理解。`
    }

    // 如果有网络搜索技能，添加Function Calling相关提示
    if (skillIds.includes('webSearch')) {
      enhancedMessage = `[智能联网搜索模式]\n${enhancedMessage}\n\n你有访问webSearch工具的能力。当用户询问以下内容时，必须使用webSearch工具：\n- 当前时间、日期\n- 今日或近期天气\n- 最新新闻、时事\n- 实时价格、汇率\n- 技术资讯、产品信息\n- 体育赛事结果\n- 任何需要实时数据的查询\n\n不要使用搜索工具查询：\n- 历史事实、定义\n- 一般性知识、常识\n- 编程概念、语法\n\n使用工具的流程：\n1. 判断用户问题是否需要实时信息\n2. 如果需要，调用webSearch工具并提供简洁的搜索词\n3. 基于搜索结果生成准确、有用的回答\n4. 不要提及"我搜索了"、"根据搜索结果"等工具调用细节\n5. 直接提供基于搜索结果的答案`
    }

    return enhancedMessage
  }

  // 获取技能的UI组件需求
  getRequiredUIComponents(skillIds) {
    const components = new Set()

    skillIds.forEach(skillId => {
      const skill = getSkillById(skillId)
      if (skill && skill.uiComponents) {
        skill.uiComponents.forEach(comp => components.add(comp))
      }
    })

    return Array.from(components)
  }

  // 清理技能状态
  clearSkills() {
    this.activeSkills.clear()
  }
}

// 导出单例实例
export const skillService = new SkillService()