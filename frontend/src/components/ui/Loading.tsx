import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const loadingVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      size: {
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-8',
        xl: 'p-12',
      },
      variant: {
        default: '',
        inline: 'inline-flex',
        overlay: 'fixed inset-0 z-50 bg-black/20 backdrop-blur-sm',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const spinnerVariants = cva(
  'border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin',
  {
    variants: {
      size: {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const loadingTextVariants = cva(
  'ml-3 text-sm text-gray-600',
  {
    variants: {
      variant: {
        default: '',
        hidden: 'sr-only',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string;
  showText?: boolean;
}

const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size, variant, text = 'Loading...', showText = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(loadingVariants({ size, variant }), className)}
      {...props}
    >
      <div className={spinnerVariants({ size })} />
      {showText && (
        <span className={loadingTextVariants({ variant: showText ? 'default' : 'hidden' })}>
          {text}
        </span>
      )}
    </div>
  )
);
Loading.displayName = 'Loading';

export { Loading };