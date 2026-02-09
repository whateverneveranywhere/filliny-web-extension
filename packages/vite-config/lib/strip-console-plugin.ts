import type { Plugin } from 'vite';

/**
 * Vite plugin that strips console.log, console.warn, console.info, and console.debug
 * from production builds. Preserves console.error.
 *
 * Works in all build modes (regular, lib, IIFE) by operating on the final rendered chunks.
 * Replaces calls with `void 0` to maintain valid syntax in expression contexts.
 */
export const stripConsolePlugin = (): Plugin => ({
  name: 'strip-console',
  apply: 'build',
  renderChunk(code) {
    // Match console.log/warn/info/debug calls including nested parentheses and template literals.
    // Supports up to 4 levels of nested parentheses.
    // Replaces with `void 0` to keep valid syntax in expression contexts
    // (e.g., `x || console.warn(...)` becomes `x || void 0`).
    const pattern =
      /\bconsole\s*\.\s*(?:log|warn|info|debug)\s*\((?:[^)(]*|\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\))*\)/g;
    const stripped = code.replace(pattern, 'void 0');
    return { code: stripped, map: null };
  },
});
