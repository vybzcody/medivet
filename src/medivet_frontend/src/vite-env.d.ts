/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DFX_NETWORK: string;
  readonly VITE_CANISTER_ID_INTERNET_IDENTITY: string;
  readonly VITE_CANISTER_ID_MEDIVET_BACKEND: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}