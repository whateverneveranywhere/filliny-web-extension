/**
 * Tests for findServerDocument with the addServerDocument reuse feature.
 *
 * Covers:
 *  - Add document and find it
 *  - Add multiple documents, find specific ones
 *  - Added documents survive alongside setServerDocuments
 *  - clearServerDocuments also clears added documents
 *  - Partial filename matching with added documents
 *  - Case-insensitive matching with added documents
 *  - Match priority with added documents
 */
import './chrome-mock';

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setServerDocuments,
  clearServerDocuments,
  findServerDocument,
  addServerDocument,
} from '../components/filliny-button/search-button/serverDocumentContext.js';
import type { ServerDocumentInfo } from '../components/filliny-button/search-button/serverDocumentContext.js';

// ============================================================================
// Helper fixtures
// ============================================================================

const baseDoc = (id: number, filename: string, mimeType = 'application/pdf'): ServerDocumentInfo => ({
  docId: id,
  profileId: 'profile-1',
  websiteId: 'website-1',
  filename,
  mimeType,
});

const initialDocs: ServerDocumentInfo[] = [
  baseDoc(1, 'CoverLetter.pdf'),
  baseDoc(2, 'Resume_2024.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
];

// ============================================================================
// 1. Add document and find it
// ============================================================================
describe('addServerDocument and findServerDocument basic flow', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should find a newly added document by exact name', () => {
    addServerDocument(baseDoc(10, 'Generated-CL.pdf'));
    const result = findServerDocument('Generated-CL.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(10);
  });

  it('should find a newly added document by case-insensitive name', () => {
    addServerDocument(
      baseDoc(11, 'MyResume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    );
    const result = findServerDocument('myresume.docx');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(11);
  });

  it('should find a newly added document by partial name', () => {
    addServerDocument(baseDoc(12, 'Software-Engineer-Resume-2024.pdf'));
    const result = findServerDocument('resume');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(12);
  });

  it('should return null when no documents match', () => {
    addServerDocument(baseDoc(13, 'Report.pdf'));
    const result = findServerDocument('nonexistent.xlsx');
    expect(result).toBeNull();
  });

  it('should preserve all fields of added document when found', () => {
    const doc: ServerDocumentInfo = {
      docId: 14,
      profileId: 'prof-abc',
      websiteId: 'web-xyz',
      filename: 'Unique-Document.pdf',
      mimeType: 'application/pdf',
    };
    addServerDocument(doc);
    const result = findServerDocument('Unique-Document.pdf');
    expect(result).toEqual(doc);
  });
});

// ============================================================================
// 2. Add multiple documents, find specific ones
// ============================================================================
describe('findServerDocument with multiple added documents', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should find first added document among many', () => {
    addServerDocument(baseDoc(20, 'Alpha.pdf'));
    addServerDocument(baseDoc(21, 'Beta.pdf'));
    addServerDocument(baseDoc(22, 'Gamma.pdf'));

    const result = findServerDocument('Alpha.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(20);
  });

  it('should find middle added document among many', () => {
    addServerDocument(baseDoc(20, 'Alpha.pdf'));
    addServerDocument(baseDoc(21, 'Beta.pdf'));
    addServerDocument(baseDoc(22, 'Gamma.pdf'));

    const result = findServerDocument('Beta.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(21);
  });

  it('should find last added document among many', () => {
    addServerDocument(baseDoc(20, 'Alpha.pdf'));
    addServerDocument(baseDoc(21, 'Beta.pdf'));
    addServerDocument(baseDoc(22, 'Gamma.pdf'));

    const result = findServerDocument('Gamma.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(22);
  });

  it('should distinguish between similar filenames', () => {
    addServerDocument(baseDoc(30, 'Report-Q1.pdf'));
    addServerDocument(baseDoc(31, 'Report-Q2.pdf'));
    addServerDocument(baseDoc(32, 'Report-Q3.pdf'));

    expect(findServerDocument('Report-Q1.pdf')!.docId).toBe(30);
    expect(findServerDocument('Report-Q2.pdf')!.docId).toBe(31);
    expect(findServerDocument('Report-Q3.pdf')!.docId).toBe(32);
  });
});

// ============================================================================
// 3. Added documents survive alongside setServerDocuments
// ============================================================================
describe('added documents coexist with setServerDocuments', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should find both set and added documents', () => {
    setServerDocuments(initialDocs);
    addServerDocument(baseDoc(100, 'Extra-Generated.pdf'));

    expect(findServerDocument('CoverLetter.pdf')).not.toBeNull();
    expect(findServerDocument('Resume_2024.docx')).not.toBeNull();
    expect(findServerDocument('Extra-Generated.pdf')).not.toBeNull();
  });

  it('should find added document even after initial set', () => {
    setServerDocuments(initialDocs);
    addServerDocument(baseDoc(101, 'LateComer.pdf'));

    const result = findServerDocument('LateComer.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(101);
  });

  it('should still find set documents after adding new ones', () => {
    setServerDocuments(initialDocs);
    addServerDocument(baseDoc(102, 'New.pdf'));
    addServerDocument(baseDoc(103, 'Another.pdf'));

    // Original set documents are still findable
    expect(findServerDocument('CoverLetter.pdf')!.docId).toBe(1);
    expect(findServerDocument('Resume_2024.docx')!.docId).toBe(2);
  });

  it('should handle adding document with same filename as existing (first match wins)', () => {
    setServerDocuments([baseDoc(1, 'Document.pdf')]);
    addServerDocument(baseDoc(2, 'Document.pdf'));

    // Both are in the store; exact match returns the first one found
    const result = findServerDocument('Document.pdf');
    expect(result).not.toBeNull();
    // The first entry (from setServerDocuments) should be found first
    expect(result!.docId).toBe(1);
  });
});

