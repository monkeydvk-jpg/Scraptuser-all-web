'use client';

import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { LineChart, Github } from 'lucide-react';

export function Footer() {
  const { theme } = useAppStore();
  const t = useT();

  return (
    <footer
      className="border-t py-8 mt-16 backdrop-blur-xl"
      style={{ backgroundColor: `${theme.colors.frameBg}b3`, borderColor: `${theme.colors.highlight}26` }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <span
              className="grid place-items-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.colors.highlight}, ${theme.colors.labelFg})` }}
            >
              <LineChart className="w-4 h-4" style={{ color: '#fff' }} strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-display font-semibold" style={{ color: theme.colors.fg }}>
                {t('footer_tagline')}
              </p>
              <p className="text-sm mt-0.5" style={{ color: theme.colors.labelFg }}>
                {t('footer_sub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ color: theme.colors.labelFg, border: `1px solid ${theme.colors.highlight}26` }}
            >
              {t('footer_hint')}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.colors.highlight, color: '#fff' }}>
              v2.0
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex items-center gap-1.5 hover:underline"
              style={{ color: theme.colors.labelFg }}
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
