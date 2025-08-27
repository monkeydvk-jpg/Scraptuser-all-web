'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    const { theme } = useAppStore();
    
    return (
      <div className="space-y-2">
        {label && (
          <label 
            className="block text-sm font-medium"
            style={{ color: theme.colors.labelFg }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input-field w-full transition-all duration-200',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          style={{
            backgroundColor: theme.colors.entryBg,
            borderColor: error ? theme.colors.error : `${theme.colors.highlight}50`,
            color: theme.colors.entryFg
          }}
          {...props}
        />
        {error && (
          <p className="text-sm" style={{ color: theme.colors.error }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
