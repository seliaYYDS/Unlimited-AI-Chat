<template>
  <div class="music-login-modal-overlay" v-if="visible" @click="closeLogin">
    <div class="music-login-modal-content" @click.stop>
      <div class="music-login-header">
        <h3>网易云音乐登录</h3>
        <button class="close-btn" @click="closeLogin">×</button>
      </div>
      
      <div class="music-login-body">
        <!-- 登录方式切换 -->
        <div class="login-tabs">
          <button 
            :class="['login-tab', { active: loginMode === 'qrcode' }]"
            @click="switchLoginMode('qrcode')"
          >
            二维码登录
          </button>
          <button 
            :class="['login-tab', { active: loginMode === 'phone' }]"
            @click="switchLoginMode('phone')"
          >
            手机验证码登录
          </button>
        </div>
        
        <!-- 二维码登录 -->
        <div v-if="loginMode === 'qrcode'" class="qrcode-login">
          <div class="qrcode-container">
            <div v-if="qrCodeStatus === 'loading'" class="qrcode-loading">
              <div class="loading-spinner"></div>
              <p>正在生成二维码...</p>
            </div>
            <div v-else-if="qrCodeStatus === 'waiting'" class="qrcode-wrapper">
              <div class="qrcode-image" v-html="qrCodeHtml"></div>
              <p class="qrcode-tip">请使用网易云音乐APP扫描二维码登录</p>
            </div>
            <div v-else-if="qrCodeStatus === 'scanned'" class="qrcode-scanned">
              <div class="scanned-icon">✓</div>
              <p>扫码成功，请在手机上确认登录</p>
            </div>
            <div v-else-if="qrCodeStatus === 'expired'" class="qrcode-expired">
              <p>二维码已过期</p>
              <button @click="generateQRCode" class="refresh-btn">刷新二维码</button>
            </div>
            <div v-else-if="qrCodeStatus === 'error'" class="qrcode-error">
              <p>生成二维码失败</p>
              <button @click="generateQRCode" class="refresh-btn">重试</button>
            </div>
          </div>
        </div>
        
        <!-- 手机验证码登录 -->
        <div v-if="loginMode === 'phone'" class="phone-login">
          <div class="phone-input-group">
            <input 
              type="tel" 
              v-model="phoneNumber" 
              placeholder="请输入手机号码" 
              class="phone-input"
              maxlength="11"
              @input="validatePhoneNumber"
            />
            <button 
              @click="sendVerificationCode" 
              class="send-code-btn"
              :disabled="!isValidPhone || codeCountdown > 0"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
            </button>
          </div>
          
          <div class="code-input-group">
            <input 
              type="text" 
              v-model="verificationCode" 
              placeholder="请输入验证码" 
              class="code-input"
              maxlength="6"
            />
          </div>
          
          <button 
            @click="loginWithPhone" 
            class="login-btn"
            :disabled="!isValidPhone || !verificationCode || isLoggingIn"
          >
            {{ isLoggingIn ? '登录中...' : '登录' }}
          </button>
        </div>
        
        <!-- 登录状态提示 -->
        <div v-if="loginMessage" class="login-message" :class="messageType">
          {{ loginMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MusicLogin',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    apiUrl: {
      type: String,
      default: 'https://zm.i9mr.com'
    }
  },
  data() {
    return {
      loginMode: 'qrcode', // 'qrcode' 或 'phone'
      // 二维码登录相关
      qrCodeKey: '',
      qrCodeHtml: '',
      qrCodeStatus: 'loading', // 'loading', 'waiting', 'scanned', 'expired', 'error'
      qrCodeCheckTimer: null,
      // 手机登录相关
      phoneNumber: '',
      verificationCode: '',
      isValidPhone: false,
      codeCountdown: 0,
      codeCountdownTimer: null,
      isLoggingIn: false,
      // 通用状态
      loginMessage: '',
      messageType: 'info', // 'info', 'success', 'error'
      loginCookie: ''
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.initLogin();
      } else {
        this.cleanup();
      }
    }
  },
  methods: {
    initLogin() {
      this.loginMessage = '';
      this.messageType = 'info';
      if (this.loginMode === 'qrcode') {
        this.generateQRCode();
      }
    },
    
    cleanup() {
      if (this.qrCodeCheckTimer) {
        clearInterval(this.qrCodeCheckTimer);
        this.qrCodeCheckTimer = null;
      }
      if (this.codeCountdownTimer) {
        clearInterval(this.codeCountdownTimer);
        this.codeCountdownTimer = null;
      }
    },
    
    switchLoginMode(mode) {
      this.loginMode = mode;
      this.loginMessage = '';
      this.messageType = 'info';
      this.cleanup();
      
      if (mode === 'qrcode') {
        this.generateQRCode();
      } else {
        // 重置手机登录状态
        this.phoneNumber = '';
        this.verificationCode = '';
        this.isValidPhone = false;
        this.codeCountdown = 0;
      }
    },
    
    // 生成二维码
    async generateQRCode() {
      this.qrCodeStatus = 'loading';
      this.loginMessage = '';
      
      try {
        // 1. 获取二维码key
        const keyResponse = await fetch(`${this.apiUrl}/login/qr/key?timestamp=${Date.now()}`);
        if (!keyResponse.ok) {
          throw new Error(`HTTP错误: ${keyResponse.status} ${keyResponse.statusText}`);
        }
        
        const keyData = await keyResponse.json();
        if (keyData.code !== 200 || !keyData.data.unikey) {
          const errorMsg = keyData.msg || keyData.message || '获取二维码密钥失败';
          throw new Error(`API错误[${keyData.code}]: ${errorMsg}`);
        }
        
        this.qrCodeKey = keyData.data.unikey;
        
        // 2. 生成二维码
        const qrResponse = await fetch(`${this.apiUrl}/login/qr/create?key=${this.qrCodeKey}&qrimg=true&timestamp=${Date.now()}`);
        if (!qrResponse.ok) {
          throw new Error(`HTTP错误: ${qrResponse.status} ${qrResponse.statusText}`);
        }
        
        const qrData = await qrResponse.json();
        if (qrData.code !== 200) {
          const errorMsg = qrData.msg || qrData.message || '生成二维码失败';
          throw new Error(`API错误[${qrData.code}]: ${errorMsg}`);
        }
        
        // 处理二维码数据
        this.processQRCodeData(qrData.data);
        this.qrCodeStatus = 'waiting';
        
        // 3. 开始检查二维码状态
        this.startQRCodeCheck();
      } catch (error) {
        console.error('生成二维码失败:', error);
        this.qrCodeStatus = 'error';
        this.loginMessage = `生成二维码失败: ${error.message}`;
        this.messageType = 'error';
      }
    },
    
    // 处理二维码数据
    processQRCodeData(data) {
      console.log('二维码API返回数据:', data);
      
      // 检查是否有qrimg字段（HTML格式）
      if (data.qrimg) {
        console.log('使用qrimg字段:', data.qrimg.substring(0, 100) + '...');
        
        // 检查是否是base64图片数据
        if (data.qrimg.startsWith('data:image')) {
          // 直接使用base64图片数据
          this.qrCodeHtml = `<img src="${data.qrimg}" alt="二维码" />`;
          console.log('使用base64图片格式');
        } else {
          // 假设是HTML格式，直接使用
          this.qrCodeHtml = data.qrimg;
          console.log('使用HTML格式');
        }
      } 
      // 检查是否有qrurl字段（图片URL）
      else if (data.qrurl) {
        console.log('使用qrurl字段:', data.qrurl);
        this.qrCodeHtml = `<img src="${data.qrurl}" alt="二维码" />`;
      }
      // 如果都没有，尝试使用其他字段
      else {
        console.error('无法获取二维码数据，可用字段:', Object.keys(data));
        throw new Error('无法获取二维码数据');
      }
    },
    
    // 开始检查二维码状态
    startQRCodeCheck() {
      // 清除之前的定时器
      if (this.qrCodeCheckTimer) {
        clearInterval(this.qrCodeCheckTimer);
      }
      
      // 每2秒检查一次
      this.qrCodeCheckTimer = setInterval(async () => {
        try {
          const response = await fetch(`${this.apiUrl}/login/qr/check?key=${this.qrCodeKey}&timestamp=${Date.now()}`);
          if (!response.ok) {
            console.error(`检查二维码状态HTTP错误: ${response.status} ${response.statusText}`);
            return; // 不显示错误，继续检查
          }
          
          const data = await response.json();
          console.log('二维码状态检查:', data);
          
          if (data.code === 800) {
            // 二维码过期
            this.qrCodeStatus = 'expired';
            clearInterval(this.qrCodeCheckTimer);
            this.qrCodeCheckTimer = null;
          } else if (data.code === 801) {
            // 等待扫码
            this.qrCodeStatus = 'waiting';
          } else if (data.code === 802) {
            // 扫码成功，等待确认
            this.qrCodeStatus = 'scanned';
          } else if (data.code === 803) {
            // 登录成功
            this.qrCodeStatus = 'waiting';
            clearInterval(this.qrCodeCheckTimer);
            this.qrCodeCheckTimer = null;
            
            // 保存cookie
            this.loginCookie = data.cookie;
            this.handleLoginSuccess();
          } else if (data.code !== 801 && data.code !== 802) {
            // 处理其他错误代码
            const errorMsg = data.msg || data.message || '未知错误';
            console.error(`二维码登录错误[${data.code}]: ${errorMsg}`);
            
            // 某些错误需要停止检查
            if (data.code === 801 || data.code === 802) {
              return; // 继续检查
            } else {
              clearInterval(this.qrCodeCheckTimer);
              this.qrCodeCheckTimer = null;
              this.qrCodeStatus = 'error';
              this.loginMessage = `登录失败[${data.code}]: ${errorMsg}`;
              this.messageType = 'error';
            }
          }
        } catch (error) {
          console.error('检查二维码状态失败:', error);
          // 不显示错误，继续检查
        }
      }, 2000);
    },
    
    // 验证手机号码
    validatePhoneNumber() {
      const phoneRegex = /^1[3-9]\d{9}$/;
      this.isValidPhone = phoneRegex.test(this.phoneNumber);
    },
    
    // 发送验证码
    async sendVerificationCode() {
      if (!this.isValidPhone) return;
      
      try {
        this.loginMessage = '正在发送验证码...';
        this.messageType = 'info';
        
        const response = await fetch(`${this.apiUrl}/captcha/sent?phone=${this.phoneNumber}&timestamp=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('发送验证码响应:', data);
        
        if (data.code === 200) {
          this.loginMessage = '验证码已发送';
          this.messageType = 'success';
          
          // 开始倒计时
          this.codeCountdown = 60;
          this.codeCountdownTimer = setInterval(() => {
            this.codeCountdown--;
            if (this.codeCountdown <= 0) {
              clearInterval(this.codeCountdownTimer);
              this.codeCountdownTimer = null;
            }
          }, 1000);
        } else {
          const errorMsg = data.msg || data.message || '发送验证码失败';
          throw new Error(`API错误[${data.code}]: ${errorMsg}`);
        }
      } catch (error) {
        console.error('发送验证码失败:', error);
        this.loginMessage = `发送验证码失败: ${error.message}`;
        this.messageType = 'error';
      }
    },
    
    // 手机验证码登录
    async loginWithPhone() {
      if (!this.isValidPhone || !this.verificationCode) return;
      
      this.isLoggingIn = true;
      this.loginMessage = '正在登录...';
      this.messageType = 'info';
      
      try {
        const response = await fetch(`${this.apiUrl}/login/cellphone?phone=${this.phoneNumber}&captcha=${this.verificationCode}&timestamp=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('手机登录响应:', data);
        
        if (data.code === 200) {
          // 保存cookie
          this.loginCookie = data.cookie;
          this.handleLoginSuccess();
        } else {
          const errorMsg = data.msg || data.message || '登录失败';
          throw new Error(`API错误[${data.code}]: ${errorMsg}`);
        }
      } catch (error) {
        console.error('登录失败:', error);
        this.loginMessage = `登录失败: ${error.message}`;
        this.messageType = 'error';
      } finally {
        this.isLoggingIn = false;
      }
    },
    
    // 解析错误代码
    parseErrorCode(code) {
      const errorMap = {
        // 二维码登录错误
        800: '二维码已过期',
        801: '等待扫码',
        802: '扫码成功，等待确认',
        803: '授权登录成功',
        // 手机登录错误
        501: '手机号格式错误',
        502: '手机号未注册',
        503: '验证码错误',
        504: '验证码已过期',
        505: '发送验证码过于频繁',
        506: '操作过于频繁，请稍后再试',
        // 通用错误
        400: '请求参数错误',
        401: '未授权',
        403: '禁止访问',
        404: '接口不存在',
        500: '服务器内部错误',
        502: '网关错误',
        503: '服务不可用'
      };
      
      return errorMap[code] || `未知错误代码: ${code}`;
    },
    
    // 处理登录成功
    handleLoginSuccess() {
      this.loginMessage = '登录成功！';
      this.messageType = 'success';
      
      // 保存登录信息到localStorage
      try {
        localStorage.setItem('musicLoginCookie', this.loginCookie);
        localStorage.setItem('musicLoginTime', Date.now().toString());
      } catch (error) {
        console.error('保存登录信息失败:', error);
      }
      
      // 获取用户信息
      this.getUserInfo();
      
      // 延迟关闭登录弹窗
      setTimeout(() => {
        this.closeLogin();
        this.$emit('login-success', {
          cookie: this.loginCookie
        });
      }, 1500);
    },
    
    // 获取用户信息
    async getUserInfo() {
      try {
        const response = await fetch(`${this.apiUrl}/user/account?timestamp=${Date.now()}`, {
          headers: {
            'Cookie': this.loginCookie
          }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.code === 200 && data.profile) {
          // 保存用户信息
          try {
            localStorage.setItem('musicUserInfo', JSON.stringify(data.profile));
          } catch (error) {
            console.error('保存用户信息失败:', error);
          }
          
          this.$emit('user-info-updated', data.profile);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    },
    
    closeLogin() {
      this.$emit('close');
    }
  },
  
  beforeUnmount() {
    this.cleanup();
  }
}
</script>

<style scoped>
.music-login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10003;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.music-login-modal-content {
  width: 90%;
  max-width: 400px;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.music-login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border-radius: 20px 20px 0 0;
}

.music-login-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.music-login-body {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.login-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
}

.login-tab {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.login-tab.active {
  background: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qrcode-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qrcode-container {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  position: relative;
}

.qrcode-loading, .qrcode-scanned, .qrcode-expired, .qrcode-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  text-align: center;
}

.qrcode-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.qrcode-image {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.qrcode-tip {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.scanned-icon {
  width: 60px;
  height: 60px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: var(--primary-hover);
}

.phone-login {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.phone-input-group {
  display: flex;
  gap: 0.5rem;
}

.phone-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.phone-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
}

.send-code-btn {
  padding: 0.75rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  white-space: nowrap;
}

.send-code-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.send-code-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.code-input-group {
  display: flex;
}

.code-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.code-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
}

.login-btn {
  padding: 0.875rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 600;
}

.login-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-message {
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  white-space: pre-line;
  max-width: 100%;
  word-wrap: break-word;
}

.login-message.info {
  background: rgba(var(--primary-color-rgb), 0.1);
  color: var(--primary-color);
  border: 1px solid rgba(var(--primary-color-rgb), 0.2);
}

.login-message.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.login-message.error {
  background: rgba(244, 67, 54, 0.1);
  color: #F44336;
  border: 1px solid rgba(244, 67, 54, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUpScale {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>