import { authStorage } from '@extension/storage';
import { MessageType } from '../../../types/enums.js';
import { getConfig } from '../../../utils/helpers.js';
import { apiEndpoints } from '../../endpoints.js';
import type { DTOFillPayload, Field } from '../../schemas/index.js';

const { ai } = apiEndpoints;

export const aiFillService = async (
  fillPayLoad: DTOFillPayload,
): Promise<{ data: Field[] } | ReadableStream<Uint8Array>> => {
  const config = getConfig();
  // Use apiURL which already includes /api/v1, then append the endpoint path
  const fullUrl = `${config.apiURL}${ai.fill}`;

  // Get auth token for API request
  const authToken = await authStorage.getWithFallback();

  const response = await chrome.runtime.sendMessage({
    type: MessageType.API_REQUEST,
    url: fullUrl,
    options: {
      method: 'POST',
      body: JSON.stringify(fillPayLoad),
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      isStream: true,
    },
  });

  if (response.error) {
    throw new Error(response.error);
  }

  // If it's a ReadableStream, return it directly for processing by the caller
  if (response.data instanceof ReadableStream) {
    return response.data;
  }

  // If it's a regular response with data, return it in the expected format
  if (response.data && typeof response.data === 'object') {
    return { data: response.data };
  }

  // If we got a success response from streaming, return an empty data array
  // This is fine because the streaming data has already been processed
  if (response.success === true) {
    return { data: [] };
  }

  throw new Error('Unexpected response type');
};
