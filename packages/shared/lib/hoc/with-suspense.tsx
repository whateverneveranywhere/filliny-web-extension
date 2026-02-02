import { Suspense } from 'react';
import type { ComponentType, ReactElement, JSX } from 'react';

export const withSuspense =
  <T extends JSX.IntrinsicAttributes>(Component: ComponentType<T>, SuspenseComponent: ReactElement) =>
  (props: T) => (
    <Suspense fallback={SuspenseComponent}>
      <Component {...props} />
    </Suspense>
  );
