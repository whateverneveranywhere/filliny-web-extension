import { apiEndpoints } from '../../endpoints';
// import { AuthHealthCheck } from './types';
import { httpService } from '../../httpService';
import type { DTOAIModel } from './types';

const {
  auth: {
    models: { availableModesl, getById, setDefault, setConfig },
  },
} = apiEndpoints;

export const getAvailableAiModelsService = (): Promise<DTOAIModel[]> => httpService.get(availableModesl);
export const getModelConfigByIdService = (id: string): Promise<DTOAIModel> => httpService.get(getById(id));
export const updateDefaultModelService = (defaultId: string): Promise<object> => httpService.put(setDefault(defaultId));
export const updateModelConfigService = (data: {
  modelId: string;
  accessToken: string;
  isDefaultModel?: boolean;
}): Promise<object> =>
  httpService.put(setConfig(data.modelId), {
    accessToken: data.accessToken,
    isDefaultModel: data.isDefaultModel,
  });
