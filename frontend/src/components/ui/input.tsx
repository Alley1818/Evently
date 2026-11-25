import type { ComponentProps } from 'react';
import { cn } from '@/lib/classnames';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn('ui-input', className)} {...props} />;
}
