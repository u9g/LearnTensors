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

        <p>I was working on LearnTensors' Python editor and noticed something bugging me: when you hover over a function like <code>torch.linear</code>, the tooltip shows the type signature as plain gray text. No syntax highlighting at all. In VS Code this just works, but standalone Monaco doesn't do it. So I started looking into how to fix that.</p>

        <h2>Turns out it's really hard</h2>
        <p>My first thought was to use <code>monaco.editor.colorize()</code>, which takes code and returns syntax-highlighted HTML. Simple enough. Except Monaco's hover widget runs everything through DOMPurify, and I quickly learned there are three layers of sanitization working against you.</p>

        <p>First, <code>colorize()</code> outputs HTML with CSS classes like <code>&lt;span class="mtk3"&gt;def&lt;/span&gt;</code>. The DOMPurify config strips all class attributes on spans unless they match <code>codicon codicon-*</code>. I found this by digging through Monaco's source at <code>vs/base/browser/markdownRenderer.js</code>:</p>
        <pre><code data-lang="javascript">if (e.attrName === 'class') {
  e.keepAttr = /^codicon codicon-[a-z\-]+( codicon-modifier-[a-z\-]+)?$/.test(e.attrValue);
  return;
}</code></pre>

        <p>So CSS classes are out. I switched to inline <code>style</code> attributes, but then hit the second wall: the sanitizer validates styles with a strict regex that only accepts hex colors with trailing semicolons. <code>style="color:rgb(86, 156, 214)"</code> gets stripped. <code>style="color:#569cd6;"</code> survives. Took me a while to figure out the semicolon was required too.</p>

        <h2>Building the colorizer</h2>
        <p>Since none of Monaco's built-in colorization APIs play nice with the hover widget, I built my own. The approach has two layers: Monarch tokens for base syntax colors, and semantic tokens from <a href="https://github.com/astral-sh/ruff" target="_blank">ty</a> (Astral's Python type checker, compiled to WASM) for the rich stuff.</p>

        <p>I start by parsing fenced code blocks out of the hover markdown and processing them separately:</p>
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

        <p>Then for each code block, I build a character-level color array. Every character position gets a hex color. First pass is Monarch tokenization for the basics (keywords, strings, numbers):</p>
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

        <h2>The semantic token layer</h2>
        <p>Monarch tokenization only gets you so far. It can't tell the difference between a function name, a parameter, a class, and a variable &mdash; they're all just <code>identifier</code>. This is where ty comes in. I open a temporary file in the ty WASM workspace with the hover code, get semantic tokens, and overlay them on top of the Monarch colors:</p>
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

        <p>I stumbled upon a fun problem here. The hover markdown uses abbreviated type names like <code>Tensor</code> instead of <code>torch.Tensor</code>. Since my temp file didn't have the right imports, ty saw <code>Tensor</code> as an unresolved variable and gave it the wrong color. The fix was to prepend the source file's imports <em>plus</em> wildcard imports for bare <code>import</code> statements:</p>
        <pre><code>for (const line of sourceLines) {
  const bare = line.match(/^\s*import (\S+)/);
  if (bare) {
    importLines.push(line);
    importLines.push(`from ${bare[1]} import *`);
  }
}</code></pre>
        <p>So if the editor has <code>import torch</code>, the temp file also gets <code>from torch import *</code>, which lets ty resolve <code>Tensor</code> as a class.</p>

        <h2>Putting it together</h2>
        <p>With the character color array built, I group consecutive same-color characters into spans with inline hex styles:</p>
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

        <p>Then the hover provider returns the colorized HTML with <code>supportHtml: true</code> and <code>isTrusted: true</code>:</p>
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

        <h2>One more gotcha</h2>
        <p>If you want to read the Monarch <code>mtk*</code> class colors at runtime instead of hardcoding them, you can scan the document's stylesheets. But <code>rule.style.color</code> returns <code>rgb()</code> format even if the CSS source uses hex, so you need a converter:</p>
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
        <pre><code>function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
  if (!m) return rgb;
  const hex = (n: string) =&gt; parseInt(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}</code></pre>

        <h2>What I learned</h2>
        <p>The whole thing boils down to two layers working together:</p>
        <table>
          <thead>
            <tr><th>Layer</th><th>Source</th><th>What it colors</th><th>Priority</th></tr>
          </thead>
          <tbody>
            <tr><td>Monarch tokenizer</td><td><code>monaco.editor.tokenize()</code></td><td>Keywords, operators, strings, numbers, delimiters</td><td>Base</td></tr>
            <tr><td>Semantic tokens</td><td>Language server / type checker</td><td>Functions, parameters, classes, variables, decorators</td><td>Override</td></tr>
          </tbody>
        </table>

        <p>The constraints worth remembering: hex colors only (not rgb), trailing semicolons required, wrap in <code>&lt;pre&gt;</code> for whitespace, no CSS classes (DOMPurify kills them), and set both <code>supportHtml</code> and <code>isTrusted</code> to <code>true</code>.</p>

        <p>All in all, a lot more work than I expected for what seems like a basic feature. But the result is hover tooltips that look just like VS Code. See the full implementation in <a href="https://github.com/u9g/LearnTensors/blob/main/src/composables/useTyChecker.ts" target="_blank">useTyChecker.ts</a>.</p>
      </article>

      <article v-else-if="slug === 'blog-code-block-colorization'">
        <h1>Getting VS Code-Quality Syntax Highlighting in Blog Code Blocks</h1>
        <div class="meta">March 22, 2026</div>

        <p>After building this engineering blog as a Vue SSR app on Cloudflare Pages, I looked at the code blocks and they were just... gray. Plain monospace text in a dark box. I'd just spent all this effort getting syntax highlighting into Monaco hover tooltips, and now the blog <em>about that work</em> had no code colors. So I decided to fix it.</p>

        <h2>First try: <code>colorize()</code></h2>
        <p>Monaco has a <code>colorize()</code> API that takes code and a language and gives you back highlighted HTML. Two lines of code:</p>
        <pre><code>const html = await monaco.editor.colorize(code, "typescript", { tabSize: 2 });
