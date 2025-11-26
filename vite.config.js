import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/sdapi': {
        target: 'http://127.0.0.1:7860',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sdapi/, '/sdapi')
      },
      // 网易云音乐API代理
      '/api': {
        target: 'http://localhost:3000', // 假设API服务运行在localhost:3000
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 为兼容网易云API格式，直接代理所有相关请求
      '/search': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/song': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/personalized': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/lyric': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/album': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/artist': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/playlist': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/comment': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})