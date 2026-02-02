import { cn } from '../../utils';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

const containerVariants = cva('filliny-mx-auto filliny-w-full filliny-px-4 sm:filliny-px-6 lg:filliny-px-8', {
  variants: {
    size: {
      xs: 'filliny-max-w-2xl',
      sm: 'filliny-max-w-3xl',
      md: 'filliny-max-w-4xl',
      lg: 'filliny-max-w-5xl',
      xl: 'filliny-max-w-6xl',
      '2xl': 'filliny-max-w-7xl',
      full: 'filliny-max-w-full',
    },
  },
  defaultVariants: {
    size: '2xl',
  },
});

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {}

const Container = ({ className, size, ...props }: ContainerProps) => (
  <div className={cn(containerVariants({ size }), className)} {...props} />
);
Container.displayName = 'Container';

const pageSectionVariants = cva('', {
  variants: {
    spacing: {
      none: '',
      compact: 'filliny-py-12',
      default: 'filliny-py-16 md:filliny-py-24',
      large: 'filliny-py-20 md:filliny-py-32',
    },
  },
  defaultVariants: {
    spacing: 'default',
  },
});

interface PageSectionProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof pageSectionVariants> {
  containerSize?: VariantProps<typeof containerVariants>['size'];
}

const PageSection = ({ className, spacing, containerSize, children, ...props }: PageSectionProps) => (
  <section className={cn(pageSectionVariants({ spacing }), className)} {...props}>
    <Container size={containerSize}>{children}</Container>
  </section>
);
PageSection.displayName = 'PageSection';

export { Container, containerVariants, PageSection, pageSectionVariants };
export type { ContainerProps, PageSectionProps };
