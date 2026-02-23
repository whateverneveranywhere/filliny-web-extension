/**
 * Tests for server document context module.
 *
 * Covers:
 *  - setServerDocuments / clearServerDocuments lifecycle
 *  - findServerDocument: exact match, case-insensitive match, partial match, no match
 *  - Edge cases: empty store, empty filename, multiple partial matches
 */
import './chrome-mock';

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setServerDocuments,
  clearServerDocuments,
  findServerDocument,
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
    filename: 'Resume_2024.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    docId: 3,
    profileId: 'profile-2',
    websiteId: 'website-2',
    filename: 'portfolio-screenshots.png',
    mimeType: 'image/png',
  },
];

// ============================================================================
// 1. setServerDocuments / clearServerDocuments lifecycle
// ============================================================================
describe('server document context lifecycle', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should store documents and make them findable', () => {
    setServerDocuments(createTestDocs());
    const result = findServerDocument('CoverLetter.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
  });

  it('should clear all documents', () => {
    setServerDocuments(createTestDocs());
    clearServerDocuments();
    const result = findServerDocument('CoverLetter.pdf');
    expect(result).toBeNull();
  });

  it('should replace previous documents on re-set', () => {
    setServerDocuments(createTestDocs());
    setServerDocuments([
      {
        docId: 99,
        profileId: 'p-new',
        websiteId: 'w-new',
        filename: 'NewDoc.pdf',
        mimeType: 'application/pdf',
      },
    ]);
    expect(findServerDocument('CoverLetter.pdf')).toBeNull();
    expect(findServerDocument('NewDoc.pdf')).not.toBeNull();
    expect(findServerDocument('NewDoc.pdf')!.docId).toBe(99);
  });

  it('should handle empty array', () => {
    setServerDocuments([]);
    expect(findServerDocument('anything.pdf')).toBeNull();
  });
});

// ============================================================================
// 2. findServerDocument - exact match
// ============================================================================
describe('findServerDocument exact match', () => {
  beforeEach(() => {
    setServerDocuments(createTestDocs());
  });

  it('should find document by exact filename', () => {
    const result = findServerDocument('CoverLetter.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
    expect(result!.filename).toBe('CoverLetter.pdf');
    expect(result!.profileId).toBe('profile-1');
    expect(result!.websiteId).toBe('website-1');
    expect(result!.mimeType).toBe('application/pdf');
  });

  it('should find second document by exact filename', () => {
    const result = findServerDocument('Resume_2024.docx');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(2);
  });

  it('should find third document by exact filename', () => {
    const result = findServerDocument('portfolio-screenshots.png');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(3);
  });
});

// ============================================================================
// 3. findServerDocument - case-insensitive match
// ============================================================================
describe('findServerDocument case-insensitive match', () => {
  beforeEach(() => {
    setServerDocuments(createTestDocs());
  });

  it('should find document with different casing', () => {
    const result = findServerDocument('coverletter.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
  });

  it('should find document with uppercase search', () => {
    const result = findServerDocument('RESUME_2024.DOCX');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(2);
  });

  it('should find document with mixed casing', () => {
    const result = findServerDocument('Portfolio-Screenshots.PNG');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(3);
  });
});

// ============================================================================
// 4. findServerDocument - partial match
// ============================================================================
describe('findServerDocument partial match', () => {
  beforeEach(() => {
    setServerDocuments(createTestDocs());
  });

  it('should find document when search contains document filename', () => {
    // "path/to/CoverLetter.pdf" contains "CoverLetter.pdf"
    const result = findServerDocument('path/to/coverletter.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
  });

  it('should find document when document filename contains search', () => {
    // "Resume_2024.docx" contains "resume"
    const result = findServerDocument('resume');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(2);
  });

  it('should find document by partial name match', () => {
    const result = findServerDocument('portfolio');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(3);
  });
});

// ============================================================================
// 5. findServerDocument - no match
// ============================================================================
describe('findServerDocument no match', () => {
  beforeEach(() => {
    setServerDocuments(createTestDocs());
  });

  it('should return null for non-existent filename', () => {
    expect(findServerDocument('nonexistent.pdf')).toBeNull();
  });

  it('should match first document for empty string via partial match', () => {
    // Empty string is included in any filename, so partial match returns first doc
    const result = findServerDocument('');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
  });

  it('should return null for completely unrelated name', () => {
    expect(findServerDocument('tax-returns-2025.xlsx')).toBeNull();
  });
});

// ============================================================================
// 6. findServerDocument - priority: exact > case-insensitive > partial
// ============================================================================
describe('findServerDocument match priority', () => {
  it('should prefer exact match over case-insensitive', () => {
    setServerDocuments([
      { docId: 1, profileId: 'p1', websiteId: 'w1', filename: 'Doc.pdf', mimeType: 'application/pdf' },
      { docId: 2, profileId: 'p1', websiteId: 'w1', filename: 'doc.pdf', mimeType: 'application/pdf' },
    ]);
    // Searching for "doc.pdf" should find docId 2 (exact) not docId 1
    const result = findServerDocument('doc.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(2);
  });

  it('should prefer case-insensitive match over partial', () => {
    setServerDocuments([
      { docId: 1, profileId: 'p1', websiteId: 'w1', filename: 'my-document.pdf', mimeType: 'application/pdf' },
      { docId: 2, profileId: 'p1', websiteId: 'w1', filename: 'Document.pdf', mimeType: 'application/pdf' },
    ]);
    // Searching for "document.pdf" should find docId 2 (case-insensitive) not docId 1 (partial)
    const result = findServerDocument('document.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(2);
  });
});

// ============================================================================
// 7. ServerDocumentInfo structure
// ============================================================================
describe('ServerDocumentInfo structure', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should preserve all fields from stored document', () => {
    const doc: ServerDocumentInfo = {
      docId: 42,
      profileId: 'profile-abc',
      websiteId: 'website-xyz',
      filename: 'tailored-cover-letter.pdf',
      mimeType: 'application/pdf',
    };
    setServerDocuments([doc]);
    const result = findServerDocument('tailored-cover-letter.pdf');
    expect(result).toEqual(doc);
  });
});
