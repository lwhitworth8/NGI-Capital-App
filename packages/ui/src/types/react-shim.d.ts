// Editor shim to avoid missing React type libs in package scope.
// Remove once @types/react and @types/react-dom are available to this package.

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

