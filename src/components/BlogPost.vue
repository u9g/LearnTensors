<script setup lang="ts">
import { onMounted } from "vue";
import {
  darkModernTheme,
  enhancePythonTokenizer,
} from "../composables/darkModernTheme";

defineProps<{ slug: string }>();

// Dark Modern color map for Monarch token types
const tokenColors: Record<string, string> = {
  "keyword": "#569cd6",
  "string": "#ce9178",
  "string.escape": "#d7ba7d",
  "number": "#b5cea8",
  "number.hex": "#b5cea8",
  "comment": "#6a9955",
  "delimiter": "#d4d4d4",
  "delimiter.curly": "#d4d4d4",
  "delimiter.bracket": "#d4d4d4",
  "delimiter.parenthesis": "#d4d4d4",
  "operator": "#d4d4d4",
  "predefined": "#dcdcaa",
  "function": "#dcdcaa",
  "tag": "#dcdcaa",
  "type": "#4ec9b0",
  "type.identifier": "#4ec9b0",
  "identifier": "#9cdcfe",
  "regexp": "#d16969",
};
const defaultFg = "#cccccc";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// VS Code bracket pair colorization colors
const bracketColors = ["#ffd700", "#da70d6", "#179fff"];
const typeKeywords = new Set(["string", "number", "boolean", "any", "void", "never", "null", "undefined", "object", "unknown", "bigint", "symbol"]);
const openBrackets: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const closeBrackets = new Set([")", "]", "}"]);

function colorizeBlock(
  code: string,
  lang: string,
  monaco: typeof import("monaco-editor"),
): string {
  const lines = code.split("\n");
  const tokenized = monaco.editor.tokenize(code, lang);
  const htmlLines: string[] = [];
  let bracketDepth = 0;
  let prevStripped = "";
  let prevText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tokens = tokenized[i] || [];
    if (line.length === 0) {
      htmlLines.push("");
      continue;
    }

    let lineHtml = "";
    for (let t = 0; t < tokens.length; t++) {
      const offset = tokens[t].offset;
      const nextOffset = t + 1 < tokens.length ? tokens[t + 1].offset : line.length;
      const text = line.slice(offset, nextOffset);
      if (text.length === 0) continue;

      // Strip language suffix (e.g. "keyword.ts" → "keyword")
      let rawType = tokens[t].type;
      const stripped = rawType.replace(/\.\w+$/, "");

      // Detect function calls: identifier immediately followed by "("
      if (stripped === "identifier" && t + 1 < tokens.length) {
        const nextText = line.slice(tokens[t + 1].offset, t + 2 < tokens.length ? tokens[t + 2].offset : line.length);
        if (nextText.startsWith("(")) rawType = "function";
      }

      // Color type keywords teal when they follow ":" (type annotation position)
      if (stripped === "keyword" && typeKeywords.has(text) && prevText === ":") {
        rawType = "type";
      }

      if (stripped !== "" && text.trim()) {
        prevStripped = stripped;
        prevText = text;
      }

      // Bracket pair colorization
      if (stripped.startsWith("delimiter")) {
        let bracketHtml = "";
        for (const ch of text) {
          if (ch in openBrackets) {
            const color = bracketColors[bracketDepth % bracketColors.length];
            bracketHtml += `<span style="color:${color};">${ch}</span>`;
            bracketDepth++;
          } else if (closeBrackets.has(ch)) {
            bracketDepth = Math.max(0, bracketDepth - 1);
            const color = bracketColors[bracketDepth % bracketColors.length];
            bracketHtml += `<span style="color:${color};">${ch}</span>`;
          } else {
            const color = tokenColors[rawType] ?? tokenColors[stripped] ?? defaultFg;
            bracketHtml += `<span style="color:${color};">${escapeHtml(ch)}</span>`;
          }
        }
        lineHtml += bracketHtml;
        continue;
      }

      const color = tokenColors[rawType] ?? tokenColors[stripped] ?? defaultFg;
      lineHtml += `<span style="color:${color};">${escapeHtml(text)}</span>`;
    }
    htmlLines.push(lineHtml);
  }

  return htmlLines.join("\n");
}

