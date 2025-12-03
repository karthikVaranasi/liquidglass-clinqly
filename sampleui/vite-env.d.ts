/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// React type declarations
declare module 'react' {
  export = React;
  export as namespace React;
}

declare module 'react/jsx-runtime' {
  export = React;
  export as namespace React;
}

declare module 'react/jsx-dev-runtime' {
  export = React;
  export as namespace React;
}
