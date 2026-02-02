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

const {
  auth: {
    profiles: { profilesList, suggestedWebsites, povsList, tonesList, setActive, getById, base },
  },
} = apiEndpoints;

export const getProfilesListService = (): Promise<DTOFillingProfileItem[]> => httpService.get(profilesList);
export const getSuggestedWebsitesService = (): Promise<DTOSuggestedWebsite[]> => httpService.get(suggestedWebsites);
export const getTonesListService = (): Promise<DTOTone[]> => httpService.get(tonesList);
export const getPOVsListService = (): Promise<DTOPov[]> => httpService.get(povsList);
export const createFillingProfileService = (data: DTOProfileFillingForm): Promise<DTOProfileFillingForm> =>
  httpService.post(base, data);
export const editFillingProfileService = (
  profileId: string,
  data: DTOProfileFillingForm,
): Promise<EditProfileResponse> => httpService.put(`${base}/${profileId}`, data);
export const changeActiveFillingProfileService = (profileId: string): Promise<ChangeActiveProfileResponse> =>
  httpService.post(setActive(profileId));
export const getFillingProfileByIdService = (profileId: string): Promise<DTOProfileFillingForm> =>
  httpService.get(getById(profileId));
export const deleteFillingProfileByIdService = (profileId: string): Promise<DeleteProfileResponse> =>
  httpService.delete(getById(profileId));
