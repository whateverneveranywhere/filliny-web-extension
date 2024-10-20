import { useQuery } from '@tanstack/react-query';
import { getAvailableAiModelsService, getModelConfigByIdService } from '../../services';

export const useAvailableAiModelsQuery = () =>
  useQuery({
    queryKey: ['availableModels'],
    queryFn: getAvailableAiModelsService,
  });

export const useModelConfigByIdQuery = (id: string) =>
  useQuery({
    queryKey: ['modelConfigById', id],
    queryFn: () => getModelConfigByIdService(id),
    enabled: !!id,
  });
