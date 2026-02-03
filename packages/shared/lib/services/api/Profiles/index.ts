import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type { EditProfileResponse, ChangeActiveProfileResponse, DeleteProfileResponse } from '../../schemas/index.js';
import type {
  DTOFillingProfileItem,
  DTOPov,
  DTOProfileFillingForm,
  DTOSuggestedWebsite,
  DTOTone,
} from '@extension/storage';

const { profiles } = apiEndpoints;

export const getProfilesListService = (): Promise<DTOFillingProfileItem[]> => httpService.get(profiles.list);
export const getSuggestedWebsitesService = (): Promise<DTOSuggestedWebsite[]> => httpService.get(profiles.suggestedWebsites);
export const getTonesListService = (): Promise<DTOTone[]> => httpService.get(profiles.tones);
export const getPOVsListService = (): Promise<DTOPov[]> => httpService.get(profiles.povs);
export const createFillingProfileService = (data: DTOProfileFillingForm): Promise<DTOProfileFillingForm> =>
  httpService.post(profiles.create, data);
export const editFillingProfileService = (
  profileId: string,
  data: DTOProfileFillingForm,
): Promise<EditProfileResponse> => httpService.put(profiles.update(profileId), data);
export const changeActiveFillingProfileService = (profileId: string): Promise<ChangeActiveProfileResponse> =>
  httpService.post(profiles.activate(profileId));
export const getFillingProfileByIdService = (profileId: string): Promise<DTOProfileFillingForm> =>
  httpService.get(profiles.getById(profileId));
export const deleteFillingProfileByIdService = (profileId: string): Promise<DeleteProfileResponse> =>
  httpService.delete(profiles.delete(profileId));
