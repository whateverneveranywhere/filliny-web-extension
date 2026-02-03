import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => (
  <main>
    <div
      className={cn(
        'filliny-transition-colors filliny-bg-background filliny-relative filliny-flex filliny-h-[100vh] filliny-flex-col filliny-items-center filliny-justify-center',
        className,
      )}
      {...props}>
      <div className="filliny-absolute filliny-inset-0 filliny-overflow-hidden">
        <div
          className={cn(
            `after:filliny-animate-aurora filliny-pointer-events-none filliny-absolute filliny--inset-[10px] filliny-opacity-50 filliny-blur-[10px] filliny-invert filliny-filter filliny-will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] [background-image:var(--white-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%] after:filliny-absolute after:filliny-inset-0 after:filliny-mix-blend-difference after:filliny-content-[""] after:[background-attachment:fixed] after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] dark:filliny-invert-0 dark:[background-image:var(--dark-gradient),var(--aurora)] after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,

            showRadialGradient && `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`,
          )}></div>
      </div>
      {children}
    </div>
  </main>
);
