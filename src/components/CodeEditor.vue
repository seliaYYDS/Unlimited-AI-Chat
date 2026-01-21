<template>
  <div class="code-editor-wrapper">
    <div ref="editorContainer" class="code-editor-container"></div>
  </div>
</template>

<script>
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export default {
  name: 'CodeEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'dark'
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      editor: null
    }
  },
  mounted() {
    this.initEditor()
  },
  beforeUnmount() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
  watch: {
    modelValue(newValue) {
      if (this.editor && newValue !== this.editor.state.doc.toString()) {
        this.editor.dispatch({
          changes: { from: 0, to: this.editor.state.doc.length, insert: newValue }
        })
      }
    }
  },
  methods: {
    initEditor() {
      const extensions = [
        basicSetup,
        javascript({ jsx: true }),
        this.theme === 'dark' ? oneDark : null
      ].filter(Boolean)

      this.editor = new EditorView({
        doc: this.modelValue,
        extensions: [
          ...extensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.$emit('update:modelValue', update.state.doc.toString())
            }
          })
        ],
        parent: this.$refs.editorContainer
      })
    },
    getEditor() {
      return this.editor
    }
  }
}
</script>

<style scoped>
.code-editor-wrapper {
  width: 100%;
  height: 100%;
}

.code-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* CodeMirror 样式覆盖 */
:deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.cm-scroller) {
  overflow: auto;
}

:deep(.cm-content) {
  padding: 16px;
  font-family: 'Courier New', 'Fira Code', 'Consolas', monospace;
}

:deep(.cm-gutters) {
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

:deep(.cm-activeLineGutter) {
  background-color: var(--bg-hover);
}

:deep(.cm-activeLine) {
  background-color: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] :deep(.cm-activeLine) {
  background-color: rgba(255, 255, 255, 0.05);
}

:deep(.cm-cursor) {
  border-left-color: var(--primary-color);
}

:deep(.cm-selectionBackground) {
  background-color: rgba(236, 72, 153, 0.3);
}

:deep(.cm-focused .cm-selectionBackground) {
  background-color: rgba(236, 72, 153, 0.5);
}

/* 滚动条样式 */
:deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.cm-scroller::-webkit-scrollbar-track) {
  background: var(--bg-secondary);
}

:deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--border-color);
  border-radius: 4px;
}

:deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: var(--text-tertiary);
}
</style>