import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, FC, ComponentType } from 'react';

interface ShadowPortalProps {
  /**
   * The content to render in the shadow DOM
   */
  children: ReactNode;

  /**
   * Optional container ID within the shadow root
   * If provided, will create or use an existing container with this ID
   * If not provided, will render directly into the shadow root
   */
  containerId?: string;

  /**
   * Optional z-index for the container
   */
  zIndex?: number;
}

/**
 * A portal component that renders children into the Shadow DOM
 * Useful for components like popovers, dropdowns, and tooltips that need to be rendered
 * within the Shadow DOM boundary to inherit styles properly
 */
const ShadowPortal: FC<ShadowPortalProps> = ({ children, containerId = 'shadow-portal-container', zIndex }) => {
  // Find the Shadow DOM root element
  const shadowHost = useMemo(() => document.querySelector('#chrome-extension-filliny-all'), []);

  const shadowRoot = useMemo(() => shadowHost?.shadowRoot, [shadowHost]);

  // If no shadow root is found, return null (or render in place as fallback)
  if (!shadowRoot) {
    console.error('ShadowPortal: No shadow root found. Components may not display correctly.');
    return <>{children}</>;
  }

  // Get or create container in shadow DOM
  let container = shadowRoot.querySelector<HTMLDivElement>(`#${containerId}`);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.setAttribute('data-shadow-portal', 'true');
    // Set styles to ensure proper layering and inheritance
    container.style.cssText = `
      position: relative;
      font-family: inherit;
      color: inherit;
      ${zIndex ? `z-index: ${zIndex};` : ''}
    `.trim();
    shadowRoot.appendChild(container);
  }

  return createPortal(children, container);
};

/**
 * Higher-order component to make any component render into the Shadow DOM
 * @param Component The component to wrap
 * @returns A wrapped component that renders into Shadow DOM
 */
const withShadowPortal =
  <P extends object>(WrappedComponent: ComponentType<P>, portalProps?: Omit<ShadowPortalProps, 'children'>) =>
  (props: P) => (
    <ShadowPortal {...portalProps}>
      <WrappedComponent {...props} />
    </ShadowPortal>
  );

export { ShadowPortal, withShadowPortal };
