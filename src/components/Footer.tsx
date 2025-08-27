'use client';

import { useAppStore } from '@/lib/store';

export function Footer() {
  const { theme } = useAppStore();
  
  return (
    <footer 
      className="border-t py-8 mt-16"
      style={{ 
        backgroundColor: theme.colors.frameBg,
        borderColor: `${theme.colors.highlight}30`
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p style={{ color: theme.colors.labelFg }}>
              ✨ Adobe Stock Prompt Generator Pro - Ready to scrape!
            </p>
            <p className="text-sm mt-1" style={{ color: theme.colors.labelFg }}>
              Modern web interface with real-time processing
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span 
              className="px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: theme.colors.highlight,
                color: 'white'
              }}
            >
              v2.0 Web
            </span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: theme.colors.labelFg }}
            >
              GitHub
            </a>
            <a 
              href="https://vercel.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: theme.colors.labelFg }}
            >
              Deploy on Vercel
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
