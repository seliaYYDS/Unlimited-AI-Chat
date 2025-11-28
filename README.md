# 无限制本地纯前端AI智能体对话项目

这是一个基于Vue 3的纯前端AI对话应用，支持创建多个具有不同角色设定的AI智能体，进行本地或网络API驱动的对话，并具备一些高级功能如Stable Diffusion图像生成、对话历史管理、音乐播放、样式定制等。

## 项目概述

本项目提供了一个基于浏览器的AI对话界面，具备以下核心功能：

- **AI智能体管理**: 创建、编辑、删除具有不同角色设定的AI智能体
- **多智能体对话**: 每个智能体拥有独立的对话历史
- **多API支持**: 支持OpenAI、DeepSeek、Anthropic、Azure、Google Gemini及本地模型
- **图像生成**: 集成Stable Diffusion，支持基于对话内容的图像生成
- **音乐播放器**: 集成网易云音乐API，支持音乐搜索和播放功能
- **悬浮球工具**: 快速访问常用功能的悬浮球组件
- **个性化定制**: 亮/暗主题、样式定制、动画效果等
- **数据管理**: 支持数据导入导出、自动清理等功能

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **UI**: 原生CSS + SVG 图标
- **状态管理**: 原生JavaScript类
- **本地存储**: localStorage

## 安装与运行

### 环境要求

- Node.js 16+ 
- npm

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建后的文件将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## 功能特性

### AI智能体管理
- 创建/编辑智能体（名称、头像、场景描述、角色设定等）
- 智能体列表展示与管理
- AI辅助填写功能
- 右键菜单快速操作
- 拖拽排序功能
- 侧边栏收起/展开

### 对话系统
- 多智能体独立对话历史
- 流式输出模式
- 推荐回复功能
- 消息编辑与复制
- 令牌数与思考时间显示
- 重新生成功能
- 智能滚动

### 图像生成
- 集成Stable Diffusion WebUI
- 基于对话内容的AI提示词生成
- 图像生成与展示
- 参数配置（采样步数、CFG Scale、尺寸等）
- 模型选择
- 生成进度显示

### 音乐播放器
- 集成网易云音乐API
- 支持音乐搜索（歌曲、歌手、专辑等）
- 播放列表管理
- 播放控制（播放/暂停、上一首、下一首、音量控制）
- 播放进度控制
- 歌曲信息显示（专辑封面、歌手、专辑名等）

### 悬浮球工具
- 可拖拽的悬浮球界面
- 快速访问音乐播放器、草稿纸、快速对话等功能
- 移动端优化的触摸交互
- 自定义位置记忆

### 样式与主题
- 亮/暗主题切换
- 样式定制（主色调、字体大小、圆角等）
- 多种动画效果
- 多种消息气泡样式与聊天布局
- 颜色模式选择
- 流光效果（可调节透明度和速度）
- 灵动岛设计
- 弹窗背景模糊和暗化效果

### 数据管理
- 数据导入导出功能
- 自动清理机制
- 手动清理功能
- 存储优化

## 配置说明

### AI API配置
在应用中配置所需的AI服务API密钥和端点。

### Stable Diffusion配置
本地运行Stable Diffusion WebUI，应用将通过代理访问 `http://127.0.0.1:7860`。

### 音乐API配置
1. 需要运行网易云音乐API后端服务
2. 在应用设置中配置音乐API服务器地址
3. 默认使用 `https://zm.i9mr.com` 作为API端点

## 文件结构

```
.
├── index.html              # 应用入口HTML文件
├── package.json            # 项目配置和依赖
├── package-lock.json       # 锁定依赖版本
├── vite.config.js          # Vite构建配置
├── README.md              # 项目说明文档
├── IFLOW.md               # 项目开发指南文档
├── api.md                 # 网易云音乐API文档
├── dist/                  # 构建输出目录
├── node_modules/          # 依赖模块目录
├── public/                # 静态资源
│   └── favicon.ico
└── src/                   # 源代码目录
    ├── main.js            # Vue应用入口
    ├── App.vue            # 主应用组件
    ├── storage.js         # 本地存储管理模块
    ├── aiService.js       # AI模型服务兼容层
    ├── components/        # 可复用组件
    │   ├── AnimationDemo.vue
    │   ├── AvatarUpload.vue
    │   ├── CustomCheckbox.vue
    │   ├── CustomSelect.vue
    │   ├── CustomSlider.vue
    │   ├── FloatingBall.vue
    │   ├── Modal.vue
    │   ├── MusicPlayer.vue
    │   └── StyleSettings.vue
    ├── styles/            # CSS样式文件
    │   ├── animations.css
    │   ├── base.css
    │   ├── components.css
    │   ├── global.css
    │   └── variables.css
    └── utils/             # 工具类
        ├── fontDetector.js
        ├── markdownParser.js
        └── theme.js
```

## 开发约定

- 使用Vue 3 Composition API风格
- CSS类名使用BEM命名约定
- JavaScript使用ES6+特性
- 组件和文件命名使用PascalCase或kebab-case
- 严格遵循Vue 3最佳实践
- 使用localStorage进行数据持久化

## 最新更新

### v2.0.0 新增功能
- 🎵 新增音乐播放器功能，集成网易云音乐API
- 🎯 新增悬浮球工具，提供快速访问入口
- 🎨 新增弹窗背景模糊和暗化效果设置
- 📱 优化移动端触摸交互体验
- 🔧 修复滑块组件浮点数精度问题
- 💫 改进流光效果控制，支持透明度调节

## 注意事项

- 项目为纯前端应用，所有数据存储在浏览器localStorage中
- 使用网络API需要用户自行配置端点和密钥
- Stable Diffusion图像生成功能需要本地运行SD WebUI
- 音乐播放器功能需要配置并运行网易云音乐API后端服务
- 项目依赖现代浏览器特性，建议使用最新版Chrome/Firefox/Edge
- 图像生成功能依赖SD WebUI的本地部署，需要正确配置代理
- 长对话可能会影响性能，建议适时清理对话历史
- 弹窗背景模糊效果需要浏览器支持 `backdrop-filter` CSS属性
