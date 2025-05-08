// src/components/Footer.tsx
'use client'

import Link from 'next/link'
import { GithubIcon } from "lucide-react" // This is the shadcn/ui way of using Lucide icons

export const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="w-full py-4 px-6 border-t border-border">
      <div className="container mx-auto flex justify-between items-center">
        {/* Copyright */}
        <div className="text-sm text-muted-foreground">
          © {currentYear} Blaze Arcade
        </div>
        
        {/* GitHub link */}
        <Link 
          href="https://github.com/awesamarth/blaze-arcade" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          aria-label="GitHub Repository"
        >
          <GithubIcon size={20} />
        </Link>
      </div>
    </footer>
  )
}