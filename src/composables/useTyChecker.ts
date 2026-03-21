/**
 * Integrates Astral's ty Python type checker (via WASM) with Monaco editor.
 * Provides diagnostics, hover, completions, inlay hints, signature help,
 * and semantic tokens.
 */
import type {
  Workspace,
  FileHandle,
  SemanticToken as SemanticTokenType,
} from "../ty_wasm/ty_wasm";

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

export async function initTyChecker(
  monaco: any,
  editor: any,
  initialCode: string,
) {
  const ty = await loadTy();

  const workspace: Workspace = new ty.Workspace(
    "/",
    ty.PositionEncoding.Utf16,
    {},
  );
  const handle: FileHandle = workspace.openFile("solution.py", initialCode);
  const model = editor.getModel();
  if (!model) return () => {};

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
      const diagnostics = workspace.checkFile(handle);
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
  const contentDisposable = model.onDidChangeContent(() => {
    workspace.updateFile(handle, model.getValue());
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateDiagnostics, 300);
  });
  disposables.push(contentDisposable);

  updateDiagnostics();

  // --- Hover Provider ---
  disposables.push(
    monaco.languages.registerHoverProvider("python", {
      provideHover(_model: any, position: any) {
        try {
          const result = workspace.hover(
            handle,
            new ty.Position(position.lineNumber, position.column),
          );
          if (!result) return null;
          return {
            contents: [{ value: result.markdown, isTrusted: true }],
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
            handle,
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
          const hints = workspace.inlayHints(handle, tyRange);
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
            handle,
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
            const tokens = workspace.semanticTokens(handle);
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

  return function dispose() {
    clearTimeout(debounceTimer);
    monaco.editor.setModelMarkers(model, "ty", []);
    for (const d of disposables) {
      d.dispose();
    }
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
