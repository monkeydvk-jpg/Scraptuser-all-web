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
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium" style={{ color: theme.colors.labelFg }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2',
            className
          )}
          style={{
            backgroundColor: theme.colors.entryBg,
            border: `1px solid ${error ? theme.colors.error : `${theme.colors.highlight}40`}`,
            color: theme.colors.entryFg,
            // @ts-expect-error custom prop for tailwind ring color
            '--tw-ring-color': `${theme.colors.highlight}40`,
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: theme.colors.error }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
