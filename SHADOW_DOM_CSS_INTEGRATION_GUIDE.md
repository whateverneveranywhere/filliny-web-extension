# Shadow DOM CSS Integration Guide

Your unified shadow DOM system now supports using your actual built CSS (including Tailwind config and global styles) with minimal complexity.

## What Changed

✅ **Before**: Hardcoded CSS styles in `unified-shadow-dom.tsx` that didn't properly inherit CSS variables  
✅ **After**: Uses your actual built CSS with variables that work in both regular and shadow DOM

## Key Benefits

- 🎨 **Consistent Styling**: Uses your actual Tailwind config and global styles
- 🔄 **Synchronized**: Changes to your Tailwind config automatically apply to shadow DOM injections
- 🧩 **Proper Isolation**: CSS variables work correctly within the shadow DOM boundary
- 🔗 **Unified Approach**: Single CSS file works for both shadow DOM and regular DOM
- 🚀 **Build Integration**: Leverages your existing build process
- 🦄 **Firefox Compatible**: Uses the same CSS injection pattern as `initAppWithShadow`

## Usage Examples

### Basic Usage

```tsx
import inlineCss from "../../dist/all/index.css?inline";
import { initializeShadowDOM, injectComponent } from "@extension/ui";

// Initialize shadow DOM with CSS
await initializeShadowDOM({
  css: inlineCss,
  shadowHostId: "my-extension-components"
});

// Inject your component
await injectComponent({
  containerId: "my-component",
  component: <MyComponent />,
  zIndex: 999999
});
```

### Using with Search Button

```tsx
import inlineCss from "../../dist/all/index.css?inline";
import { initializeSearchButton } from "@extension/ui";

// Initialize search button with your CSS
await initializeSearchButton({
  css: inlineCss,
  shadowHostId: "chrome-extension-filliny-search-button"
});
```

## Integration with Your Build Process

### Content-UI Build Process

Your `pages/content-ui/build.mts` already generates CSS files in `dist/`:

```
dist/
  content-ui/
    all/
      index.css    # ← Use this CSS
    example/
      index.css    # ← Or this for example match
```

### Import Pattern

```tsx
// Import the built CSS for the specific match
import inlineCss from "../../../dist/all/index.css?inline";
```

### Unified CSS Variables Approach

The updated `global.css` file defines CSS variables for both regular DOM and shadow DOM:

```css
/* Variables work in both contexts */
:root, :host, :host(*) {
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  /* and other variables */
}
```

This unified approach eliminates duplication and ensures consistent styling across contexts.

## Dynamic Style Updates

```tsx
import { updateShadowDOMStyles } from "@extension/ui";

// Update styles at runtime
await updateShadowDOMStyles(newCssString);
```

## Multiple Shadow DOM Instances

```tsx
import { unifiedShadowDOM } from "@extension/ui";

// Initialize different shadow DOM instances with different CSS
await unifiedShadowDOM.initialize({
  css: mainAppCss,
  shadowHostId: "main-app"
});

await unifiedShadowDOM.initialize({
  css: searchButtonCss,
  shadowHostId: "search-button"
});
```

## Troubleshooting

### CSS Variables Not Applying

1. **Check inspector**: Open DevTools, select the shadow DOM, and check if CSS variables are defined
2. **CSS selector specificity**: Make sure the correct selector is being used (:host vs :root)
3. **CSS encapsulation**: Remember shadow DOM has its own styling scope

### Styles Not Applying

1. **Shadow DOM isolation**: Styles are isolated to the shadow DOM
2. **CSS specificity**: Use your prefixed classes (e.g., `filliny-`)
3. **CSS variables**: Ensure CSS custom properties are defined on both `:root` and `:host`

## API Reference

### Basic Shadow DOM Functions

```tsx
// Initialize shadow DOM with CSS
initializeShadowDOM({
  css?: string;
  shadowHostId?: string;
}): Promise<ShadowRoot | null>

// Inject component into shadow DOM
injectComponent({
  containerId: string;
  component: React.ReactNode;
  zIndex?: number;
  isolate?: boolean;
  onError?: (error: Error) => void;
}): Promise<void>

// Update styles in shadow DOM
updateShadowDOMStyles(css: string): Promise<void>
```

## Next Steps

1. **Update your components** to use the CSS integration
2. **Test with your actual Tailwind config** to ensure styles apply correctly
3. **Verify cross-browser compatibility** (Chrome, Firefox, Safari)

The shadow DOM system now seamlessly integrates with your existing build process and Tailwind configuration, using a simplified approach that works everywhere! 🎉 