/**
 * Shadow UI Components
 *
 * This module exports all UI components enhanced with Shadow DOM portal support.
 * These components ensure proper styling within the Shadow DOM boundary.
 */

// Base portal component
export { ShadowPortal, withShadowPortal } from "../shadow-portal";

// Enhanced UI components that use ShadowPortal
export { ShadowPopover, ShadowPopoverTrigger, ShadowPopoverContent } from "./shadow-popover";

export {
  ShadowSelect,
  ShadowSelectGroup,
  ShadowSelectValue,
  ShadowSelectTrigger,
  ShadowSelectContent,
  ShadowSelectLabel,
  ShadowSelectItem,
  ShadowSelectSeparator,
  ShadowSelectScrollUpButton,
  ShadowSelectScrollDownButton,
} from "./shadow-select";

export {
  ShadowDropdownMenu,
  ShadowDropdownMenuTrigger,
  ShadowDropdownMenuContent,
  ShadowDropdownMenuItem,
  ShadowDropdownMenuCheckboxItem,
  ShadowDropdownMenuRadioItem,
  ShadowDropdownMenuLabel,
  ShadowDropdownMenuSeparator,
  ShadowDropdownMenuShortcut,
  ShadowDropdownMenuGroup,
  ShadowDropdownMenuSub,
  ShadowDropdownMenuSubTrigger,
  ShadowDropdownMenuSubContent,
  ShadowDropdownMenuRadioGroup,
} from "./shadow-dropdown-menu";
