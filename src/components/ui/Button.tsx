'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className,
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    children,
    disabled,
    onClick,
    type,
    ...props 
  }, ref) => {
    const { theme } = useAppStore();
    
    const getVariantStyles = () => {
      switch (variant) {
        case 'success':
          return {
            backgroundColor: theme.colors.success,
            color: 'white',
            border: `1px solid ${theme.colors.success}`
          };
        case 'warning':
          return {
            backgroundColor: theme.colors.warning,
            color: 'white',
            border: `1px solid ${theme.colors.warning}`
          };
        case 'error':
          return {
            backgroundColor: theme.colors.error,
            color: 'white',
            border: `1px solid ${theme.colors.error}`
          };
        case 'secondary':
          return {
            backgroundColor: theme.colors.buttonBg,
            color: theme.colors.buttonFg,
            border: `1px solid ${theme.colors.buttonBg}`
          };
        default:
          return {
            backgroundColor: theme.colors.highlight,
            color: 'white',
            border: `1px solid ${theme.colors.highlight}`
          };
      }
    };
    
    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-2 text-sm';
        case 'lg':
          return 'px-6 py-4 text-lg';
        default:
          return 'px-4 py-3 text-base';
      }
    };
    
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.05 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
        className={clsx(
          'glass-button font-semibold rounded-lg transition-all duration-200',
          'flex items-center justify-center gap-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          getSizeClasses(),
          className
        )}
        style={getVariantStyles()}
        disabled={disabled || loading}
        onClick={onClick}
        type={type}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
          />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
