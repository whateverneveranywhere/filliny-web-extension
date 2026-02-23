/**
 * Tests for the isGeneratableDocumentType function from fileGenerationService.
 *
 * Covers:
 *  - PDF/DOCX/DOC accept types should be generatable
 *  - Image accept types should NOT be generatable
 *  - Video/audio accept types should NOT be generatable
 *  - Mixed accept types
 *  - Empty/undefined accept types (should default to generatable)
 *  - Extension-only accept types (.pdf, .docx)
 *  - MIME-only accept types
 *  - Archive types should NOT be generatable
 */
import './chrome-mock';

import { describe, it, expect } from 'vitest';

// Mock the dependencies that fileGenerationService imports
vi.mock('@extension/shared', () => ({
  MessageType: {
    GENERATE_DOCUMENT_FOR_FIELD: 'GENERATE_DOCUMENT_FOR_FIELD',
  },
}));

vi.mock('@extension/storage', () => ({
  getDirectoryHandle: vi.fn(),
  verifyWritePermission: vi.fn(),
  writeFileToDirectory: vi.fn(),
}));

import { vi } from 'vitest';
import { isGeneratableDocumentType } from '../components/filliny-button/search-button/field-types/fileGenerationService.js';

// ============================================================================
// 1. PDF accept types should be generatable
// ============================================================================
describe('isGeneratableDocumentType - PDF types', () => {
  it('should return true for application/pdf MIME type', () => {
    expect(isGeneratableDocumentType('application/pdf')).toBe(true);
  });

  it('should return true for .pdf extension', () => {
    expect(isGeneratableDocumentType('.pdf')).toBe(true);
  });

  it('should return true for mixed PDF accept string', () => {
    expect(isGeneratableDocumentType('.pdf,application/pdf')).toBe(true);
  });
});

