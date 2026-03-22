/**
 * Integrates Astral's ty Python type checker (via WASM) with Monaco editor.
 * Provides diagnostics, hover, completions, inlay hints, signature help,
 * and semantic tokens.
 *
 * Keeps solution.py always in the workspace so test files can
 * `from solution import ...` and get full type checking.
 */
import type {
  Workspace,
  FileHandle,
  SemanticToken as SemanticTokenType,
} from "../ty_wasm/ty_wasm";
import {
  darkSemanticRules,
  lightSemanticRules,
} from "./darkModernTheme";

import torchInit from "../stubs/torch/__init__.pyi?raw";
import torchLinalg from "../stubs/torch/linalg.pyi?raw";
import torchNnInit from "../stubs/torch/nn/__init__.pyi?raw";
import torchNnFunctional from "../stubs/torch/nn/functional.pyi?raw";

const STUBS: [string, string][] = [
  ["torch/__init__.pyi", torchInit],
  ["torch/linalg/__init__.pyi", torchLinalg],
  ["torch/nn/__init__.pyi", torchNnInit],
  ["torch/nn/functional/__init__.pyi", torchNnFunctional],
];

let tyPromise: Promise<typeof import("../ty_wasm/ty_wasm")> | null = null;

async function loadTy() {
  if (!tyPromise) {
    tyPromise = (async () => {
      const ty = await import("../ty_wasm/ty_wasm");
      const wasmUrl = (await import("../ty_wasm/ty_wasm_bg.wasm?url")).default;
      await ty.default(wasmUrl);
      return ty;
    })();
  }
  return tyPromise;
}

export interface TyChecker {
  /** Switch the active file for providers. Opens the file if not already open. */
  switchFile(name: string, content: string): void;
  /** Update solution.py content (call when user edits on the solution tab) */
  updateSolution(code: string): void;
  dispose(): void;
}

