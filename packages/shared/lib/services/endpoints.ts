/**
 * API Endpoints for the extension
 *
 * These paths match the filliny-app API route definitions.
 * All authenticated routes require session cookies to be sent.
 */
export const apiEndpoints = {
  version: '/api/v1',
  // Authentication routes (handled by Better Auth)
  auth: {
    base: '/auth',
  },
  // Profile management routes
  profiles: {
    base: '/profiles',
    list: '/profiles',
    create: '/profiles',
    getById: (id: string) => `/profiles/${id}`,
    update: (id: string) => `/profiles/${id}`,
    delete: (id: string) => `/profiles/${id}`,
    activate: (id: string) => `/profiles/${id}/activate`,
    websites: (id: string) => `/profiles/${id}/websites`,
    removeWebsite: (id: string, websiteId: string) => `/profiles/${id}/websites/${websiteId}`,
    // Options
    tones: '/profiles/tones',
    povs: '/profiles/povs',
    suggestedWebsites: '/profiles/suggested-websites',
  },
  // Dashboard routes (overview is at root, not under /dashboard)
  dashboard: {
    base: '/overview',
    overview: '/overview',
  },
  // AI routes
  ai: {
    base: '/ai',
    fill: '/ai/fill',
  },
  // Health check route
  healthCheck: '/auth-health',
} as const;
