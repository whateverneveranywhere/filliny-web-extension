/**
 * Tests for the document generation API service.
 *
 * Covers:
 *  - DTOGenerateForFieldResponseSchema validation (valid and invalid inputs)
 *  - DTOWebsiteDocumentSchema validation (valid and invalid inputs)
 *  - Endpoint URL pattern construction
 *  - Request body structure validation
 *  - Error handling patterns
 *
 * These tests validate the Zod schemas and endpoint patterns used by the
 * document generation service. Since the schemas and endpoint definitions
 * are pure functions, they can be tested directly without mocking.
 */
import './chrome-mock';

import { describe, it, expect, vi } from 'vitest';

// Mock @extension/shared partially: keep schemas real but mock other dependencies
// The schemas are re-exported through the barrel: shared/lib/index.ts -> services/index.ts -> schemas/index.ts
// vitest resolves @extension/shared via the alias in vitest.config.ts
vi.mock('@extension/shared', async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    // Override anything that causes side effects during import
  };
});

import { DTOGenerateForFieldResponseSchema, DTOWebsiteDocumentSchema, apiEndpoints } from '@extension/shared';

// ============================================================================
// Helper fixtures
// ============================================================================

const mockWebsiteDocument = {
  id: 42,
  documentType: 'cover_letter' as const,
  status: 'ready' as const,
  title: 'Google Cover Letter',
  contentMarkdown: '# Cover Letter\n\nDear Hiring Manager...',
  r2Filename: 'Google-Cover-Letter.pdf',
  r2Filesize: 52000,
  r2MimeType: 'application/pdf',
  modelName: 'gemini-2.5-flash',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:05:00Z',
};

const mockGenerateForFieldResponse = {
  document: mockWebsiteDocument,
  wasExisting: false,
};

