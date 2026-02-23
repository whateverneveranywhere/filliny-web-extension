/**
 * Tests for session context features in serverDocumentContext.
 *
 * Covers:
 *  - setSessionContext / getSessionContext / clearSessionContext lifecycle
 *  - addServerDocument - adding documents to existing session
 *  - Integration: session context + server documents together
 *  - Edge cases: clearing one context doesn't affect the other
 */
import './chrome-mock';

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setServerDocuments,
  clearServerDocuments,
  findServerDocument,
  addServerDocument,
  setSessionContext,
  getSessionContext,
  clearSessionContext,
} from '../components/filliny-button/search-button/serverDocumentContext.js';
import type { ServerDocumentInfo } from '../components/filliny-button/search-button/serverDocumentContext.js';

// ============================================================================
// Helper fixtures
// ============================================================================

const createTestDocs = (): ServerDocumentInfo[] => [
  {
    docId: 1,
    profileId: 'profile-1',
    websiteId: 'website-1',
    filename: 'CoverLetter.pdf',
    mimeType: 'application/pdf',
  },
  {
    docId: 2,
    profileId: 'profile-1',
    websiteId: 'website-1',
    filename: 'Resume.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
];

// ============================================================================
// 1. setSessionContext / getSessionContext / clearSessionContext lifecycle
// ============================================================================
describe('session context lifecycle', () => {
  beforeEach(() => {
    clearSessionContext();
    clearServerDocuments();
  });

  it('should return null when no session context is set', () => {
    expect(getSessionContext()).toBeNull();
  });

  it('should store and retrieve session context', () => {
    setSessionContext('profile-1', 'website-1');
    const ctx = getSessionContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.profileId).toBe('profile-1');
    expect(ctx!.websiteId).toBe('website-1');
  });

  it('should overwrite previous session context on re-set', () => {
    setSessionContext('profile-1', 'website-1');
    setSessionContext('profile-2', 'website-2');
    const ctx = getSessionContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.profileId).toBe('profile-2');
    expect(ctx!.websiteId).toBe('website-2');
  });

  it('should clear session context', () => {
    setSessionContext('profile-1', 'website-1');
    clearSessionContext();
    expect(getSessionContext()).toBeNull();
  });

  it('should handle clearing already-clear context (no-op)', () => {
    clearSessionContext();
    expect(getSessionContext()).toBeNull();
    // Second clear should not throw
    clearSessionContext();
    expect(getSessionContext()).toBeNull();
  });

  it('should allow re-setting after clear', () => {
    setSessionContext('profile-1', 'website-1');
    clearSessionContext();
    setSessionContext('profile-3', 'website-3');
    const ctx = getSessionContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.profileId).toBe('profile-3');
  });
});

// ============================================================================
// 2. addServerDocument
// ============================================================================
describe('addServerDocument', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should add a document to an empty store', () => {
    addServerDocument({
      docId: 10,
      profileId: 'p1',
      websiteId: 'w1',
      filename: 'added.pdf',
      mimeType: 'application/pdf',
    });
    const result = findServerDocument('added.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(10);
  });

  it('should add a document alongside existing documents', () => {
    setServerDocuments(createTestDocs());
    addServerDocument({
      docId: 99,
      profileId: 'p1',
      websiteId: 'w1',
      filename: 'Extra.pdf',
      mimeType: 'application/pdf',
    });

    // Original docs still findable
    expect(findServerDocument('CoverLetter.pdf')).not.toBeNull();
    expect(findServerDocument('Resume.docx')).not.toBeNull();
    // New doc also findable
    expect(findServerDocument('Extra.pdf')).not.toBeNull();
    expect(findServerDocument('Extra.pdf')!.docId).toBe(99);
  });

  it('should allow adding multiple documents sequentially', () => {
    addServerDocument({
      docId: 1,
      profileId: 'p1',
      websiteId: 'w1',
      filename: 'first.pdf',
      mimeType: 'application/pdf',
    });
    addServerDocument({
      docId: 2,
      profileId: 'p1',
      websiteId: 'w1',
      filename: 'second.pdf',
      mimeType: 'application/pdf',
    });
    addServerDocument({
      docId: 3,
      profileId: 'p1',
      websiteId: 'w1',
      filename: 'third.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(findServerDocument('first.pdf')!.docId).toBe(1);
    expect(findServerDocument('second.pdf')!.docId).toBe(2);
    expect(findServerDocument('third.docx')!.docId).toBe(3);
  });

  it('should preserve all fields of the added document', () => {
    const doc: ServerDocumentInfo = {
      docId: 42,
      profileId: 'profile-abc',
      websiteId: 'website-xyz',
      filename: 'generated-cover-letter.pdf',
      mimeType: 'application/pdf',
    };
    addServerDocument(doc);
    const result = findServerDocument('generated-cover-letter.pdf');
    expect(result).toEqual(doc);
  });
});

