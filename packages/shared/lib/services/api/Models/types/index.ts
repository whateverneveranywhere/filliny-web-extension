export interface DTOAIModel {
  accessToken: string;
  isDefaultModel: boolean;
  id: number | string;
  name: string;
  requiresToken: boolean;
  slug: string;
  hasConfig: boolean;
}
