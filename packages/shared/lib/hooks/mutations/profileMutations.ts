import {
  changeActiveFillingProfileService,
  createFillingProfileService,
  deleteFillingProfileByIdService,
  editFillingProfileService,
} from '../../services/api/Profiles/index.js';
import { invalidateProfileMutationQueries } from '../queryKeys.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DTOProfileFillingForm } from '@extension/storage';

/**
 * Mutation hook for changing the active filling profile
 * Invalidates profile list and dashboard queries on success
 */
export const useChangeActiveFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activeProfileId }: { activeProfileId: string }) =>
      changeActiveFillingProfileService(activeProfileId),
    onSuccess: async (_data, { activeProfileId }) => {
      // Use centralized invalidation helper
      await invalidateProfileMutationQueries(queryClient, activeProfileId);
    },
    onError: (error: Error) => {
      console.error('Failed to change active profile:', error.message);
    },
  });
};

/**
 * Mutation hook for deleting a profile by ID
 * Invalidates profile list and dashboard queries on success
 */
export const useDeleteProfileByIdMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFillingProfileByIdService(id),
    onSuccess: async (_data, { id }) => {
      // Use centralized invalidation helper
      await invalidateProfileMutationQueries(queryClient, id);
    },
    onError: (error: Error) => {
      console.error('Failed to delete profile:', error.message);
    },
  });
};

/**
 * Mutation hook for creating a new filling profile
 * Invalidates profile list and dashboard queries on success
 */
export const useCreateFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: { data: DTOProfileFillingForm }) => createFillingProfileService(data),
    onSuccess: async () => {
      // Use centralized invalidation helper (no specific profile ID for new profiles)
      await invalidateProfileMutationQueries(queryClient);
    },
    onError: (error: Error) => {
      console.error('Failed to create profile:', error.message);
    },
  });
};

/**
 * Mutation hook for editing an existing filling profile
 * Invalidates profile list, specific profile detail, and dashboard queries on success
 */
export const useEditFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DTOProfileFillingForm }) => editFillingProfileService(id, data),
    onSuccess: async (_data, { id }) => {
      // Use centralized invalidation helper with specific profile ID
      await invalidateProfileMutationQueries(queryClient, id);
    },
    onError: (error: Error) => {
      console.error('Failed to edit profile:', error.message);
    },
  });
};
