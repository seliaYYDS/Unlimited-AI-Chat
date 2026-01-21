<template>
  <div class="component-renderer">
    <!-- 柱状图 -->
    <div v-if="component.type === 'bar'" class="bar-chart">
      <div class="chart-title">{{ component.data.label }}</div>
      <div class="bar-container">
        <div
          v-for="(item, index) in component.data.values"
          :key="index"
          class="bar-item"
        >
          <div class="bar-label">{{ item.label }}</div>
          <div class="bar-wrapper">
            <div class="bar-fill" :style="{ width: item.percentage + '%' }">
              <span class="bar-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 雷达图 -->
    <div v-else-if="component.type === 'radar'" class="radar-chart">
      <div class="chart-title">能力雷达图</div>
      <svg viewBox="0 0 200 200" class="radar-svg">
        <!-- 背景网格 -->
        <polygon
          v-for="level in 5"
          :key="'grid-' + level"
          :points="getRadarGridPoints(level)"
          class="radar-grid"
          :stroke-opacity="level * 0.15"
        />
        <!-- 轴线 -->
        <line
          v-for="(dim, index) in component.data.dimensions"
          :key="'axis-' + index"
          :x1="100"
          :y1="100"
          :x2="getRadarPoint(index, 100).x"
          :y2="getRadarPoint(index, 100).y"
          class="radar-axis"
        />
        <!-- 数据区域 -->
        <polygon
          :points="getRadarDataPoints()"
          class="radar-data"
        />
        <!-- 数据点 -->
        <circle
          v-for="(dim, index) in component.data.dimensions"
          :key="'point-' + index"
          :cx="getRadarPoint(index, dim.value).x"
          :cy="getRadarPoint(index, dim.value).y"
          r="4"
          class="radar-point"
        />
        <!-- 标签 -->
        <text
          v-for="(dim, index) in component.data.dimensions"
          :key="'label-' + index"
          :x="getRadarLabelPosition(index).x"
          :y="getRadarLabelPosition(index).y"
          class="radar-label"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {{ dim.dimension }}: {{ dim.value }}
        </text>
      </svg>
    </div>

    <!-- 饼状图 -->
    <div v-else-if="component.type === 'pie'" class="pie-chart">
      <div class="chart-title">数据分布</div>
      <svg viewBox="0 0 200 200" class="pie-svg">
        <g transform="translate(100, 100)">
          <path
            v-for="(item, index) in component.data.items"
            :key="index"
            :d="getPieSlicePath(item, index)"
            :fill="getPieColor(index)"
            class="pie-slice"
          />
        </g>
      </svg>
      <div class="pie-legend">
        <div
          v-for="(item, index) in component.data.items"
          :key="index"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: getPieColor(index) }"></span>
          <span class="legend-label">{{ item.label }}: {{ item.value }} ({{ item.percentage.toFixed(1) }}%)</span>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-else-if="component.type === 'progress'" class="progress-bar">
      <div class="progress-label">{{ component.data.label }}: {{ component.data.current }} / {{ component.data.max }}</div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: component.data.percentage + '%' }">
          <span class="progress-text">{{ component.data.percentage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div v-else-if="component.type === 'table'" class="data-table">
      <table>
        <thead>
          <tr>
            <th v-for="(header, index) in component.data.headers" :key="'header-' + index">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in component.data.rows" :key="'row-' + rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="'cell-' + rowIndex + '-' + cellIndex">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 卡片组件 -->
    <div v-else-if="component.type === 'card'" class="info-card" :class="'card-' + component.data.color">
      <div class="card-header">
        <span class="card-icon">{{ getCardIcon(component.data.color) }}</span>
        <span class="card-title">{{ component.data.title }}</span>
      </div>
      <div class="card-content">{{ component.data.content }}</div>
    </div>

    <!-- 统计卡片组件 -->
    <div v-else-if="component.type === 'stat'" class="stat-card">
      <div class="stat-value">{{ formatNumber(component.data.value) }}</div>
      <div class="stat-unit">{{ component.data.unit }}</div>
      <div class="stat-label">{{ component.data.label }}</div>
    </div>

    <!-- 开关组件 -->
    <div v-else-if="component.type === 'toggle'" class="toggle-switch">
      <div class="toggle-label">{{ component.data.label }}</div>
      <div class="toggle-indicator" :class="{ 'toggle-on': component.data.enabled }">
        <div class="toggle-dot"></div>
      </div>
      <div class="toggle-status">{{ component.data.enabled ? '已启用' : '已禁用' }}</div>
    </div>

    <!-- 列表组件 -->
    <div v-else-if="component.type === 'list'" class="item-list">
      <ul class="list-items">
        <li v-for="(item, index) in component.data.items" :key="index" class="list-item">
          <span class="list-bullet">{{ index + 1 }}</span>
          <span class="list-text">{{ item }}</span>
        </li>
      </ul>
    </div>

    <!-- 配置展示组件 -->
    <div v-else-if="component.type === 'config'" class="config-display">
      <div class="config-header">配置信息</div>
      <div class="config-items">
        <div v-for="(value, key) in component.data.config" :key="key" class="config-item">
          <span class="config-key">{{ key }}</span>
          <span class="config-value">{{ formatConfigValue(value) }}</span>
        </div>
      </div>
    </div>

    <!-- 自定义组件 -->
    <div v-else-if="component.type === 'custom'" class="custom-component-wrapper">
      <div 
        v-if="component.data && component.data.template"
        class="custom-component-container"
        :style="component.data.style ? component.data.style : ''"
      >
        <div v-html="renderCustomTemplate(component.data.template, component.data.props || {})"></div>
      </div>
      <div v-else class="custom-component-placeholder">
        <pre v-if="component.data">{{ JSON.stringify(component.data, null, 2) }}</pre>
        <div v-else>自定义组件数据</div>
      </div>
    </div>

    <!-- 未知组件类型 -->
    <div v-else class="unknown-component">
      <div class="unknown-component-message">未知组件类型: {{ component.type }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ComponentRenderer',
  props: {
    component: {
      type: Object,
      required: true
    }
  },
  methods: {
    // 渲染自定义组件模板
    renderCustomTemplate(template, props) {
      if (!template) return ''
      
      // 替换模板中的变量 {{ variable }}
      let rendered = template
      Object.keys(props).forEach(key => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        rendered = rendered.replace(regex, props[key])
      })
      
      return rendered
    },
    
    // 雷达图计算方法
    getRadarPoint(index, value) {
      const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
      const radius = (value / 100) * 80
      return {
        x: 100 + radius * Math.cos(angle),
        y: 100 + radius * Math.sin(angle)
      }
    },
    getRadarGridPoints(level) {
      const points = []
      for (let i = 0; i < 5; i++) {
        const point = this.getRadarPoint(i, level * 20)
        points.push(`${point.x},${point.y}`)
      }
      return points.join(' ')
    },
    getRadarDataPoints() {
      const points = []
      this.component.data.dimensions.forEach((dim, index) => {
        const point = this.getRadarPoint(index, dim.value)
        points.push(`${point.x},${point.y}`)
      })
      return points.join(' ')
    },
    getRadarLabelPosition(index) {
      const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
      const radius = 95
      return {
        x: 100 + radius * Math.cos(angle),
        y: 100 + radius * Math.sin(angle)
      }
    },
    // 饼状图计算方法
    getPieSlicePath(item, index) {
      const startAngle = this.getPieStartAngle(index)
      const endAngle = startAngle + (item.percentage / 100) * Math.PI * 2
      const radius = 80

      const x1 = Math.cos(startAngle) * radius
      const y1 = Math.sin(startAngle) * radius
      const x2 = Math.cos(endAngle) * radius
      const y2 = Math.sin(endAngle) * radius

      const largeArcFlag = item.percentage > 50 ? 1 : 0

      return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    },
    getPieStartAngle(index) {
      let angle = 0
      for (let i = 0; i < index; i++) {
        angle += (this.component.data.items[i].percentage / 100) * Math.PI * 2
      }
      return angle - Math.PI / 2
    },
    getPieColor(index) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#FF6F61'
      ]
      return colors[index % colors.length]
    },
    
    // 卡片组件方法
    getCardIcon(color) {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      }
      return icons[color] || 'ℹ️'
    },
    
    // 统计卡片方法
    formatNumber(value) {
      if (typeof value !== 'number') return value
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M'
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K'
      }
      return value.toLocaleString()
    },
    
    // 配置展示方法
    formatConfigValue(value) {
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      } else if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    }
  }
}
</script>

