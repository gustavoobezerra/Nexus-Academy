/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AI_SERVICE_URL?: string
  readonly VITE_USE_MOCK_AI?: string
  readonly VITE_AI_SERVICE_KEY?: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_DAILY_API_KEY?: string
  readonly VITE_GEMINI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