export async function initTyChecker(
  monaco: any,
  editor: any,
  initialCode: string,
): Promise<TyChecker> {
  const ty = await loadTy();

  const workspace: Workspace = new ty.Workspace(
    "/",
    ty.PositionEncoding.Utf16,
    {},
  );
  // Load torch type stubs into the virtual filesystem
  for (const [path, content] of STUBS) {
    workspace.openFile(path, content);
  }

  // solution.py is always open so test files can import from it
  const solutionHandle: FileHandle = workspace.openFile(
    "solution.py",
    initialCode,
  );

  // Track open file handles (solution + any test files)
  const handles = new Map<string, FileHandle>();
  handles.set("solution.py", solutionHandle);

  // Active file = the one the editor is showing
  let activeHandle = solutionHandle;

  const model = editor.getModel();
  if (!model) {
    return { switchFile() {}, updateSolution() {}, dispose() {} };
  }

  const disposables: { dispose(): void }[] = [];

  // Severity enum values (from ty_wasm): Info=0, Warning=1, Error=2, Fatal=3
  function mapSeverity(severity: number): number {
    switch (severity) {
      case ty.Severity.Error:
      case ty.Severity.Fatal:
        return monaco.MarkerSeverity.Error;
      case ty.Severity.Warning:
        return monaco.MarkerSeverity.Warning;
      default:
        return monaco.MarkerSeverity.Info;
    }
  }

  // --- Diagnostics ---
  function updateDiagnostics() {
    try {
      const diagnostics = workspace.checkFile(activeHandle);
      const markers = diagnostics.map((d) => {
        const range = d.toRange(workspace);
        return {
          code: d.id(),
          message: d.message(),
          severity: mapSeverity(d.severity()),
          startLineNumber: range?.start?.line ?? 1,
          startColumn: range?.start?.column ?? 1,
          endLineNumber: range?.end?.line ?? 1,
          endColumn: range?.end?.column ?? 1,
        };
      });
      monaco.editor.setModelMarkers(model, "ty", markers);
    } catch (e) {
      console.warn("ty diagnostics error:", e);
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout>;
  let contentChangeEnabled = true;

  const contentDisposable = model.onDidChangeContent(() => {
    if (!contentChangeEnabled) return;
    workspace.updateFile(activeHandle, model.getValue());
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateDiagnostics, 300);
  });
  disposables.push(contentDisposable);

  updateDiagnostics();

  // --- Hover Provider ---
  function getSemanticColorMap(): Map<string, string> {
    const isDark = !document.documentElement.classList.contains("light-mode");
    const rules = isDark ? darkSemanticRules : lightSemanticRules;
    const map = new Map<string, string>();
    for (const r of rules) {
      map.set(r.token, "#" + r.foreground);
    }
    return map;
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rgbToHex(rgb: string): string {
    const m = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (!m) return rgb;
    const hex = (n: string) => parseInt(n).toString(16).padStart(2, "0");
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }

  function resolveMonarchColors(): Map<string, string> {
    const map = new Map<string, string>();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule) {
            const m = rule.selectorText.match(/^\.(mtk\d+)$/);
            if (m && rule.style.color) {
              map.set(m[1], rgbToHex(rule.style.color));
            }
          }
        }
      } catch {
        // cross-origin stylesheet, skip
      }
    }
    return map;
  }

  let hoverHandle: FileHandle | null = null;

  function colorizeWithSemanticTokens(code: string): string {
    const semColorMap = getSemanticColorMap();
    const tokenKinds = ty.SemanticToken.kinds();
    const isDark = !document.documentElement.classList.contains("light-mode");
    const defaultFg = isDark ? "#cccccc" : "#3b3b3b";

    // Extract import lines from the current file so ty can resolve types.
    // Also add wildcard imports for bare `import X` so ty can resolve
    // abbreviated names in hover (e.g. `Tensor` instead of `torch.Tensor`).
    const sourceLines = model.getValue().split("\n");
    const importLines: string[] = [];
    for (const l of sourceLines) {
      const bare = l.match(/^\s*import (\S+)/);
      if (bare) {
        importLines.push(l);
        importLines.push(`from ${bare[1]} import *`);
      } else if (/^\s*from \S+ import /.test(l)) {
        importLines.push(l);
      }
    }
    const importPrefix = importLines.length
      ? importLines.join("\n") + "\n"
      : "";
    const importLineCount = importLines.length;

    // Open/update a temp file in the ty workspace for semantic analysis
    const bodyCode = /^def\s/.test(code) ? code + "\n    ..." : code;
    const tempCode = importPrefix + bodyCode;
    if (hoverHandle) {
      workspace.updateFile(hoverHandle, tempCode);
    } else {
      hoverHandle = workspace.openFile("__hover__.py", tempCode);
    }

    // Get semantic tokens from ty
    let semTokens: SemanticTokenType[] = [];
    try {
      semTokens = workspace.semanticTokens(hoverHandle);
    } catch {
      // fall through with empty tokens
    }

    // Filter to only tokens in the hover code (after imports) and adjust line numbers
    const adjustedTokens = semTokens
      .filter((t) => t.range.start.line > importLineCount)
      .map((t) => ({
        kind: t.kind,
        modifiers: t.modifiers,
        startLine: t.range.start.line - importLineCount,
        startCol: t.range.start.column,
        endLine: t.range.end.line - importLineCount,
        endCol: t.range.end.column,
      }));
    // Build per-line semantic overlays: array of {start, end, color}
    const lineOverlays = new Map<
      number,
      { start: number; end: number; color: string }[]
    >();
    for (const t of adjustedTokens) {
      const kindName = tokenKinds[t.kind];
      const color = semColorMap.get(kindName);
      if (!color) continue;
      const line = t.startLine; // 1-based
      const start = t.startCol - 1; // 0-based
      const end = t.endCol - 1;
      if (!lineOverlays.has(line)) lineOverlays.set(line, []);
      lineOverlays.get(line)!.push({ start, end, color });
    }

    // Get Monarch tokens as base layer
    const monarchColors = resolveMonarchColors();
    const monarchLines = monaco.editor.tokenize(code, "python");

    const codeLines = code.split("\n");
    const htmlLines: string[] = [];

    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i];
      const lineNum = i + 1; // 1-based for ty
      const overlays = (lineOverlays.get(lineNum) || []).sort(
        (a, b) => a.start - b.start,
      );
      const mTokens = monarchLines[i] || [];

      // Build a color for each character position using Monarch as base
      const charColors: string[] = new Array(line.length).fill(defaultFg);

      // Apply Monarch token colors
      for (let t = 0; t < mTokens.length; t++) {
        const token = mTokens[t];
        const nextOffset =
          t + 1 < mTokens.length ? mTokens[t + 1].offset : line.length;
        // Map Monarch token type to mtk class color
        // tokenize returns type like "keyword.python" — we need to find
        // which mtk class it maps to. Use colorize for a single token instead.
        // Simpler: map known token types to theme colors directly.
        const color = getMonarchColor(token.type, monarchColors, isDark);
        if (color) {
          for (let c = token.offset; c < nextOffset; c++) {
            charColors[c] = color;
          }
        }
      }

      // Overlay semantic token colors (higher priority)
      for (const o of overlays) {
        for (let c = o.start; c < o.end && c < line.length; c++) {
          charColors[c] = o.color;
        }
      }

      // Build HTML by grouping consecutive same-color characters
      let html = "";
      let spanStart = 0;
      for (let c = 1; c <= line.length; c++) {
        if (c === line.length || charColors[c] !== charColors[spanStart]) {
          html += `<span style="color:${charColors[spanStart]};">${escapeHtml(line.slice(spanStart, c))}</span>`;
          spanStart = c;
        }
      }
      if (line.length === 0) html = "";
      htmlLines.push(html);
    }

    return htmlLines.join("\n");
  }

  function getMonarchColor(
    tokenType: string,
    _monarchColors: Map<string, string>,
    isDark: boolean,
  ): string | null {
    // Map Monarch token types to theme colors
    const base = tokenType.replace(/\.python$/, "");
    const darkMap: Record<string, string> = {
      keyword: "#569cd6",
      predefined: "#4ec9b0",
      identifier: "#cccccc",
      operator: "#d4d4d4",
      delimiter: "#cccccc",
      "delimiter.curly": "#cccccc",
      "delimiter.bracket": "#cccccc",
      "delimiter.parenthesis": "#cccccc",
      string: "#ce9178",
      "string.escape": "#d7ba7d",
      number: "#b5cea8",
      "number.hex": "#b5cea8",
      comment: "#6a9955",
      tag: "#dcdcaa",
      white: "",
    };
    const lightMap: Record<string, string> = {
      keyword: "#0000ff",
      predefined: "#267f99",
      identifier: "#3b3b3b",
      operator: "#000000",
      delimiter: "#3b3b3b",
      "delimiter.curly": "#3b3b3b",
      "delimiter.bracket": "#3b3b3b",
      "delimiter.parenthesis": "#3b3b3b",
      string: "#a31515",
      "string.escape": "#ee0000",
      number: "#098658",
      "number.hex": "#098658",
      comment: "#008000",
      tag: "#795e26",
      white: "",
    };
    const map = isDark ? darkMap : lightMap;
    return map[base] ?? map[tokenType] ?? null;
  }

  async function colorizeHoverMarkdown(md: string): Promise<string> {
    const parts: string[] = [];
    const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
    let last = 0;
    for (const m of md.matchAll(codeBlockRe)) {
      parts.push(md.slice(last, m.index!));
      const lang = m[1] || "python";
      const code = m[2].trimEnd();
      if (lang === "python") {
        parts.push(`<pre>${colorizeWithSemanticTokens(code)}</pre>`);
      } else {
        // Non-Python: use Monarch colorize with inline styles
        const monarchColors = resolveMonarchColors();
        const html = await monaco.editor.colorize(code, lang, { tabSize: 4 });
        parts.push(
          `<pre>${html.replace(
            /class="(mtk\w+)"/g,
            (_match: string, cls: string) => {
              const color = monarchColors.get(cls);
              return color ? `style="color:${color};"` : "";
            },
          )}</pre>`,
        );
      }
      last = m.index! + m[0].length;
    }
    if (parts.length === 0) return md;
    parts.push(md.slice(last));
    return parts.join("");
  }

  disposables.push(
    monaco.languages.registerHoverProvider("python", {
      async provideHover(_model: any, position: any) {
        try {
          const result = workspace.hover(
            activeHandle,
            new ty.Position(position.lineNumber, position.column),
          );
          if (!result) return null;
          const colorized = await colorizeHoverMarkdown(result.markdown);
          return {
            contents: [
              { value: colorized, supportHtml: true, isTrusted: true },
            ],
            range: {
              startLineNumber: result.range.start.line,
              startColumn: result.range.start.column,
              endLineNumber: result.range.end.line,
              endColumn: result.range.end.column,
            },
          };
        } catch {
          return null;
        }
      },
    }),
  );

  // --- Completion Provider ---
  disposables.push(
    monaco.languages.registerCompletionItemProvider("python", {
      triggerCharacters: ["."],
      provideCompletionItems(_model: any, position: any) {
        try {
          const completions = workspace.completions(
            activeHandle,
            new ty.Position(position.lineNumber, position.column),
          );
          if (!completions || completions.length === 0)
            return { suggestions: [] };
          const digitsLength = String(completions.length - 1).length;
          return {
            suggestions: completions.map((item, i) => ({
              label: item.name,
              sortText: String(i).padStart(digitsLength, "0"),
              kind:
                item.kind != null
                  ? mapCompletionKind(monaco, item.kind)
                  : monaco.languages.CompletionItemKind.Variable,
              insertText: item.name,
              range: undefined as any,
            })),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
  );

  // --- Inlay Hints Provider ---
  disposables.push(
    monaco.languages.registerInlayHintsProvider("python", {
      provideInlayHints(_model: any, range: any) {
        try {
          const tyRange = new ty.Range(
            new ty.Position(range.startLineNumber, range.startColumn),
            new ty.Position(range.endLineNumber, range.endColumn),
          );
          const hints = workspace.inlayHints(activeHandle, tyRange);
          if (!hints || hints.length === 0) return { hints: [], dispose() {} };
          return {
            hints: hints.map((h) => ({
              label: h.label.map((part) => part.label).join(""),
              position: {
                lineNumber: h.position.line,
                column: h.position.column,
              },
              kind: h.kind,
            })),
            dispose() {},
          };
        } catch {
          return { hints: [], dispose() {} };
        }
      },
    }),
  );

  // --- Signature Help Provider ---
  disposables.push(
    monaco.languages.registerSignatureHelpProvider("python", {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [")"],
      provideSignatureHelp(_model: any, position: any) {
        try {
          const result = workspace.signatureHelp(
            activeHandle,
            new ty.Position(position.lineNumber, position.column),
          );
          if (!result) return null;
          return {
            dispose() {},
            value: {
              signatures: result.signatures.map((sig) => ({
                label: sig.label,
                documentation: sig.documentation
                  ? { value: sig.documentation }
                  : undefined,
                parameters: sig.parameters.map((param) => ({
                  label: param.label,
                  documentation: param.documentation
                    ? { value: param.documentation }
                    : undefined,
                })),
                activeParameter: sig.active_parameter,
              })),
              activeSignature: result.active_signature ?? 0,
              activeParameter:
                result.active_signature != null
                  ? (result.signatures[result.active_signature]
                      ?.active_parameter ?? 0)
                  : 0,
            },
          };
        } catch {
          return null;
        }
      },
    }),
  );

  // --- Semantic Tokens Provider ---
  try {
    const legend = {
      tokenTypes: ty.SemanticToken.kinds(),
      tokenModifiers: ty.SemanticToken.modifiers(),
    };

    disposables.push(
      monaco.languages.registerDocumentSemanticTokensProvider("python", {
        getLegend() {
          return legend;
        },
        provideDocumentSemanticTokens(model: any) {
          try {
            const tokens = workspace.semanticTokens(activeHandle);
            return generateMonacoTokens(tokens, model);
          } catch {
            return null;
          }
        },
        releaseDocumentSemanticTokens() {},
      }),
    );
  } catch {
    // SemanticToken API may not be available in all ty_wasm builds
  }

  return {
    switchFile(name: string, content: string) {
      // Suppress content change listener during programmatic setValue
      contentChangeEnabled = false;

      if (name === "solution.py") {
        activeHandle = solutionHandle;
      } else {
        // Open or update the test file in the workspace
        let h = handles.get(name);
        if (h) {
          workspace.updateFile(h, content);
        } else {
          h = workspace.openFile(name, content);
          handles.set(name, h);
        }
        activeHandle = h;
      }

      updateDiagnostics();
      // Re-enable after a microtask (after Monaco processes the setValue)
      queueMicrotask(() => {
        contentChangeEnabled = true;
      });
    },

    updateSolution(code: string) {
      workspace.updateFile(solutionHandle, code);
    },

    dispose() {
      clearTimeout(debounceTimer);
      monaco.editor.setModelMarkers(model, "ty", []);
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}

function generateMonacoTokens(tokens: SemanticTokenType[], model: any) {
  const result: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of tokens) {
    // Convert from 1-based to 0-based for the delta encoding Monaco expects
    const line = token.range.start.line - 1;
    const char = token.range.start.column - 1;
    const length = model.getValueLengthInRange({
      startLineNumber: token.range.start.line,
      startColumn: token.range.start.column,
      endLineNumber: token.range.end.line,
      endColumn: token.range.end.column,
    });
    result.push(
      line - prevLine,
      prevLine === line ? char - prevChar : char,
      length,
      token.kind,
      token.modifiers,
    );
    prevLine = line;
    prevChar = char;
  }

  return { data: Uint32Array.from(result) };
}

function mapCompletionKind(monaco: any, kind: number): number {
  const K = monaco.languages.CompletionItemKind;
  const map: Record<number, number> = {
    0: K.Text,
    1: K.Method,
    2: K.Function,
    3: K.Constructor,
    4: K.Field,
    5: K.Variable,
    6: K.Class,
    7: K.Interface,
    8: K.Module,
    9: K.Property,
    10: K.Unit,
    11: K.Value,
    12: K.Enum,
    13: K.Keyword,
    14: K.Snippet,
    15: K.Color,
    16: K.File,
    17: K.Reference,
    18: K.Folder,
    19: K.EnumMember,
    20: K.Constant,
    21: K.Struct,
    22: K.Event,
    23: K.Operator,
    24: K.TypeParameter,
  };
  return map[kind] ?? K.Variable;
}
