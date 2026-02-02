import * as React from 'react';
import { cn } from '../../utils';
import { Skeleton } from './skeleton';
import { Loader2 } from 'lucide-react';

interface GlobalPendingProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

const GlobalPendingComponent = ({ message = 'Loading...', className, ...props }: GlobalPendingProps) => (
  <div
    className={cn(
      'filliny-flex filliny-min-h-[200px] filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4',
      className,
    )}
    {...props}>
    <Loader2 className="filliny-h-8 filliny-w-8 filliny-animate-spin filliny-text-primary" />
    <p className="filliny-text-sm filliny-text-muted-foreground">{message}</p>
  </div>
);

const PageSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('filliny-space-y-6 filliny-p-6', className)} {...props}>
    <div className="filliny-space-y-2">
      <Skeleton className="filliny-h-8 filliny-w-48" />
      <Skeleton className="filliny-h-4 filliny-w-96" />
    </div>
    <div className="filliny-space-y-4">
      <Skeleton className="filliny-h-32 filliny-w-full" />
      <Skeleton className="filliny-h-32 filliny-w-full" />
    </div>
  </div>
);

const ProfilesSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('filliny-space-y-4', className)} {...props}>
    <div className="filliny-flex filliny-items-center filliny-justify-between">
      <Skeleton className="filliny-h-8 filliny-w-32" />
      <Skeleton className="filliny-h-10 filliny-w-32" />
    </div>
    <div className="filliny-grid filliny-gap-4 md:filliny-grid-cols-2 lg:filliny-grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="filliny-space-y-4 filliny-rounded-xl filliny-border filliny-p-6">
          <div className="filliny-flex filliny-items-center filliny-gap-3">
            <Skeleton className="filliny-h-10 filliny-w-10 filliny-rounded-full" />
            <div className="filliny-space-y-2">
              <Skeleton className="filliny-h-4 filliny-w-24" />
              <Skeleton className="filliny-h-3 filliny-w-16" />
            </div>
          </div>
          <Skeleton className="filliny-h-4 filliny-w-full" />
          <Skeleton className="filliny-h-4 filliny-w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

const SettingsSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('filliny-space-y-6', className)} {...props}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="filliny-space-y-4 filliny-rounded-xl filliny-border filliny-p-6">
        <Skeleton className="filliny-h-6 filliny-w-40" />
        <div className="filliny-space-y-3">
          <div className="filliny-flex filliny-items-center filliny-justify-between">
            <Skeleton className="filliny-h-4 filliny-w-32" />
            <Skeleton className="filliny-h-6 filliny-w-12 filliny-rounded-full" />
          </div>
          <div className="filliny-flex filliny-items-center filliny-justify-between">
            <Skeleton className="filliny-h-4 filliny-w-40" />
            <Skeleton className="filliny-h-6 filliny-w-12 filliny-rounded-full" />
          </div>
          <div className="filliny-flex filliny-items-center filliny-justify-between">
            <Skeleton className="filliny-h-4 filliny-w-36" />
            <Skeleton className="filliny-h-6 filliny-w-12 filliny-rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CardSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('filliny-space-y-4 filliny-rounded-xl filliny-border filliny-p-6', className)} {...props}>
    <Skeleton className="filliny-h-10 filliny-w-10 filliny-rounded-lg" />
    <div className="filliny-space-y-2">
      <Skeleton className="filliny-h-5 filliny-w-32" />
      <Skeleton className="filliny-h-4 filliny-w-full" />
      <Skeleton className="filliny-h-4 filliny-w-3/4" />
    </div>
  </div>
);

export { GlobalPendingComponent, PageSkeleton, ProfilesSkeleton, SettingsSkeleton, CardSkeleton };
