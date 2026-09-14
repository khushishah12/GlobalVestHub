import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'nx-btn-gold',
  secondary: 'nx-btn-line',
  ghost: 'nx-btn-ghost',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', children, variant = 'primary', isLoading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`nx-btn ${VARIANT_STYLES[variant]} disabled:pointer-events-none disabled:opacity-50 ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
