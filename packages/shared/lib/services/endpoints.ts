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
    // Authorized files
    files: {
      list: (profileId: string) => `/profiles/${profileId}/files`,
      create: (profileId: string) => `/profiles/${profileId}/files`,
      update: (profileId: string, fileId: string) => `/profiles/${profileId}/files/${fileId}`,
      delete: (profileId: string, fileId: string) => `/profiles/${profileId}/files/${fileId}`,
      confirm: (profileId: string, fileId: string) => `/profiles/${profileId}/files/${fileId}/confirm`,
      download: (profileId: string, fileId: string) => `/profiles/${profileId}/files/${fileId}/download`,
    },
    // Website documents
    documents: {
      list: (profileId: string, websiteId: string) => `/profiles/${profileId}/websites/${websiteId}/documents`,
      create: (profileId: string, websiteId: string) => `/profiles/${profileId}/websites/${websiteId}/documents`,
      generate: (profileId: string, websiteId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/generate`,
      getById: (profileId: string, websiteId: string, docId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/${docId}`,
      delete: (profileId: string, websiteId: string, docId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/${docId}`,
      upload: (profileId: string, websiteId: string, docId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/${docId}/upload`,
      download: (profileId: string, websiteId: string, docId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/${docId}/download`,
      convert: (profileId: string, websiteId: string, docId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/${docId}/convert`,
      generateForField: (profileId: string, websiteId: string) =>
        `/profiles/${profileId}/websites/${websiteId}/documents/generate-for-field`,
    },
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
  // Health check routes
  healthCheck: '/auth-health',
  /** Public health check endpoint - does not require authentication */
  publicHealth: '/health',
} as const;
