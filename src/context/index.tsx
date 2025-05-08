'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit, useAppKitTheme } from '@reown/appkit/react'
import { foundry, megaethTestnet } from '@reown/appkit/networks'
import React, { ReactNode, useEffect, useState } from 'react'
import { cookieToInitialState, WagmiProvider} from 'wagmi'
import { useTheme } from 'next-themes'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'portfolio',
  description: 'Portfolio',
  url: 'https://appkitexampleapp.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal
// Create the modal with monochrome theme variables
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [megaethTestnet, foundry],
  defaultNetwork: megaethTestnet,
  metadata: metadata,
  features: {
    email: false,
    socials: ['google'],
  },
  themeVariables: {
    '--w3m-accent': '#333333',           // Dark gray for accents
    '--w3m-color-mix': '#000000',        // Black for mixing
    '--w3m-color-mix-strength': 10,      // Subtle mixing
    '--w3m-border-radius-master': '1px', // Smaller, more squared borders
    '--w3m-font-family': 'var(--font-geist-sans)', 
    '--w3m-z-index': 9999,               
  },
  // Start with a default, we'll update it in the component
  themeMode: 'light'
})

// Theme synchronization component
function ThemeSynchronizer() {
  const { resolvedTheme } = useTheme()
  const { setThemeMode } = useAppKitTheme()
  
  useEffect(() => {

    console.log(resolvedTheme)
    if (resolvedTheme) {
      setThemeMode(resolvedTheme === 'dark' ? 'dark' : resolvedTheme === 'doom' ? "dark":'light')
    }
  }, [resolvedTheme, setThemeMode])
  
  return null
}

// In src/context/index.tsx - modify the ContextProvider

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [initialState, setInitialState] = useState<any>(undefined)
  
  useEffect(() => {
    setMounted(true)
    
    // Function to attempt initializing the state with retries
    const initializeState = async () => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          // Try to initialize the state
          const state = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies)
          setInitialState(state)
          return // Success - exit the function
        } catch (error) {
          attempts++
          console.error(`Error initializing wagmi state (attempt ${attempts}/${maxAttempts}):`, error)
          
          if (attempts >= maxAttempts) {
            console.warn("Max retry attempts reached. Continuing without blockchain state.")
            return // Give up after max attempts
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
        }
      }
    }
    
    initializeState()
  }, [cookies])

  if (!mounted) {
    return null
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ThemeSynchronizer />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 

export default ContextProvider