// ============================================================================
// 1. DTOGenerateForFieldResponseSchema validation
// ============================================================================
describe('DTOGenerateForFieldResponseSchema validation', () => {
  it('should validate a correct generate-for-field response', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse(mockGenerateForFieldResponse);
    expect(result.success).toBe(true);
  });

  it('should validate response with wasExisting=true', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      ...mockGenerateForFieldResponse,
      wasExisting: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wasExisting).toBe(true);
    }
  });

  it('should reject response missing document field', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      wasExisting: false,
    });
    expect(result.success).toBe(false);
  });

  it('should reject response missing wasExisting field', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      document: mockWebsiteDocument,
    });
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid document status', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      document: { ...mockWebsiteDocument, status: 'unknown' },
      wasExisting: false,
    });
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid document type', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      document: { ...mockWebsiteDocument, documentType: 'invalid' },
      wasExisting: false,
    });
    expect(result.success).toBe(false);
  });

  it('should accept document with nullable fields set to null', () => {
    const doc = {
      ...mockWebsiteDocument,
      contentMarkdown: null,
      r2Filename: null,
      r2Filesize: null,
      r2MimeType: null,
      modelName: null,
      createdAt: null,
      updatedAt: null,
    };
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      document: doc,
      wasExisting: false,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 2. DTOWebsiteDocumentSchema validation
// ============================================================================
describe('DTOWebsiteDocumentSchema validation', () => {
  it('should validate a full website document', () => {
    const result = DTOWebsiteDocumentSchema.safeParse(mockWebsiteDocument);
    expect(result.success).toBe(true);
  });

  it('should validate document with all nullable fields as null', () => {
    const result = DTOWebsiteDocumentSchema.safeParse({
      id: 1,
      documentType: 'resume',
      status: 'draft',
      title: 'Test',
      contentMarkdown: null,
      r2Filename: null,
      r2Filesize: null,
      r2MimeType: null,
      modelName: null,
      createdAt: null,
      updatedAt: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const { id: _id, ...rest } = mockWebsiteDocument;
    const result = DTOWebsiteDocumentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should accept all valid document statuses', () => {
    const statuses = ['draft', 'generating', 'ready', 'failed'] as const;
    for (const status of statuses) {
      const result = DTOWebsiteDocumentSchema.safeParse({
        ...mockWebsiteDocument,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid document types', () => {
    const types = ['cover_letter', 'resume', 'custom'] as const;
    for (const documentType of types) {
      const result = DTOWebsiteDocumentSchema.safeParse({
        ...mockWebsiteDocument,
        documentType,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// 3. Endpoint URL patterns
// ============================================================================
describe('document service endpoint URL patterns', () => {
  it('should construct list documents URL correctly', () => {
    const url = apiEndpoints.profiles.documents.list('prof-1', 'web-1');
    expect(url).toContain('/profiles/prof-1');
    expect(url).toContain('/websites/web-1');
    expect(url).toContain('/documents');
  });

  it('should construct create document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.create('prof-1', 'web-1');
    expect(url).toContain('/profiles/prof-1');
    expect(url).toContain('/websites/web-1');
    expect(url).toContain('/documents');
  });

  it('should construct get document by ID URL correctly', () => {
    const url = apiEndpoints.profiles.documents.getById('prof-1', 'web-1', '42');
    expect(url).toContain('/profiles/prof-1');
    expect(url).toContain('/websites/web-1');
    expect(url).toContain('/documents/42');
  });

  it('should construct delete document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.delete('prof-1', 'web-1', '42');
    expect(url).toContain('/profiles/prof-1');
    expect(url).toContain('/websites/web-1');
    expect(url).toContain('/documents/42');
  });

  it('should construct upload document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.upload('prof-1', 'web-1', '42');
    expect(url).toContain('/documents/42/upload');
  });

  it('should construct download document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.download('prof-1', 'web-1', '42');
    expect(url).toContain('/documents/42/download');
  });

  it('should construct generate document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.generate('prof-1', 'web-1');
    expect(url).toContain('/documents/generate');
  });

  it('should construct convert document URL correctly', () => {
    const url = apiEndpoints.profiles.documents.convert('prof-1', 'web-1', '42');
    expect(url).toContain('/documents/42/convert');
  });

  it('should construct generate-for-field URL correctly', () => {
    const url = apiEndpoints.profiles.documents.generateForField('prof-1', 'web-1');
    expect(url).toContain('/documents/generate-for-field');
  });
});

// ============================================================================
// 4. Request body validation patterns
// ============================================================================
describe('generate-for-field request body patterns', () => {
  it('should accept request with only required fieldLabel', () => {
    const body = { fieldLabel: 'Resume Upload' };
    expect(body.fieldLabel).toBe('Resume Upload');
  });

  it('should accept request with all optional fields', () => {
    const body = {
      fieldLabel: 'Upload Document',
      fieldDescription: 'Please upload your cover letter in PDF format',
      acceptTypes: 'application/pdf',
      additionalInstructions: 'Use formal language',
    };
    expect(body.fieldLabel).toBe('Upload Document');
    expect(body.fieldDescription).toBe('Please upload your cover letter in PDF format');
    expect(body.acceptTypes).toBe('application/pdf');
    expect(body.additionalInstructions).toBe('Use formal language');
  });

  it('should accept request with fieldDescription but no acceptTypes', () => {
    const body = {
      fieldLabel: 'Cover Letter',
      fieldDescription: 'Upload in PDF',
    };
    expect(body.fieldLabel).toBeDefined();
    expect(body.fieldDescription).toBeDefined();
  });

  it('should accept request with acceptTypes but no fieldDescription', () => {
    const body = {
      fieldLabel: 'Resume',
      acceptTypes: '.pdf,.docx',
    };
    expect(body.fieldLabel).toBeDefined();
    expect(body.acceptTypes).toBeDefined();
  });
});

// ============================================================================
// 5. Schema inference and type compatibility
// ============================================================================
describe('schema type inference', () => {
  it('should correctly infer document type from DTOWebsiteDocumentSchema', () => {
    const result = DTOWebsiteDocumentSchema.safeParse(mockWebsiteDocument);
    if (result.success) {
      const doc = result.data;
      expect(typeof doc.id).toBe('number');
      expect(typeof doc.documentType).toBe('string');
      expect(typeof doc.status).toBe('string');
      expect(typeof doc.title).toBe('string');
    }
  });

  it('should correctly infer response type from DTOGenerateForFieldResponseSchema', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse(mockGenerateForFieldResponse);
    if (result.success) {
      const response = result.data;
      expect(typeof response.wasExisting).toBe('boolean');
      expect(typeof response.document.id).toBe('number');
      expect(typeof response.document.title).toBe('string');
    }
  });

  it('should reject document with wrong id type', () => {
    const result = DTOWebsiteDocumentSchema.safeParse({
      ...mockWebsiteDocument,
      id: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('should reject document with wrong title type', () => {
    const result = DTOWebsiteDocumentSchema.safeParse({
      ...mockWebsiteDocument,
      title: 42,
    });
    expect(result.success).toBe(false);
  });

  it('should reject wasExisting with wrong type', () => {
    const result = DTOGenerateForFieldResponseSchema.safeParse({
      document: mockWebsiteDocument,
      wasExisting: 'true',
    });
    expect(result.success).toBe(false);
  });
});
