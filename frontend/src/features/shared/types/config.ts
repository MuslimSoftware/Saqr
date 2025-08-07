export type Environment = 'development' | 'staging' | 'production'

export interface DevModeConfig {
  bypassAuth: boolean
  autoFillCredentials: {
    enabled: boolean
    email: string
    password: string
  }
}

export interface AppConfig {
  env: Environment
  apiUrl: string
  devMode: DevModeConfig
} 