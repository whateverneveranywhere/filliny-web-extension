// Define reusable action types
export enum BackgroundActions {
  GET_AUTH_TOKEN = 'GET_AUTH_TOKEN',
  INVALID_ACTION = 'INVALID_ACTION',
  // Add future actions here
}

// Generic interface for action requests
interface ActionRequest<ActionType, Payload = undefined> {
  action: ActionType;
  payload?: Payload; // Optional payload to accommodate future actions
}

// Specific request interfaces for each action
export type GetAuthTokenRequest = ActionRequest<BackgroundActions.GET_AUTH_TOKEN>;
export type InvalidRequest = ActionRequest<BackgroundActions.INVALID_ACTION>;

// Union of all valid requests
export type Request = GetAuthTokenRequest | InvalidRequest;

// Generic interface for action responses
interface ActionResponse<SuccessData = undefined, ErrorData = undefined> {
  success?: SuccessData; // Data returned on success
  error?: ErrorData; // Error message returned on failure
}

// Define specific responses using the generic ActionResponse
export type GetAuthTokenResponse = ActionResponse<{ token: string | null }>;
export type ErrorResponse = ActionResponse<undefined, { error: string }>;
