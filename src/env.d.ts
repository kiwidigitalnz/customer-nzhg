
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PODIO_CLIENT_ID: string
  readonly VITE_PODIO_CLIENT_SECRET: string
  readonly VITE_PODIO_CONTACTS_APP_ID: string
  readonly VITE_PODIO_PACKING_SPEC_APP_ID: string
  // Add other environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
