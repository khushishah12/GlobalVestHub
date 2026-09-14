import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-[3px] border border-[#26314A] bg-[#0B111C] px-3 py-2 text-sm text-[#EBEEF4] placeholder-[#5C6883] transition-all duration-200 hover:border-[#4A5878] focus:border-[#D4A657] focus:outline-none focus:ring-1 focus:ring-[#D4A657] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
