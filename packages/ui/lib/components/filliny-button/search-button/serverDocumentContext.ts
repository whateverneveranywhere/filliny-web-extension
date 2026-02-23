/**
 * Server Document Context
 *
 * Module-level store for server document metadata during a fill session.
 * Set in handleFormClick before AI fill starts, read in file.ts during injection.
 */

interface ServerDocumentInfo {
  docId: number;
  profileId: string;
  websiteId: string;
  filename: string;
  mimeType: string;
}

interface SessionContext {
  profileId: string;
  websiteId: string;
}

let sessionDocuments: ServerDocumentInfo[] = [];
let currentSessionContext: SessionContext | null = null;

/**
 * Set server documents for the current fill session.
 * Call before AI fill starts.
 */
const setServerDocuments = (docs: ServerDocumentInfo[]) => {
  sessionDocuments = docs;
};

/**
 * Clear server documents after fill session completes.
 */
const clearServerDocuments = () => {
  sessionDocuments = [];
};

/**
 * Set session context (profileId + websiteId) for the current fill session.
 * Needed by file generation service to know which profile/website to generate documents for.
 */
const setSessionContext = (profileId: string, websiteId: string) => {
  currentSessionContext = { profileId, websiteId };
};

/**
 * Get the current session context.
 */
const getSessionContext = (): SessionContext | null => currentSessionContext;

/**
 * Clear session context after fill session completes.
 */
const clearSessionContext = () => {
  currentSessionContext = null;
};

/**
 * Find a server document by filename match.
 * Returns the document info if found, null otherwise.
 */
const findServerDocument = (filename: string): ServerDocumentInfo | null => {
  // Exact match first
  const exact = sessionDocuments.find(doc => doc.filename === filename);
  if (exact) {
    return exact;
  }

  // Case-insensitive match
  const lower = filename.toLowerCase();
  const caseMatch = sessionDocuments.find(doc => doc.filename.toLowerCase() === lower);
  if (caseMatch) {
    return caseMatch;
  }

  // Partial match (filename contains document name or vice versa)
  const partial = sessionDocuments.find(
    doc => lower.includes(doc.filename.toLowerCase()) || doc.filename.toLowerCase().includes(lower),
  );
  return partial || null;
};

/**
 * Add a server document to the session (for reuse after generation).
 */
const addServerDocument = (doc: ServerDocumentInfo) => {
  sessionDocuments.push(doc);
};

export { setServerDocuments, clearServerDocuments, findServerDocument, addServerDocument };
export { setSessionContext, getSessionContext, clearSessionContext };
export type { ServerDocumentInfo, SessionContext };
