import deepmerge from "deepmerge";

/**
 * Gets the global UI styles content
 * This includes the base CSS styles that would be in @extension/ui/global.css
 * We define this statically to avoid build-time import issues with ?inline
 */
export const getGlobalUIStyles = (): string =>
  `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply filliny-border-border;
  }

  body {
    @apply filliny-bg-background filliny-text-foreground;
    margin: 0;
    padding: 0;
    box-sizing: border-box;

    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
      'Helvetica Neue', sans-serif;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}
`;

/**
 * Configuration for style merging
 */
export interface StyleMergeOptions {
  /** Whether to merge styles (default: true) */
  mergeStyles?: boolean;
  /** Whether to put global styles first (default: true) */
  globalStylesFirst?: boolean;
  /** Custom CSS to add after merging */
  additionalCSS?: string;
}

/**
 * Merges global UI styles with custom inline CSS
 * Uses string concatenation since CSS isn't a JavaScript object that can use deepmerge directly
 * However, we use deepmerge for any JavaScript configuration objects if needed
 */
export const mergeUIStyles = (customInlineCSS: string, options: StyleMergeOptions = {}): string => {
  const { mergeStyles = true, globalStylesFirst = true, additionalCSS = "" } = options;

  if (!mergeStyles) {
    return customInlineCSS;
  }

  const globalStyles = getGlobalUIStyles();

  // For CSS, we concatenate strings in the right order
  // Global styles first so they can be overridden by custom styles
  const mergedCSS = globalStylesFirst
    ? `${globalStyles}\n\n/* Custom styles */\n${customInlineCSS}\n\n/* Additional styles */\n${additionalCSS}`
    : `${customInlineCSS}\n\n/* Global UI styles */\n${globalStyles}\n\n/* Additional styles */\n${additionalCSS}`;

  return mergedCSS;
};

/**
 * Default style merge configuration
 * Can be extended with deepmerge for complex configurations
 */
export const defaultStyleMergeConfig: StyleMergeOptions = {
  mergeStyles: true,
  globalStylesFirst: true,
  additionalCSS: "",
};

/**
 * Merges style configurations using deepmerge
 */
export const mergeStyleConfig = (
  baseConfig: StyleMergeOptions,
  customConfig: Partial<StyleMergeOptions>,
): StyleMergeOptions => deepmerge(baseConfig, customConfig);
