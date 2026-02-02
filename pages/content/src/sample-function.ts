import { createDebugLogger } from '@extension/shared';

const debug = createDebugLogger('SampleFunction');

export const sampleFunction = () => {
  debug.log('content script - sampleFunction() called from another module');
};
