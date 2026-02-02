// Unified Shadow DOM utilities
export {
  UnifiedShadowDOMManager,
  unifiedShadowDOM,
  initializeShadowDOM,
  getShadowRoot,
  getContainer,
  injectComponent,
  cleanupContainer,
  cleanupShadowDOM,
  isShadowDOMReady,
  waitForShadowDOM,
  updateShadowDOMStyles,
  type ShadowContainerConfig,
  type ComponentInjectionConfig,
  type ShadowDOMInitConfig,
} from './unified-shadow-dom';

// File processing utilities
export {
  processPDF,
  processDOCX,
  processSpreadsheet,
  processTextFile,
  extractTextFromFile,
  detectFileType,
  isAcceptedFileType,
  DEFAULT_ACCEPTED_FILE_TYPES,
  type SupportedFileType,
} from './file-processing';
