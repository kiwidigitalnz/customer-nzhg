
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PODIO_CLIENT_ID: string
  readonly VITE_PODIO_CLIENT_SECRET: string
  // Add other environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
