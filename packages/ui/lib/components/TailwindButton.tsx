import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils';

export type TWButtonProps = {
  theme?: 'light' | 'dark';
} & ComponentPropsWithoutRef<'button'>;

export function TailwindButton({ theme, className, children, ...props }: TWButtonProps) {
  return (
    <button
      className={cn(
        className,
        'py-1 px-4 rounded shadow hover:scale-105',
        theme === 'light' ? 'bg-white text-black' : 'bg-black text-white',
      )}
      {...props}>
      {children}
    </button>
  );
}