// ============================================================================
// 4. clearServerDocuments also clears added documents
// ============================================================================
describe('clearServerDocuments clears added documents', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should clear all added documents', () => {
    addServerDocument(baseDoc(50, 'Added1.pdf'));
    addServerDocument(baseDoc(51, 'Added2.pdf'));
    clearServerDocuments();

    expect(findServerDocument('Added1.pdf')).toBeNull();
    expect(findServerDocument('Added2.pdf')).toBeNull();
  });

  it('should clear both set and added documents', () => {
    setServerDocuments(initialDocs);
    addServerDocument(baseDoc(52, 'Added.pdf'));
    clearServerDocuments();

    expect(findServerDocument('CoverLetter.pdf')).toBeNull();
    expect(findServerDocument('Resume_2024.docx')).toBeNull();
    expect(findServerDocument('Added.pdf')).toBeNull();
  });

  it('should allow adding documents after clear', () => {
    addServerDocument(baseDoc(60, 'Before.pdf'));
    clearServerDocuments();
    addServerDocument(baseDoc(61, 'After.pdf'));

    expect(findServerDocument('Before.pdf')).toBeNull();
    expect(findServerDocument('After.pdf')).not.toBeNull();
    expect(findServerDocument('After.pdf')!.docId).toBe(61);
  });
});

// ============================================================================
// 5. Partial filename matching with added documents
// ============================================================================
describe('partial matching with added documents', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should find added document by partial filename (document name contains search)', () => {
    addServerDocument(baseDoc(70, 'Company-X-Cover-Letter-2024.pdf'));
    const result = findServerDocument('cover-letter');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(70);
  });

  it('should find added document when search contains document filename', () => {
    addServerDocument(baseDoc(71, 'Resume.pdf'));
    const result = findServerDocument('path/to/resume.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(71);
  });

  it('should find set documents with partial match when added documents do not match', () => {
    setServerDocuments([baseDoc(1, 'CoverLetter.pdf')]);
    addServerDocument(baseDoc(80, 'TaxReturn.xlsx'));

    const result = findServerDocument('cover');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(1);
  });

  it('should handle partial match across set and added documents', () => {
    setServerDocuments([baseDoc(1, 'Engineering-Resume.pdf')]);
    addServerDocument(baseDoc(80, 'Marketing-Resume.pdf'));

    // "resume" partial matches both; first match (from set) should win
    const result = findServerDocument('resume');
    expect(result).not.toBeNull();
    // The first document in the array matches first
    expect(result!.docId).toBe(1);
  });
});

// ============================================================================
// 6. Case-insensitive matching with added documents
// ============================================================================
describe('case-insensitive matching with added documents', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should find added document case-insensitively', () => {
    addServerDocument(baseDoc(90, 'MyDocument.PDF'));
    const result = findServerDocument('mydocument.pdf');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(90);
  });

  it('should find added document with uppercase search', () => {
    addServerDocument(baseDoc(91, 'letter.docx'));
    const result = findServerDocument('LETTER.DOCX');
    expect(result).not.toBeNull();
    expect(result!.docId).toBe(91);
  });
});

// ============================================================================
// 7. setServerDocuments replaces all including previously added
// ============================================================================
describe('setServerDocuments replaces everything including added documents', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  it('should replace added documents when setServerDocuments is called', () => {
    addServerDocument(baseDoc(100, 'OldAdded.pdf'));
    setServerDocuments([baseDoc(200, 'NewSet.pdf')]);

    // The added document should be gone because setServerDocuments replaces the array
    expect(findServerDocument('OldAdded.pdf')).toBeNull();
    expect(findServerDocument('NewSet.pdf')).not.toBeNull();
    expect(findServerDocument('NewSet.pdf')!.docId).toBe(200);
  });

  it('should allow adding after re-setting', () => {
    addServerDocument(baseDoc(100, 'First.pdf'));
    setServerDocuments([baseDoc(200, 'Reset.pdf')]);
    addServerDocument(baseDoc(300, 'AfterReset.pdf'));

    expect(findServerDocument('First.pdf')).toBeNull();
    expect(findServerDocument('Reset.pdf')).not.toBeNull();
    expect(findServerDocument('AfterReset.pdf')).not.toBeNull();
  });
});