block.innerHTML = html;</code></pre>
        <p>This didn't really work. The HTML it returns uses CSS classes like <code>&lt;span class="mtk6"&gt;const&lt;/span&gt;</code>, and those classes kept breaking &mdash; Vue's scoped styles messed with the specificity, and every time Vite's HMR kicked in the colors disappeared. On top of that, the Monarch tokenizer behind <code>colorize()</code> treats every variable, function name, and type as the same gray <code>identifier</code> token. So even when it worked, the output was barely better than plain text.</p>

        <h2>Second try: <code>tokenize()</code> with inline styles</h2>
        <p>I switched to <code>monaco.editor.tokenize()</code>, which gives you raw token objects. Then I built a color map matching VS Code's Dark Modern palette and generated HTML with inline <code>style</code> attributes instead of relying on CSS classes:</p>
        <pre><code>const tokenColors: Record&lt;string, string&gt; = {
  "keyword": "#569cd6",
  "string": "#ce9178",
  "number": "#b5cea8",
  "comment": "#6a9955",
  "identifier": "#9cdcfe",
  "type.identifier": "#4ec9b0",
  // ...
};

for (let t = 0; t &lt; tokens.length; t++) {
  const rawType = tokens[t].type;
  const stripped = rawType.replace(/\.\w+$/, "");
  const color = tokenColors[rawType] ?? tokenColors[stripped] ?? defaultFg;
  html += `&lt;span style="color:${color};"&gt;${escapeHtml(text)}&lt;/span&gt;`;
}</code></pre>
        <p>This was way more reliable. Colors survived HMR, Vue scoping, SSR hydration, all of it. But it still looked flat compared to VS Code.</p>

        <h2>The HMR bug that drove me crazy</h2>
        <p>During development, I kept running into this thing where the code blocks would colorize perfectly on first load, then go completely gray after I saved any file. Took me a while to figure out what was going on.</p>
        <p>Turns out <code>monaco.editor.tokenize()</code> is synchronous. When Vite's HMR reloads the module, it creates a fresh Monaco instance where the language tokenizers haven't finished registering yet. Calling <code>tokenize()</code> at that point returns tokens with empty type strings, so everything falls back to the default gray.</p>
        <p>The fix was kind of funny: I call the <em>async</em> <code>colorize()</code> (the API I'd abandoned) on a dummy string first, just to wait for the tokenizer to be ready. Then the synchronous <code>tokenize()</code> works:</p>
        <pre><code>// Prime tokenizers before using synchronous tokenize()
await monaco.editor.colorize("x", "typescript", { tabSize: 2 });
await monaco.editor.colorize("x", "javascript", { tabSize: 2 });

// Now tokenize() will return real tokens
const tokens = monaco.editor.tokenize(code, lang);</code></pre>
        <p>I also had to stash the original source text in a <code>data-original</code> attribute, because if HMR re-ran the colorizer, <code>block.textContent</code> would read back the already-colorized HTML's text content, which Monaco couldn't tokenize properly:</p>
        <pre><code>if (!block.dataset.original) {
  block.dataset.original = block.textContent ?? "";
}
const text = block.dataset.original;</code></pre>

        <h2>Making it actually look like VS Code</h2>
        <p>With reliable tokenization in place, I still had the "everything is an identifier" problem. VS Code solves this with semantic tokens from the TypeScript language service, but I didn't want to spin up a full language server just for blog code blocks. So I used heuristics.</p>

        <p>For function calls, the logic is simple: if an identifier is immediately followed by <code>(</code>, it's a function call, color it yellow:</p>
        <pre><code>if (stripped === "identifier" &amp;&amp; t + 1 &lt; tokens.length) {
  const nextText = line.slice(tokens[t + 1].offset,
    t + 2 &lt; tokens.length ? tokens[t + 2].offset : line.length);
  if (nextText.startsWith("(")) rawType = "function";
}</code></pre>

        <p>For type annotations, I wanted <code>string</code> after a <code>:</code> to show as teal instead of keyword-blue. I initially tried tracking an <code>inTypeAnnotation</code> state flag, entering it on every <code>:</code>. This immediately broke ternary operators and object literals. The simpler approach: just look back one token and check if it was <code>:</code>:</p>
        <pre><code>const typeKeywords = new Set([
  "string", "number", "boolean", "any", "void",
  "never", "null", "undefined", "object", "unknown",
]);

if (stripped === "keyword" &amp;&amp; typeKeywords.has(text) &amp;&amp; prevText === ":") {
  rawType = "type";
}</code></pre>

        <p>And I added bracket pair colorization, cycling through gold, violet, and blue just like VS Code does:</p>
        <pre><code>const bracketColors = ["#ffd700", "#da70d6", "#179fff"];

if (ch in openBrackets) {
  const color = bracketColors[bracketDepth % bracketColors.length];
  bracketDepth++;
} else if (closeBrackets.has(ch)) {
  bracketDepth = Math.max(0, bracketDepth - 1);
  const color = bracketColors[bracketDepth % bracketColors.length];
}</code></pre>

        <h2>How it works with SSR</h2>
        <p>The blog is server-rendered for SEO, so code blocks initially ship as plain <code>&lt;pre&gt;&lt;code&gt;</code> with no colors. Monaco (~2MB) loads asynchronously after hydration and colorizes everything client-side. If you're on a slow connection or have JavaScript disabled, you still get readable monospace code. Everyone else gets the full syntax highlighting after a brief flash.</p>

        <h2>Where it stands</h2>
        <table>
          <thead>
            <tr><th>Feature</th><th>How</th></tr>
          </thead>
          <tbody>
            <tr><td>Base syntax colors</td><td>Monarch <code>tokenize()</code> + inline hex styles</td></tr>
            <tr><td>Function calls (yellow)</td><td>Identifier followed by <code>(</code></td></tr>
            <tr><td>Type annotations (teal)</td><td>Type keyword preceded by <code>:</code></td></tr>
            <tr><td>Bracket pairs (gold/violet/blue)</td><td>Depth counter across delimiter tokens</td></tr>
            <tr><td>HMR stability</td><td>Async <code>colorize()</code> primes sync <code>tokenize()</code></td></tr>
            <tr><td>SSR compatibility</td><td>Progressive enhancement, <code>data-original</code> cache</td></tr>
          </tbody>
        </table>

        <p>It's not pixel-identical to VS Code &mdash; I can't distinguish parameters from local variables without a real language server, and the function call detection is just a heuristic. But it's a huge improvement over gray monospace, and it all happens without bundling a TypeScript language server for the blog.</p>
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
