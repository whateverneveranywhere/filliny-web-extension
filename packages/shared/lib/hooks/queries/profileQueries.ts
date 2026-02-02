import {
  getFillingProfileByIdService,
  getPOVsListService,
  getProfilesListService,
  getSuggestedWebsitesService,
  getTonesListService,
} from '../../services/api/Profiles/index.js';
import { useQuery } from '@tanstack/react-query';
import type { DTOTone, DTOPov } from '@extension/storage';

export const useProfilesListQuery = () =>
  useQuery({
    queryKey: ['profilesList'],
    queryFn: getProfilesListService,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: 'Failed to fetch profiles list',
    },
  });

export const useSuggestedWebsites = () =>
  useQuery({
    queryKey: ['recommendedWebsites'],
    queryFn: getSuggestedWebsitesService,
    staleTime: 30 * 60 * 1000, // 30 minutes - suggested websites don't change often
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: 'Failed to fetch suggested websites',
    },
  });

export const useFillingProfileById = (id: string) =>
  useQuery({
    queryKey: ['fillingProfileById', id],
    queryFn: () => getFillingProfileByIdService(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: 'Failed to fetch profile details',
    },
  });

export const useTonesListQuery = () =>
  useQuery({
    queryKey: ['tones'],
    queryFn: getTonesListService,
    select: (data: DTOTone[]) => data.map((item: DTOTone) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity, // Static data - tones rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: 'Failed to fetch tones list',
    },
  });

export const usePOVListQuery = () =>
  useQuery({
    queryKey: ['povs'],
    queryFn: getPOVsListService,
    select: (data: DTOPov[]) => data.map((item: DTOPov) => ({ label: item.label, value: String(item.id) })),
    staleTime: Infinity, // Static data - POVs rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    meta: {
      errorMessage: 'Failed to fetch POV list',
    },
  });
