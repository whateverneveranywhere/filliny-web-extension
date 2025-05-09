import { useQuery } from "@tanstack/react-query";
import {
  getFillingProfileByIdService,
  getPOVsListService,
  getProfilesListService,
  getSuggestedWebsitesService,
  getTonesListService,
} from "../../services/api/Profiles/index.js";
import type { DTOTone, DTOpov } from "@extension/storage";

export const useProfilesListQuery = () =>
  useQuery({
    queryKey: ["profilesList"],
    queryFn: getProfilesListService,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

export const useSuggestedWebsites = () => {
  return useQuery({
    queryKey: ["recommendedWebsites"],
    queryFn: getSuggestedWebsitesService,
  });
};

export const useFillingProfileById = (id: string) => {
  return useQuery({
    queryKey: ["fillingProfileById", id],
    queryFn: () => getFillingProfileByIdService(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useTonesListQuery = () => {
  return useQuery({
    queryKey: ["tones"],
    queryFn: getTonesListService,
    select: (data: DTOTone[]) => data.map((item: DTOTone) => ({ label: item.label, value: String(item.id) })),
  });
};

export const usePOVListQuery = () => {
  return useQuery({
    queryKey: ["povs"],
    queryFn: getPOVsListService,
    select: (data: DTOpov[]) => data.map((item: DTOpov) => ({ label: item.label, value: String(item.id) })),
  });
};
