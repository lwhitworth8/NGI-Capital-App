const ts = require('typescript')
const path = require('path')

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2019,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowJs: true,
}

module.exports = {
  process(src, filename) {
    const ext = path.extname(filename)
    if (/\.[jt]sx?$/.test(ext)) {
      const result = ts.transpileModule(src, {
        compilerOptions,
        fileName: filename,
        reportDiagnostics: false,
      })
      return { code: result.outputText }
    }
    return { code: src }
  },
}
