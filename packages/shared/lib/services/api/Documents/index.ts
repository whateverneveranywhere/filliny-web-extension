import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import {
  DTOWebsiteDocumentSchema,
  DTOWebsiteDocumentListSchema,
  DTODocumentCreatedResponseSchema,
  DTOGenerateForFieldResponseSchema,
  SuccessResponseSchema,
} from '../../schemas/index.js';
import type {
  DTOWebsiteDocument,
  DTOWebsiteDocumentList,
  DTOCreateDocumentRequest,
  DTOGenerateDocumentRequest,
  DTOConvertDocumentRequest,
  DTODocumentCreatedResponse,
  DTOGenerateForFieldRequest,
  DTOGenerateForFieldResponse,
  SuccessResponse,
} from '../../schemas/index.js';

const { profiles } = apiEndpoints;

export const listDocumentsService = (profileId: string, websiteId: string): Promise<DTOWebsiteDocumentList> =>
  httpService.get(profiles.documents.list(profileId, websiteId), {
    schema: DTOWebsiteDocumentListSchema,
  });

export const createDocumentService = (
  profileId: string,
  websiteId: string,
  data: DTOCreateDocumentRequest,
): Promise<DTODocumentCreatedResponse> =>
  httpService.post(profiles.documents.create(profileId, websiteId), data, {
    schema: DTODocumentCreatedResponseSchema,
  });

export const getDocumentService = (profileId: string, websiteId: string, docId: string): Promise<DTOWebsiteDocument> =>
  httpService.get(profiles.documents.getById(profileId, websiteId, docId), {
    schema: DTOWebsiteDocumentSchema,
  });

export const deleteDocumentService = (profileId: string, websiteId: string, docId: string): Promise<SuccessResponse> =>
  httpService.delete(profiles.documents.delete(profileId, websiteId, docId), {
    schema: SuccessResponseSchema,
  });

export const uploadDocumentService = async (
  profileId: string,
  websiteId: string,
  docId: string,
  file: File,
): Promise<DTOWebsiteDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  return httpService.post(profiles.documents.upload(profileId, websiteId, docId), formData, {
    schema: DTOWebsiteDocumentSchema,
  });
};

export const downloadDocumentService = async (profileId: string, websiteId: string, docId: string): Promise<Blob> => {
  // Download returns binary stream, use raw fetch via httpService
  const response = await httpService.get(profiles.documents.download(profileId, websiteId, docId), { isStream: true });
  return response as unknown as Blob;
};

export const generateDocumentService = (
  profileId: string,
  websiteId: string,
  data: DTOGenerateDocumentRequest,
): Promise<DTOWebsiteDocument> =>
  httpService.post(profiles.documents.generate(profileId, websiteId), data, {
    schema: DTOWebsiteDocumentSchema,
    isStream: true,
  });

export const generateDocumentForFieldService = (
  profileId: string,
  websiteId: string,
  data: DTOGenerateForFieldRequest,
): Promise<DTOGenerateForFieldResponse> =>
  httpService.post(profiles.documents.generateForField(profileId, websiteId), data, {
    schema: DTOGenerateForFieldResponseSchema,
  });

export const convertDocumentService = (
  profileId: string,
  websiteId: string,
  docId: string,
  data: DTOConvertDocumentRequest,
): Promise<DTOWebsiteDocument> =>
  httpService.post(profiles.documents.convert(profileId, websiteId, docId), data, { schema: DTOWebsiteDocumentSchema });
