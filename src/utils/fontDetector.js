// 字体检测工具
export class FontDetector {
  constructor() {
    this.baseFonts = [
      'monospace',
      'sans-serif',
      'serif'
    ]
    
    this.testString = 'mmmmmmmmmmlli'
    this.testSize = '72px'
    this.canvas = null
    this.context = null
  }

  // 初始化Canvas
  initCanvas() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = 200
    this.canvas.height = 200
    this.context = this.canvas.getContext('2d')
  }

  // 获取字体的宽度
  getTextWidth(fontFamily) {
    if (!this.context) {
      this.initCanvas()
    }
    
    this.context.font = `${this.testSize} ${fontFamily}`
    return this.context.measureText(this.testString).width
  }

  // 检测字体是否安装
  isFontAvailable(font) {
    // 检测基础字体宽度
    const baseWidths = this.baseFonts.map(baseFont => 
      this.getTextWidth(`${font}, ${baseFont}`)
    )
    
    // 检测只有基础字体的宽度
    const controlWidths = this.baseFonts.map(baseFont => 
      this.getTextWidth(`${baseFont}`)
    )
    
    // 比较宽度，如果有差异说明字体存在
    for (let i = 0; i < baseWidths.length; i++) {
      if (baseWidths[i] !== controlWidths[i]) {
        return true
      }
    }
    
    return false
  }

  // 获取系统安装的字体列表
  async getSystemFonts() {
    // 常见的字体列表
    const commonFonts = [
      // Windows 系统字体
      'Arial',
      'Arial Black',
      'Calibri',
      'Cambria',
      'Consolas',
      'Courier New',
      'Georgia',
      'Impact',
      'Lucida Console',
      'Microsoft Sans Serif',
      'Palatino Linotype',
      'Segoe UI',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      
      // 中文字体
      'Microsoft YaHei',
      '微软雅黑',
      'SimHei',
      '黑体',
      'SimSun',
      '宋体',
      'SimKai',
      '楷体',
      'KaiTi',
      'FangSong',
      '仿宋',
      'SimFang',
      'NSimSun',
      '新宋体',
      'FangSong_GB2312',
      'KaiTi_GB2312',
      'STXihei',
      'STSong',
      'STKaiti',
      'STFangsong',
      'STZhongsong',
      'STXingkai',
      'STXinwei',
      'STLiti',
      'STCaiyun',
      'STHupo',
      'STXingkai SC',
      'STXinwei SC',
      
      // macOS 系统字体
      'Helvetica',
      'Helvetica Neue',
      'Menlo',
      'Monaco',
      'Optima',
      'SF Pro Display',
      'SF Pro Text',
      'Geneva',
      'Lucida Grande',
      
      // Linux 系统字体
      'DejaVu Sans',
      'DejaVu Sans Mono',
      'DejaVu Serif',
      'Liberation Sans',
      'Liberation Mono',
      'Liberation Serif',
      'Ubuntu',
      'Cantarell',
      'Noto Sans',
      'Noto Serif',
      'Roboto',
      'Droid Sans',
      'Droid Serif',
      
      // 其他常见字体
      'Comic Sans MS',
      'Impact',
      'Trebuchet MS',
      'Lucida Console',
      'Palatino',
      'Garamond',
      'Bookman',
      'Avant Garde',
      
      // Web 字体
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont'
    ]

    const availableFonts = []
    
    // 使用 requestIdleCallback 在空闲时检测字体，避免阻塞主线程
    return new Promise((resolve) => {
      const checkFonts = () => {
        let checked = 0
        const total = commonFonts.length
        
        for (const font of commonFonts) {
          if (this.isFontAvailable(font)) {
            availableFonts.push(font)
          }
          checked++
          
          // 每检测10个字体就暂停一下，避免阻塞UI
          if (checked % 10 === 0) {
            setTimeout(() => {}, 0)
          }
        }
        
        // 按字母顺序排序
        availableFonts.sort((a, b) => a.localeCompare(b))
        resolve(availableFonts)
      }
      
      // 使用 requestIdleCallback 或 setTimeout 延迟执行
      if ('requestIdleCallback' in window) {
        requestIdleCallback(checkFonts)
      } else {
        setTimeout(checkFonts, 100)
      }
    })
  }

  // 获取字体分类
  getFontCategory(fontFamily) {
    const serifFonts = ['Times New Roman', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'SimSun', '宋体', 'STSong']
    const monoFonts = ['Courier New', 'Consolas', 'Monaco', 'Menlo', 'Lucida Console', 'DejaVu Sans Mono', 'Liberation Mono']
    const cursiveFonts = ['Comic Sans MS', 'Impact']
    
    if (serifFonts.some(font => fontFamily.includes(font))) {
      return 'serif'
    } else if (monoFonts.some(font => fontFamily.includes(font))) {
      return 'monospace'
    } else if (cursiveFonts.some(font => fontFamily.includes(font))) {
      return 'cursive'
    } else {
      return 'sans-serif'
    }
  }

  // 格式化字体名称，添加备用字体
  formatFontFamily(fontFamily) {
    const category = this.getFontCategory(fontFamily)
    const fallbacks = {
      'serif': 'serif',
      'sans-serif': 'sans-serif',
      'monospace': 'monospace',
      'cursive': 'cursive'
    }
    
    return `"${fontFamily}", ${fallbacks[category]}`
  }
}