onMounted(async () => {
  try {
    const [monaco, editorWorker] = await Promise.all([
      import("monaco-editor"),
      import("monaco-editor/esm/vs/editor/editor.worker?worker"),
    ]);

    self.MonacoEnvironment = {
      getWorker: () => new editorWorker.default(),
    };

    monaco.editor.defineTheme("dark-modern", darkModernTheme as any);
    monaco.editor.setTheme("dark-modern");
    enhancePythonTokenizer(monaco);

    // Wait for TypeScript language to be ready before tokenizing
    // colorize() internally waits for the tokenizer; we use it once to prime it
    await monaco.editor.colorize("x", "typescript", { tabSize: 2 });
    await monaco.editor.colorize("x", "javascript", { tabSize: 2 });

    const blocks = document.querySelectorAll<HTMLElement>("article pre > code");
    for (const block of blocks) {
      if (!block.dataset.original) {
        block.dataset.original = block.textContent ?? "";
      }
      const text = block.dataset.original;
      const lang = block.dataset.lang ?? "typescript";
      block.innerHTML = colorizeBlock(text, lang, monaco);
    }
  } catch (e) {
    console.error("blog colorize failed:", e);
  }
});
</script>

<template>
  <div class="blog">
    <div class="blog-content">
      <div class="back"><a href="/blog/">&larr; All posts</a></div>
      <article v-if="slug === 'monaco-hover-syntax-highlighting'">
        <h1>Syntax-Highlighted Hover Tooltips in Monaco Editor</h1>
        <div class="meta">March 22, 2026</div>

        <p>Monaco's hover widget renders markdown from <code>registerHoverProvider</code>, but <strong>does not syntax-highlight fenced code blocks</strong> in standalone mode. This post explains how we added full syntax highlighting (including semantic tokens) to hover tooltips in LearnTensors.</p>

        <h2>The Problem</h2>
        <p>Monaco's hover widget renders <code>IMarkdownString</code> content. When a hover provider returns markdown with fenced code blocks, the code renders as plain monospace text with no colors. VS Code handles this internally, but standalone Monaco does not.</p>

        <h2>Why It's Hard</h2>
        <p>Three obstacles prevent straightforward approaches:</p>

        <h3>1. <code>monaco.editor.colorize()</code> uses CSS classes, not inline styles</h3>
        <p><code>colorize()</code> returns HTML like <code>&lt;span class="mtk3"&gt;def&lt;/span&gt;</code>. These <code>mtk*</code> classes are generated by Monaco's theme engine and work in the editor, but...</p>

        <h3>2. Monaco's DOMPurify sanitizer strips most class attributes</h3>
        <p>The hover widget runs all HTML through DOMPurify. The sanitizer only preserves <code>class</code> on <code>&lt;span&gt;</code> if it matches <code>codicon codicon-*</code>. All other classes are removed, so <code>mtk3</code> gets stripped.</p>
        <p>From Monaco's source at <code>vs/base/browser/markdownRenderer.js</code>:</p>
        <pre><code data-lang="javascript">if (e.attrName === 'class') {
  e.keepAttr = /^codicon codicon-[a-z\-]+( codicon-modifier-[a-z\-]+)?$/.test(e.attrValue);
  return;
}</code></pre>

        <h3>3. The sanitizer only allows hex colors in <code>style</code> attributes</h3>
        <p>Even with <code>supportHtml: true</code>, the <code>style</code> attribute on <code>&lt;span&gt;</code> elements is validated against a strict regex. <code>style="color:rgb(86, 156, 214)"</code> is <strong>stripped</strong>, but <code>style="color:#569cd6;"</code> is kept. The trailing semicolon is required.</p>

        <h2>The Solution</h2>
        <p>Our approach has two layers: a Monarch tokenizer for base syntax colors, and semantic tokens for rich type-aware colors.</p>

        <h3>Step 1: Parse Fenced Code Blocks from Hover Markdown</h3>
        <p>The hover provider returns markdown from the language server. Extract fenced code blocks and process them separately:</p>
        <pre><code>async function colorizeHoverMarkdown(md: string): Promise&lt;string&gt; {
  const parts: string[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  for (const m of md.matchAll(codeBlockRe)) {
    parts.push(md.slice(last, m.index!));
    const code = m[2].trimEnd();
    parts.push(`&lt;pre&gt;${colorizeCode(code)}&lt;/pre&gt;`);
    last = m.index! + m[0].length;
  }
  if (parts.length === 0) return md;
  parts.push(md.slice(last));
  return parts.join("");
}</code></pre>
        <p>Wrapping in <code>&lt;pre&gt;</code> preserves whitespace. Both <code>&lt;pre&gt;</code> and <code>&lt;span&gt;</code> are in Monaco's allowed HTML tags list.</p>

        <h3>Step 2: Build a Character-Level Color Array</h3>
        <p>For each line, assign a color to every character position. Start with Monarch tokens as the base layer:</p>
        <pre><code>const monarchLines = monaco.editor.tokenize(code, "python");

for (let i = 0; i &lt; codeLines.length; i++) {
  const line = codeLines[i];
  const charColors: string[] = new Array(line.length).fill(defaultFg);
  const mTokens = monarchLines[i] || [];

  for (let t = 0; t &lt; mTokens.length; t++) {
    const token = mTokens[t];
    const nextOffset = t + 1 &lt; mTokens.length
      ? mTokens[t + 1].offset : line.length;
    const color = monarchColorMap[token.type];
    if (color) {
      for (let c = token.offset; c &lt; nextOffset; c++) {
        charColors[c] = color;
      }
    }
  }
}</code></pre>
        <p><code>monaco.editor.tokenize()</code> returns token type strings like <code>"keyword.python"</code>, <code>"identifier.python"</code>, etc. You need a manual mapping from these type strings to hex colors matching your theme.</p>

        <h3>Step 3: Overlay Semantic Tokens</h3>
        <p>Monarch tokenization only gives basic syntax colors. Semantic tokens from a language server distinguish functions, parameters, classes, variables, etc. If you have a language server or type checker (like ty for Python), get semantic tokens for the hover code:</p>
        <pre><code>// Open a temp file with the hover code
const tempCode = importPrefix + hoverCode;
workspace.updateFile(tempHandle, tempCode);
const semTokens = workspace.semanticTokens(tempHandle);

// Overlay semantic colors (higher priority than Monarch)
for (const token of semTokens) {
  const color = semanticColorMap.get(tokenKindName);
  if (color) {
    for (let c = token.start; c &lt; token.end; c++) {
      charColors[c] = color;
    }
  }
}</code></pre>

        <p><strong>Key detail for type resolution:</strong> Hover markdown often uses abbreviated type names (e.g. <code>Tensor</code> instead of <code>torch.Tensor</code>). For the language server to resolve these in the temp file, prepend the source file's imports <em>plus</em> wildcard imports for bare <code>import X</code> statements:</p>
        <pre><code>for (const line of sourceLines) {
  const bare = line.match(/^\s*import (\S+)/);
  if (bare) {
    importLines.push(line);
    importLines.push(`from ${bare[1]} import *`);
  }
}</code></pre>
        <p>Without this, the language server sees <code>Tensor</code> as an unresolved variable instead of a class, and it gets the wrong color.</p>

        <h3>Step 4: Build HTML with Inline Hex Colors</h3>
        <p>Group consecutive same-color characters into spans with inline styles:</p>
        <pre><code>let html = "";
let spanStart = 0;
for (let c = 1; c &lt;= line.length; c++) {
  if (c === line.length || charColors[c] !== charColors[spanStart]) {
    html += `&lt;span style="color:${charColors[spanStart]};"&gt;`
      + escapeHtml(line.slice(spanStart, c))
      + "&lt;/span&gt;";
    spanStart = c;
  }
}</code></pre>
        <p>Colors <strong>must</strong> be hex format with a trailing semicolon (<code>color:#569cd6;</code>). RGB format is rejected by the sanitizer.</p>

        <h3>Step 5: Return with <code>supportHtml: true</code></h3>
        <pre><code>monaco.languages.registerHoverProvider("python", {
  async provideHover(_model, position) {
    const result = languageServer.hover(position);
    if (!result) return null;
    const colorized = await colorizeHoverMarkdown(result.markdown);
    return {
      contents: [{ value: colorized, supportHtml: true, isTrusted: true }],
      range: { ... },
    };
  },
});</code></pre>
        <p>Both <code>supportHtml</code> and <code>isTrusted</code> must be <code>true</code>. The provider can be <code>async</code> &mdash; Monaco accepts <code>Thenable</code> returns from <code>provideHover</code>.</p>

        <h2>Reading Monarch Token Colors at Runtime</h2>
        <p>If you want to read the actual <code>mtk*</code> class colors from the active theme instead of hardcoding them, scan the document's stylesheets:</p>
        <pre><code>function resolveMonarchColors(): Map&lt;string, string&gt; {
  const map = new Map&lt;string, string&gt;();
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const m = rule.selectorText.match(/^\.(mtk\d+)$/);
          if (m &amp;&amp; rule.style.color) {
            map.set(m[1], rgbToHex(rule.style.color));
          }
        }
      }
    } catch {} // skip cross-origin sheets
  }
  return map;
}</code></pre>
        <p>Note that <code>rule.style.color</code> returns <code>rgb()</code> format even if the original CSS uses hex, so you need to convert:</p>
        <pre><code>function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
  if (!m) return rgb;
  const hex = (n: string) =&gt; parseInt(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}</code></pre>

        <h2>Summary</h2>
        <table>
          <thead>
            <tr><th>Layer</th><th>Source</th><th>What it colors</th><th>Priority</th></tr>
          </thead>
          <tbody>
            <tr><td>Monarch tokenizer</td><td><code>monaco.editor.tokenize()</code></td><td>Keywords, operators, strings, numbers, delimiters</td><td>Base</td></tr>
            <tr><td>Semantic tokens</td><td>Language server / type checker</td><td>Functions, parameters, classes, variables, decorators</td><td>Override</td></tr>
          </tbody>
        </table>

        <p>The key constraints to remember:</p>
        <ul>
          <li>Use <strong>hex colors</strong> with <strong>trailing semicolons</strong> in <code>style</code> attributes</li>
          <li>Wrap code in <code>&lt;pre&gt;</code> to preserve whitespace</li>
          <li>Set both <code>supportHtml: true</code> and <code>isTrusted: true</code></li>
          <li>Don't use CSS classes &mdash; they get stripped by DOMPurify</li>
          <li>Don't use <code>rgb()</code> colors &mdash; they get stripped by the style validator</li>
        </ul>

        <p>See the full implementation in <a href="https://github.com/u9g/LearnTensors/blob/main/src/composables/useTyChecker.ts" target="_blank">useTyChecker.ts</a>.</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.blog {
  background-color: #1a1a1a;
  min-height: calc(100vh - 50px);
  padding: 0;
}

