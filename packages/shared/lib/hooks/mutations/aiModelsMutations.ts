import { useMutation } from '@tanstack/react-query';
import { updateDefaultModelService, updateModelConfigService } from '../../services';

export const useUpdateDefaultAIModelMutation = () =>
  useMutation({
    mutationFn: ({ defaultId }: { defaultId: string }) => updateDefaultModelService(defaultId),
    onSettled: (
      data,
      error,
      // variables, context
    ) => {
      if (error) {
        // toast({
        //   variant: 'destructive',
        //   title: error.message,
        // });
      }
    },
  });

export const useUpdateModelConfigMutation = () =>
  useMutation({
    mutationFn: (data: { modelId: string; accessToken: string; isDefaultModel?: boolean }) =>
      updateModelConfigService(data),
    onSettled: (
      data,
      error,
      // variables, context
    ) => {
      if (error) {
        // toast({
        //   variant: 'destructive',
        //   title: error.message,
        // });
      }
    },
  });
