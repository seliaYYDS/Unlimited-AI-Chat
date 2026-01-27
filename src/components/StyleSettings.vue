<template>
  <!-- 主题设置 -->
    <div class="settings-section">
      <h4 class="section-title">主题设置</h4>

      <!-- 主题设置分页标签 -->
      <div class="theme-tabs">
        <button
          v-for="tab in themeTabs"
          :key="tab.id"
          :class="['theme-tab', { active: activeThemeTab === tab.id }]"
          @click="activeThemeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 预制主题分页 -->
      <div v-if="activeThemeTab === 'preset'" class="theme-tab-content">
        <div class="form-group">
          <label>预制主题</label>
          <div class="preset-themes-grid">
            <div
              v-for="presetTheme in presetThemes"
              :key="presetTheme.id"
              :class="['preset-theme-card', { active: isPresetThemeActive(presetTheme) }]"
              @click="applyPresetTheme(presetTheme)"
            >
              <div class="preset-theme-preview" :style="getPresetThemePreviewStyle(presetTheme)">
                <div class="preview-header">
                  <div class="preview-title" :style="{ color: presetTheme.colors.textPrimary }">标题</div>
                  <div class="preview-subtitle" :style="{ color: presetTheme.colors.textSecondary }">副标题</div>
                </div>
                <div class="preview-content">
                  <div class="preview-card" :style="{ backgroundColor: presetTheme.colors.bgSecondary, borderColor: presetTheme.colors.borderColor }">
                    <div class="preview-card-text" :style="{ color: presetTheme.colors.textPrimary }">内容</div>
                  </div>
                </div>
              </div>
              <div class="preset-theme-info">
                <span class="preset-theme-name">{{ presetTheme.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <CustomCheckbox
            :model-value="settings.enableMusicColorSync"
            label="颜色联动音乐封面"
            @update:model-value="updateSetting('enableMusicColorSync', $event)"
          />
          <div class="form-hint">
            开启后，当音乐播放器中有音乐正在播放时会获取歌曲封面的颜色并设置为临时主题色
          </div>
        </div>
      </div>

      <!-- 自定义主题配色分页 -->
      <div v-if="activeThemeTab === 'custom'" class="theme-tab-content">
        <div class="form-group">
          <label>主背景色</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              :value="settings.themeColors?.bgPrimary || '#ffffff'"
              @change="updateThemeColor('bgPrimary', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in themeColorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateThemeColor('bgPrimary', color)"
              ></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>次背景色</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              :value="settings.themeColors?.bgSecondary || '#f8f9fa'"
              @change="updateThemeColor('bgSecondary', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in themeColorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateThemeColor('bgSecondary', color)"
              ></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>主文字色</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              :value="settings.themeColors?.textPrimary || '#1a1a1a'"
              @change="updateThemeColor('textPrimary', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in textColorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateThemeColor('textPrimary', color)"
              ></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>次文字色</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              :value="settings.themeColors?.textSecondary || '#6c757d'"
              @change="updateThemeColor('textSecondary', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in textColorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateThemeColor('textSecondary', color)"
              ></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>边框色</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              :value="settings.themeColors?.borderColor || '#dee2e6'"
              @change="updateThemeColor('borderColor', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in borderColorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateThemeColor('borderColor', color)"
              ></div>
            </div>
          </div>
        </div>

        <!-- AI生成主题配色 -->
        <div class="form-group">
          <label>AI生成主题配色</label>
          <div class="ai-color-generator">
            <div class="ai-input-group">
              <input
                type="text"
                class="ai-prompt-input"
                v-model="aiThemeColorPrompt"
                placeholder="输入意象，如：海洋、森林、日落..."
                @keyup.enter="generateAIThemeColors"
              >
              <button
                class="ai-generate-btn"
                @click="generateAIThemeColors"
                :disabled="!aiThemeColorPrompt.trim() || generatingThemeColors"
              >
                <span v-if="!generatingThemeColors">生成</span>
                <span v-else>生成中...</span>
              </button>
            </div>

            <!-- AI主题配色预览 -->
            <div v-if="generatedThemeColors" class="ai-color-preview">
              <div class="preview-theme-colors">
                <div class="preview-color-row">
                  <div class="preview-color-item">
                    <div class="preview-color" :style="{ backgroundColor: generatedThemeColors.bgPrimary }"></div>
                    <span class="color-label">主背景</span>
                    <span class="color-code">{{ generatedThemeColors.bgPrimary }}</span>
                  </div>
                  <div class="preview-color-item">
                    <div class="preview-color" :style="{ backgroundColor: generatedThemeColors.textPrimary }"></div>
                    <span class="color-label">主文字</span>
                    <span class="color-code">{{ generatedThemeColors.textPrimary }}</span>
                  </div>
                </div>
                <div class="preview-color-row">
                  <div class="preview-color-item">
                    <div class="preview-color" :style="{ backgroundColor: generatedThemeColors.bgSecondary }"></div>
                    <span class="color-label">次背景</span>
                    <span class="color-code">{{ generatedThemeColors.bgSecondary }}</span>
                  </div>
                  <div class="preview-color-item">
                    <div class="preview-color" :style="{ backgroundColor: generatedThemeColors.textSecondary }"></div>
                    <span class="color-label">次文字</span>
                    <span class="color-code">{{ generatedThemeColors.textSecondary }}</span>
                  </div>
                </div>
                <div class="preview-color-row">
                  <div class="preview-color-item">
                    <div class="preview-color" :style="{ backgroundColor: generatedThemeColors.borderColor }"></div>
                    <span class="color-label">边框</span>
                    <span class="color-code">{{ generatedThemeColors.borderColor }}</span>
                  </div>
                </div>
              </div>
              <div class="preview-actions">
                <button class="btn apply-btn" @click="applyGeneratedThemeColors">应用配色</button>
                <button class="btn secondary cancel-btn" @click="cancelGeneratedThemeColors">取消</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 组件颜色分页 -->
      <div v-if="activeThemeTab === 'component'" class="theme-tab-content">
        <div class="form-group">
          <label>组件颜色模式</label>
          <CustomSelect
            :model-value="settings.colorMode"
            :options="colorModeOptions"
            placeholder="选择颜色模式"
            @update:model-value="updateSetting('colorMode', $event)"
          />
        </div>

        <!-- 单色模式 -->
        <div v-if="settings.colorMode === 'single'" class="form-group">
          <label>主色调</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              v-model="settings.primaryColor"
              @change="updateSetting('primaryColor', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in colorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateSetting('primaryColor', color)"
              ></div>
            </div>
          </div>
        </div>

        <!-- 双色模式 -->
        <div v-if="settings.colorMode === 'dual'" class="form-group">
          <label>主色调</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              v-model="settings.primaryColor"
              @change="updateSetting('primaryColor', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in colorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateSetting('primaryColor', color)"
              ></div>
            </div>
          </div>
        </div>

        <div v-if="settings.colorMode === 'dual'" class="form-group">
          <label>副色调</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              v-model="settings.secondaryColor"
              @change="updateSetting('secondaryColor', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in colorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateSetting('secondaryColor', color)"
              ></div>
            </div>
          </div>
        </div>

        <!-- AI生成组件配色 - 双色模式 -->
        <div v-if="settings.colorMode === 'dual'" class="form-group">
          <label>AI生成组件配色</label>
          <div class="ai-color-generator">
            <div class="ai-input-group">
              <input
                type="text"
                class="ai-prompt-input"
                v-model="aiComponentColorPrompt"
                placeholder="输入意象，如：活力、科技、温暖..."
                @keyup.enter="generateAIComponentColors"
              >
              <button
                class="ai-generate-btn"
                @click="generateAIComponentColors"
                :disabled="!aiComponentColorPrompt.trim() || generatingComponentColors"
              >
                <span v-if="!generatingComponentColors">生成</span>
                <span v-else>生成中...</span>
              </button>
            </div>

            <!-- AI组件配色预览 -->
            <div v-if="generatedComponentColors" class="ai-color-preview">
              <div class="preview-colors">
                <div class="preview-color-item">
                  <div class="preview-color" :style="{ backgroundColor: generatedComponentColors.color1 }"></div>
                  <span class="color-code">{{ generatedComponentColors.color1 }}</span>
                </div>
                <div class="preview-color-item">
                  <div class="preview-color" :style="{ backgroundColor: generatedComponentColors.color2 }"></div>
                  <span class="color-code">{{ generatedComponentColors.color2 }}</span>
                </div>
              </div>
              <div class="preview-actions">
                <button class="btn apply-btn" @click="applyGeneratedComponentColors">应用配色</button>
                <button class="btn secondary cancel-btn" @click="cancelGeneratedComponentColors">取消</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 渐变模式 -->
        <div v-if="settings.colorMode === 'gradient'" class="form-group">
          <label>渐变色一</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              v-model="settings.gradientColor1"
              @change="updateSetting('gradientColor1', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in colorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateSetting('gradientColor1', color)"
              ></div>
            </div>
          </div>
        </div>

        <div v-if="settings.colorMode === 'gradient'" class="form-group">
          <label>渐变色二</label>
          <div class="color-picker-group">
            <input
              type="color"
              class="color-picker"
              v-model="settings.gradientColor2"
              @change="updateSetting('gradientColor2', $event.target.value)"
            >
            <div class="color-presets">
              <div
                v-for="color in colorPresets"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                @click="updateSetting('gradientColor2', color)"
              ></div>
            </div>
          </div>
        </div>

        <!-- AI生成组件配色 - 渐变模式 -->
        <div v-if="settings.colorMode === 'gradient'" class="form-group">
          <label>AI生成组件配色</label>
          <div class="ai-color-generator">
            <div class="ai-input-group">
              <input
                type="text"
                class="ai-prompt-input"
                v-model="aiComponentColorPrompt"
                placeholder="输入意象，如：活力、科技、温暖..."
                @keyup.enter="generateAIComponentColors"
              >
              <button
                class="ai-generate-btn"
                @click="generateAIComponentColors"
                :disabled="!aiComponentColorPrompt.trim() || generatingComponentColors"
              >
                <span v-if="!generatingComponentColors">生成</span>
                <span v-else>生成中...</span>
              </button>
            </div>

            <!-- AI组件配色预览 -->
            <div v-if="generatedComponentColors" class="ai-color-preview">
              <div class="preview-colors">
                <div class="preview-gradient" :style="{ background: `linear-gradient(135deg, ${generatedComponentColors.color1}, ${generatedComponentColors.color2})` }"></div>
                <div class="gradient-color-codes">
                  <span class="color-code">{{ generatedComponentColors.color1 }}</span>
                  <span class="color-code">{{ generatedComponentColors.color2 }}</span>
                </div>
              </div>
              <div class="preview-actions">
                <button class="btn apply-btn" @click="applyGeneratedComponentColors">应用配色</button>
                <button class="btn secondary cancel-btn" @click="cancelGeneratedComponentColors">取消</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 高级渐变模式 -->
        <div v-if="settings.colorMode === 'advanced-gradient'">
          <!-- 渐变方向/模式 -->
          <div class="form-group">
            <label>渐变方向</label>
            <CustomSelect
              :model-value="settings.gradientDirection"
              :options="gradientDirectionOptions"
              placeholder="选择渐变方向"
              @update:model-value="updateSetting('gradientDirection', $event)"
            />
          </div>

          <!-- 自定义角度调整 -->
          <div v-if="settings.gradientDirection === 'custom'" class="form-group">
            <div class="custom-angle-control">
              <CustomSlider
                :model-value="settings.customGradientAngle || 135"
                :min="0"
                :max="360"
                :step="1"
                label="渐变角度"
                @update:model-value="updateCustomAngle"
              />
              <span class="angle-display">{{ settings.customGradientAngle || 135 }}°</span>
            </div>
          </div>

          <!-- 渐变颜色数量 -->
          <div class="form-group">
            <label>渐变颜色数量</label>
            <div class="gradient-color-count">
              <div class="color-count-controls">
                <button
                  class="color-count-btn decrease"
                  @click="decreaseColorCount"
                  :disabled="(settings.gradientColorCount || 3) <= 2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
                <span class="color-count-display">{{ settings.gradientColorCount || 3 }} 色</span>
                <button
                  class="color-count-btn increase"
                  @click="increaseColorCount"
                  :disabled="(settings.gradientColorCount || 3) >= 8"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 渐变颜色列表 -->
          <div class="form-group">
            <label>渐变颜色</label>
            <div class="advanced-gradient-colors">
              <div
                v-for="(color, index) in gradientColors"
                :key="index"
                class="gradient-color-item"
              >
                <div class="color-label">色 {{ index + 1 }}</div>
                <div class="color-picker-group">
                  <input
                    type="color"
                    class="color-picker"
                    :value="color"
                    @change="updateGradientColor(index, $event.target.value)"
                  >
                  <div class="color-presets">
                    <div
                      v-for="presetColor in colorPresets"
                      :key="presetColor"
                      class="color-preset"
                      :style="{ backgroundColor: presetColor }"
                      @click="updateGradientColor(index, presetColor)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 渐变预览 -->
          <div class="form-group">
            <label>渐变预览</label>
            <div class="gradient-preview-container">
              <div
                class="gradient-preview"
                :style="{ background: generateGradientPreview() }"
              ></div>
              <div class="gradient-css-code">
                <code>{{ generateGradientCSS() }}</code>
              </div>
            </div>
          </div>

          <!-- AI生成组件配色 - 高级渐变模式 -->
          <div class="form-group">
            <label>AI生成组件配色</label>
            <div class="ai-color-generator">
              <div class="ai-input-group">
                <input
                  type="text"
                  class="ai-prompt-input"
                  v-model="aiComponentColorPrompt"
                  placeholder="输入意象，如：活力、科技、温暖..."
                  @keyup.enter="generateAIAdvancedComponentColors"
                >
                <button
                  class="ai-generate-btn"
                  @click="generateAIAdvancedComponentColors"
                  :disabled="!aiComponentColorPrompt.trim() || generatingComponentColors"
                >
                  <span v-if="!generatingComponentColors">生成</span>
                  <span v-else>生成中...</span>
                </button>
              </div>

              <!-- AI组件配色预览 -->
              <div v-if="generatedAdvancedComponentColors" class="ai-color-preview">
                <div class="preview-colors">
                  <div class="preview-gradient" :style="{ background: generateAdvancedComponentGradientPreview() }"></div>
                  <div class="gradient-color-codes">
                    <span
                      v-for="(color, index) in generatedAdvancedComponentColors"
                      :key="index"
                      class="color-code"
                    >{{ color }}</span>
                  </div>
                </div>
                <div class="preview-actions">
                  <button class="btn apply-btn" @click="applyGeneratedAdvancedComponentColors">应用配色</button>
                  <button class="btn secondary cancel-btn" @click="cancelGeneratedAdvancedComponentColors">取消</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 界面样式 -->
    <div class="settings-section">
      <h4 class="section-title">界面样式</h4>

      <div class="form-group">
        <label>字体</label>
        <div class="font-select-container">
          <CustomSelect
            :model-value="settings.fontFamily"
            :options="fontFamilyOptions"
            placeholder="选择字体"
            @update:model-value="updateSetting('fontFamily', $event)"
          />
          <div v-if="loadingSystemFonts" class="font-loading-indicator">
            <span class="loading-text">正在检测系统字体...</span>
          </div>
          <div class="font-preview" :style="getFontPreviewStyle()">
            字体预览 AaBbCc 123 汉字测试
          </div>
        </div>
      </div>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.enableSecondaryFont"
          label="启用副字体"
          @update:model-value="updateSetting('enableSecondaryFont', $event)"
        />
        <div class="form-hint">
          启用后，当主字体无法显示某些字符时，将使用副字体显示
        </div>
      </div>

      <div v-if="settings.enableSecondaryFont" class="form-group">
        <label>副字体</label>
        <div class="font-select-container">
          <CustomSelect
            :model-value="settings.secondaryFontFamily"
            :options="fontFamilyOptions"
            placeholder="选择副字体"
            @update:model-value="updateSetting('secondaryFontFamily', $event)"
          />
          <div class="font-preview" :style="getSecondaryFontPreviewStyle()">
            副字体预览 AaBbCc 123 汉字测试
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>字体大小</label>
        <HorizontalSlider
          :model-value="settings.fontSize"
          :options="fontSizeOptions"
          @update:model-value="updateSetting('fontSize', $event)"
        />
      </div>

      <div class="form-group">
        <label>圆角大小</label>
        <HorizontalSlider
          :model-value="settings.borderRadius"
          :options="borderRadiusOptions"
          @update:model-value="updateSetting('borderRadius', $event)"
        />
      </div>

      <div class="form-group">
        <label>消息气泡样式</label>
        <CustomSelect
          :model-value="settings.messageBubbleStyle"
          :options="bubbleStyleOptions"
          placeholder="选择消息气泡样式"
          @update:model-value="updateSetting('messageBubbleStyle', $event)"
        />
      </div>

      <div class="form-group">
        <label>聊天布局</label>
        <CustomSelect
          :model-value="settings.chatLayout"
          :options="chatLayoutOptions"
          placeholder="选择聊天布局"
          @update:model-value="updateSetting('chatLayout', $event)"
        />
      </div>
    </div>

    <!-- 动画设置 -->
    <div class="settings-section">
      <h4 class="section-title">动画设置</h4>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.enableAnimations"
          label="启用动画效果"
          @update:model-value="updateSetting('enableAnimations', $event)"
        />
        <div class="form-hint">
          启用后，界面元素将会有平滑的过渡动画效果
        </div>
      </div>

      <div class="form-group">
        <label>动画速度</label>
        <HorizontalSlider
          :model-value="settings.animationSpeed"
          :options="animationSpeedOptions"
          @update:model-value="updateSetting('animationSpeed', $event)"
        />
      </div>
    </div>

    <!-- 问候动画设置 -->
    <div class="settings-section">
      <h4 class="section-title">问候动画设置</h4>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.enableSplashAnimation"
          label="启用问候动画"
          @update:model-value="updateSetting('enableSplashAnimation', $event)"
        />
        <div class="form-hint">
          开启后，打开应用时会显示问候动画
        </div>
      </div>

      <div class="form-group" v-if="settings.enableSplashAnimation">
        <CustomSlider
          :model-value="settings.splashDuration"
          :min="300"
          :max="2000"
          :step="100"
          :show-value="true"
          label="问候动画停留时间"
          unit="ms"
          @update:model-value="updateSetting('splashDuration', $event)"
        />
        <div class="form-hint">
          设置问候动画显示的时长（300-2000毫秒）
        </div>
      </div>

      <div class="form-group" v-if="settings.enableSplashAnimation">
        <label>标题文字动画类型</label>
        <CustomSelect
          :model-value="settings.splashAnimationType"
          :options="splashAnimationTypeOptions"
          @update:model-value="updateSetting('splashAnimationType', $event)"
        />
        <div class="form-hint">
          选择标题文字的动画效果类型
        </div>
      </div>
    </div>

    <!-- 灵动岛设置 -->
    <div class="settings-section">
      <h4 class="section-title">灵动岛设置</h4>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.enableDynamicIslandMusicInfo"
          label="灵动岛音乐信息显示"
          @update:model-value="updateSetting('enableDynamicIslandMusicInfo', $event)"
        />
        <div class="form-hint">
          开启后，当音乐播放器中有音乐正在播放时会在灵动岛显示音乐信息
        </div>
      </div>

      <div class="form-group" v-if="settings.enableDynamicIslandMusicInfo">
        <CustomCheckbox
          :model-value="settings.enableDynamicIslandLyrics"
          label="灵动岛歌词显示"
          @update:model-value="updateSetting('enableDynamicIslandLyrics', $event)"
        />
        <div class="form-hint">
          开启后，会在灵动岛音乐信息中显示实时歌词
        </div>
      </div>

      <div class="form-group">
        <CustomSlider
          :model-value="settings.dynamicIslandBorderWidth"
          :min="0"
          :max="10"
          :step="0.5"
          label="边框宽度"
          unit="px"
          @update:model-value="updateSetting('dynamicIslandBorderWidth', $event)"
        />
      </div>

      <div class="form-group" v-if="settings.dynamicIslandBorderWidth > 0">
        <label>边框颜色</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.dynamicIslandBorderColor"
            @change="updateSetting('dynamicIslandBorderColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('dynamicIslandBorderColor', color)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 流光效果设置 -->
    <div class="settings-section">
      <h4 class="section-title">流光效果设置</h4>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.enableShineEffect"
          label="启用流光效果"
          @update:model-value="updateSetting('enableShineEffect', $event)"
        />
        <div class="form-hint">
          启用后，按钮和元素在悬停时将显示流光效果
        </div>
      </div>

      <div class="form-group">
        <label>流光颜色</label>
        <div class="color-picker-group">
          <input
            type="color"
            class="color-picker"
            v-model="settings.shineColor"
            @change="updateSetting('shineColor', $event.target.value)"
          >
          <div class="color-presets">
            <div
              v-for="color in shineColorPresets"
              :key="color"
              class="color-preset"
              :style="{ backgroundColor: color }"
              @click="updateSetting('shineColor', color)"
            ></div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>流光速度</label>
        <HorizontalSlider
          :model-value="settings.shineSpeed"
          :options="shineSpeedOptions"
          @update:model-value="updateSetting('shineSpeed', $event)"
        />
      </div>

      <div class="form-group">
        <CustomSlider
          :model-value="settings.shineOpacity"
          :min="0"
          :max="1"
          :step="0.1"
          label="流光透明度"
          @update:model-value="updateSetting('shineOpacity', $event)"
        />
      </div>
    </div>

    <!-- 通知设置 -->
    <div class="settings-section">
      <h4 class="section-title">通知设置</h4>

      <div class="form-group">
        <label>边框模式</label>
        <CustomSelect
          :model-value="settings.notificationBorderMode"
          :options="notificationBorderOptions"
          placeholder="选择边框模式"
          @update:model-value="updateSetting('notificationBorderMode', $event)"
        />
      </div>

      <div class="form-group">
        <CustomSlider
          :model-value="settings.notificationDuration"
          :min="1"
          :max="10"
          :step="0.5"
          label="滞留时间（秒）"
          unit="秒"
          @update:model-value="updateSetting('notificationDuration', $event)"
        />
      </div>
    </div>

    <!-- 弹窗背景设置 -->
    <div class="settings-section">
      <h4 class="section-title">弹窗背景设置</h4>

      <div class="form-group">
        <CustomCheckbox
          :model-value="settings.modalBackdropBlur"
          label="启用背景模糊"
          @update:model-value="updateSetting('modalBackdropBlur', $event)"
        />
      </div>

      <div v-if="settings.modalBackdropBlur" class="form-group">
        <CustomSlider
          :model-value="settings.modalBackdropBlurAmount"
          :min="0"
          :max="20"
          :step="1"
          label="模糊程度"
          unit="px"
          @update:model-value="updateSetting('modalBackdropBlurAmount', $event)"
        />
      </div>

      <div class="form-group">
        <CustomSlider
          :model-value="settings.modalBackdropOpacity"
          :min="0.1"
          :max="1.0"
          :step="0.1"
          label="背景暗化程度"
          unit=""
          @update:model-value="updateSetting('modalBackdropOpacity', $event)"
        />
      </div>
    </div>

    <!-- 重置按钮 -->
    <div class="settings-actions">
      <button class="btn secondary" @click="resetToDefaults">
        重置为默认值
      </button>
    </div>
</template>

<script>
import { StorageManager } from '../storage.js'
import { AIService } from '../aiService.js'
import { FontDetector } from '../utils/fontDetector.js'
import CustomSelect from './CustomSelect.vue'
import CustomSlider from './CustomSlider.vue'
import CustomCheckbox from './CustomCheckbox.vue'
import HorizontalSlider from './HorizontalSlider.vue'

export default {
  name: 'StyleSettings',
  components: {
    CustomSelect,
    CustomSlider,
    CustomCheckbox,
    HorizontalSlider
  },
  emits: ['update:settings', 'notify'],
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      storageManager: null,
      aiService: null,
      fontDetector: null,
      systemFonts: [],
      loadingSystemFonts: false,
      activeThemeTab: 'preset',
      
      // AI 主题配色相关
      aiThemeColorPrompt: '',
      generatingThemeColors: false,
      generatedThemeColors: null,
      
      // AI 组件配色相关
      aiComponentColorPrompt: '',
      generatingComponentColors: false,
      generatedComponentColors: null,
      generatedAdvancedComponentColors: null,
      
      // 渐变相关
      gradientColors: [],
      aiColorPrompt: '',
      generatingColors: false,
      generatedColors: null,
      generatedAdvancedColors: null,

      // 选项配置
      themeTabs: [
        { id: 'preset', label: '预制主题' },
        { id: 'custom', label: '自定义主题' },
        { id: 'component', label: '组件颜色' }
      ],

      presetThemes: [
        {
          id: 'light',
          name: '亮色',
          colors: {
            bgPrimary: '#ffffff',
            bgSecondary: '#f8f9fa',
            bgTertiary: '#e9ecef',
            bgHover: '#f1f3f4',
            textPrimary: '#1a1a1a',
            textSecondary: '#6c757d',
            textTertiary: '#adb5bd',
            borderColor: '#dee2e6',
            borderLight: '#e9ecef'
          }
        },
        {
          id: 'dark',
          name: '暗色',
          colors: {
            bgPrimary: '#1a1a1a',
            bgSecondary: '#2d2d2d',
            bgTertiary: '#3d3d3d',
            bgHover: '#383838',
            textPrimary: '#ffffff',
            textSecondary: '#b0b0b0',
            textTertiary: '#808080',
            borderColor: '#404040',
            borderLight: '#4d4d4d'
          }
        },
        {
          id: 'ocean',
          name: '海洋',
          colors: {
            bgPrimary: '#0c4a6e',
            bgSecondary: '#075985',
            bgTertiary: '#0369a1',
            bgHover: '#0284c7',
            textPrimary: '#f0f9ff',
            textSecondary: '#bae6fd',
            textTertiary: '#7dd3fc',
            borderColor: '#0ea5e9',
            borderLight: '#38bdf8'
          }
        },
        {
          id: 'forest',
          name: '森林',
          colors: {
            bgPrimary: '#14532d',
            bgSecondary: '#166534',
            bgTertiary: '#15803d',
            bgHover: '#22c55e',
            textPrimary: '#f0fdf4',
            textSecondary: '#bbf7d0',
            textTertiary: '#86efac',
            borderColor: '#22c55e',
            borderLight: '#4ade80'
          }
        },
        {
          id: 'violet',
          name: '紫罗兰',
          colors: {
            bgPrimary: '#4c1d95',
            bgSecondary: '#5b21b6',
            bgTertiary: '#6d28d9',
            bgHover: '#7c3aed',
            textPrimary: '#faf5ff',
            textSecondary: '#e9d5ff',
            textTertiary: '#d8b4fe',
            borderColor: '#8b5cf6',
            borderLight: '#a78bfa'
          }
        },
        {
          id: 'sakura',
          name: '樱花',
          colors: {
            bgPrimary: '#831843',
            bgSecondary: '#9f1239',
            bgTertiary: '#be123c',
            bgHover: '#e11d48',
            textPrimary: '#fff1f2',
            textSecondary: '#fecdd3',
            textTertiary: '#fda4af',
            borderColor: '#f43f5e',
            borderLight: '#fb7185'
          }
        },
        {
          id: 'sunset',
          name: '日落',
          colors: {
            bgPrimary: '#7c2d12',
            bgSecondary: '#9a3412',
            bgTertiary: '#c2410c',
            bgHover: '#ea580c',
            textPrimary: '#fff7ed',
            textSecondary: '#ffedd5',
            textTertiary: '#fed7aa',
            borderColor: '#f97316',
            borderLight: '#fb923c'
          }
        },
        {
          id: 'aurora',
          name: '极光',
          colors: {
            bgPrimary: '#164e63',
            bgSecondary: '#155e75',
            bgTertiary: '#0e7490',
            bgHover: '#06b6d4',
            textPrimary: '#ecfeff',
            textSecondary: '#cffafe',
            textTertiary: '#a5f3fc',
            borderColor: '#06b6d4',
            borderLight: '#22d3ee'
          }
        }
      ],

      themeColorPresets: [
        '#ffffff', // 纯白
        '#f8fafc', // 浅灰白
        '#e2e8f0', // 浅灰
        '#1e293b', // 深蓝灰
        '#0f172a', // 深蓝黑
        '#0c4a6e', // 海洋蓝
        '#14532d', // 森林绿
        '#4c1d95', // 紫罗兰
        '#831843', // 樱花粉
        '#7c2d12'  // 日落橙
      ],

      textColorPresets: [
        '#000000', // 纯黑
        '#1a1a1a', // 深黑
        '#374151', // 深灰
        '#6b7280', // 中灰
        '#9ca3af', // 浅灰
        '#ffffff', // 纯白
        '#fef3c7', // 浅黄
        '#dbeafe', // 浅蓝
        '#d1fae5', // 浅绿
        '#fce7f3'  // 浅粉
      ],

      borderColorPresets: [
        '#e2e8f0', // 浅灰边框
        '#cbd5e1', // 中灰边框
        '#94a3b8', // 深灰边框
        '#475569', // 深色边框
        '#0ea5e9', // 蓝色边框
        '#22c55e', // 绿色边框
        '#8b5cf6', // 紫色边框
        '#f43f5e'  // 红色边框
      ],

      colorPresets: [
        '#ec4899', // 粉红
        '#3b82f6', // 蓝色
        '#10b981', // 绿色
        '#f59e0b', // 橙色
        '#8b5cf6', // 紫色
        '#ef4444'  // 红色
      ],

      colorModeOptions: [
        { value: 'single', label: '单色模式' },
        { value: 'dual', label: '双色模式' },
        { value: 'gradient', label: '渐变模式' },
        { value: 'advanced-gradient', label: '高级渐变' }
      ],

      gradientDirectionOptions: [
        { value: 'to-right', label: '向右渐变' },
        { value: 'to-left', label: '向左渐变' },
        { value: 'to-bottom', label: '向下渐变' },
        { value: 'to-top', label: '向上渐变' },
        { value: 'to-bottom-right', label: '右下渐变' },
        { value: 'to-bottom-left', label: '左下渐变' },
        { value: 'to-top-right', label: '右上渐变' },
        { value: 'to-top-left', label: '左上渐变' },
        { value: 'custom', label: '自定义角度' },
        { value: 'radial', label: '径向渐变' }
      ],

      get fontFamilyOptions() {
        const baseOptions = [
          { value: 'system-ui', label: '系统默认', fontFamily: 'system-ui' },
          { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: '苹果系统', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
          { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑', fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' },
          { value: '"SimHei", "黑体", sans-serif', label: '黑体', fontFamily: '"SimHei", "黑体", sans-serif' },
          { value: '"SimSun", "宋体", serif', label: '宋体', fontFamily: '"SimSun", "宋体", serif' },
          { value: '"KaiTi", "楷体", serif', label: '楷体', fontFamily: '"KaiTi", "楷体", serif' },
          { value: '"FangSong", "仿宋", serif', label: '仿宋', fontFamily: '"FangSong", "仿宋", serif' },
          { value: 'Arial, sans-serif', label: 'Arial', fontFamily: 'Arial, sans-serif' },
          { value: 'Georgia, serif', label: 'Georgia', fontFamily: 'Georgia, serif' },
          { value: '"Courier New", monospace', label: 'Courier New', fontFamily: '"Courier New", monospace' },
          { value: '"Comic Sans MS", cursive', label: 'Comic Sans', fontFamily: '"Comic Sans MS", cursive' }
        ]

        // 如果有系统字体，添加到选项中
        if (this.systemFonts.length > 0) {
          const systemFontOptions = this.systemFonts.map(font => ({
            value: this.fontDetector.formatFontFamily(font),
            label: font,
            fontFamily: this.fontDetector.formatFontFamily(font)
          }))
          
          // 添加分隔符
          if (systemFontOptions.length > 0) {
            return [
              ...baseOptions,
              { value: '---', label: '--- 系统字体 ---', disabled: true, fontFamily: 'inherit' },
              ...systemFontOptions
            ]
          }
        }

        return baseOptions
      },

      fontSizeOptions: [
        { value: 'small', label: '小' },
        { value: 'medium', label: '中' },
        { value: 'large', label: '大' }
      ],

      borderRadiusOptions: [
        { value: 'small', label: '小' },
        { value: 'medium', label: '中' },
        { value: 'large', label: '大' }
      ],

      bubbleStyleOptions: [
        { value: 'default', label: '默认' },
        { value: 'rounded', label: '圆角' },
        { value: 'minimal', label: '极简' }
      ],

      chatLayoutOptions: [
        { value: 'standard', label: '标准' },
        { value: 'compact', label: '紧凑' },
        { value: 'expanded', label: '扩展' }
      ],

      animationSpeedOptions: [
        { value: 'fast', label: '快速' },
        { value: 'normal', label: '正常' },
        { value: 'slow', label: '慢速' }
      ],

      splashAnimationTypeOptions: [
        { value: 'scale', label: '放大' },
        { value: 'flyIn', label: '飞入' },
        { value: 'fadeIn', label: '渐入' }
      ],

      shineColorPresets: [
        '#ec4899', // 粉红
        '#3b82f6', // 蓝色
        '#10b981', // 绿色
        '#f59e0b', // 橙色
        '#8b5cf6', // 紫色
        '#ef4444', // 红色
        '#ffffff'  // 白色
      ],

      shineSpeedOptions: [
        { value: 'fast', label: '快速' },
        { value: 'normal', label: '正常' },
        { value: 'slow', label: '慢速' }
      ],

      dynamicIslandBorderWidthOptions: [
        { value: 0, label: '无边框' },
        { value: 1, label: '1px' },
        { value: 2, label: '2px' },
        { value: 3, label: '3px' }
      ],
      
      notificationBorderOptions: [
        { value: 'none', label: '无边框' },
        { value: 'left', label: '左边框' },
        { value: 'right', label: '右边框' },
        { value: 'full', label: '完全边框' }
      ]
    }
  },
  created() {
    this.storageManager = new StorageManager()
    this.aiService = new AIService(this.storageManager)
    this.fontDetector = new FontDetector()
  },
  mounted() {
    this.loadSystemFonts()
  },
  watch: {
    'settings.colorMode': {
      handler(newMode) {
        if (newMode === 'advanced-gradient') {
          this.$nextTick(() => {
            this.initializeAdvancedGradient()
          })
        }
      },
      immediate: true
    }
  },
  methods: {
    updateSetting(key, value) {
      this.$emit('update:settings', {
        ...this.settings,
        [key]: value
      })
    },

    updateThemeColor(colorKey, value) {
      const currentColors = this.settings.themeColors || {}
      const newColors = {
        ...currentColors,
        [colorKey]: value
      }
      this.updateSetting('themeColors', newColors)
    },

    // 应用预制主题
    applyPresetTheme(presetTheme) {
      const newSettings = {
        ...this.settings,
        themeColors: presetTheme.colors
      }
      this.$emit('update:settings', newSettings)
      this.showNotification(`已应用主题：${presetTheme.name}`, 'success')
    },

    // 检查预制主题是否激活
    isPresetThemeActive(presetTheme) {
      if (!this.settings.themeColors) return false
      const currentColors = this.settings.themeColors
      const presetColors = presetTheme.colors
      return currentColors.bgPrimary === presetColors.bgPrimary &&
             currentColors.bgSecondary === presetColors.bgSecondary &&
             currentColors.textPrimary === presetColors.textPrimary
    },

    // 获取预制主题预览样式
    getPresetThemePreviewStyle(presetTheme) {
      return {
        backgroundColor: presetTheme.colors.bgPrimary,
        borderColor: presetTheme.colors.borderColor,
        '--preview-bg-secondary': presetTheme.colors.bgSecondary,
        '--preview-text-primary': presetTheme.colors.textPrimary,
        '--preview-text-secondary': presetTheme.colors.textSecondary,
        '--preview-border': presetTheme.colors.borderColor
      }
    },

    // AI生成主题配色
    async generateAIThemeColors() {
      if (!this.aiThemeColorPrompt.trim()) {
        this.showNotification('请输入配色意象', 'warning')
        return
      }

      this.generatingThemeColors = true
      this.generatedThemeColors = null

      try {
        const settings = this.storageManager.getSettings()
        let colorScheme

        if (settings.apiType === 'network') {
          colorScheme = await this.aiService.generateThemeColorScheme(this.aiThemeColorPrompt, settings)
        } else {
          colorScheme = await this.aiService.generateLocalThemeColorScheme(this.aiThemeColorPrompt)
        }

        this.generatedThemeColors = colorScheme
        this.showNotification('主题配色生成成功', 'success')
      } catch (error) {
        console.error('生成主题配色失败:', error)
        this.showNotification(`生成配色失败: ${error.message}`, 'danger')
      } finally {
        this.generatingThemeColors = false
      }
    },

    // 应用生成的主题配色
    applyGeneratedThemeColors() {
      if (!this.generatedThemeColors) return

      const newSettings = {
        ...this.settings,
        themeColors: this.generatedThemeColors
      }
      this.$emit('update:settings', newSettings)
      this.showNotification('主题配色已应用', 'success')
      this.cancelGeneratedThemeColors()
    },

    // 取消生成的主题配色
    cancelGeneratedThemeColors() {
      this.generatedThemeColors = null
      this.aiThemeColorPrompt = ''
    },

    // AI生成组件配色
    async generateAIComponentColors() {
      if (!this.aiComponentColorPrompt.trim()) {
        this.showNotification('请输入配色意象', 'warning')
        return
      }

      this.generatingComponentColors = true
      this.generatedComponentColors = null

      try {
        const settings = this.storageManager.getSettings()
        let colorScheme

        if (settings.apiType === 'network') {
          colorScheme = await this.aiService.generateColorScheme(this.aiComponentColorPrompt, settings)
        } else {
          colorScheme = await this.aiService.generateLocalColorScheme(this.aiComponentColorPrompt)
        }

              this.generatedComponentColors = colorScheme
              this.showNotification('组件配色生成成功', 'success')
            } catch (error) {        console.error('生成组件配色失败:', error)
        this.showNotification(`生成配色失败: ${error.message}`, 'danger')
      } finally {
        this.generatingComponentColors = false
      }
    },

    // 应用生成的组件配色
    applyGeneratedComponentColors() {
      if (!this.generatedComponentColors) return

      if (this.settings.colorMode === 'dual') {
        const newSettings = {
          ...this.settings,
          primaryColor: this.generatedComponentColors.color1,
          secondaryColor: this.generatedComponentColors.color2
        }
        this.$emit('update:settings', newSettings)
      } else if (this.settings.colorMode === 'gradient') {
        const newSettings = {
          ...this.settings,
          gradientColor1: this.generatedComponentColors.color1,
          gradientColor2: this.generatedComponentColors.color2
        }
        this.$emit('update:settings', newSettings)
      }

      this.showNotification('组件配色已应用', 'success')
      this.cancelGeneratedComponentColors()
    },

    // 取消生成的组件配色
    cancelGeneratedComponentColors() {
      this.generatedComponentColors = null
      this.aiComponentColorPrompt = ''
    },

    // AI生成高级渐变组件配色
    async generateAIAdvancedComponentColors() {
      if (!this.aiComponentColorPrompt.trim()) {
        this.showNotification('请输入配色意象', 'warning')
        return
      }

      this.generatingComponentColors = true
      this.generatedAdvancedComponentColors = null

      try {
        const settings = this.storageManager.getSettings()
        const colorCount = this.settings.gradientColorCount || 3

        let colors

        if (settings.apiType === 'network') {
          colors = await this.aiService.generateAdvancedColorScheme(this.aiComponentColorPrompt, colorCount, settings)
        } else {
          colors = await this.aiService.generateLocalAdvancedColorScheme(this.aiComponentColorPrompt, colorCount)
        }

        this.generatedAdvancedComponentColors = colors
        this.showNotification('组件配色生成成功', 'success')
      } catch (error) {
        console.error('生成高级组件配色失败:', error)
        this.showNotification(`生成配色失败: ${error.message}`, 'danger')
      } finally {
        this.generatingComponentColors = false
      }
    },

    // 生成高级渐变组件预览
    generateAdvancedComponentGradientPreview() {
      const direction = this.settings.gradientDirection || '135deg'
      const colors = this.generatedAdvancedComponentColors || ['#ec4899', '#3b82f6', '#10b981']

      let cssDirection = direction
      if (direction === 'to-right') cssDirection = 'to right'
      else if (direction === 'to-left') cssDirection = 'to left'
      else if (direction === 'to-bottom') cssDirection = 'to bottom'
      else if (direction === 'to-top') cssDirection = 'to top'
      else if (direction === 'to-bottom-right') cssDirection = 'to bottom right'
      else if (direction === 'to-bottom-left') cssDirection = 'to bottom left'
      else if (direction === 'to-top-right') cssDirection = 'to top right'
      else if (direction === 'to-top-left') cssDirection = 'to top left'
      else if (direction === 'custom') cssDirection = `${this.settings.customGradientAngle || 135}deg`

      if (direction === 'radial') {
        return `radial-gradient(circle, ${colors.join(', ')})`
      } else {
        return `linear-gradient(${cssDirection}, ${colors.join(', ')})`
      }
    },

    // 应用生成的高级渐变组件配色
    applyGeneratedAdvancedComponentColors() {
      if (!this.generatedAdvancedComponentColors) return

      const newSettings = {
        ...this.settings,
        advancedGradientColors: this.generatedAdvancedComponentColors
      }

      this.gradientColors = this.generatedAdvancedComponentColors
      this.$emit('update:settings', newSettings)

      this.showNotification('组件配色已应用', 'success')
      this.cancelGeneratedAdvancedComponentColors()
    },

    // 取消生成的高级渐变组件配色
    cancelGeneratedAdvancedComponentColors() {
      this.generatedAdvancedComponentColors = null
      this.aiComponentColorPrompt = ''
    },

    // 初始化高级渐变模式
    initializeAdvancedGradient() {
      if (this.settings.advancedGradientColors && this.settings.advancedGradientColors.length > 0) {
        this.gradientColors = [...this.settings.advancedGradientColors]
      } else {
        const colorCount = this.settings.gradientColorCount || 3
        this.gradientColors = this.colorPresets.slice(0, colorCount)
        this.updateSetting('advancedGradientColors', this.gradientColors)
      }
    },

    // 更新渐变颜色数量
    updateGradientColorCount(count) {
      this.updateSetting('gradientColorCount', count)
      this.updateGradientColors(count)
    },

    // 增加颜色数量
    increaseColorCount() {
      const currentCount = parseInt(this.settings.gradientColorCount) || 3
      if (currentCount < 8) {
        const newCount = currentCount + 1
        let newColors = [...this.gradientColors]
        while (newColors.length < newCount) {
          newColors.push(this.colorPresets[newColors.length % this.colorPresets.length])
        }
        
        this.gradientColors = newColors
        
        const newSettings = {
          ...this.settings,
          gradientColorCount: newCount,
          advancedGradientColors: newColors
        }
        this.$emit('update:settings', newSettings)
      }
    },

    // 减少颜色数量
    decreaseColorCount() {
      const currentCount = parseInt(this.settings.gradientColorCount) || 3
      if (currentCount > 2) {
        const newCount = currentCount - 1
        
        let newColors = this.gradientColors.slice(0, newCount)
        
        this.gradientColors = newColors
        
        const newSettings = {
          ...this.settings,
          gradientColorCount: newCount,
          advancedGradientColors: newColors
        }
        this.$emit('update:settings', newSettings)
      }
    },

    // 更新渐变颜色数组
    updateGradientColors(count = null) {
      const targetCount = count !== null ? count : Math.max(2, Math.min(8, this.settings.gradientColorCount || 3))
      const currentColors = this.settings.advancedGradientColors || []
      
      let newColors = [...currentColors]
      while (newColors.length < targetCount) {
        newColors.push(this.colorPresets[newColors.length % this.colorPresets.length])
      }
      
      if (newColors.length > targetCount) {
        newColors = newColors.slice(0, targetCount)
      }
      
      this.gradientColors = newColors
      this.updateSetting('advancedGradientColors', newColors)
    },

    // 更新单个渐变颜色
    updateGradientColor(index, color) {
      const newColors = [...this.gradientColors]
      newColors[index] = color
      this.gradientColors = newColors
      this.updateSetting('advancedGradientColors', newColors)
    },

    // 生成渐变预览
    generateGradientPreview() {
      const direction = this.settings.gradientDirection || '135deg'
      const colors = this.gradientColors.length > 0 ? this.gradientColors : ['#ec4899', '#3b82f6', '#10b981']
      
      let cssDirection = direction
      if (direction === 'to-right') cssDirection = 'to right'
      else if (direction === 'to-left') cssDirection = 'to left'
      else if (direction === 'to-bottom') cssDirection = 'to bottom'
      else if (direction === 'to-top') cssDirection = 'to top'
      else if (direction === 'to-bottom-right') cssDirection = 'to bottom right'
      else if (direction === 'to-bottom-left') cssDirection = 'to bottom left'
      else if (direction === 'to-top-right') cssDirection = 'to top right'
      else if (direction === 'to-top-left') cssDirection = 'to top left'
      else if (direction === 'custom') cssDirection = `${this.settings.customGradientAngle || 135}deg`
      
      if (direction === 'radial') {
        return `radial-gradient(circle, ${colors.join(', ')})`
      } else {
        return `linear-gradient(${cssDirection}, ${colors.join(', ')})`
      }
    },

    // 生成渐变CSS代码
    generateGradientCSS() {
      return this.generateGradientPreview()
    },

    // 更新自定义角度
    updateCustomAngle(angle) {
      this.updateSetting('customGradientAngle', angle)
    },

    // AI生成配色（双色/渐变模式）
    async generateAIColors() {
      if (!this.aiColorPrompt.trim()) {
        this.showNotification('请输入配色意象', 'warning')
        return
      }

      this.generatingColors = true
      this.generatedColors = null

      try {
        const settings = this.storageManager.getSettings()
        let colorScheme

        if (settings.apiType === 'network') {
          colorScheme = await this.aiService.generateColorScheme(this.aiColorPrompt, settings)
        } else {
          colorScheme = await this.aiService.generateLocalColorScheme(this.aiColorPrompt)
        }

        this.generatedColors = colorScheme
        this.showNotification('配色生成成功', 'success')
      } catch (error) {
        console.error('生成配色失败:', error)
        this.showNotification(`生成配色失败: ${error.message}`, 'danger')
      } finally {
        this.generatingColors = false
      }
    },

    // 应用生成的配色
    applyGeneratedColors() {
      if (!this.generatedColors) return

      if (this.settings.colorMode === 'dual') {
        const newSettings = {
          ...this.settings,
          primaryColor: this.generatedColors.color1,
          secondaryColor: this.generatedColors.color2
        }
        this.$emit('update:settings', newSettings)
      } else if (this.settings.colorMode === 'gradient') {
        const newSettings = {
          ...this.settings,
          gradientColor1: this.generatedColors.color1,
          gradientColor2: this.generatedColors.color2
        }
        this.$emit('update:settings', newSettings)
      }

      this.showNotification('配色已应用', 'success')
      this.cancelGeneratedColors()
    },

    // 取消生成的配色
    cancelGeneratedColors() {
      this.generatedColors = null
      this.aiColorPrompt = ''
    },

    // AI生成高级渐变配色
    async generateAdvancedGradientColors() {
      if (!this.aiColorPrompt.trim()) {
        this.showNotification('请输入配色意象', 'warning')
        return
      }

      this.generatingColors = true
      this.generatedAdvancedColors = null

      try {
        const settings = this.storageManager.getSettings()
        const colorCount = this.settings.gradientColorCount || 3
        
        let colors

        if (settings.apiType === 'network') {
          colors = await this.aiService.generateAdvancedColorScheme(this.aiColorPrompt, colorCount, settings)
        } else {
          colors = await this.aiService.generateLocalAdvancedColorScheme(this.aiColorPrompt, colorCount)
        }

        this.generatedAdvancedColors = colors
        this.showNotification('配色生成成功', 'success')
      } catch (error) {
        console.error('生成高级配色失败:', error)
        this.showNotification(`生成配色失败: ${error.message}`, 'danger')
      } finally {
        this.generatingColors = false
      }
    },

    // 生成高级渐变预览
    generateAdvancedGradientPreview() {
      const direction = this.settings.gradientDirection || '135deg'
      const colors = this.generatedAdvancedColors || ['#ec4899', '#3b82f6', '#10b981']
      
      let cssDirection = direction
      if (direction === 'to-right') cssDirection = 'to right'
      else if (direction === 'to-left') cssDirection = 'to left'
      else if (direction === 'to-bottom') cssDirection = 'to bottom'
      else if (direction === 'to-top') cssDirection = 'to top'
      else if (direction === 'to-bottom-right') cssDirection = 'to bottom right'
      else if (direction === 'to-bottom-left') cssDirection = 'to bottom left'
      else if (direction === 'to-top-right') cssDirection = 'to top right'
      else if (direction === 'to-top-left') cssDirection = 'to top left'
      else if (direction === 'custom') cssDirection = `${this.settings.customGradientAngle || 135}deg`
      
      if (direction === 'radial') {
        return `radial-gradient(circle, ${colors.join(', ')})`
      } else {
        return `linear-gradient(${cssDirection}, ${colors.join(', ')})`
      }
    },

    // 应用生成的高级配色
    applyAdvancedGeneratedColors() {
      if (!this.generatedAdvancedColors) return

      const newSettings = {
        ...this.settings,
        advancedGradientColors: this.generatedAdvancedColors
      }
      
      this.gradientColors = this.generatedAdvancedColors
      this.$emit('update:settings', newSettings)
      
      this.showNotification('配色已应用', 'success')
      this.cancelAdvancedGeneratedColors()
    },

    // 取消生成的高级配色
    cancelAdvancedGeneratedColors() {
      this.generatedAdvancedColors = null
      this.aiColorPrompt = ''
    },

    resetToDefaults() {
      const defaultSettings = this.storageManager.getSettings()

      this.$emit('update:settings', {
        ...this.settings,
        autoTheme: false,
        theme: 'light',
        primaryColor: '#ec4899',
        secondaryColor: '#3b82f6',
        gradientColor1: '#ec4899',
        gradientColor2: '#3b82f6',
        fontFamily: 'system-ui',
        enableSecondaryFont: false,
        secondaryFontFamily: 'system-ui',
        fontSize: 'medium',
        borderRadius: 'medium',
        animationSpeed: 'normal',
        enableAnimations: true,
        messageBubbleStyle: 'default',
        chatLayout: 'standard',
        colorMode: 'single',
        enableShineEffect: true,
        shineColor: '#ec4899',
        shineSpeed: 'normal',
        dynamicIslandBorderWidth: 0,
        dynamicIslandBorderColor: '#ffffff',
        notificationBorderMode: 'none',
        notificationDuration: 3,
        modalBackdropBlur: true,
        modalBackdropBlurAmount: 8,
        modalBackdropOpacity: 0.5,
        enableMusicColorSync: false,
        enableMusicPlayerNotifications: true,
        enableDynamicIslandMusicInfo: true,
        enableDynamicIslandLyrics: false,
        themeColors: null
      })

      this.showNotification('已重置为默认样式', 'success')
    },

    showNotification(message, type) {
      this.$emit('notify', { message, type })
    },

    async loadSystemFonts() {
      this.loadingSystemFonts = true
      try {
        const fonts = await this.fontDetector.getSystemFonts()
        this.systemFonts = fonts
      } catch (error) {
        console.error('加载系统字体失败:', error)
        this.showNotification('加载系统字体失败', 'danger')
      } finally {
        this.loadingSystemFonts = false
      }
    },

    // 获取主字体预览样式
    getFontPreviewStyle() {
      let fontFamily = this.settings.fontFamily || 'system-ui'
      
      if (this.settings.enableSecondaryFont && this.settings.secondaryFontFamily) {
        if (this.settings.secondaryFontFamily !== fontFamily) {
          fontFamily = `${fontFamily}, ${this.settings.secondaryFontFamily}`
        }
      }
      
      return { fontFamily }
    },

    // 获取副字体预览样式
    getSecondaryFontPreviewStyle() {
      return { fontFamily: this.settings.secondaryFontFamily || 'system-ui' }
    }
  }
}
</script>

<style scoped>
/* 应用于组件顶级元素的样式 */
:deep(.settings-section:first-child) {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 16px;
  padding-left: 16px;
  width: 100%;
  min-width: 300px;
  box-sizing: border-box;
}

/* 隐藏滚动条但保留功能 */
:deep(.settings-section:first-child)::-webkit-scrollbar {
  width: 6px;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

:deep(.settings-section:first-child)::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* 隐藏父级模态框的滚动条 */
:deep(.modal-content) {
  overflow-y: hidden !important;
}

:deep(.modal-content .settings-section:first-child) {
  max-height: 65vh;
  min-width: 300px;
}

.settings-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* 主题分页标签 */
.theme-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 8px;
}

.theme-tab {
  padding: 8px 16px;
  border: none;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.theme-tab:hover {
  color: var(--primary-color);
  background: var(--bg-hover);
}

.theme-tab.active {
  color: var(--primary-color);
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--primary-color);
  margin-bottom: -10px;
}

.theme-tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 预制主题网格 */
.preset-themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.preset-theme-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-color);
}

