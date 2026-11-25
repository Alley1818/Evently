import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/classnames';

const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      default: 'ui-button--primary',
      secondary: 'ui-button--secondary',
      ghost: 'ui-button--ghost',
      outline: 'ui-button--secondary',
    },
    size: {
      default: '',
      sm: 'ui-button--small',
      icon: 'ui-button--icon',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export function Button({
  className, variant, size, asChild = false, type = 'button', ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) return <Slot data-slot="button" className={classes} {...props} />;
  return <button data-slot="button" type={type} className={classes} {...props} />;
}
