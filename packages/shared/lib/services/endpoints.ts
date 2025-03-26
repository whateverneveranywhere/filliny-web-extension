export const apiEndpoints = {
  version: "/api/v1",
  auth: {
    base: "/auth",
    profiles: {
      base: `${"/auth"}/filling-profiles`,
      profilesList: `${"/auth"}/filling-profiles`,
      suggestedWebsites: `${"/auth"}/filling-profiles/suggested-websites`,
      povsList: `${"/auth"}/filling-profiles/povs`,
      tonesList: `${"/auth"}/filling-profiles/tones`,
      setActive: (defaultId: string) => `${"/auth"}/filling-profiles/${defaultId}/activate`,
      getById: (defaultId: string) => `${"/auth"}/filling-profiles/${defaultId}`,
    },
    dashboard: {
      base: `${"/auth"}/dashboard`,
      overview: `${"/auth"}/dashboard/overview`,
    },
    ai: {
      base: `${"/auth"}/ai`,
      AIBase: `${"/auth"}/ai`,
      AIFill: `${"/auth"}/ai/fill`,
    },
  },
  healthCheck: "/auth-health-check",
} as const;
