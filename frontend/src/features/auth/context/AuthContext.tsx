import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { setDemoToken, getDemoToken, clearDemoToken } from '@/config/storage.config'
import { requestOTP, authenticate } from '@/api/endpoints/authApi'

type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  demoToken: string | null
  signInAsDemo: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [demoToken, setDemoTokenState] = useState<string | null>(null)
  const router = useRouter()

  const createNewDemoSession = async () => {
    setIsLoading(true)
    try {
      // Always create a fresh demo session - no login flow
      console.log('Creating new demo session...')
      
      // Step 1: Request a new demo session
      const otpResponse = await requestOTP({ email: 'demo@example.com' })
      if (!otpResponse || !otpResponse.data?.token) {
        throw new Error('Failed to get demo session token.')
      }

      // Step 2: Authenticate with the completion token
      const authResponse = await authenticate({ token: otpResponse.data.token })
      if (!authResponse || !authResponse.data?.access_token) {
        throw new Error('Failed to authenticate demo session.')
      }

      // Step 3: Set token and update state
      const accessToken = authResponse.data.access_token
      setDemoToken(accessToken)
      setDemoTokenState(accessToken)
      setIsAuthenticated(true)
      
      console.log('Demo session created successfully')
    } catch (e) {
      console.error("Error creating demo session:", e)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const signInAsDemo = async () => {
    await createNewDemoSession()
  }

  const signOut = async () => {
    // In demo mode, signing out just creates a new session
    clearDemoToken()
    setDemoTokenState(null)
    setIsAuthenticated(false)
    await createNewDemoSession()
  }

  // Always create a new demo session on mount - no persistent auth
  useEffect(() => {
    const initializeDemo = async () => {
      // Clear any existing token to ensure fresh session
      clearDemoToken()
      // Create new demo session
      await createNewDemoSession()
    }
    
    initializeDemo()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        demoToken,
        signInAsDemo,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}