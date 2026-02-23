/**
 * Tests for server document integration in the AI fill pipeline.
 *
 * Tests the transformation logic from handleFormClick.ts that:
 *  1. Fetches server documents via listDocumentsService
 *  2. Filters by status=ready and presence of r2Filename/contentMarkdown
 *  3. Transforms them to DTOAuthorizedFileForAI with ID offset 10000
 *  4. Maps document types to categories (resume -> 'resume', others -> 'document')
 *  5. Stores metadata in serverDocumentContext for file.ts
 *  6. Clears metadata after fill session
 *
 * Also covers the end-to-end flow from document listing to file injection.
 */
import './chrome-mock';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Polyfill DataTransfer for jsdom (not natively available)
if (typeof globalThis.DataTransfer === 'undefined') {
  class MockDataTransferItemList {
    private _items: File[] = [];
    get length() {
      return this._items.length;
    }
    add(file: File) {
      this._items.push(file);
      return file;
    }
    [Symbol.iterator]() {
      return this._items[Symbol.iterator]();
    }
  }

  class MockFileList {
    private _files: File[];
    constructor(files: File[]) {
      this._files = files;
    }
    get length() {
      return this._files.length;
    }
    item(index: number) {
      return this._files[index] || null;
    }
    [Symbol.iterator]() {
      return this._files[Symbol.iterator]();
    }
  }

  globalThis.DataTransfer = class DataTransfer {
    items: MockDataTransferItemList;
    private _files: File[] = [];
    constructor() {
      this.items = new MockDataTransferItemList();
    }
    get files(): FileList {
      const files = Array.from(this.items as unknown as Iterable<File>);
      return new MockFileList(files) as unknown as FileList;
    }
  } as unknown as typeof DataTransfer;
}
import {
  setServerDocuments,
  clearServerDocuments,
  findServerDocument,
} from '../components/filliny-button/search-button/serverDocumentContext.js';
import type { ServerDocumentInfo } from '../components/filliny-button/search-button/serverDocumentContext.js';
import { createRealisticFile } from '../components/filliny-button/search-button/field-types/file.js';

// ============================================================================
// Types that mirror the API response (from extension schemas)
// ============================================================================

