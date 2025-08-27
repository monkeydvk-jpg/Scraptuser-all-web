'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, icon, children, ...props }, ref) => {
    const { theme } = useAppStore();
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={clsx('card overflow-hidden', className)}
        style={{ backgroundColor: theme.colors.frameBg }}
        {...props}
      >
        {title && (
          <div 
            className="px-6 py-4 border-b"
            style={{ 
              backgroundColor: theme.colors.highlight,
              borderColor: theme.colors.highlight
            }}
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {icon}
              {title}
            </h3>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
