// Markdown 解析器 - 用于格式化AI输出内容
export class MarkdownParser {
    // 解析markdown文本为HTML
    static parse(markdown) {
        if (!markdown) return ''

        let html = markdown

        // 第一步：提取并保护代码块
        const codeBlocks = []
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length
            codeBlocks.push({
                lang: lang || '',
                code: code
            })
            return `__CODEBLOCK_${index}__`
        })

        // 第二步：提取并保护行内代码
        const inlineCodes = []
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const index = inlineCodes.length
            inlineCodes.push(code)
            return `__INLINECODE_${index}__`
        })

        // 第三步：处理表格
        html = this.parseTables(html)

        // 第四步：处理标题
        html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

        // 第五步：处理分割线
        html = html.replace(/^-{3,}$/gm, '<hr>')

        // 第六步：处理引用块
        html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

        // 第七步：处理列表
        html = this.parseLists(html)

        // 第八步：处理粗体和斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
        html = html.replace(/_(.+?)_/g, '<em>$1</em>')

        // 第九步：处理链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

        // 第十步：处理段落
        html = html.replace(/^([^<\n#*-].*?)(?=\n\n|\n*$)/gm, '<p>$1</p>')

        // 第十一步：恢复代码块
        codeBlocks.forEach((block, index) => {
            const escapedCode = this.escapeHtml(block.code)
            const langAttr = block.lang ? ` class="language-${block.lang}"` : ''
            const blockHtml = `<pre><code${langAttr}>${escapedCode}</code></pre>`
            const placeholder = new RegExp(`__CODEBLOCK_${index}__`, 'g')
            html = html.replace(placeholder, blockHtml)
        })

        // 第十二步：恢复行内代码
        inlineCodes.forEach((code, index) => {
            const escapedCode = this.escapeHtml(code)
            const inlineHtml = `<code>${escapedCode}</code>`
            const placeholder = new RegExp(`__INLINECODE_${index}__`, 'g')
            html = html.replace(placeholder, inlineHtml)
        })

        return html
    }

    // 转义HTML特殊字符
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
        const tableRegex = /(?:^|\n)((?:\|.*\|.*\n?)+)(?=\s*$|(?!\s*\|))/gm

        return html.replace(tableRegex, (fullMatch, tableContent) => {
            const lines = tableContent.trim().split('\n').filter(line => line.trim())

            if (lines.length < 2) return fullMatch

            const headerRow = lines[0]
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h)

            const bodyRows = lines.slice(2).filter(row => row && typeof row === 'string')
            const bodyCells = bodyRows.map(row =>
                row.split('|').map(cell => cell.trim()).filter(cell => cell)
            )

            let tableHtml = '<table>'

            if (headers.length > 0) {
                tableHtml += '<thead><tr>'
                headers.forEach(header => {
                    tableHtml += `<th>${this.escapeHtml(header)}</th>`
                })
                tableHtml += '</tr></thead>'
            }

            if (bodyCells.length > 0) {
                tableHtml += '<tbody>'
                bodyCells.forEach(row => {
                    if (Array.isArray(row)) {
                        tableHtml += '<tr>'
                        row.forEach(cell => {
                            tableHtml += `<td>${this.escapeHtml(cell)}</td>`
                        })
                        tableHtml += '</tr>'
                    }
                })
                tableHtml += '</tbody>'
            }

            tableHtml += '</table>'
            return tableHtml
        })
    }

    // 解析列表
    static parseLists(html) {
        let result = html

        const ulRegex = /(?:^|\n)([ \t]*[-*+][ \t]+.*(?:\n[ \t]*[-*+][ \t]+.*)*)/g
        result = result.replace(ulRegex, (match, listContent) => {
            const content = listContent.replace(/^\n+/, '')
            const lines = content.split('\n').filter(line => line.trim())
            let listHtml = '<ul>'
            lines.forEach(line => {
                const itemContent = line.replace(/^[ \t]*[-*+][ \t]+/, '').trim()
                listHtml += `<li>${this.escapeHtml(itemContent)}</li>`
            })
            listHtml += '</ul>'
            return '\n' + listHtml + '\n'
        })

        const olRegex = /(?:^|\n)([ \t]*\d+\.[ \t]+.*(?:\n[ \t]*\d+\.[ \t]+.*)*)/g
        result = result.replace(olRegex, (match, listContent) => {
            const content = listContent.replace(/^\n+/, '')
            const lines = content.split('\n').filter(line => line.trim())
            let listHtml = '<ol>'
            lines.forEach(line => {
                const itemContent = line.replace(/^[ \t]*\d+\.[ \t]+/, '').trim()
                listHtml += `<li>${this.escapeHtml(itemContent)}</li>`
            })
            listHtml += '</ol>'
            return '\n' + listHtml + '\n'
        })

        return result
    }

    // 检查是否包含markdown
    static containsMarkdown(text) {
        if (!text) return false

        const patterns = [
            /^#{1,6}\s+/,
            /\*\*.*\*\*/,
            /\*.*\*/,
            /```[\s\S]*```/,
            /`[^`]+`/,
            /^>\s+/,
            /^\s*[-*+]\s+/,
            /^\s*\d+\.\s+/,
            /\[.*\]\(.*\)/,
            /^---+$/,
            /\|.*\|.*\|/,
        ]

        return patterns.some(pattern => pattern.test(text))
    }

    // 渲染安全HTML
    static renderSafeHTML(html) {
        return html
    }

    // 格式化AI输出
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