// ============================================================================
// 2. DOCX/DOC accept types should be generatable
// ============================================================================
describe('isGeneratableDocumentType - Word document types', () => {
  it('should return true for DOCX MIME type', () => {
    expect(isGeneratableDocumentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(
      true,
    );
  });

  it('should return true for DOC MIME type', () => {
    expect(isGeneratableDocumentType('application/msword')).toBe(true);
  });

  it('should return true for .docx extension', () => {
    expect(isGeneratableDocumentType('.docx')).toBe(true);
  });

  it('should return true for .doc extension', () => {
    expect(isGeneratableDocumentType('.doc')).toBe(true);
  });
});

// ============================================================================
// 3. Text document types should be generatable
// ============================================================================
describe('isGeneratableDocumentType - text document types', () => {
  it('should return true for text/plain MIME type', () => {
    expect(isGeneratableDocumentType('text/plain')).toBe(true);
  });

  it('should return true for text/markdown MIME type', () => {
    expect(isGeneratableDocumentType('text/markdown')).toBe(true);
  });

  it('should return true for .txt extension', () => {
    expect(isGeneratableDocumentType('.txt')).toBe(true);
  });

  it('should return true for .md extension', () => {
    expect(isGeneratableDocumentType('.md')).toBe(true);
  });

  it('should return true for .rtf extension', () => {
    expect(isGeneratableDocumentType('.rtf')).toBe(true);
  });
});

// ============================================================================
// 4. Image accept types should NOT be generatable
// ============================================================================
describe('isGeneratableDocumentType - image types', () => {
  it('should return false for image/* wildcard', () => {
    expect(isGeneratableDocumentType('image/*')).toBe(false);
  });

  it('should return false for image/jpeg', () => {
    expect(isGeneratableDocumentType('image/jpeg')).toBe(false);
  });

  it('should return false for image/png', () => {
    expect(isGeneratableDocumentType('image/png')).toBe(false);
  });

  it('should return false for image/gif', () => {
    expect(isGeneratableDocumentType('image/gif')).toBe(false);
  });

  it('should return false for image/webp', () => {
    expect(isGeneratableDocumentType('image/webp')).toBe(false);
  });

  it('should return false for .jpg extension', () => {
    expect(isGeneratableDocumentType('.jpg')).toBe(false);
  });

  it('should return false for .jpeg extension', () => {
    expect(isGeneratableDocumentType('.jpeg')).toBe(false);
  });

  it('should return false for .png extension', () => {
    expect(isGeneratableDocumentType('.png')).toBe(false);
  });

  it('should return false for .gif extension', () => {
    expect(isGeneratableDocumentType('.gif')).toBe(false);
  });

  it('should return false for .svg extension', () => {
    expect(isGeneratableDocumentType('.svg')).toBe(false);
  });

  it('should return false for .heic extension', () => {
    expect(isGeneratableDocumentType('.heic')).toBe(false);
  });
});

// ============================================================================
// 5. Video accept types should NOT be generatable
// ============================================================================
describe('isGeneratableDocumentType - video types', () => {
  it('should return false for video/* wildcard', () => {
    expect(isGeneratableDocumentType('video/*')).toBe(false);
  });

  it('should return false for video/mp4', () => {
    expect(isGeneratableDocumentType('video/mp4')).toBe(false);
  });

  it('should return false for .mp4 extension', () => {
    expect(isGeneratableDocumentType('.mp4')).toBe(false);
  });

  it('should return false for .mov extension', () => {
    expect(isGeneratableDocumentType('.mov')).toBe(false);
  });

  it('should return false for .avi extension', () => {
    expect(isGeneratableDocumentType('.avi')).toBe(false);
  });

  it('should return false for .webm extension', () => {
    expect(isGeneratableDocumentType('.webm')).toBe(false);
  });
});

// ============================================================================
// 6. Audio accept types should NOT be generatable
// ============================================================================
describe('isGeneratableDocumentType - audio types', () => {
  it('should return false for audio/* wildcard', () => {
    expect(isGeneratableDocumentType('audio/*')).toBe(false);
  });

  it('should return false for audio/mpeg', () => {
    expect(isGeneratableDocumentType('audio/mpeg')).toBe(false);
  });

  it('should return false for .mp3 extension', () => {
    expect(isGeneratableDocumentType('.mp3')).toBe(false);
  });

  it('should return false for .wav extension', () => {
    expect(isGeneratableDocumentType('.wav')).toBe(false);
  });

  it('should return false for .ogg extension', () => {
    expect(isGeneratableDocumentType('.ogg')).toBe(false);
  });
});

// ============================================================================
// 7. Archive types should NOT be generatable
// ============================================================================
describe('isGeneratableDocumentType - archive types', () => {
  it('should return false for .zip extension', () => {
    expect(isGeneratableDocumentType('.zip')).toBe(false);
  });

  it('should return false for .rar extension', () => {
    expect(isGeneratableDocumentType('.rar')).toBe(false);
  });

  it('should return false for .7z extension', () => {
    expect(isGeneratableDocumentType('.7z')).toBe(false);
  });

  it('should return false for .tar extension', () => {
    expect(isGeneratableDocumentType('.tar')).toBe(false);
  });

  it('should return false for .gz extension', () => {
    expect(isGeneratableDocumentType('.gz')).toBe(false);
  });
});

// ============================================================================
// 8. Empty/undefined accept types (should default to generatable)
// ============================================================================
describe('isGeneratableDocumentType - empty/undefined types', () => {
  it('should return true for undefined accept types', () => {
    expect(isGeneratableDocumentType(undefined)).toBe(true);
  });

  it('should return true for empty string accept types', () => {
    expect(isGeneratableDocumentType('')).toBe(true);
  });
});

// ============================================================================
// 9. Mixed accept types
// ============================================================================
describe('isGeneratableDocumentType - mixed accept types', () => {
  it('should return false for image and document mixed types (image blocks it)', () => {
    expect(isGeneratableDocumentType('image/jpeg,.pdf')).toBe(false);
  });

  it('should return false for video and document mixed types (video blocks it)', () => {
    expect(isGeneratableDocumentType('video/mp4,.pdf')).toBe(false);
  });

  it('should return true for multiple document types only', () => {
    expect(isGeneratableDocumentType('.pdf,.docx,.doc')).toBe(true);
  });

  it('should return true for PDF and text mixed types', () => {
    expect(isGeneratableDocumentType('application/pdf,text/plain')).toBe(true);
  });
});

// ============================================================================
// 10. Case insensitivity
// ============================================================================
describe('isGeneratableDocumentType - case insensitivity', () => {
  it('should handle uppercase MIME types', () => {
    expect(isGeneratableDocumentType('APPLICATION/PDF')).toBe(true);
  });

  it('should handle uppercase extensions', () => {
    expect(isGeneratableDocumentType('.PDF')).toBe(true);
  });

  it('should handle mixed case', () => {
    expect(isGeneratableDocumentType('Image/JPEG')).toBe(false);
  });
});
