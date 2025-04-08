/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // Only keeping essential environment variables that are still needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
