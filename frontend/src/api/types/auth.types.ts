
// Demo-only auth types - simplified for demo purposes

export interface DemoAuthRequest {
  signal?: AbortSignal
}

export interface DemoAuthResponse {
  demo_token: string
  user: {
    id: string
    email: string
    name: string
  }
}
