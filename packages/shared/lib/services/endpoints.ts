export const apiEndpoints = {
  version: '/api/v1',
  auth: {
    base: '/auth',

    profiles: {
      get base() {
        return `${apiEndpoints.auth.base}/filling-profiles`;
      },

      get profilesList() {
        return `${this.base}`;
      },

      get suggestedWebsites() {
        return `${this.base}/suggested-websites`;
      },

      get povsList() {
        return `${this.base}/povs`;
      },

      get tonesList() {
        return `${this.base}/tones`;
      },

      setActive: (defaultId: string) => {
        return `${apiEndpoints.auth.profiles.base}/${defaultId}/activate`;
      },

      getById: (defaultId: string) => {
        return `${apiEndpoints.auth.profiles.base}/${defaultId}`;
      },
    },

    ai: {
      get base() {
        return `${apiEndpoints.auth.base}/ai`;
      },

      get AIBase() {
        return `${this.base}`;
      },

      get AIFill() {
        return `${this.base}/fill`;
      },
    },
  },

  get healthCheck() {
    return `/auth-health-check`;
  },
};
