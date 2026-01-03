import { createApp } from 'vue'
import App from './App.vue'

// 标题动画
let titleAnimationInterval = null
const originalTitle = '- - - -U- - - -N- - - -L- - - -X'

function startTitleAnimation() {
    const title = originalTitle
    let index = 0

    titleAnimationInterval = setInterval(() => {
        let rotatedTitle = ''
        for (let i = 0; i < 10; i++) {
            rotatedTitle += title[(index + i) % title.length]
        }
        document.title = rotatedTitle
        index = (index + 1) % title.length
    }, 200)
}

function stopTitleAnimation() {
    if (titleAnimationInterval) {
        clearInterval(titleAnimationInterval)
        titleAnimationInterval = null
    }
    document.title = 'Unlimited'
}

// 页面可见性监听
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTitleAnimation()
    } else {
        startTitleAnimation()
    }
})

// 初始化标题动画
startTitleAnimation()

createApp(App).mount('#app')