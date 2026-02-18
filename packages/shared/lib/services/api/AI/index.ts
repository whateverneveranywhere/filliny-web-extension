import { MessageType } from '../../../types/enums.js';
import { getConfig } from '../../../utils/helpers.js';
import { apiEndpoints } from '../../endpoints.js';
import { ApiUnauthorizedError, ApiQuotaExceededError } from '../../httpService.js';
import { FieldSchema, detectQuotaErrorFromResponse } from '../../schemas/index.js';
import { authStorage } from '@extension/storage';
import { z } from 'zod';
import type { DTOFillPayload, Field } from '../../schemas/index.js';

const { ai } = apiEndpoints;

/**
 * AI Fill Service - sends form data to AI for intelligent form filling
 *
 * Uses the same authentication pattern as httpService.requestViaBackground:
 * 1. Gets auth token via authStorage.getWithFallback() (cookie first, then bearer token)
 * 2. Sends both Cookie and Authorization headers for Better Auth compatibility
 * 3. Includes X-Extension-ID header for extension identification
 * 4. Routes request through background script to handle CORS
 */
export const aiFillService = async (
  fillPayLoad: DTOFillPayload,
): Promise<{ data: Field[]; streaming?: boolean } | ReadableStream<Uint8Array>> => {
  const config = getConfig();
  // Use apiURL which already includes /api/v1, then append the endpoint path
  const fullUrl = `${config.apiURL}${ai.fill}`;

  // Get auth token - prioritizes bearer token, falls back to session cookie
  const authToken = await authStorage.getWithFallback();

  console.log('[AI Service] Auth token:', authToken ? `${authToken.substring(0, 20)}...` : 'empty');

  // Use Authorization header for authentication
  // Note: Cookie header is forbidden in service workers/fetch
  const authHeaders: Record<string, string> = {};
  if (authToken) {
    authHeaders['Authorization'] = `Bearer ${authToken}`;
    console.log('[AI Service] Auth header set (Bearer)');
  } else {
    console.warn('[AI Service] No auth token available - request may fail with 401');
  }

  // Use the same message structure as httpService.requestViaBackground
  // Note: Use string literal 'API_REQUEST' for consistency with httpService
  const message = {
    type: MessageType.API_REQUEST,
    url: fullUrl,
    options: {
      method: 'POST',
      body: JSON.stringify(fillPayLoad),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        // Include extension ID header like httpService does
        'X-Extension-ID': chrome.runtime.id,
      },
      isStream: true,
    },
  };

  console.log('[AI Service] Sending request to:', fullUrl);

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      // Handle Chrome runtime errors
      if (chrome.runtime.lastError) {
        console.error('[AI Service] Chrome runtime error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message || 'Chrome runtime error'));
        return;
      }

      // Handle API errors - using same error types as httpService for consistency
      if (response?.error) {
        console.error('[AI Service] API error:', response.error);
        const errorMessage = response.error;

        // Check for unauthorized errors
        const lowerError = errorMessage.toLowerCase();
        if (
          lowerError.includes('401') ||
          lowerError.includes('unauthorized') ||
          lowerError.includes('unauthenticated')
        ) {
          authStorage.set('').catch(err => console.error('[AI Service] Failed to clear auth token:', err));
          reject(new ApiUnauthorizedError('Unauthorized: Please log in again', 401));
          return;
        }

        // Check for quota/limit errors using structured detection
        const quotaErrorType = detectQuotaErrorFromResponse(errorMessage);
        if (quotaErrorType) {
          reject(new ApiQuotaExceededError(errorMessage, quotaErrorType));
          return;
        }

        // Check for other 403 errors
        if (lowerError.includes('403') || lowerError.includes('forbidden')) {
          reject(new ApiUnauthorizedError(errorMessage || 'Forbidden: Access denied', 403));
          return;
        }

        reject(new Error(errorMessage));
        return;
      }

      // If it's a ReadableStream, return it directly for processing by the caller
      if (response?.data instanceof ReadableStream) {
        resolve(response.data);
        return;
      }

      // If it's a regular response with data, validate and return it in the expected format
      if (response?.data) {
        const parseResult = z.array(FieldSchema).safeParse(response.data);
        if (parseResult.success) {
          resolve({ data: parseResult.data });
        } else {
          console.error('[AI Service] Response validation failed:', parseResult.error.errors);
          resolve({ data: [] });
        }
        return;
      }

      // If we got a success response from streaming, signal streaming mode
      // The actual data arrives via chrome.tabs.sendMessage (STREAM_CHUNK messages)
      if (response?.success === true) {
        resolve({ data: [], streaming: true });
        return;
      }

      // No valid response received
      console.error('[AI Service] Unexpected response:', response);
      reject(new Error('Unexpected response type from AI service'));
    });
  });
};
