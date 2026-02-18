import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import {
  DTOFillingProfileItemSchema,
  DTOSuggestedWebsiteSchema,
  DTOToneSchema,
  DTOPovSchema,
  DTOProfileFillingFormSchema,
  SuccessResponseSchema,
  EditProfileResponseSchema,
} from '../../schemas/index.js';
import { z } from 'zod';
import type { EditProfileResponse, ChangeActiveProfileResponse, DeleteProfileResponse } from '../../schemas/index.js';
import type {
  DTOFillingProfileItem,
  DTOPov,
  DTOProfileFillingForm,
  DTOSuggestedWebsite,
  DTOTone,
} from '@extension/storage';

const { profiles } = apiEndpoints;

/**
 * Transform profile data to match API schema (removes extra fields)
 * The API uses strict validation and rejects unknown fields like:
 * - createdAt, updatedAt, userId (profile level)
 * - createdAt, updatedAt, profileId (website level)
 * - id, profileId (preferences level)
 */
const transformProfileForApi = (data: DTOProfileFillingForm) => ({
  profileName: data.profileName,
  defaultFillingContext: data.defaultFillingContext,
  preferences: {
    isFormal: data.preferences.isFormal,
    isGapFillingAllowed: data.preferences.isGapFillingAllowed,
    povId: data.preferences.povId,
    toneId: data.preferences.toneId,
  },
  fillingWebsites: data.fillingWebsites.map(website => ({
    ...(website.id !== undefined && { id: website.id }),
    websiteUrl: website.websiteUrl,
    isRootLoad: website.isRootLoad,
    fillingContext: website.fillingContext || '',
  })),
});

export const getProfilesListService = (): Promise<DTOFillingProfileItem[]> =>
  httpService.get(profiles.list, { schema: z.array(DTOFillingProfileItemSchema) });
export const getSuggestedWebsitesService = (): Promise<DTOSuggestedWebsite[]> =>
  httpService.get(profiles.suggestedWebsites, { schema: z.array(DTOSuggestedWebsiteSchema) });
export const getTonesListService = (): Promise<DTOTone[]> =>
  httpService.get(profiles.tones, { schema: z.array(DTOToneSchema) });
export const getPOVsListService = (): Promise<DTOPov[]> =>
  httpService.get(profiles.povs, { schema: z.array(DTOPovSchema) });
export const createFillingProfileService = (data: DTOProfileFillingForm): Promise<DTOProfileFillingForm> =>
  httpService.post(profiles.create, transformProfileForApi(data), { schema: DTOProfileFillingFormSchema });
export const editFillingProfileService = (
  profileId: string,
  data: DTOProfileFillingForm,
): Promise<EditProfileResponse> =>
  httpService.put(profiles.update(profileId), transformProfileForApi(data), {
    schema: EditProfileResponseSchema,
  });
export const changeActiveFillingProfileService = (profileId: string): Promise<ChangeActiveProfileResponse> =>
  httpService.post(profiles.activate(profileId), undefined, { schema: SuccessResponseSchema });
export const getFillingProfileByIdService = (profileId: string): Promise<DTOProfileFillingForm> =>
  httpService.get(profiles.getById(profileId), { schema: DTOProfileFillingFormSchema });
export const deleteFillingProfileByIdService = (profileId: string): Promise<DeleteProfileResponse> =>
  httpService.delete(profiles.delete(profileId), { schema: SuccessResponseSchema });
