/**
 * Auth types - these are re-exported from the centralized schemas
 *
 * IMPORTANT: All types should be inferred from Zod schemas in @extension/shared/lib/services/schemas
 * This file re-exports the types for backwards compatibility
 */

// Re-export types from centralized schemas
export type { AuthHealthCheckResponse as AuthHealthCheck } from '../schemas/index.js';
