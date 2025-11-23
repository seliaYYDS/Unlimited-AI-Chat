<template>
  <div class="animation-demo">
    <h2 class="demo-title animate-fade-in">动画效果演示</h2>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">3D 翻转动画</h3>
      <div class="demo-grid">
        <div class="demo-item animate-flip-in-x">
          <div class="demo-card">
            <h4>X轴翻转</h4>
            <p>animate-flip-in-x</p>
          </div>
        </div>
        <div class="demo-item animate-flip-in-y">
          <div class="demo-card">
            <h4>Y轴翻转</h4>
            <p>animate-flip-in-y</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">缩放动画</h3>
      <div class="demo-grid">
        <div class="demo-item animate-zoom-in">
          <div class="demo-card">
            <h4>缩放进入</h4>
            <p>animate-zoom-in</p>
          </div>
        </div>
        <div class="demo-item animate-bounce-in">
          <div class="demo-card">
            <h4>弹跳进入</h4>
            <p>animate-bounce-in</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">滑动动画增强</h3>
      <div class="demo-grid">
        <div class="demo-item animate-slide-in-up-enhanced">
          <div class="demo-card">
            <h4>向上滑动增强</h4>
            <p>animate-slide-in-up-enhanced</p>
          </div>
        </div>
        <div class="demo-item animate-slide-in-left-enhanced">
          <div class="demo-card">
            <h4>向左滑动增强</h4>
            <p>animate-slide-in-left-enhanced</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">淡入动画增强</h3>
      <div class="demo-grid">
        <div class="demo-item animate-fade-in-up">
          <div class="demo-card">
            <h4>向上淡入</h4>
            <p>animate-fade-in-up</p>
          </div>
        </div>
        <div class="demo-item animate-fade-in-right">
          <div class="demo-card">
            <h4>向右淡入</h4>
            <p>animate-fade-in-right</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">特殊效果动画</h3>
      <div class="demo-grid">
        <div class="demo-item animate-wobble">
          <div class="demo-card">
            <h4>摇摆效果</h4>
            <p>animate-wobble</p>
          </div>
        </div>
        <div class="demo-item animate-tada">
          <div class="demo-card">
            <h4>庆祝效果</h4>
            <p>animate-tada</p>
          </div>
        </div>
        <div class="demo-item animate-jello">
          <div class="demo-card">
            <h4>果冻效果</h4>
            <p>animate-jello</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">光效动画</h3>
      <div class="demo-grid">
        <div class="demo-item animate-glow">
          <div class="demo-card">
            <h4>光晕效果</h4>
            <p>animate-glow</p>
          </div>
        </div>
        <div class="demo-item animate-glow-pulse">
          <div class="demo-card">
            <h4>脉冲光晕</h4>
            <p>animate-glow-pulse</p>
          </div>
        </div>
        <div class="demo-item animate-neon-flicker">
          <div class="demo-card">
            <h4>霓虹闪烁</h4>
            <p>animate-neon-flicker</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">悬停效果增强</h3>
      <div class="demo-grid">
        <div class="demo-item hover-rotate">
          <div class="demo-card">
            <h4>悬停旋转</h4>
            <p>hover-rotate</p>
            <p class="hint">鼠标悬停查看效果</p>
          </div>
        </div>
        <div class="demo-item hover-skew">
          <div class="demo-card">
            <h4>悬停倾斜</h4>
            <p>hover-skew</p>
            <p class="hint">鼠标悬停查看效果</p>
          </div>
        </div>
        <div class="demo-item hover-perspective">
          <div class="demo-card">
            <h4>3D透视</h4>
            <p>hover-perspective</p>
            <p class="hint">鼠标悬停查看效果</p>
          </div>
        </div>
        <div class="demo-item hover-glow-enhanced">
          <div class="demo-card">
            <h4>增强光晕</h4>
            <p>hover-glow-enhanced</p>
            <p class="hint">鼠标悬停查看效果</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">加载动画</h3>
      <div class="demo-grid">
        <div class="demo-item">
          <div class="demo-card">
            <h4>加载点</h4>
            <div class="loading-dots">
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
            </div>
          </div>
        </div>
        <div class="demo-item animate-breathe">
          <div class="demo-card">
            <h4>呼吸效果</h4>
            <p>animate-breathe</p>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title animate-fade-in-down">进度条动画</h3>
      <div class="demo-grid">
        <div class="demo-item">
          <div class="demo-card">
            <h4>渐变进度条</h4>
            <div class="progress-bar">
              <div class="progress-fill progress-bar-gradient" style="width: 75%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnimationDemo',
  mounted() {
    // 添加滚动显示动画
    this.setupScrollAnimations()
  },
  methods: {
    setupScrollAnimations() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
          }
        })
      }, {
        threshold: 0.1
      })

      // 观察所有需要滚动显示的元素
      document.querySelectorAll('.scroll-reveal-staggered').forEach(el => {
        observer.observe(el)
      })
    }
  }
}
</script>

<style scoped>
.animation-demo {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-title {
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.demo-section {
  margin-bottom: 60px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 8px;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.demo-item {
  perspective: 1000px;
}

.demo-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.demo-card:hover {
  box-shadow: var(--shadow-lg);
}

.demo-card h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.demo-card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.hint {
  font-size: 0.8rem !important;
  color: var(--text-tertiary) !important;
  font-style: italic;
  margin-top: 8px !important;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 12px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animation-demo {
    padding: 16px;
  }

  .demo-title {
    font-size: 2rem;
  }

  .demo-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .demo-card {
    padding: 20px;
    min-height: 100px;
  }
}
</style>