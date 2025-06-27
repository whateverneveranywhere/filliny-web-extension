import { getConfig } from "../../../utils/helpers.js";
import { apiEndpoints } from "../../endpoints.js";
import type { DTOFillPayload, Field } from "../../types/ai.js";

const {
  version,
  auth: {
    ai: { AIFill },
  },
  // auth: { healthCheck },
} = apiEndpoints;

export const aiFillService = async (
  fillPayLoad: DTOFillPayload,
): Promise<{ data: Field[] } | ReadableStream<Uint8Array>> => {
  const config = getConfig();
  const fullUrl = `${config.baseURL}${version}${AIFill}`;

  console.log("AI Service: Making request to:", fullUrl);
  console.log("AI Service: Payload:", fillPayLoad);

  const response = await chrome.runtime.sendMessage({
    type: "API_REQUEST",
    url: fullUrl,
    options: {
      method: "POST",
      body: JSON.stringify(fillPayLoad),
      headers: {
        "Content-Type": "application/json",
      },
      isStream: true,
    },
  });

  console.log("AI Service: Received response:", response);

  if (response.error) {
    console.error("AI Service: Error from background:", response.error);
    throw new Error(response.error);
  }

  // If it's a ReadableStream, return it directly for processing by the caller
  if (response.data instanceof ReadableStream) {
    console.log("AI Service: Got stream response");
    return response.data;
  }

  // If it's a regular response with data, return it in the expected format
  if (response.data && typeof response.data === "object") {
    console.log("AI Service: Got regular response:", response.data);
    return { data: response.data };
  }

  // If we got a success response from streaming, return an empty data array
  // This is fine because the streaming data has already been processed
  if (response.success === true) {
    console.log("AI Service: Got success response from streaming");
    return { data: [] };
  }

  console.error("AI Service: Unexpected response type:", response);
  throw new Error("Unexpected response type");
};
