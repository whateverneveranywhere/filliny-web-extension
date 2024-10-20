import { useQuery } from '@tanstack/react-query';
import {
  getFillingProfileByIdService,
  getPOVsListService,
  getProfilesListService,
  getSuggestedWebsitesService,
  getTonesListService,
} from '../../services/api/Profiles';

export const useProfilesListQuery = () =>
  useQuery({
    queryKey: ['profilesList'],
    queryFn: getProfilesListService,
  });

export const useSuggestedWebsites = () => {
  return useQuery({
    queryKey: ['recommendedWebsites'],
    queryFn: getSuggestedWebsitesService,
  });
};

export const useFillingProfileById = (id: string) => {
  return useQuery({
    queryKey: ['fillingProfileById', id],
    queryFn: () => getFillingProfileByIdService(id),
    enabled: !!id,
  });
};

export const useTonesListQuery = () => {
  return useQuery({
    queryKey: ['tones'],
    queryFn: getTonesListService,
    select: data => data.map(item => ({ label: item.label, value: String(item.id) })),
  });
};

export const usePOVListQuery = () => {
  return useQuery({
    queryKey: ['povs'],
    queryFn: getPOVsListService,
    select: data => data.map(item => ({ label: item.label, value: String(item.id) })),
  });
};
