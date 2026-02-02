import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const headingVariants = cva('filliny-scroll-m-20 filliny-tracking-tight', {
  variants: {
    level: {
      1: 'filliny-text-4xl filliny-font-bold md:filliny-text-5xl lg:filliny-text-6xl',
      2: 'filliny-text-3xl filliny-font-bold md:filliny-text-4xl',
      3: 'filliny-text-2xl filliny-font-semibold md:filliny-text-3xl',
      4: 'filliny-text-xl filliny-font-semibold',
      5: 'filliny-text-lg filliny-font-semibold',
      6: 'filliny-text-base filliny-font-semibold',
    },
    color: {
      default: 'filliny-text-foreground',
      muted: 'filliny-text-muted-foreground',
      primary: 'filliny-text-primary',
      destructive: 'filliny-text-destructive',
      success: 'filliny-text-success',
    },
  },
  defaultVariants: {
    level: 1,
    color: 'default',
  },
});

interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, color, as, children, ...props }, ref) => {
    const Component = as || (`h${level}` as keyof JSX.IntrinsicElements);
    return React.createElement(
      Component,
      { ref, className: cn(headingVariants({ level, color }), className), ...props },
      children
    );
  }
);
Heading.displayName = 'Heading';

const textVariants = cva('', {
  variants: {
    variant: {
      body: 'filliny-text-base filliny-leading-relaxed',
      lead: 'filliny-text-lg filliny-leading-relaxed md:filliny-text-xl',
      small: 'filliny-text-sm filliny-leading-normal',
      caption: 'filliny-text-xs filliny-leading-normal',
    },
    color: {
      default: 'filliny-text-foreground',
      muted: 'filliny-text-muted-foreground',
      primary: 'filliny-text-primary',
      destructive: 'filliny-text-destructive',
      success: 'filliny-text-success',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'default',
  },
});

interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div';
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, color, as = 'p', children, ...props }, ref) => {
    return React.createElement(
      as,
      { ref, className: cn(textVariants({ variant, color }), className), ...props },
      children
    );
  }
);
Text.displayName = 'Text';

interface PageTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

const PageTitle = ({ title, description, className, ...props }: PageTitleProps) => (
  <div className={cn('filliny-space-y-2', className)} {...props}>
    <Heading level={1} className="filliny-text-2xl md:filliny-text-3xl">
      {title}
    </Heading>
    {description && <Text color="muted">{description}</Text>}
  </div>
);

const SectionTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <Heading ref={ref} level={2} className={className} {...props}>
      {children}
    </Heading>
  )
);
SectionTitle.displayName = 'SectionTitle';

const CardTitleText = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <Heading ref={ref} level={3} className={cn('filliny-text-lg', className)} {...props}>
      {children}
    </Heading>
  )
);
CardTitleText.displayName = 'CardTitleText';

const LabelText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'filliny-text-xs filliny-font-medium filliny-uppercase filliny-tracking-wider filliny-text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
LabelText.displayName = 'LabelText';

export {
  Heading,
  headingVariants,
  Text,
  textVariants,
  PageTitle,
  SectionTitle,
  CardTitleText,
  LabelText,
};
export type { HeadingProps, TextProps, PageTitleProps };
