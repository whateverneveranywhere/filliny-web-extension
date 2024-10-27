// packages/ui/lib/overlay/index.ts
export let overlayContainer: HTMLElement | null = null;

export const getOverlayContainer = (): HTMLElement => {
  if (!overlayContainer) {
    overlayContainer = document.getElementById('filliny-overlay-container');
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.id = 'filliny-overlay-container';
      document.body.appendChild(overlayContainer);
    }
  }
  return overlayContainer;
};
