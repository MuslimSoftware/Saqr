
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

export interface ApiError {
  message: string
  error_code: string
  status_code: number
}

