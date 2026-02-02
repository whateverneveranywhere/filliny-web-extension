import { ErrorBoundary } from 'react-error-boundary';
import type { ComponentType, JSX } from 'react';
import type { FallbackProps } from 'react-error-boundary';

export const withErrorBoundary = <T extends JSX.IntrinsicAttributes>(
  Component: ComponentType<T>,
  FallbackComponent: ComponentType<FallbackProps>,
) =>
  function WithErrorBoundary(props: T) {
    return (
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
