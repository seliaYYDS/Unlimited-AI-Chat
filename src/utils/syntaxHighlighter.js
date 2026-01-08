// 增强的语法高亮工具类
export class SyntaxHighlighter {
    // 语言关键字定义
    static keywords = {
        javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'super', 'static', 'get', 'set', 'yield'],
        typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'interface', 'type', 'enum', 'implements', 'private', 'public', 'protected', 'readonly', 'abstract', 'static', 'as', 'is', 'keyof', 'super', 'namespace', 'declare', 'module', 'global'],
        python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert', 'del', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None', 'async', 'await', 'match', 'case', 'type'],
        java: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'new', 'this', 'super', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'synchronized', 'volatile', 'transient', 'native', 'strictfp', 'instanceof', 'void', 'boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double', 'true', 'false', 'null', 'package', 'import', 'enum', 'var', 'yield', 'record', 'sealed', 'non-sealed', 'permits'],
        cpp: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'class', 'private', 'public', 'protected', 'template', 'typename', 'virtual', 'override', 'final', 'nullptr', 'true', 'false', 'bool', 'constexpr', 'decltype', 'noexcept', 'thread_local', 'alignas', 'alignof', 'static_assert', 'concept', 'requires', 'co_await', 'co_return', 'co_yield'],
        go: ['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var', 'true', 'false', 'nil', 'iota', 'go', 'defer', 'recover'],
        rust: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'for', 'while', 'loop', 'if', 'else', 'match', 'break', 'continue', 'return', 'where', 'use', 'mod', 'crate', 'pub', 'unsafe', 'extern', 'ref', 'move', 'type', 'self', 'Self', 'super', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'async', 'await', 'dyn', 'macro', 'become', 'box', 'union', 'impl', 'unsafe'],
        php: ['if', 'else', 'elseif', 'endif', 'for', 'endfor', 'foreach', 'endforeach', 'while', 'endwhile', 'do', 'switch', 'endswitch', 'case', 'break', 'continue', 'default', 'function', 'class', 'extends', 'interface', 'implements', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'const', 'return', 'require', 'require_once', 'include', 'include_once', 'new', 'clone', 'true', 'false', 'null', 'array', 'echo', 'print', 'die', 'exit', 'isset', 'empty', 'unset', 'list', 'global', 'namespace', 'use', 'trait', 'yield', 'finally', 'catch', 'throw'],
        ruby: ['def', 'class', 'module', 'end', 'if', 'else', 'elsif', 'unless', 'case', 'when', 'while', 'for', 'do', 'break', 'next', 'return', 'yield', 'begin', 'rescue', 'ensure', 'raise', 'retry', 'and', 'or', 'not', 'true', 'false', 'nil', 'self', 'super', 'alias', 'undef', 'defined', 'redo', 'BEGIN', 'END'],
        sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'UNION', 'ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'],
        bash: ['if', 'then', 'elif', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'local', 'export', 'unset', 'readonly', 'declare', 'typeset', 'shift', 'exit', 'break', 'continue', 'true', 'false', 'echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'cat', 'grep', 'sed', 'awk', 'sort', 'uniq', 'head', 'tail', 'test', 'select', 'until', 'time', 'exec', 'source', 'builtin'],
        json: ['true', 'false', 'null'],
        yaml: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
        xml: ['xml', 'version', 'encoding', 'DOCTYPE', 'ELEMENT', 'ATTLIST', 'ENTITY', 'NOTATION', 'SYSTEM', 'PUBLIC', 'NDATA']
    }

    // 内置函数/方法
    static builtins = {
        javascript: ['console', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'JSON', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'Symbol', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape', 'eval', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'alert', 'confirm', 'prompt', 'document', 'window', 'navigator', 'history', 'location', 'localStorage', 'sessionStorage'],
        python: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'delattr', 'open', 'input', 'sum', 'max', 'min', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'reduce', 'lambda', 'any', 'all', 'chr', 'ord', 'hex', 'oct', 'bin', 'format', 'join', 'split', 'strip', 'replace', 'find', 'index', 'count', 'append', 'extend', 'insert', 'remove', 'pop', 'sort', 'reverse', 'keys', 'values', 'items', 'get', 'update', 'popitem', 'clear', 'copy', 'setdefault', 'isalpha', 'isdigit', 'isalnum', 'isspace', 'lower', 'upper', 'title', 'capitalize', 'swapcase', 'startswith', 'endswith', 'find', 'rfind', 'count', 'replace', 'split', 'rsplit', 'strip', 'lstrip', 'rstrip', 'join', 'format', 'encode', 'decode'],
        java: ['System', 'out', 'println', 'print', 'String', 'Integer', 'Double', 'Float', 'Long', 'Short', 'Byte', 'Boolean', 'Character', 'Math', 'Arrays', 'Collections', 'List', 'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap', 'TreeSet', 'Iterator', 'Scanner', 'Random', 'Date', 'Calendar', 'SimpleDateFormat', 'Objects', 'Optional', 'Stream', 'Collectors'],
        cpp: ['std', 'cout', 'cin', 'endl', 'vector', 'string', 'map', 'set', 'pair', 'make_pair', 'sort', 'reverse', 'find', 'count', 'max', 'min', 'accumulate', 'transform', 'for_each', 'copy', 'fill', 'swap', 'push_back', 'pop_back', 'size', 'empty', 'clear', 'resize', 'capacity', 'begin', 'end', 'front', 'back', 'unique', 'merge', 'includes', 'set_union', 'set_intersection', 'set_difference', 'lower_bound', 'upper_bound'],
        go: ['fmt', 'Println', 'Printf', 'Print', 'Scanln', 'Scanf', 'Scan', 'len', 'cap', 'make', 'new', 'append', 'copy', 'delete', 'close', 'panic', 'recover', 'goroutine', 'channel', 'select', 'range', 'defer', 'go', 'import', 'package', 'main', 'init', 'nil', 'true', 'false', 'iota', 'os', 'io', 'bufio', 'strings', 'strconv', 'time', 'math', 'sort', 'errors', 'log', 'http', 'json', 'regexp'],
        rust: ['println', 'print', 'eprintln', 'eprint', 'vec', 'String', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'Box', 'Rc', 'Arc', 'Mutex', 'RwLock', 'Condvar', 'Barrier', 'Once', 'Cell', 'RefCell', 'panic', 'assert', 'debug_assert', 'unreachable', 'todo', 'unimplemented', 'std', 'println', 'print', 'dbg', 'eprintln', 'eprint', 'format', 'write', 'read', 'iter', 'into_iter', 'clone', 'copy', 'drop', 'size_hint'],
        php: ['echo', 'print', 'var_dump', 'print_r', 'count', 'strlen', 'strpos', 'str_replace', 'explode', 'implode', 'trim', 'ltrim', 'rtrim', 'substr', 'strtolower', 'strtoupper', 'ucfirst', 'lcfirst', 'ucwords', 'htmlspecialchars', 'htmlentities', 'strip_tags', 'addslashes', 'stripslashes', 'json_encode', 'json_decode', 'date', 'time', 'strtotime', 'mktime', 'file_get_contents', 'file_put_contents', 'fopen', 'fclose', 'fread', 'fwrite', 'is_file', 'is_dir', 'file_exists', 'unlink', 'mkdir', 'rmdir', 'scandir', 'glob', 'array', 'array_push', 'array_pop', 'array_shift', 'array_unshift', 'array_merge', 'array_keys', 'array_values', 'in_array', 'isset', 'empty', 'unset'],
        ruby: ['puts', 'print', 'p', 'gets', 'chomp', 'to_s', 'to_i', 'to_f', 'to_a', 'to_h', 'length', 'size', 'count', 'first', 'last', 'each', 'map', 'collect', 'select', 'reject', 'find', 'find_all', 'any', 'all', 'include', 'join', 'split', 'gsub', 'sub', 'scan', 'match', 'strip', 'chop', 'chomp', 'upcase', 'downcase', 'capitalize', 'swapcase', 'reverse', 'sort', 'shuffle', 'sample', 'min', 'max', 'sum', 'reduce', 'inject', 'times', 'upto', 'downto', 'step', 'loop', 'break', 'next', 'retry', 'redo', 'return', 'yield', 'require', 'require_relative', 'load', 'include', 'extend', 'module_eval', 'class_eval', 'instance_eval', 'define_method', 'alias_method', 'attr_reader', 'attr_writer', 'attr_accessor'],
        bash: ['echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'cat', 'grep', 'sed', 'awk', 'sort', 'uniq', 'head', 'tail', 'wc', 'cut', 'tr', 'date', 'sleep', 'test', '[', '[[', ']]', 'true', 'false', 'exit', 'return', 'shift', 'set', 'unset', 'export', 'readonly', 'declare', 'local', 'typeset', 'source', '.', 'eval', 'exec', 'trap', 'wait', 'kill', 'jobs', 'bg', 'fg', 'disown', 'nohup', 'seq', 'basename', 'dirname', 'readlink', 'realpath', 'stat', 'touch', 'chmod', 'chown', 'chgrp', 'ln', 'find', 'xargs', 'tar', 'gzip', 'gunzip', 'zip', 'unzip']
    }

    // 运算符定义
    static operators = {
        javascript: ['+', '-', '*', '/', '%', '++', '--', '+=', '-=', '*=', '/=', '%=', '=', '==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '=>', '?.', '??'],
        typescript: ['+', '-', '*', '/', '%', '++', '--', '+=', '-=', '*=', '/=', '%=', '=', '==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '=>', '?.', '??', 'as', 'in', 'instanceof', 'keyof', 'typeof', 'void'],
        python: ['+', '-', '*', '/', '//', '%', '**', '=', '+=', '-=', '*=', '/=', '//=', '%=', '**=', '==', '!=', '>', '<', '>=', '<=', 'and', 'or', 'not', '&', '|', '^', '~', '<<', '>>', '&=', '|=', '^=', '<<=', '>>=', 'is', 'is not', 'in', 'not in', '->', ':=', '@'],
        java: ['+', '-', '*', '/', '%', '++', '--', '+=', '-=', '*=', '/=', '%=', '=', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '<<=', '>>=', '>>>=', '&=', '|=', '^=', 'instanceof', '?', ':'],
        cpp: ['+', '-', '*', '/', '%', '++', '--', '+=', '-=', '*=', '/=', '%=', '=', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '<<=', '>>=', '&=', '|=', '^=', '->', '.*', '->*', '?:', 'new', 'delete', 'sizeof', 'typeid'],
        go: ['+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '&^', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '&^=', '&&', '||', '!', '<-', '++', '--', '==', '!=', '<', '<=', '>', '>=', ':=', '...', '->', '&'],
        rust: ['+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '&&', '||', '!', '==', '!=', '<', '<=', '>', '>=', '..', '..', '=>', '&', '*', '-', '!', '?', '->', '::', '@', 'as', '=>', '=>', '=>'],
        php: ['+', '-', '*', '/', '%', '.', '.=', '+=', '-=', '*=', '/=', '%=', '=', '==', '===', '!=', '!==', '<>', '<=>', '>', '<', '>=', '<=', '&&', 'and', '||', 'or', 'xor', '!', '&', '|', '^', '~', '<<', '>>', '++', '--', '->', '=>', '::', '?', '?:', '??'],
        ruby: ['+', '-', '*', '/', '%', '**', '=', '+=', '-=', '*=', '/=', '%=', '**=', '==', '===', '!=', '!~', '<=>', '>', '<', '>=', '<=', '&&', 'and', '||', 'or', 'not', '&', '|', '^', '~', '<<', '>>', '++', '--', '===', '==', '=~', '!~', '<=>', 'defined?', '=>', '::', '?', '?:', '..', '...'],
        sql: ['=', '!=', '<>', '<', '>', '<=', '>=', 'AND', 'OR', 'NOT', 'BETWEEN', 'LIKE', 'IN', 'IS', 'NULL', 'EXISTS', 'ALL', 'ANY', 'SOME', 'UNION', 'INTERSECT', 'EXCEPT', '+', '-', '*', '/', '%', '||', '&&', '!', '~', '|', '&', '^', '<<', '>>'],
        bash: ['+', '-', '*', '/', '%', '**', '=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '<', '>', '<<', '>>', '<<<', '<<', '>>', '<&', '>&', ';;', ';;&', '|&', '&', '|', ';', '&', '&&', '||', '!', '~']
    }

    // 高亮代码
    static highlight(code, language = '') {
        if (!code || !language) {
            return this.escapeHtml(code)
        }

        const lang = language.toLowerCase()
        
        // 使用令牌化方法进行更准确的高亮
        return this.tokenizeAndHighlight(code, lang)
    }

    // 令牌化并高亮
    static tokenizeAndHighlight(code, language) {
        const tokens = this.tokenize(code, language)
        let result = ''
        
        for (const token of tokens) {
            result += this.highlightToken(token, language)
        }
        
        return result
    }

    // 令牌化代码
    static tokenize(code, language) {
        const tokens = []
        let i = 0
        const len = code.length
        
        while (i < len) {
            // 检查注释
            const commentToken = this.consumeComment(code, i, language)
            if (commentToken) {
                tokens.push(commentToken)
                i += commentToken.value.length
                continue
            }
            
            // 检查字符串
            const stringToken = this.consumeString(code, i)
            if (stringToken) {
                tokens.push(stringToken)
                i += stringToken.value.length
                continue
            }
            
            // 检查数字
            const numberToken = this.consumeNumber(code, i)
            if (numberToken) {
                tokens.push(numberToken)
                i += numberToken.value.length
                continue
            }
            
            // 检查关键字
            const keywordToken = this.consumeKeyword(code, i, language)
            if (keywordToken) {
                tokens.push(keywordToken)
                i += keywordToken.value.length
                continue
            }
            
            // 检查内置函数
            const builtinToken = this.consumeBuiltin(code, i, language)
            if (builtinToken) {
                tokens.push(builtinToken)
                i += builtinToken.value.length
                continue
            }
            
            // 检查运算符
            const operatorToken = this.consumeOperator(code, i, language)
            if (operatorToken) {
                tokens.push(operatorToken)
                i += operatorToken.value.length
                continue
            }
            
            // 检查函数调用
            const functionToken = this.consumeFunctionCall(code, i)
            if (functionToken) {
                tokens.push(functionToken)
                i += functionToken.value.length
                continue
            }
            
            // 检查类名（大写开头的标识符）
            const classToken = this.consumeClassName(code, i)
            if (classToken) {
                tokens.push(classToken)
                i += classToken.value.length
                continue
            }
            
            // 检查标识符
            const identifierToken = this.consumeIdentifier(code, i)
            if (identifierToken) {
                tokens.push(identifierToken)
                i += identifierToken.value.length
                continue
            }
            
            // 其他字符
            tokens.push({ type: 'text', value: code[i] })
            i++
        }
        
        return tokens
    }

    // 消费注释
    static consumeComment(code, i, language) {
        const commentPatterns = {
            javascript: { single: '//', multi: { start: '/*', end: '*/' } },
            typescript: { single: '//', multi: { start: '/*', end: '*/' } },
            python: { single: '#', multi: { start: '"""', end: '"""' }, multi2: { start: "'''", end: "'''" } },
            java: { single: '//', multi: { start: '/*', end: '*/' } },
            cpp: { single: '//', multi: { start: '/*', end: '*/' } },
            go: { single: '//', multi: { start: '/*', end: '*/' } },
            rust: { single: '//', multi: { start: '/*', end: '*/' } },
            php: { single: '//', multi: { start: '/*', end: '*/' }, single2: '#' },
            ruby: { single: '#' },
            sql: { single: '--', multi: { start: '/*', end: '*/' } },
            bash: { single: '#' },
            yaml: { single: '#' }
        }

        const patterns = commentPatterns[language]
        if (!patterns) return null

        // 单行注释
        if (patterns.single && code.startsWith(patterns.single, i)) {
            let end = code.indexOf('\n', i)
            if (end === -1) end = code.length
            return { type: 'comment', value: code.slice(i, end) }
        }

        if (patterns.single2 && code.startsWith(patterns.single2, i)) {
            let end = code.indexOf('\n', i)
            if (end === -1) end = code.length
            return { type: 'comment', value: code.slice(i, end) }
        }

        // 多行注释
        if (patterns.multi && code.startsWith(patterns.multi.start, i)) {
            const end = code.indexOf(patterns.multi.end, i + patterns.multi.start.length)
            if (end !== -1) {
                return { type: 'comment', value: code.slice(i, end + patterns.multi.end.length) }
            }
        }

        if (patterns.multi2 && code.startsWith(patterns.multi2.start, i)) {
            const end = code.indexOf(patterns.multi2.end, i + patterns.multi2.start.length)
            if (end !== -1) {
                return { type: 'comment', value: code.slice(i, end + patterns.multi2.end.length) }
            }
        }

        return null
    }

    // 消费字符串
    static consumeString(code, i) {
        const char = code[i]
        
        if (char === '"' || char === "'" || char === '`') {
            let j = i + 1
            let escaped = false
            
            while (j < code.length) {
                if (escaped) {
                    escaped = false
                } else if (code[j] === '\\') {
                    escaped = true
                } else if (code[j] === char) {
                    return { type: 'string', value: code.slice(i, j + 1) }
                }
                j++
            }
            
            // 未闭合的字符串
            return { type: 'string', value: code.slice(i, j) }
        }
        
        return null
    }

    // 消费数字
    static consumeNumber(code, i) {
        if (!/\d/.test(code[i])) return null
        
        let j = i
        let hasDot = false
        let hasExponent = false
        
        // 十六进制
        if (code.startsWith('0x', i) || code.startsWith('0X', i)) {
            j = i + 2
            while (j < code.length && /[0-9a-fA-F]/.test(code[j])) {
                j++
            }
            return { type: 'number', value: code.slice(i, j) }
        }
        
        // 二进制
        if (code.startsWith('0b', i) || code.startsWith('0B', i)) {
            j = i + 2
            while (j < code.length && /[01]/.test(code[j])) {
                j++
            }
            return { type: 'number', value: code.slice(i, j) }
        }
        
        // 八进制
        if (code.startsWith('0o', i) || code.startsWith('0O', i)) {
            j = i + 2
            while (j < code.length && /[0-7]/.test(code[j])) {
                j++
            }
            return { type: 'number', value: code.slice(i, j) }
        }
        
        // 十进制
        while (j < code.length && /\d/.test(code[j])) {
            j++
        }
        
        // 小数部分
        if (j < code.length && code[j] === '.') {
            hasDot = true
            j++
            while (j < code.length && /\d/.test(code[j])) {
                j++
            }
        }
        
        // 指数部分
        if (j < code.length && (code[j] === 'e' || code[j] === 'E')) {
            hasExponent = true
            j++
            if (j < code.length && (code[j] === '+' || code[j] === '-')) {
                j++
            }
            while (j < code.length && /\d/.test(code[j])) {
                j++
            }
        }
        
        // 类型后缀（如 f, d, L 等）
        if (j < code.length && /[fFlL]/.test(code[j])) {
            j++
        }
        
        if (j > i) {
            return { type: 'number', value: code.slice(i, j) }
        }
        
        return null
    }

    // 消费关键字
    static consumeKeyword(code, i, language) {
        const keywords = this.keywords[language]
        if (!keywords) return null
        
        // 匹配标识符
        if (!/[a-zA-Z_]/.test(code[i])) return null
        
        let j = i
        while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) {
            j++
        }
        
        const word = code.slice(i, j)
        
        // 检查是否是关键字
        if (keywords.includes(word)) {
            return { type: 'keyword', value: word }
        }
        
        return null
    }

    // 消费内置函数
    static consumeBuiltin(code, i, language) {
        const builtins = this.builtins[language]
        if (!builtins) return null
        
        // 匹配标识符
        if (!/[a-zA-Z_]/.test(code[i])) return null
        
        let j = i
        while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) {
            j++
        }
        
        const word = code.slice(i, j)
        
        // 检查是否是内置函数
        if (builtins.includes(word)) {
            return { type: 'builtin', value: word }
        }
        
        return null
    }

    // 消费运算符
    static consumeOperator(code, i, language) {
        const operators = this.operators[language]
        if (!operators) return null
        
        // 按长度排序，优先匹配较长的运算符
        const sortedOperators = [...operators].sort((a, b) => b.length - a.length)
        
        for (const op of sortedOperators) {
            if (code.startsWith(op, i)) {
                return { type: 'operator', value: op }
            }
        }
        
        return null
    }

    // 消费函数调用
    static consumeFunctionCall(code, i) {
        if (!/[a-zA-Z_]/.test(code[i])) return null
        
        let j = i
        while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) {
            j++
        }
        
        const identifier = code.slice(i, j)
        
        // 检查后面是否有括号
        let k = j
        while (k < code.length && /\s/.test(code[k])) {
            k++
        }
        
        if (k < code.length && code[k] === '(') {
            return { type: 'function', value: identifier }
        }
        
        return null
    }

    // 消费类名
    static consumeClassName(code, i) {
        if (!/[A-Z]/.test(code[i])) return null
        
        let j = i
        while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) {
            j++
        }
        
        const identifier = code.slice(i, j)
        
        // 确保不是关键字
        const langKeywords = Object.values(this.keywords).flat()
        if (!langKeywords.includes(identifier)) {
            return { type: 'class', value: identifier }
        }
        
        return null
    }

    // 消费标识符
    static consumeIdentifier(code, i) {
        if (!/[a-zA-Z_]/.test(code[i])) return null
        
        let j = i
        while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) {
            j++
        }
        
        return { type: 'identifier', value: code.slice(i, j) }
    }

    // 高亮单个令牌
    static highlightToken(token, language) {
        const escapedValue = this.escapeHtml(token.value)
        
        switch (token.type) {
            case 'comment':
                return `<span class="syntax-comment">${escapedValue}</span>`
            case 'string':
                return `<span class="syntax-string">${escapedValue}</span>`
            case 'number':
                return `<span class="syntax-number">${escapedValue}</span>`
            case 'keyword':
                return `<span class="syntax-keyword">${escapedValue}</span>`
            case 'builtin':
                return `<span class="syntax-builtin">${escapedValue}</span>`
            case 'operator':
                return `<span class="syntax-operator">${escapedValue}</span>`
            case 'function':
                return `<span class="syntax-function">${escapedValue}</span>`
            case 'class':
                return `<span class="syntax-class">${escapedValue}</span>`
            case 'identifier':
                return `<span class="syntax-identifier">${escapedValue}</span>`
            default:
                return escapedValue
        }
    }

    // 转义HTML
    static escapeHtml(text) {
        if (!text) return ''
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }
}