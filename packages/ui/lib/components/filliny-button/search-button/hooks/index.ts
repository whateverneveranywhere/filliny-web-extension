/**
 * Search Button Hooks - Custom hooks for separating logic from presentation
 */

export {
  useFormElement,
  findFormElement,
  scrollToForm,
  countFormFields,
  findOutermostContainer,
} from './useFormElement';
export { useOverlayPosition, calculateOverlayPosition } from './useOverlayPosition';
export { useFormFill } from './useFormFill';
export { useFieldDetection, isFormField, isElementVisibleAndInteractive } from './useFieldDetection';
export { useFieldButtonPosition } from './useFieldButtonPosition';
export { useHoverState } from './useHoverState';
