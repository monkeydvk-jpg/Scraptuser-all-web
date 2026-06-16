'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  /** Entrance animation delay in seconds (for stagger). */
  delay?: number;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, icon, delay = 0, children, onClick, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const { theme } = useAppStore();

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
        className={clsx('overflow-hidden backdrop-blur-xl', className)}
        style={{
          backgroundColor: `${theme.colors.frameBg}cc`,
          border: `1px solid ${theme.colors.highlight}26`,
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {title && (
          <div
            className="flex items-center gap-2.5 px-5 py-4 border-b"
            style={{ borderColor: `${theme.colors.highlight}1f` }}
          >
            {icon && (
              <span
                className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,.06)', color: theme.colors.labelFg }}
              >
                {icon}
              </span>
            )}
            <h3 className="font-display text-[15px] font-semibold" style={{ color: theme.colors.fg }}>
              {title}
            </h3>
          </div>
        )}
        <div className="p-5">{children}</div>
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