// ============================================================================
// 3. Integration: session context + server documents together
// ============================================================================
describe('session context and server documents integration', () => {
  beforeEach(() => {
    clearSessionContext();
    clearServerDocuments();
  });

  it('should maintain both session context and server documents independently', () => {
    setSessionContext('profile-1', 'website-1');
    setServerDocuments(createTestDocs());

    expect(getSessionContext()).not.toBeNull();
    expect(getSessionContext()!.profileId).toBe('profile-1');
    expect(findServerDocument('CoverLetter.pdf')).not.toBeNull();
  });

  it('should allow adding documents that reference the session context', () => {
    setSessionContext('profile-1', 'website-1');
    setServerDocuments(createTestDocs());

    const ctx = getSessionContext()!;
    addServerDocument({
      docId: 100,
      profileId: ctx.profileId,
      websiteId: ctx.websiteId,
      filename: 'AI-Generated.pdf',
      mimeType: 'application/pdf',
    });

    const result = findServerDocument('AI-Generated.pdf');
    expect(result).not.toBeNull();
    expect(result!.profileId).toBe('profile-1');
    expect(result!.websiteId).toBe('website-1');
  });

  it('should simulate full fill session lifecycle', () => {
    // Session start: set context and documents
    setSessionContext('profile-1', 'website-1');
    setServerDocuments(createTestDocs());

    expect(getSessionContext()).not.toBeNull();
    expect(findServerDocument('CoverLetter.pdf')).not.toBeNull();

    // During fill: add generated document
    addServerDocument({
      docId: 50,
      profileId: 'profile-1',
      websiteId: 'website-1',
      filename: 'Generated-CL.pdf',
      mimeType: 'application/pdf',
    });
    expect(findServerDocument('Generated-CL.pdf')).not.toBeNull();

    // Session end: cleanup
    clearServerDocuments();
    clearSessionContext();

    expect(getSessionContext()).toBeNull();
    expect(findServerDocument('CoverLetter.pdf')).toBeNull();
    expect(findServerDocument('Generated-CL.pdf')).toBeNull();
  });
});

// ============================================================================
// 4. Edge cases: clearing one doesn't clear the other
// ============================================================================
describe('clearing session context vs server documents independence', () => {
  beforeEach(() => {
    clearSessionContext();
    clearServerDocuments();
  });

  it('should not clear server documents when clearing session context', () => {
    setSessionContext('profile-1', 'website-1');
    setServerDocuments(createTestDocs());

    clearSessionContext();

    expect(getSessionContext()).toBeNull();
    // Server documents should still be present
    expect(findServerDocument('CoverLetter.pdf')).not.toBeNull();
    expect(findServerDocument('Resume.docx')).not.toBeNull();
  });

  it('should not clear session context when clearing server documents', () => {
    setSessionContext('profile-1', 'website-1');
    setServerDocuments(createTestDocs());

    clearServerDocuments();

    // Session context should still be present
    expect(getSessionContext()).not.toBeNull();
    expect(getSessionContext()!.profileId).toBe('profile-1');
    // Server documents should be cleared
    expect(findServerDocument('CoverLetter.pdf')).toBeNull();
  });

  it('should handle multiple clear-and-set cycles', () => {
    // Cycle 1
    setSessionContext('p1', 'w1');
    setServerDocuments([
      { docId: 1, profileId: 'p1', websiteId: 'w1', filename: 'a.pdf', mimeType: 'application/pdf' },
    ]);
    expect(getSessionContext()!.profileId).toBe('p1');
    expect(findServerDocument('a.pdf')).not.toBeNull();

    // Clear only documents
    clearServerDocuments();
    expect(getSessionContext()!.profileId).toBe('p1');
    expect(findServerDocument('a.pdf')).toBeNull();

    // Cycle 2: new context but no documents
    setSessionContext('p2', 'w2');
    expect(getSessionContext()!.profileId).toBe('p2');
    expect(findServerDocument('a.pdf')).toBeNull();

    // Add document in new context
    addServerDocument({ docId: 2, profileId: 'p2', websiteId: 'w2', filename: 'b.pdf', mimeType: 'application/pdf' });
    expect(findServerDocument('b.pdf')).not.toBeNull();
    expect(findServerDocument('b.pdf')!.profileId).toBe('p2');

    // Full cleanup
    clearSessionContext();
    clearServerDocuments();
    expect(getSessionContext()).toBeNull();
    expect(findServerDocument('b.pdf')).toBeNull();
  });

  it('should handle session context with empty string profileId', () => {
    setSessionContext('', 'website-1');
    const ctx = getSessionContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.profileId).toBe('');
    expect(ctx!.websiteId).toBe('website-1');
  });

  it('should allow documents from different profiles to coexist', () => {
    addServerDocument({
      docId: 1,
      profileId: 'profile-a',
      websiteId: 'website-1',
      filename: 'from-a.pdf',
      mimeType: 'application/pdf',
    });
    addServerDocument({
      docId: 2,
      profileId: 'profile-b',
      websiteId: 'website-2',
      filename: 'from-b.pdf',
      mimeType: 'application/pdf',
    });

    const docA = findServerDocument('from-a.pdf');
    const docB = findServerDocument('from-b.pdf');
    expect(docA).not.toBeNull();
    expect(docB).not.toBeNull();
    expect(docA!.profileId).toBe('profile-a');
    expect(docB!.profileId).toBe('profile-b');
  });
});
