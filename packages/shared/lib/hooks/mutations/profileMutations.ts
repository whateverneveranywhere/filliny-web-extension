import {
  changeActiveFillingProfileService,
  createFillingProfileService,
  deleteFillingProfileByIdService,
  editFillingProfileService,
} from '../../services/api/Profiles/index.js';
import { invalidateProfileMutationQueries, queryKeys } from '../queryKeys.js';
import { profileStorage } from '@extension/storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DTOProfileFillingForm } from '@extension/storage';

/**
 * Mutation hook for changing the active filling profile
 * Invalidates profile list, all profile details, and dashboard queries on success
 */
export const useChangeActiveFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activeProfileId }: { activeProfileId: string }) =>
      changeActiveFillingProfileService(activeProfileId),
    retry: false, // Don't retry on 401 - user needs to re-authenticate
    onSuccess: async (_data, { activeProfileId }) => {
      // Invalidate all profile queries since active status changed affects all profiles
      await Promise.all([
        invalidateProfileMutationQueries(queryClient, activeProfileId),
        // Also invalidate all profile details since isActive changed
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
      ]);
    },
    onError: (error: Error) => {
      console.error('Failed to change active profile:', error.message);
      // Re-throw to allow components to handle the error
      throw error;
    },
  });
};

/**
 * Mutation hook for deleting a profile by ID
 * Removes profile from cache and invalidates related queries
 */
export const useDeleteProfileByIdMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFillingProfileByIdService(id),
    retry: false, // Don't retry on 401 - user needs to re-authenticate
    onSuccess: async (_data, { id }) => {
      // Remove the deleted profile from cache immediately
      queryClient.removeQueries({ queryKey: queryKeys.profile.detail(id) });
      // Use centralized invalidation helper
      await invalidateProfileMutationQueries(queryClient, id);
    },
    onError: (error: Error) => {
      console.error('Failed to delete profile:', error.message);
      // Re-throw to allow components to handle the error
      throw error;
    },
  });
};

/**
 * Mutation hook for creating a new filling profile
 * Immediately updates query cache for UI reactivity, then invalidates for eventual consistency
 * Returns the created profile data for immediate use
 */
export const useCreateFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: { data: DTOProfileFillingForm }) => createFillingProfileService(data),
    retry: false, // Don't retry on 401 - user needs to re-authenticate
    onSuccess: async createdProfile => {
      if (createdProfile?.id) {
        const profileId = String(createdProfile.id);

        // 1. Set in query cache for immediate detail access
        queryClient.setQueryData(queryKeys.profile.detail(profileId), createdProfile);

        // 2. Set in chrome storage BEFORE invalidation so useActiveProfile's
        //    storage fallback works immediately when queries re-render
        await profileStorage.setDefaultProfile(createdProfile);

        // 3. Set as active on server so refetched list returns isActive: true
        await changeActiveFillingProfileService(profileId).catch(err => {
          console.warn('Failed to set new profile as active:', err);
        });
      }
      // 4. Invalidate for eventual consistency (list, dashboard)
      await invalidateProfileMutationQueries(queryClient);
    },
    onError: (error: Error) => {
      console.error('Failed to create profile:', error.message);
      // Re-throw to allow components to handle the error
      throw error;
    },
  });
};

/**
 * Mutation hook for editing an existing filling profile
 * Immediately updates query cache for UI reactivity, then invalidates for eventual consistency
 */
export const useEditFillingProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DTOProfileFillingForm }) => editFillingProfileService(id, data),
    retry: false, // Don't retry on 401 - user needs to re-authenticate
    onSuccess: async (_data, { id, data }) => {
      // Immediately update cache so UI reacts without waiting for refetch
      queryClient.setQueryData(queryKeys.profile.detail(id), data);
      // Invalidate for eventual consistency with server data
      await invalidateProfileMutationQueries(queryClient, id);
    },
    onError: (error: Error) => {
      console.error('Failed to edit profile:', error.message);
      // Re-throw to allow components to handle the error
      throw error;
    },
  });
};
