import React, { forwardRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const modalBackdropVariants = cva(
  'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const modalContentVariants = cva(
  'relative bg-white rounded-lg shadow-lg max-h-[90vh] overflow-auto',
  {
    variants: {
      size: {
        sm: 'max-w-md w-full mx-4',
        md: 'max-w-lg w-full mx-4',
        lg: 'max-w-2xl w-full mx-4',
        xl: 'max-w-4xl w-full mx-4',
        full: 'max-w-full w-full mx-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const modalHeaderVariants = cva(
  'flex items-center justify-between p-6 border-b border-gray-200',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const modalTitleVariants = cva(
  'text-lg font-semibold text-gray-900',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const modalBodyVariants = cva(
  'p-6',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const modalFooterVariants = cva(
  'flex items-center justify-end gap-3 p-6 border-t border-gray-200',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: VariantProps<typeof modalContentVariants>['size'];
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onOpenChange, size, children, ...props }, ref) => {
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && onOpenChange) {
          onOpenChange(false);
        }
      };

      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(modalVariants({ variant: 'default' }), className)}
        {...props}
      >
        <div
          className={modalBackdropVariants({ variant: 'default' })}
          onClick={() => onOpenChange?.(false)}
        />
        <div className={modalContentVariants({ size })}>
          {children}
        </div>
      </div>
    );
  }
);
Modal.displayName = 'Modal';

const ModalHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof modalHeaderVariants>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(modalHeaderVariants({ variant: 'default' }), className)}
    {...props}
  />
));
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & VariantProps<typeof modalTitleVariants>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(modalTitleVariants({ variant: 'default' }), className)}
    {...props}
  />
));
ModalTitle.displayName = 'ModalTitle';

const ModalBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof modalBodyVariants>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(modalBodyVariants({ variant: 'default' }), className)}
    {...props}
  />
));
ModalBody.displayName = 'ModalBody';

const ModalFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof modalFooterVariants>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(modalFooterVariants({ variant: 'default' }), className)}
    {...props}
  />
));
ModalFooter.displayName = 'ModalFooter';

export { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter };