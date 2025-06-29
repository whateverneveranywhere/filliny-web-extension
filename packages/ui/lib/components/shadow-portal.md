# Shadow Portal System

This document explains how to use the Shadow Portal system for proper component styling in Shadow DOM.

## Problem

In browser extensions that use Shadow DOM, components like popovers, dropdowns, and tooltips may not render correctly because:

1. Radix UI portals render content outside the Shadow DOM boundary
2. Styles defined within Shadow DOM are not inherited by portals
3. Content positioned incorrectly due to lack of style context

## Solution

Our Shadow Portal system ensures components are properly rendered within the Shadow DOM boundary, maintaining style consistency.

## Components

### 1. Base Components

- `ShadowPortal`: Core component that renders children into Shadow DOM
- `withShadowPortal`: HOC to wrap any component to render in Shadow DOM

### 2. Enhanced UI Components

- `ShadowPopover`: Enhanced Popover that works in Shadow DOM
- `ShadowSelect`: Enhanced Select that works in Shadow DOM
- `ShadowDropdownMenu`: Enhanced DropdownMenu that works in Shadow DOM

## Usage

### Basic Portal

```tsx
import { ShadowPortal } from "@extension/ui/lib/components/shadow-portal";

// Render content within Shadow DOM
const MyComponent = () => (
  <ShadowPortal containerId="my-content">
    <div>This content will render in Shadow DOM</div>
  </ShadowPortal>
);
```

### Enhanced UI Components

```tsx
// Import enhanced Shadow DOM components
import { 
  ShadowPopover,
  ShadowPopoverTrigger,
  ShadowPopoverContent 
} from "@extension/ui/lib/components/ui/shadow-ui";

// Use them like regular components
const MyPopover = () => (
  <ShadowPopover>
    <ShadowPopoverTrigger>Click me</ShadowPopoverTrigger>
    <ShadowPopoverContent portalContainerId="my-popover">
      Content renders properly in Shadow DOM
    </ShadowPopoverContent>
  </ShadowPopover>
);
```

### Advanced: Higher Order Component

```tsx
import { withShadowPortal } from "@extension/ui/lib/components/shadow-portal";

// Create a version of any component that renders in Shadow DOM
const MyShadowComponent = withShadowPortal(MyComponent, {
  containerId: "custom-container",
  zIndex: 9999
});
```

## Best Practices

1. **Unique Container IDs**: Provide unique `containerId` for components that need isolation
2. **Z-Index Management**: Use `zIndex` prop for proper stacking context
3. **Component Composition**: Prefer using the enhanced components over custom implementations

## Available Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ShadowPortal` | Base portal component | `children`, `containerId`, `zIndex` |
| `ShadowPopover` | Popover in Shadow DOM | Same as Radix UI Popover |
| `ShadowSelect` | Select dropdown in Shadow DOM | Same as Radix UI Select + `portalContainerId` |
| `ShadowDropdownMenu` | Dropdown menu in Shadow DOM | Same as Radix UI DropdownMenu + `portalContainerId` |

## Troubleshooting

1. **Styles not applying**: Check CSS variable definitions in both contexts
2. **Content not visible**: Verify Shadow DOM is initialized
3. **Z-index issues**: Adjust the `zIndex` prop to ensure proper stacking

## When to Use

Use Shadow DOM components whenever you need:

- Popovers, tooltips, dropdown menus
- Any floating UI elements
- Components that render with portals
- Any UI that needs to appear above page content

## Implementation Details

The Shadow Portal system works by:

1. Finding the extension's Shadow DOM root
2. Creating a container element within the Shadow DOM
3. Using React's `createPortal` to render content into that container
4. Maintaining proper styling and positioning context 