interface ServerDocument {
  id: number;
  documentType: 'cover_letter' | 'resume' | 'custom';
  status: 'draft' | 'generating' | 'ready' | 'failed';
  title: string;
  contentMarkdown: string | null;
  r2Filename: string | null;
  r2Filesize: number | null;
  r2MimeType: string | null;
  modelName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface DTOAuthorizedFileForAI {
  id: number;
  filename: string;
  description: string;
  useCases: string;
  category: 'resume' | 'photo' | 'certificate' | 'document' | 'other';
  mimeType: string;
  fileSize: number;
}

// ============================================================================
// Replicate exact transformation logic from handleFormClick.ts (lines 227-241)
// ============================================================================

const filterReadyDocuments = (docs: ServerDocument[]): ServerDocument[] =>
  docs.filter(doc => doc.status === 'ready' && (doc.r2Filename || doc.contentMarkdown));

const transformServerDocsToAuthorizedFiles = (docs: ServerDocument[]): DTOAuthorizedFileForAI[] =>
  docs.map(doc => ({
    id: 10000 + doc.id,
    filename: doc.r2Filename || `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`,
    description: `Server document: ${doc.title} (${doc.documentType})`,
    useCases:
      doc.documentType === 'cover_letter'
        ? 'Upload as cover letter to file input fields'
        : doc.documentType === 'resume'
          ? 'Upload as resume/CV to file input fields'
          : `Upload as ${doc.documentType} document to file input fields`,
    category: doc.documentType === 'resume' ? 'resume' : 'document',
    mimeType: doc.r2MimeType || 'application/pdf',
    fileSize: doc.r2Filesize || 0,
  }));

const transformServerDocsToContextMetadata = (
  docs: ServerDocument[],
  profileId: string,
  websiteId: string,
): ServerDocumentInfo[] =>
  docs.map(doc => ({
    docId: doc.id,
    profileId,
    websiteId,
    filename: doc.r2Filename || `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`,
    mimeType: doc.r2MimeType || 'application/pdf',
  }));

// ============================================================================
// Test fixtures
// ============================================================================

const createMockServerDocuments = (): ServerDocument[] => [
  {
    id: 1,
    documentType: 'cover_letter',
    status: 'ready',
    title: 'Google Cover Letter',
    contentMarkdown: '# Cover Letter\n\nDear Hiring Manager...',
    r2Filename: 'Google-Cover-Letter.pdf',
    r2Filesize: 52000,
    r2MimeType: 'application/pdf',
    modelName: 'gemini-2.5-flash',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:05:00Z',
  },
  {
    id: 2,
    documentType: 'resume',
    status: 'ready',
    title: 'Software Engineer Resume',
    contentMarkdown: '# John Doe\n\n## Experience...',
    r2Filename: 'SWE-Resume.pdf',
    r2Filesize: 85000,
    r2MimeType: 'application/pdf',
    modelName: 'gemini-2.5-flash',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:10:00Z',
  },
  {
    id: 3,
    documentType: 'custom',
    status: 'draft',
    title: 'Work In Progress',
    contentMarkdown: null,
    r2Filename: null,
    r2Filesize: null,
    r2MimeType: null,
    modelName: null,
    createdAt: '2026-01-20T12:00:00Z',
    updatedAt: '2026-01-20T12:00:00Z',
  },
  {
    id: 4,
    documentType: 'cover_letter',
    status: 'generating',
    title: 'Still Generating',
    contentMarkdown: null,
    r2Filename: null,
    r2Filesize: null,
    r2MimeType: null,
    modelName: 'gemini-2.5-flash',
    createdAt: '2026-01-20T13:00:00Z',
    updatedAt: '2026-01-20T13:00:00Z',
  },
  {
    id: 5,
    documentType: 'custom',
    status: 'failed',
    title: 'Failed Generation',
    contentMarkdown: null,
    r2Filename: null,
    r2Filesize: null,
    r2MimeType: null,
    modelName: 'gemini-2.5-flash',
    createdAt: '2026-01-20T14:00:00Z',
    updatedAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 6,
    documentType: 'custom',
    status: 'ready',
    title: 'Markdown Only Doc',
    contentMarkdown: '# Custom Document\n\nSome content...',
    r2Filename: null,
    r2Filesize: null,
    r2MimeType: null,
    modelName: 'gemini-2.5-flash',
    createdAt: '2026-01-22T09:00:00Z',
    updatedAt: '2026-01-22T09:05:00Z',
  },
];

// ============================================================================
// 1. Filtering server documents by status and content availability
// ============================================================================
describe('server document filtering (status=ready with content)', () => {
  const allDocs = createMockServerDocuments();

  it('should only include documents with status=ready', () => {
    const filtered = filterReadyDocuments(allDocs);
    filtered.forEach(doc => {
      expect(doc.status).toBe('ready');
    });
  });

  it('should filter out draft documents', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered.find(d => d.id === 3)).toBeUndefined(); // draft
  });

  it('should filter out generating documents', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered.find(d => d.id === 4)).toBeUndefined(); // generating
  });

  it('should filter out failed documents', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered.find(d => d.id === 5)).toBeUndefined(); // failed
  });

  it('should include ready documents with r2Filename', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered.find(d => d.id === 1)).toBeDefined(); // has r2Filename
    expect(filtered.find(d => d.id === 2)).toBeDefined(); // has r2Filename
  });

  it('should include ready documents with contentMarkdown only (no r2Filename)', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered.find(d => d.id === 6)).toBeDefined(); // has contentMarkdown, no r2Filename
  });

  it('should return exactly 3 documents from the test fixture', () => {
    const filtered = filterReadyDocuments(allDocs);
    expect(filtered).toHaveLength(3);
    expect(filtered.map(d => d.id).sort()).toEqual([1, 2, 6]);
  });

  it('should return empty array when no documents are ready', () => {
    const noneReady: ServerDocument[] = [
      { ...allDocs[2] }, // draft
      { ...allDocs[3] }, // generating
      { ...allDocs[4] }, // failed
    ];
    expect(filterReadyDocuments(noneReady)).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    expect(filterReadyDocuments([])).toHaveLength(0);
  });
});

