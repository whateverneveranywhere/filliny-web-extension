import { apiEndpoints } from '../../endpoints';
import type { DTOFillPayload, Field } from '../../types';
import { httpService } from '../../httpService';

const {
  auth: {
    ai: { AIFill },
  },
  // auth: { healthCheck },
} = apiEndpoints;

export const aiFillService = async (
  fillPayLoad: DTOFillPayload,
): Promise<{ data: Field[] } | ReadableStream<Uint8Array>> => {
  // const response = await httpService.requestViaBackground<{ data: Field[] } | ReadableStream<Uint8Array>>(AIFill, {
  //   method: 'POST',
  //   body: JSON.stringify(fillPayLoad),
  //   isStream: true,
  // });

  const response = await httpService.post<{ data: Field[] }>(AIFill, fillPayLoad, { isStream: true });

  if (response instanceof ReadableStream) {
    return response;
  } else if (response && typeof response === 'object' && 'data' in response) {
    return response;
  } else {
    throw new Error('Unexpected response type');
  }
};
