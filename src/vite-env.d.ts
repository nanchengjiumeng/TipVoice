/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly VITE_API_KEY: string;
  readonly VITE_API_KEY_MINIMAX: string;
  readonly VITE_API_KEY_SILICONFLOW: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
