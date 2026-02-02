import { ErrorDisplay } from './error-display/ErrorDisplay';
import { Loading } from './ui/loading';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import type { ComponentType, JSX } from 'react';

/**
 * Wraps a page component with error boundary and suspense.
 * Combines withErrorBoundary and withSuspense HOCs for consistent page setup.
 *
 * @param Component - The page component to wrap
 * @returns Wrapped component with error boundary and suspense
 *
 * @example
 * const MyPage = () => <div>My Page Content</div>;
 * export default withPageWrapper(MyPage);
 */
export const withPageWrapper = <T extends JSX.IntrinsicAttributes>(Component: ComponentType<T>) =>
  withErrorBoundary(withSuspense(Component, <Loading fullScreen size="xl" />), ErrorDisplay);
