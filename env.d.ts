/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_STELLAR_RPC_URL: string
  readonly PUBLIC_STELLAR_NETWORK_PASSPHRASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}