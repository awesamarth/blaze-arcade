'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export const Navbar = () => {
  const { theme, setTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  
  // Used for conditional rendering based on theme
  const isDark = mounted && theme === 'dark'

  return (
    <nav className={cn(
      "w-full fixed top-0 z-[9999] py-4 px-6 md:px-12 flex items-center justify-between border-b transition-colors duration-300",
      isDark 
        ? "bg-black border-white/10" 
        : "bg-white border-black/10"
    )}>
      {/* Logo/Brand */}
      <Link href="/" className="flex items-center">
        <span className={cn(
          "text-2xl font-bold font-[family-name:var(--font-doom)]",
          isDark ? "text-white" : "text-black"
        )}>
          BLAZE
        </span>
      </Link>
      
      {/* Mobile Menu Button */}
      <button 
        className={cn(
          "md:hidden flex items-center",
          isDark ? "text-white" : "text-black"
        )}
        onClick={toggleMenu}
        aria-label="Toggle Menu"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Nav Items & Controls */}
      <div className={cn(
        "flex flex-col md:flex-row items-center gap-6 md:gap-8 absolute md:static top-16 left-0 right-0 md:bg-transparent p-6 md:p-0 border-b md:border-0 transition-all duration-300 z-10",
        isDark 
          ? "bg-black border-white/10" 
          : "bg-white border-black/10",
        isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible md:opacity-100 md:visible"
      )}>
        <Link 
          href="/games" 
          className={cn(
            "transition-colors",
            isDark 
              ? "text-white hover:text-purple-400" 
              : "text-black hover:text-purple-700"
          )}
        >
          Games
        </Link>
        <Link 
          href="/leaderboard" 
          className={cn(
            "transition-colors",
            isDark 
              ? "text-white hover:text-purple-400" 
              : "text-black hover:text-purple-700"
          )}
        >
          Leaderboard
        </Link>
        <Link 
          href="/about" 
          className={cn(
            "transition-colors",
            isDark 
              ? "text-white hover:text-purple-400" 
              : "text-black hover:text-purple-700"
          )}
        >
          About
        </Link>
        
        {/* Wallet Connect Button */}
        <w3m-button />
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className={cn(
            "p-2 rounded-md hover:cursor-pointer transition-colors",
            isDark 
              ? "bg-gray-800 hover:bg-gray-700 text-white" 
              : "bg-gray-200 hover:bg-gray-300 text-black"
          )}
          aria-label="Toggle Theme"
        >
          {mounted && (isDark ? <Sun size={20} /> : <Moon size={20} />)}
        </button>
      </div>
    </nav>
  )
}

export default Navbar