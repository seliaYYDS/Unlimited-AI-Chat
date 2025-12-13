/**
 * 音乐封面颜色提取工具
 * 用于从音乐封面图像中提取主要颜色，并应用到主题色
 */

export class MusicColorExtractor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.cache = new Map(); // 缓存已提取的颜色
  }

  /**
   * 从图像URL提取主要颜色
   * @param {string} imageUrl 图像URL
   * @param {string} songId 歌曲ID，用于缓存
   * @returns {Promise<string>} 返回提取的主要颜色
   */
  async extractPrimaryColor(imageUrl, songId) {
    // 检查缓存
    if (this.cache.has(songId)) {
      return this.cache.get(songId);
    }

    try {
      // 创建图片元素
      const img = new Image();
      
      // 处理跨域问题
      img.crossOrigin = 'Anonymous';
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // 设置canvas尺寸为较小的值以提高性能
            const maxSize = 100;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            this.canvas.width = width;
            this.canvas.height = height;
            
            // 绘制图像到canvas
            this.ctx.drawImage(img, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            // 提取颜色
            const color = this.analyzePixels(pixels);
            
            // 缓存结果
            this.cache.set(songId, color);
            
            resolve(color);
          } catch (error) {
            console.error('分析图像颜色失败:', error);
            resolve('#ec4899'); // 返回默认颜色
          }
        };
        
        img.onerror = () => {
          console.error('加载图像失败:', imageUrl);
          resolve('#ec4899'); // 返回默认颜色
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('提取颜色失败:', error);
      return '#ec4899'; // 返回默认颜色
    }
  }

  /**
   * 从图像URL提取多个主要颜色
   * @param {string} imageUrl 图像URL
   * @param {string} songId 歌曲ID，用于缓存
   * @param {number} count 要提取的颜色数量
   * @returns {Promise<string[]>} 返回提取的主要颜色数组
   */
  async extractMultipleColors(imageUrl, songId, count = 2) {
    // 检查缓存
    const cacheKey = `${songId}_${count}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 创建图片元素
      const img = new Image();
      
      // 处理跨域问题
      img.crossOrigin = 'Anonymous';
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // 设置canvas尺寸为较小的值以提高性能
            const maxSize = 100;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            this.canvas.width = width;
            this.canvas.height = height;
            
            // 绘制图像到canvas
            this.ctx.drawImage(img, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            // 提取多个颜色
            const colors = this.analyzeMultiplePixels(pixels, count);
            
            // 缓存结果
            this.cache.set(cacheKey, colors);
            
            resolve(colors);
          } catch (error) {
            console.error('分析图像颜色失败:', error);
            // 返回默认颜色
            const defaultColors = ['#ec4899', '#3b82f6'];
            resolve(defaultColors.slice(0, count));
          }
        };
        
        img.onerror = () => {
          console.error('加载图像失败:', imageUrl);
          // 返回默认颜色
          const defaultColors = ['#ec4899', '#3b82f6'];
          resolve(defaultColors.slice(0, count));
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('提取颜色失败:', error);
      // 返回默认颜色
      const defaultColors = ['#ec4899', '#3b82f6'];
      return defaultColors.slice(0, count);
    }
  }

  /**
   * 分析像素数据，提取主要颜色
   * @param {Uint8ClampedArray} pixels 像素数据
   * @returns {string} 提取的颜色
   */
  analyzePixels(pixels) {
    // 颜色分组统计
    const colorGroups = {};
    const step = 4; // 每个像素4个值(RGBA)
    
    for (let i = 0; i < pixels.length; i += step * 4) { // 采样，提高性能
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // 跳过透明像素
      if (a < 128) continue;
      
      // 将颜色量化到较小的范围，以减少颜色数量
      const quantizedR = Math.round(r / 32) * 32;
      const quantizedG = Math.round(g / 32) * 32;
      const quantizedB = Math.round(b / 32) * 32;
      
      const key = `${quantizedR},${quantizedG},${quantizedB}`;
      
      if (!colorGroups[key]) {
        colorGroups[key] = {
          r: quantizedR,
          g: quantizedG,
          b: quantizedB,
          count: 0
        };
      }
      
      colorGroups[key].count++;
    }
    
    // 找出出现次数最多的颜色
    let maxCount = 0;
    let dominantColor = { r: 236, g: 72, b: 153 }; // 默认颜色 #ec4899
    
    for (const key in colorGroups) {
      if (colorGroups[key].count > maxCount) {
        maxCount = colorGroups[key].count;
        dominantColor = colorGroups[key];
      }
    }
    
    // 增强颜色饱和度和亮度
    const enhancedColor = this.enhanceColor(dominantColor);
    
    return this.rgbToHex(enhancedColor.r, enhancedColor.g, enhancedColor.b);
  }

  /**
   * 分析像素数据，提取多个主要颜色
   * @param {Uint8ClampedArray} pixels 像素数据
   * @param {number} count 要提取的颜色数量
   * @returns {string[]} 提取的颜色数组
   */
  analyzeMultiplePixels(pixels, count) {
    // 颜色分组统计
    const colorGroups = {};
    const step = 4; // 每个像素4个值(RGBA)
    
    for (let i = 0; i < pixels.length; i += step * 4) { // 采样，提高性能
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // 跳过透明像素
      if (a < 128) continue;
      
      // 将颜色量化到较小的范围，以减少颜色数量
      const quantizedR = Math.round(r / 32) * 32;
      const quantizedG = Math.round(g / 32) * 32;
      const quantizedB = Math.round(b / 32) * 32;
      
      const key = `${quantizedR},${quantizedG},${quantizedB}`;
      
      if (!colorGroups[key]) {
        colorGroups[key] = {
          r: quantizedR,
          g: quantizedG,
          b: quantizedB,
          count: 0
        };
      }
      
      colorGroups[key].count++;
    }
    
    // 将颜色组转换为数组并按出现次数排序
    const sortedColors = Object.values(colorGroups).sort((a, b) => b.count - a.count);
    
    // 提取前N个颜色
    const resultColors = [];
    for (let i = 0; i < Math.min(count, sortedColors.length); i++) {
      // 增强颜色饱和度和亮度
      const enhancedColor = this.enhanceColor(sortedColors[i]);
      resultColors.push(this.rgbToHex(enhancedColor.r, enhancedColor.g, enhancedColor.b));
    }
    
    // 如果提取的颜色数量不足，使用默认颜色填充
    const defaultColors = ['#ec4899', '#3b82f6'];
    while (resultColors.length < count) {
      resultColors.push(defaultColors[resultColors.length] || '#ec4899');
    }
    
    return resultColors;
  }

  /**
   * 增强颜色的饱和度和亮度
   * @param {Object} color RGB颜色对象
   * @returns {Object} 增强后的RGB颜色对象
   */
  enhanceColor(color) {
    // 转换为HSL
    const hsl = this.rgbToHsl(color.r, color.g, color.b);
    
    // 增加饱和度
    hsl.s = Math.min(100, hsl.s * 1.2);
    
    // 调整亮度
    if (hsl.l < 30) {
      hsl.l = 30; // 确保最低亮度
    } else if (hsl.l > 70) {
      hsl.l = 70; // 限制最高亮度
    }
    
    // 转换回RGB
    return this.hslToRgb(hsl.h, hsl.s, hsl.l);
  }

  /**
   * RGB转十六进制
   * @param {number} r 红色值
   * @param {number} g 绿色值
   * @param {number} b 蓝色值
   * @returns {string} 十六进制颜色值
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * RGB转HSL
   * @param {number} r 红色值
   * @param {number} g 绿色值
   * @param {number} b 蓝色值
   * @returns {Object} HSL颜色对象
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // 灰度
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * HSL转RGB
   * @param {number} h 色相
   * @param {number} s 饱和度
   * @param {number} l 亮度
   * @returns {Object} RGB颜色对象
   */
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // 灰度
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}