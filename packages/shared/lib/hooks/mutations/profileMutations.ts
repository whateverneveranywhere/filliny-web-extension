import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changeActiveFillingProfileService,
  createFillingProfileService,
  deleteFillingProfileByIdService,
  editFillingProfileService,
} from '../../services';
import type { DTOProfileFillingForm } from '@extension/storage';

export const useChangeActiveFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activeProfileId }: { activeProfileId: string }) =>
      changeActiveFillingProfileService(activeProfileId),
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] }); // For dashboard stats
    },
  });
};

export const useDeleteProfileByIdMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFillingProfileByIdService(id),
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
};

export const useCreateFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: { data: DTOProfileFillingForm }) => createFillingProfileService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
};

export const useEditFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DTOProfileFillingForm }) => editFillingProfileService(id, data),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById', id] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
};