// ============================================================================
// 2. Transformation to DTOAuthorizedFileForAI
// ============================================================================
describe('server document to DTOAuthorizedFileForAI transformation', () => {
  const readyDocs = filterReadyDocuments(createMockServerDocuments());

  it('should offset IDs by 10000 to avoid collision with local files', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    result.forEach(file => {
      expect(file.id).toBeGreaterThanOrEqual(10000);
    });
    expect(result.find(f => f.id === 10001)).toBeDefined(); // doc id 1
    expect(result.find(f => f.id === 10002)).toBeDefined(); // doc id 2
    expect(result.find(f => f.id === 10006)).toBeDefined(); // doc id 6
  });

  it('should use r2Filename when available', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    expect(coverLetter!.filename).toBe('Google-Cover-Letter.pdf');
  });

  it('should generate filename from title when r2Filename is null', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const markdownDoc = result.find(f => f.id === 10006);
    expect(markdownDoc!.filename).toBe('markdown-only-doc.md');
  });

  it('should set description with title and document type', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    expect(coverLetter!.description).toBe('Server document: Google Cover Letter (cover_letter)');
  });

  it('should set cover_letter useCases', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    expect(coverLetter!.useCases).toBe('Upload as cover letter to file input fields');
  });

  it('should set resume useCases', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const resume = result.find(f => f.id === 10002);
    expect(resume!.useCases).toBe('Upload as resume/CV to file input fields');
  });

  it('should set custom useCases', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const custom = result.find(f => f.id === 10006);
    expect(custom!.useCases).toBe('Upload as custom document to file input fields');
  });

  it('should categorize resume documents as resume', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const resume = result.find(f => f.id === 10002);
    expect(resume!.category).toBe('resume');
  });

  it('should categorize non-resume documents as document', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    const custom = result.find(f => f.id === 10006);
    expect(coverLetter!.category).toBe('document');
    expect(custom!.category).toBe('document');
  });

  it('should use r2MimeType when available', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    expect(coverLetter!.mimeType).toBe('application/pdf');
  });

  it('should default mimeType to application/pdf when r2MimeType is null', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const markdownDoc = result.find(f => f.id === 10006);
    expect(markdownDoc!.mimeType).toBe('application/pdf');
  });

  it('should use r2Filesize when available', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const coverLetter = result.find(f => f.id === 10001);
    expect(coverLetter!.fileSize).toBe(52000);
  });

  it('should default fileSize to 0 when r2Filesize is null', () => {
    const result = transformServerDocsToAuthorizedFiles(readyDocs);
    const markdownDoc = result.find(f => f.id === 10006);
    expect(markdownDoc!.fileSize).toBe(0);
  });
});

// ============================================================================
// 3. Server document context metadata transformation
// ============================================================================
describe('server document context metadata transformation', () => {
  const readyDocs = filterReadyDocuments(createMockServerDocuments());

  it('should transform to ServerDocumentInfo with correct fields', () => {
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'profile-123', 'website-456');
    expect(metadata).toHaveLength(3);
    metadata.forEach(doc => {
      expect(doc.profileId).toBe('profile-123');
      expect(doc.websiteId).toBe('website-456');
      expect(doc.docId).toBeGreaterThan(0);
      expect(doc.filename).toBeTruthy();
      expect(doc.mimeType).toBeTruthy();
    });
  });

  it('should use r2Filename when available', () => {
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'p1', 'w1');
    const doc1 = metadata.find(d => d.docId === 1);
    expect(doc1!.filename).toBe('Google-Cover-Letter.pdf');
  });

  it('should generate filename from title when r2Filename is null', () => {
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'p1', 'w1');
    const doc6 = metadata.find(d => d.docId === 6);
    expect(doc6!.filename).toBe('markdown-only-doc.md');
  });

  it('should default mimeType to application/pdf when r2MimeType is null', () => {
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'p1', 'w1');
    const doc6 = metadata.find(d => d.docId === 6);
    expect(doc6!.mimeType).toBe('application/pdf');
  });
});