.blog-content {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #d4d4d4;
}

.back {
  margin-bottom: 24px;
}

.back a {
  color: #888;
  text-decoration: none;
  font-size: 14px;
}

.back a:hover {
  color: #f5f5f5;
}

article h1 {
  color: #f5f5f5;
  font-size: 28px;
  margin-bottom: 4px;
}

.meta {
  color: #888;
  font-size: 14px;
  margin-bottom: 32px;
}

article h2 {
  color: #f5f5f5;
  font-size: 22px;
  margin: 32px 0 12px;
}

article h3 {
  color: #f5f5f5;
  font-size: 17px;
  margin: 24px 0 8px;
}

article p {
  margin-bottom: 16px;
  line-height: 1.7;
}

article code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 85%;
  color: #e6e6e6;
}

article pre {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
  line-height: 1.5;
}

article pre code {
  background: none;
  padding: 0;
  font-size: 14px;
}

article table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

article th, article td {
  border: 1px solid #333;
  padding: 8px 12px;
  text-align: left;
  font-size: 14px;
}

article th {
  background: #2d2d2d;
  color: #f5f5f5;
}

article ul {
  margin-bottom: 16px;
  padding-left: 24px;
}

article li {
  margin-bottom: 6px;
  line-height: 1.7;
}

article strong {
  color: #f5f5f5;
}

article a {
  color: #58a6ff;
  text-decoration: none;
}

article a:hover {
  text-decoration: underline;
}

article em {
  font-style: italic;
  color: #c9c9c9;
}
</style>
