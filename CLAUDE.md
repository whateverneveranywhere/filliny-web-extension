# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm build:firefox` - Build for Firefox
- `pnpm zip` - Build and package extension for distribution
- `pnpm zip:firefox` - Build and package for Firefox
- `pnpm clean` - Clean all build artifacts and node_modules

### Quality Assurance
- `pnpm lint` - Run ESLint across all packages
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm e2e` - Run end-to-end tests

### Environment Management
- `pnpm set-global-env` - Set environment variables across packages
- `pnpm copy-env` - Copy environment files to packages
- `pnpm update-version <version>` - Update version across all packages

### Development Setup
Run `pnpm dev` to start development. This will:
1. Clean the dist folder
2. Build all packages in the correct order
3. Start file watching with hot reload
4. Serve the extension for Chrome development

For Firefox development, use `pnpm dev:firefox`.

## Project Architecture

### Monorepo Structure
This is a **Turborepo monorepo** with the following structure:
- `chrome-extension/` - Main Chrome extension manifest and background scripts
- `packages/` - Shared packages and utilities
- `pages/` - Chrome extension pages (popup, options, content scripts, etc.)
- `tests/` - End-to-end tests using WebdriverIO

### Key Packages
- `@extension/ui` - React UI components and form filling logic
- `@extension/shared` - Shared utilities, hooks, and services
- `@extension/storage` - Chrome storage API abstraction
- `@extension/i18n` - Internationalization support
- `@extension/hmr` - Hot Module Replacement for development

### Extension Context Architecture
The extension implements multiple Chrome extension contexts:
- **Background Service Worker**: `/chrome-extension/src/background/index.ts`
- **Content Scripts**: Multiple scripts for different purposes
  - `content/` - Core content script functionality
  - `content-ui/` - React UI injection into web pages
  - `content-runtime/` - Runtime content script injection
- **Popup**: Extension popup interface
- **Side Panel**: Modern Chrome side panel (Chrome 114+)
- **Options**: Extension settings page
- **DevTools**: Developer tools integration
- **New Tab**: Custom new tab page

### Core Feature: Form Filling
The main feature is AI-powered form filling through:
- **FillinyButton**: Draggable floating button injected into web pages
- **Field Detection**: Unified system for detecting form fields
- **Form Filling**: Intelligent form completion with various input types
- **FormsOverlay**: Visual overlay for form interaction management

### Environment Configuration
The extension supports multiple environments:
- **Development**: `localhost:3000` (local development)
- **Preview**: `dev.filliny-app.pages.dev` (staging)
- **Production**: `filliny.io` (live)

Environment is controlled via `VITE_WEBAPP_ENV` and CLI flags.

## Development Workflow

### Adding New Features
1. Determine which package the feature belongs to:
   - UI components → `packages/ui/`
   - Shared utilities → `packages/shared/`
   - Extension pages → `pages/`
   - Storage logic → `packages/storage/`

2. Follow existing patterns:
   - Use workspace dependencies (`workspace:*`)
   - Import from package entry points
   - Follow TypeScript strict mode
   - Use React 19 with hooks

3. Test across extension contexts:
   - Test in content scripts
   - Test in popup/options
   - Test in background service worker

### Working with Content Scripts
Content scripts have special considerations:
- Must handle Shadow DOM isolation
- Limited Chrome API access
- Communication with background script via message passing
- UI injection requires careful CSS scoping

### Package Management
- Use `pnpm i <package> -w` for root dependencies
- Use `pnpm i <package> -F <workspace>` for package-specific dependencies
- Workspace names can be shortened (e.g., `ui` instead of `@extension/ui`)

### Browser Compatibility
- Primary target: Chrome with Manifest V3
- Secondary target: Firefox with Manifest V2 compatibility
- Use `CLI_CEB_FIREFOX=true` for Firefox-specific builds

### Authentication & API
- Uses cookie-based authentication
- Environment-aware API endpoints
- Background script handles CORS for content scripts
- Storage syncs between extension contexts

## Testing

### E2E Testing
- Uses WebdriverIO with Chrome and Firefox drivers
- Tests are in `tests/e2e/specs/`
- Run with `pnpm e2e` after building with `pnpm zip`

### Extension Testing
- Load unpacked extension from `dist/` folder
- Test in multiple Chrome extension contexts
- Verify cross-context communication works

## Important Notes

### Security
- Extension has `<all_urls>` permissions for form detection
- Handles sensitive form data - ensure proper security practices
- Uses Chrome's isolated worlds for content script execution

### Performance
- Turbo builds are optimized for development speed
- Content scripts are bundled as IIFE for isolation
- HMR is implemented for fast development iteration

### Debugging
- Use Chrome DevTools for different extension contexts
- Background script: `chrome://extensions` → Inspect views
- Content scripts: Regular DevTools on target pages
- Popup/Options: Right-click → Inspect

When making changes to the extension, always test in all relevant contexts and ensure the form filling functionality works correctly across different websites.

## Code Quality Requirements

### Mandatory Quality Checks
Claude Code must **ALWAYS** run these commands after making any code changes:

1. **TypeScript Compilation**: `pnpm type-check`
   - Zero TypeScript errors are required
   - All type issues must be resolved before proceeding
   - Use proper types instead of `any` wherever possible

2. **ESLint Validation**: `pnpm lint`
   - Critical errors must be fixed immediately
   - Warnings should be addressed when possible
   - Follow the existing code style and patterns

3. **Code Formatting**: `pnpm format`
   - Ensure consistent code formatting across the project
   - Use Prettier for automatic formatting

4. **Build Verification**: `pnpm build`
   - All packages must compile successfully
   - No build errors are acceptable

### Code Quality Standards

#### Function Declarations
- Use function expressions instead of function declarations where required by ESLint
- Prefer arrow functions for simple utility functions
- Use async/await over Promise chains for better readability

#### TypeScript Best Practices
- Always provide explicit types for function parameters and return values
- Use proper type guards and assertions
- Avoid `any` types - use `unknown` or proper type definitions
- Handle nullable/undefined values correctly

#### Import/Export Standards
- Keep imports and exports organized and clean
- Avoid duplicate exports
- Place export statements at the end of files when required by ESLint
- Use proper module resolution patterns

#### Error Handling
- Always handle Promise rejections
- Use try-catch blocks for async operations
- Provide meaningful error messages and logging
- Handle edge cases gracefully

### Automated Quality Gates

The `.claude/settings.local.json` configuration ensures:
- Automated permission for quality commands
- Integration with development workflow
- Consistent quality checks across all changes

### Development Workflow Integration

**Before committing any changes:**
1. Run `pnpm type-check` - Must pass with zero errors
2. Run `pnpm lint` - Must address all critical errors
3. Run `pnpm format` - Ensure consistent formatting
4. Run `pnpm build` - Verify all packages compile successfully

**When encountering quality issues:**
1. Fix TypeScript errors immediately - they prevent compilation
2. Address ESLint errors before warnings
3. Maintain existing code patterns and conventions
4. Test changes in relevant extension contexts

### Continuous Quality Maintenance

- Monitor for new ESLint rules and TypeScript configurations
- Update quality standards as the project evolves
- Ensure all team members follow the same quality standards
- Use automated tools to maintain code quality consistently

This quality-first approach ensures the extension remains maintainable, secure, and performant across all environments and use cases.