// ============================================================================
// 4. Combining local files with server documents
// ============================================================================
describe('combining local and server authorized files', () => {
  it('should not have ID collisions between local and server files', () => {
    // Local files use sequential IDs starting from 0
    const localFiles: DTOAuthorizedFileForAI[] = [
      {
        id: 0,
        filename: 'local-resume.pdf',
        description: 'Local file',
        useCases: 'PDF upload',
        category: 'document',
        mimeType: 'application/pdf',
        fileSize: 10000,
      },
      {
        id: 1,
        filename: 'local-photo.jpg',
        description: 'Local file',
        useCases: 'Image upload',
        category: 'photo',
        mimeType: 'image/jpeg',
        fileSize: 5000,
      },
    ];

    // Server files use IDs starting from 10000
    const serverFiles = transformServerDocsToAuthorizedFiles(filterReadyDocuments(createMockServerDocuments()));

    const combined = [...localFiles, ...serverFiles];

    // Check no ID collisions
    const ids = combined.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // All local IDs < 10000, all server IDs >= 10000
    localFiles.forEach(f => expect(f.id).toBeLessThan(10000));
    serverFiles.forEach(f => expect(f.id).toBeGreaterThanOrEqual(10000));
  });

  it('should preserve all files in combined array', () => {
    const localFiles: DTOAuthorizedFileForAI[] = [
      {
        id: 0,
        filename: 'local.pdf',
        description: 'Local',
        useCases: 'Upload',
        category: 'document',
        mimeType: 'application/pdf',
        fileSize: 1000,
      },
    ];
    const serverFiles = transformServerDocsToAuthorizedFiles(filterReadyDocuments(createMockServerDocuments()));

    const combined = [...localFiles, ...serverFiles];
    expect(combined).toHaveLength(1 + 3); // 1 local + 3 server (ready docs)
  });
});

// ============================================================================
// 5. Title to filename conversion
// ============================================================================
describe('title to filename conversion for markdown-only documents', () => {
  const convertTitleToFilename = (title: string): string => `${title.replace(/\s+/g, '-').toLowerCase()}.md`;

  it('should convert spaces to hyphens', () => {
    expect(convertTitleToFilename('My Cover Letter')).toBe('my-cover-letter.md');
  });

  it('should convert to lowercase', () => {
    expect(convertTitleToFilename('Software Engineer Resume')).toBe('software-engineer-resume.md');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(convertTitleToFilename('A   Document   Title')).toBe('a-document-title.md');
  });

  it('should handle single word titles', () => {
    expect(convertTitleToFilename('Resume')).toBe('resume.md');
  });

  it('should add .md extension', () => {
    const result = convertTitleToFilename('Any Title');
    expect(result.endsWith('.md')).toBe(true);
  });
});