<style scoped>
.component-renderer {
  margin: 16px 0;
  padding: 16px;
  background: var(--component-bg, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  border: 1px solid var(--component-border, rgba(255, 255, 255, 0.1));
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-color, #333);
  text-align: center;
}

/* 柱状图样式 */
.bar-chart {
  padding: 8px;
}

.bar-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  min-width: 80px;
  font-size: 13px;
  color: var(--text-color, #333);
  text-align: right;
}

.bar-wrapper {
  flex: 1;
  height: 32px;
  background: var(--bar-track-bg, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 6px;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}

.bar-value {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 雷达图样式 */
.radar-chart {
  padding: 8px;
}

.radar-svg {
  width: 100%;
  max-width: 300px;
  height: auto;
  margin: 0 auto;
  display: block;
}

.radar-grid {
  fill: none;
  stroke: var(--text-color, #333);
  stroke-width: 1;
}

.radar-axis {
  stroke: var(--text-color, #333);
  stroke-width: 1;
  opacity: 0.3;
}

.radar-data {
  fill: var(--primary-color, #667eea);
  fill-opacity: 0.3;
  stroke: var(--primary-color, #667eea);
  stroke-width: 2;
}

.radar-point {
  fill: var(--primary-color, #667eea);
  stroke: white;
  stroke-width: 2;
}

.radar-label {
  font-size: 11px;
  fill: var(--text-color, #333);
}

/* 饼状图样式 */
.pie-chart {
  padding: 8px;
}

.pie-svg {
  width: 150px;
  height: 150px;
  margin: 0 auto 16px;
  display: block;
}

.pie-slice {
  transition: transform 0.2s ease;
  cursor: pointer;
}

.pie-slice:hover {
  transform: scale(1.05);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-color, #333);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 进度条样式 */
.progress-bar {
  padding: 8px;
}

.progress-label {
  font-size: 13px;
  color: var(--text-color, #333);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.progress-track {
  height: 24px;
  background: var(--progress-track-bg, rgba(0, 0, 0, 0.05));
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 12px;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-text {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 表格样式 */
.data-table {
  padding: 8px;
  overflow-x: auto;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid var(--table-border, rgba(0, 0, 0, 0.1));
}

.data-table th {
  background: var(--table-header-bg, rgba(0, 0, 0, 0.05));
  font-weight: 600;
  color: var(--text-color, #333);
}

.data-table td {
  color: var(--text-color, #333);
}

.data-table tr:hover {
  background: var(--table-hover-bg, rgba(0, 0, 0, 0.02));
}

/* 自定义组件样式 */
.custom-component-wrapper {
  padding: 8px;
}

.custom-component-container {
  border-radius: 8px;
  overflow: hidden;
}

.custom-component-placeholder {
  padding: 16px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 8px;
  text-align: center;
  color: var(--text-secondary, #666);
}

.custom-component-placeholder pre {
  text-align: left;
  font-size: 12px;
  overflow-x: auto;
}

/* 错误样式 */
.component-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  color: #ff4444;
  font-size: 13px;
}

/* 卡片组件样式 */
.info-card {
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
}

.card-info {
  border-left-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.card-success {
  border-left-color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
}

.card-warning {
  border-left-color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.card-error {
  border-left-color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 18px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.card-content {
  font-size: 13px;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

/* 统计卡片样式 */
.stat-card {
  padding: 20px;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
  border-radius: 12px;
  color: white;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-unit {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

/* 开关组件样式 */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 8px;
}

.toggle-label {
  font-size: 14px;
  color: var(--text-color, #333);
  flex: 1;
}

.toggle-indicator {
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s ease;
}

.toggle-indicator.toggle-on {
  background: #2ecc71;
}

.toggle-dot {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.3s ease;
}

.toggle-indicator.toggle-on .toggle-dot {
  left: 22px;
}

.toggle-status {
  font-size: 12px;
  color: var(--text-secondary, #666);
  min-width: 50px;
}

/* 列表组件样式 */
.item-list {
  padding: 8px;
}

.list-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.list-item:hover {
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.1));
}

.list-bullet {
  width: 24px;
  height: 24px;
  background: var(--primary-color, #667eea);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.list-text {
  font-size: 14px;
  color: var(--text-color, #333);
  flex: 1;
}

/* 配置展示组件样式 */
.config-display {
  padding: 16px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 12px;
}

.config-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #333);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.08));
  border-radius: 6px;
}

.config-key {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color, #667eea);
  min-width: 100px;
}

.config-value {
  font-size: 13px;
  color: var(--text-color, #333);
  font-family: 'Courier New', monospace;
  flex: 1;
  word-break: break-all;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .component-renderer {
    --component-bg: rgba(255, 255, 255, 0.05);
    --component-border: rgba(255, 255, 255, 0.1);
    --text-color: #e0e0e0;
    --bar-track-bg: rgba(255, 255, 255, 0.1);
    --progress-track-bg: rgba(255, 255, 255, 0.1);
    --table-border: rgba(255, 255, 255, 0.1);
    --table-header-bg: rgba(255, 255, 255, 0.1);
    --table-hover-bg: rgba(255, 255, 255, 0.05);
  }
}

/* 亮色主题适配 */
@media (prefers-color-scheme: light) {
  .component-renderer {
    --component-bg: rgba(0, 0, 0, 0.02);
    --component-border: rgba(0, 0, 0, 0.1);
    --text-color: #333;
    --bar-track-bg: rgba(0, 0, 0, 0.05);
    --progress-track-bg: rgba(0, 0, 0, 0.05);
    --table-border: rgba(0, 0, 0, 0.1);
    --table-header-bg: rgba(0, 0, 0, 0.05);
    --table-hover-bg: rgba(0, 0, 0, 0.02);
  }
}
</style>