.preset-theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preset-theme-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.preset-theme-preview {
  width: 100%;
  height: 100px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 8px;
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--preview-border);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
}

.preview-subtitle {
  font-size: 11px;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-card {
  width: 70%;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid;
  text-align: center;
}

.preview-card-text {
  font-size: 12px;
}

.preset-theme-info {
  padding: 8px;
  text-align: center;
}

.preset-theme-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 颜色选择器 */
.color-picker-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.color-presets {
  display: flex;
  gap: 8px;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid var(--border-color);
  transition: transform 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.1);
}

/* 选项按钮 */
.option-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.option-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.option-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 操作按钮 */
.settings-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 滑块样式 */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-value {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 字体选择器相关样式 */
.font-select-container {
  position: relative;
}

.font-loading-indicator {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--text-secondary);
  z-index: 10;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-text::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.font-preview {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 16px;
  color: var(--text-primary);
  text-align: center;
  transition: all var(--duration-fast) var(--ease-in-out);
}

.font-preview:hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* AI生成配色样式 */
.ai-color-generator {
  margin-top: 12px;
}

.ai-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-prompt-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.ai-prompt-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.ai-prompt-input::placeholder {
  color: var(--text-tertiary);
}

.ai-generate-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: var(--primary-color);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.ai-generate-btn:hover:not(:disabled) {
  background: var(--primary-color);
  opacity: 0.9;
  transform: translateY(-1px);
}

.ai-generate-btn:disabled {
  background: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
}

.ai-color-preview {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.preview-colors {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.preview-color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-color {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-gradient {
  width: 120px;
  height: 60px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gradient-color-codes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.color-code {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
}

.color-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-theme-colors {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-color-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.preview-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.apply-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.apply-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.cancel-btn {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--text-tertiary);
}

/* 高级渐变模式样式 */
.gradient-color-count {
  display: flex;
  align-items: center;
  gap: 16px;
}

.color-count-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-count-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-count-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.color-count-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.color-count-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.color-count-btn svg {
  transition: transform 0.2s ease;
}

.color-count-btn:hover:not(:disabled) svg {
  transform: scale(1.1);
}

.color-count-display {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-weight: 500;
}

.custom-angle-control {
  display: flex;
  align-items: center;
  gap: 16px;
}

.angle-display {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 50px;
  text-align: center;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-weight: 500;
}

.advanced-gradient-colors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gradient-color-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.gradient-color-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: center;
  font-weight: 500;
}

.gradient-preview-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gradient-preview {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gradient-css-code {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
}

.gradient-css-code code {
  background: none;
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preset-themes-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }

  .option-buttons {
    justify-content: center;
  }

  .ai-input-group {
    flex-direction: column;
  }

  .preview-colors {
    flex-direction: column;
    gap: 12px;
  }

  .preview-actions {
    flex-direction: column;
  }

  .color-count-controls {
    flex-direction: column;
    gap: 8px;
  }

  .gradient-color-item {
    flex-direction: column;
    text-align: center;
  }

  .color-label {
    min-width: auto;
  }
}
</style>