// ============================================================================
// 6. End-to-end: server documents flow through full pipeline
// ============================================================================
describe('end-to-end: server documents through full fill pipeline', () => {
  beforeEach(() => {
    clearServerDocuments();
  });

  afterEach(() => {
    clearServerDocuments();
  });

  it('should complete full flow from server doc list to file creation', () => {
    // Step 1: Simulate API response with server documents
    const serverDocs = createMockServerDocuments();

    // Step 2: Filter ready documents
    const readyDocs = filterReadyDocuments(serverDocs);
    expect(readyDocs).toHaveLength(3);

    // Step 3: Transform to authorized files for AI context
    const authorizedFiles = transformServerDocsToAuthorizedFiles(readyDocs);
    expect(authorizedFiles).toHaveLength(3);

    // Step 4: Store metadata in serverDocumentContext
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'p1', 'w1');
    setServerDocuments(metadata);

    // Step 5: AI suggests a filename matching a server document
    const suggestedFilename = 'Google-Cover-Letter.pdf';
    const serverDoc = findServerDocument(suggestedFilename);
    expect(serverDoc).not.toBeNull();
    expect(serverDoc!.docId).toBe(1);
    expect(serverDoc!.profileId).toBe('p1');
    expect(serverDoc!.websiteId).toBe('w1');

    // Step 6: Simulate blob download and create File
    const blob = new Blob(['%PDF-1.4\ntest content'], { type: 'application/pdf' });
    const file = new File([blob], serverDoc!.filename, { type: serverDoc!.mimeType });
    expect(file.name).toBe('Google-Cover-Letter.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file).toBeInstanceOf(File);
    // Note: DOM injection via programmaticSetFiles is not testable in jsdom
    // due to DataTransfer/FileList limitation. Real browser e2e tests cover this.
  });

  it('should handle markdown-only document with generated filename', () => {
    const serverDocs = createMockServerDocuments();
    const readyDocs = filterReadyDocuments(serverDocs);
    const metadata = transformServerDocsToContextMetadata(readyDocs, 'p1', 'w1');
    setServerDocuments(metadata);

    // AI suggests the generated filename for the markdown-only doc
    const serverDoc = findServerDocument('markdown-only-doc.md');
    expect(serverDoc).not.toBeNull();
    expect(serverDoc!.docId).toBe(6);

    // Create a realistic fallback file (since markdown docs might not have R2 files)
    const file = createRealisticFile('markdown-only-doc.md', 'text/markdown');
    expect(file.name).toBe('markdown-only-doc.md');
    expect(file).toBeInstanceOf(File);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should handle resume document with correct category', () => {
    const serverDocs = createMockServerDocuments();
    const readyDocs = filterReadyDocuments(serverDocs);
    const authorizedFiles = transformServerDocsToAuthorizedFiles(readyDocs);

    // Resume doc should have 'resume' category
    const resumeFile = authorizedFiles.find(f => f.id === 10002);
    expect(resumeFile!.category).toBe('resume');
    expect(resumeFile!.useCases).toContain('resume');
    expect(resumeFile!.filename).toBe('SWE-Resume.pdf');

    // Cover letter should have 'document' category
    const coverLetterFile = authorizedFiles.find(f => f.id === 10001);
    expect(coverLetterFile!.category).toBe('document');
    expect(coverLetterFile!.useCases).toContain('cover letter');
  });

  it('should properly clean up between fill sessions', () => {
    // Session 1: Website A
    const docs1 = filterReadyDocuments(createMockServerDocuments());
    setServerDocuments(transformServerDocsToContextMetadata(docs1, 'p1', 'website-a'));

    expect(findServerDocument('Google-Cover-Letter.pdf')).not.toBeNull();
    expect(findServerDocument('Google-Cover-Letter.pdf')!.websiteId).toBe('website-a');

    // Cleanup
    clearServerDocuments();

    // Session 2: Website B (different documents)
    setServerDocuments([
      { docId: 99, profileId: 'p1', websiteId: 'website-b', filename: 'New-CL.pdf', mimeType: 'application/pdf' },
    ]);

    // Old session docs should not be found
    expect(findServerDocument('Google-Cover-Letter.pdf')).toBeNull();
    // New session doc should be found
    expect(findServerDocument('New-CL.pdf')).not.toBeNull();
    expect(findServerDocument('New-CL.pdf')!.websiteId).toBe('website-b');

    clearServerDocuments();
  });
});

// ============================================================================
// 7. Edge cases
// ============================================================================
describe('server document edge cases', () => {
  afterEach(() => {
    clearServerDocuments();
  });

  it('should handle documents with special characters in title', () => {
    const docs: ServerDocument[] = [
      {
        id: 10,
        documentType: 'custom',
        status: 'ready',
        title: "John's   Cover   Letter (2026)",
        contentMarkdown: 'content',
        r2Filename: null,
        r2Filesize: null,
        r2MimeType: null,
        modelName: null,
        createdAt: null,
        updatedAt: null,
      },
    ];
    const result = transformServerDocsToAuthorizedFiles(docs);
    expect(result[0].filename).toBe("john's-cover-letter-(2026).md");
  });

  it('should handle documents with very long titles', () => {
    const longTitle = 'A'.repeat(500);
    const docs: ServerDocument[] = [
      {
        id: 11,
        documentType: 'custom',
        status: 'ready',
        title: longTitle,
        contentMarkdown: 'content',
        r2Filename: null,
        r2Filesize: null,
        r2MimeType: null,
        modelName: null,
        createdAt: null,
        updatedAt: null,
      },
    ];
    const result = transformServerDocsToAuthorizedFiles(docs);
    expect(result[0].filename).toBe(`${longTitle.toLowerCase()}.md`);
  });

  it('should handle server document with r2MimeType for docx', () => {
    const docs: ServerDocument[] = [
      {
        id: 12,
        documentType: 'resume',
        status: 'ready',
        title: 'Resume',
        contentMarkdown: null,
        r2Filename: 'Resume.docx',
        r2Filesize: 45000,
        r2MimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        modelName: null,
        createdAt: null,
        updatedAt: null,
      },
    ];
    const result = transformServerDocsToAuthorizedFiles(docs);
    expect(result[0].mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result[0].fileSize).toBe(45000);
    expect(result[0].filename).toBe('Resume.docx');
  });
});
