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
      // Refetch the profile list query after a successful mutation
      queryClient.invalidateQueries({ queryKey: ['profileList'] });
    },
  });
};

export const useCreateFillingProfileMutation = () =>
  useMutation({
    mutationFn: ({ data }: { data: DTOProfileFillingForm }) => createFillingProfileService(data),
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

export const useEditFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DTOProfileFillingForm }) => editFillingProfileService(id, data),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['fillingProfileById', id] });
    },
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
};

export const useDeleteProfileByIdMutation = () => {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFillingProfileByIdService(id),
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
};
