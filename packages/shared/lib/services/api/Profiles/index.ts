import type {
  DTOFillingProfileItem,
  DTOpov,
  DTOProfileFillingForm,
  DTOSuggestedWebsite,
  DTOTone,
} from '@extension/storage';
import { apiEndpoints } from '../../endpoints';
import { httpService } from '../../httpService';

const {
  auth: {
    profiles: { profilesList, suggestedWebsites, povsList, tonesList, setActive, getById, base },
  },
} = apiEndpoints;

export const getProfilesListService = (): Promise<DTOFillingProfileItem[]> => httpService.get(profilesList);
export const getSuggestedWebsitesService = (): Promise<DTOSuggestedWebsite[]> => httpService.get(suggestedWebsites);
export const getTonesListService = (): Promise<DTOTone[]> => httpService.get(tonesList);
export const getPOVsListService = (): Promise<DTOpov[]> => httpService.get(povsList);
export const createFillingProfileService = (data: DTOProfileFillingForm): Promise<DTOProfileFillingForm> =>
  httpService.post(base, data);
export const editFillingProfileService = (profileId: string, data: DTOProfileFillingForm): Promise<object> =>
  httpService.put(`${base}/${profileId}`, data);
export const changeActiveFillingProfileService = (profileId: string): Promise<object> =>
  httpService.post(setActive(profileId));
export const getFillingProfileByIdService = (profileId: string): Promise<DTOProfileFillingForm> =>
  httpService.get(getById(profileId));
export const deleteFillingProfileByIdService = (profileId: string): Promise<object> =>
  httpService.delete(getById(profileId));
