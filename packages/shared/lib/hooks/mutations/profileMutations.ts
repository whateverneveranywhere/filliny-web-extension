import {
  changeActiveFillingProfileService,
  createFillingProfileService,
  deleteFillingProfileByIdService,
  editFillingProfileService,
} from '../../services/api/Profiles/index.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    onError: (error: Error) => {
      console.error('Failed to change active profile:', error.message);
    },
    onSettled: () => {
      // Ensure queries are refetched regardless of success or failure
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
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
    onError: (error: Error) => {
      console.error('Failed to delete profile:', error.message);
    },
    onSettled: () => {
      // Ensure profile list is refreshed regardless of outcome
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
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
    onError: (error: Error) => {
      console.error('Failed to create profile:', error.message);
    },
    onSettled: () => {
      // Ensure profile list is refreshed regardless of outcome
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
    },
  });
};

export const useEditFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DTOProfileFillingForm }) => editFillingProfileService(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById', id] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (error: Error) => {
      console.error('Failed to edit profile:', error.message);
    },
    onSettled: (_data, _error, { id }) => {
      // Ensure profile data is refreshed regardless of outcome
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById', id] });
    },
  });
};
