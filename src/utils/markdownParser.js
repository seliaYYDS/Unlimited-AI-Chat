// Markdown 解析器 - 用于格式化AI输出内容
export class MarkdownParser {
    // 解析markdown文本为HTML
    static parse(markdown) {
        if (!markdown) return ''

        let html = markdown

        // 在解析markdown前，先处理代码块，避免内部内容被误解析
        const codeBlocks = []
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
            codeBlocks.push(`<pre><code>${this.escapeHtml(code.trim())}</code></pre>`)
            return placeholder
        })

        // 处理行内代码，避免在其他解析中被误处理
        const inlineCodes = []
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const placeholder = `__INLINE_CODE_${inlineCodes.length}__`
            inlineCodes.push(`<code>${this.escapeHtml(code.trim())}</code>`)
            return placeholder
        })

        // 处理表格 - 必须在其他处理之前
        html = this.parseTables(html)

        // 处理标题
        html = html.replace(/^###(.+)$/gm, '<h3>$1</h3>')
        html = html.replace(/^##(.+)$/gm, '<h2>$1</h2>')
        html = html.replace(/^#(.+)$/gm, '<h1>$1</h1>')

        // 处理粗体
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

        // 处理斜体
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
        html = html.replace(/_(.+?)_/g, '<em>$1</em>')

        // 处理粗斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        html = html.replace(/___(.+?)___/g, '<em><strong>$1</strong></em>')

        // 处理分割线
        html = html.replace(/^---+$/gm, '<hr>')

        // 处理引用块
        html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')

        // 处理列表 - 改进的列表处理
        html = this.parseLists(html)

        // 处理链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

        // 处理段落 - 将连续的非空行视为段落
        html = html.replace(/^([^<\n#*-].*?)(?=\n\n|\n*$)/gm, '<p>$1</p>')

        // 恢复代码块
        codeBlocks.forEach((block, index) => {
            html = html.replace(`__CODE_BLOCK_${index}__`, block)
        })

        // 恢复行内代码
        inlineCodes.forEach((code, index) => {
            html = html.replace(`__INLINE_CODE_${index}__`, code)
        })

        return html
    }

    // 转义HTML特殊字符，防止XSS
    static escapeHtml(text) {
        if (!text) return ''
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }

    // 解析表格
    static parseTables(html) {
        // 匹配表格模式 - 改进的表格匹配，支持作为最后一行的表格
        const tableRegex = /(?:^|\n)((?:\|.*\|.*\n?)+)(?=\s*$|(?!\s*\|))/gm

        return html.replace(tableRegex, (fullMatch, tableContent) => {
            const lines = tableContent.trim().split('\n').filter(line => line.trim())

            if (lines.length < 2) return fullMatch // 至少需要表头和分隔线

            // 解析表头
            const headerRow = lines[0]
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h)

            // 解析分隔行（第二行）
            const separatorRow = lines[1]
            const separators = separatorRow.split('|').map(h => h.trim()).filter(h => h)

            // 解析表格主体（从第三行开始）
            const bodyRows = lines.slice(2)
            const bodyCells = bodyRows.map(row =>
                row.split('|').map(cell => cell.trim()).filter(cell => cell)
            )

            // 构建HTML表格
            let tableHtml = '<table>'

            // 表头
            if (headers.length > 0) {
                tableHtml += '<thead><tr>'
                headers.forEach(header => {
                    tableHtml += `<th>${this.escapeHtml(header)}</th>`
                })
                tableHtml += '</tr></thead>'
            }

            // 表体
            if (bodyCells.length > 0) {
                tableHtml += '<tbody>'
                bodyCells.forEach(row => {
                    tableHtml += '<tr>'
                    row.forEach(cell => {
                        tableHtml += `<td>${this.escapeHtml(cell)}</td>`
                    })
                    tableHtml += '</tr>'
                })
                tableHtml += '</tbody>'
            }

            tableHtml += '</table>'
            return tableHtml
        })
    }

    // 解析列表 - 改进的列表处理
    static parseLists(html) {
        let result = html

        // 处理无序列表 - 改进的正则表达式，支持更灵活的空格和内容
        const ulRegex = /(?:^|\n)([ \t]*[-*+][ \t]+.*(?:\n[ \t]*[-*+][ \t]+.*)*)/g
        result = result.replace(ulRegex, (match, listContent) => {
            // 移除开头的换行符
            const content = listContent.replace(/^\n+/, '')
            const lines = content.split('\n').filter(line => line.trim())
            let listHtml = '<ul>'
            lines.forEach(line => {
                const content = line.replace(/^[ \t]*[-*+][ \t]+/, '').trim()
                // 递归处理嵌套内容 - 检查是否已经包含HTML标签，避免重复处理
                let processedContent = content;
                // 如果内容中已经包含HTML标签，则不再进行markdown处理
                if (!/<[^>]+>/.test(content)) {
                    processedContent = this.parseInlineMarkdown(content)
                }
                listHtml += `<li>${processedContent}</li>`
            })
            listHtml += '</ul>'
            return '\n' + listHtml + '\n'
        })

        // 处理有序列表 - 改进的正则表达式
        const olRegex = /(?:^|\n)([ \t]*\d+\.[ \t]+.*(?:\n[ \t]*\d+\.[ \t]+.*)*)/g
        result = result.replace(olRegex, (match, listContent) => {
            // 移除开头的换行符
            const content = listContent.replace(/^\n+/, '')
            const lines = content.split('\n').filter(line => line.trim())
            let listHtml = '<ol>'
            lines.forEach(line => {
                const content = line.replace(/^[ \t]*\d+\.[ \t]+/, '').trim()
                // 递归处理嵌套内容 - 检查是否已经包含HTML标签，避免重复处理
                let processedContent = content;
                // 如果内容中已经包含HTML标签，则不再进行markdown处理
                if (!/<[^>]+>/.test(content)) {
                    processedContent = this.parseInlineMarkdown(content)
                }
                listHtml += `<li>${processedContent}</li>`
            })
            listHtml += '</ol>'
            return '\n' + listHtml + '\n'
        })

        return result
    }

    // 解析行内markdown格式（用于列表项内容）
    static parseInlineMarkdown(text) {
        if (!text) return ''

        // 先处理markdown标记，然后再转义剩余的HTML特殊字符
        let result = text

        // 处理粗斜体（需要在粗体和斜体之前处理）
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')

        // 处理粗体
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')

        // 处理斜体
        result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
        result = result.replace(/_(.+?)_/g, '<em>$1</em>')

        // 处理行内代码
        result = result.replace(/`(.+?)`/g, '<code>$1</code>')

        // 处理链接
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

        // 最后转义剩余的HTML特殊字符
        result = this.escapeHtml(result)

        return result
    }

    // 检查文本是否包含markdown格式
    static containsMarkdown(text) {
        if (!text) return false

        const markdownPatterns = [
            /^#{1,6}\s+/, // 标题
            /\*\*.*\*\*/, // 粗体
            /\*.*\*/,     // 斜体
            /```[\s\S]*```/, // 代码块
            /`[^`]+`/,    // 行内代码
            /^>\s+/,      // 引用
            /^\s*[-*]\s+/, // 无序列表
            /^\s*\d+\.\s+/, // 有序列表
            /\[.*\]\(.*\)/, // 链接
            /^---+$/,       // 分割线
            /\|.*\|.*\|/,  // 表格
            /^\s*[-*+]\s+/, // 无序列表项
            /^\s*\d+\.\s+/  // 有序列表项
        ]

        return markdownPatterns.some(pattern => pattern.test(text))
    }

    // 安全地渲染HTML内容
    static renderSafeHTML(html) {
        // 这里可以添加更多的安全过滤逻辑
        return html
    }

    // 格式化AI输出内容
    static formatAIOutput(text, enableFormatting = true) {
        if (!enableFormatting) {
            return text
        }

        if (this.containsMarkdown(text)) {
            return this.renderSafeHTML(this.parse(text))
        }

        return text
    }
}