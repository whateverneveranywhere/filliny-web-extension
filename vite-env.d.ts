/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBAPP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
