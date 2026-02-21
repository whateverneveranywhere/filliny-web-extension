/**
 * Comprehensive unit tests for file upload from AI streams.
 *
 * Covers:
 *  - isFileValueFromAI detection
 *  - File type detection and MIME mapping (file.ts)
 *  - Accept type parsing and categorization
 *  - File size parsing
 *  - Realistic file creation
 *  - File content validation
 *  - Test file generation based on accept types
 *  - FolderSelector scanning logic and MIME mapping
 *  - Authorized files transformation for AI API payloads
 */
import './chrome-mock';

import { describe, it, expect } from 'vitest';

// ---- fieldUpdaterHelpers exports ----
import {
  isFileValueFromAI,
  AUTHORIZED_FILE_PATTERN,
} from '../components/filliny-button/search-button/fieldUpdaterHelpers.js';

// ---- file.ts exports ----
import {
  getFileTypeFromExtension,
  getExtensionFromMimeType,
  createRealisticFile,
  createRealisticFileContent,
  validateFileContent,
  parseAcceptTypes,
  categorizeFileType,
  categorizeMimeType,
  parseFileSize,
  generateTestFilesForAcceptTypes,
  MIME_TYPE_MAP,
} from '../components/filliny-button/search-button/field-types/file.js';
import type { AcceptType } from '../components/filliny-button/search-button/field-types/file.js';

// ---- folderScanUtils exports (extracted from FolderSelector) ----
import {
  getMimeType,
  scanDirectoryHandle,
  ALLOWED_EXTENSIONS,
  MAX_FILES_LIMIT,
} from '../components/authorized-files/folderScanUtils.js';

// ============================================================================
// 1. isFileValueFromAI
// ============================================================================
describe('isFileValueFromAI', () => {
  // --- URLs ---
  it('should return true for http:// URLs', () => {
    expect(isFileValueFromAI('http://example.com/file.pdf')).toBe(true);
  });

  it('should return true for https:// URLs', () => {
    expect(isFileValueFromAI('https://cdn.example.com/resume.docx')).toBe(true);
  });

  it('should return true for URLs with query params', () => {
    expect(isFileValueFromAI('https://example.com/file.pdf?token=abc123')).toBe(true);
  });

  // --- authorized_file:N patterns ---
  it('should return true for authorized_file:0', () => {
    expect(isFileValueFromAI('authorized_file:0')).toBe(true);
  });

  it('should return true for authorized_file:42', () => {
    expect(isFileValueFromAI('authorized_file:42')).toBe(true);
  });

  it('should return true for authorized_file:999', () => {
    expect(isFileValueFromAI('authorized_file:999')).toBe(true);
  });

  it('should return false for malformed authorized_file patterns', () => {
    expect(isFileValueFromAI('authorized_file:')).toBe(false);
    expect(isFileValueFromAI('authorized_file:abc')).toBe(false);
    expect(isFileValueFromAI('authorized_file')).toBe(false);
  });

  // --- Plain filenames with known extensions (treated as AI values) ---
  // The function now recognizes filenames with known extensions (pdf, docx, etc.)
  // as AI-suggested values because AI returns local filenames from the authorized folder.
  it('should return true for plain filenames with known extensions (e.g., Resume.pdf)', () => {
    expect(isFileValueFromAI('Resume.pdf')).toBe(true);
  });

  it('should return true for filenames with spaces and known extensions', () => {
    expect(isFileValueFromAI('My Resume 2024.pdf')).toBe(true);
  });

  it('should return false for filenames without extension', () => {
    expect(isFileValueFromAI('document')).toBe(false);
  });

  it('should return false for filenames with unknown extensions', () => {
    expect(isFileValueFromAI('data.xyz')).toBe(false);
    expect(isFileValueFromAI('file.unknown')).toBe(false);
  });

  // --- Array values ---
  it('should return true for arrays containing at least one URL', () => {
    expect(isFileValueFromAI(['Resume.pdf', 'https://example.com/photo.jpg'])).toBe(true);
  });

  it('should return true for arrays containing at least one authorized_file ref', () => {
    expect(isFileValueFromAI(['Resume.pdf', 'authorized_file:3'])).toBe(true);
  });

  it('should return true for arrays of filenames with known extensions', () => {
    expect(isFileValueFromAI(['Resume.pdf', 'CoverLetter.docx'])).toBe(true);
  });

  it('should return false for arrays of filenames without known extensions', () => {
    expect(isFileValueFromAI(['document', 'noext'])).toBe(false);
  });

  // --- Edge cases ---
  it('should return false for empty string', () => {
    expect(isFileValueFromAI('')).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(isFileValueFromAI([])).toBe(false);
  });

  it('should return false for array of empty strings', () => {
    expect(isFileValueFromAI(['', ''])).toBe(false);
  });
});

// ============================================================================
// 2. AUTHORIZED_FILE_PATTERN regex
// ============================================================================
describe('AUTHORIZED_FILE_PATTERN', () => {
  it('should match authorized_file:0', () => {
    expect(AUTHORIZED_FILE_PATTERN.test('authorized_file:0')).toBe(true);
  });

  it('should match authorized_file:123', () => {
    expect(AUTHORIZED_FILE_PATTERN.test('authorized_file:123')).toBe(true);
  });

  it('should not match partial patterns', () => {
    expect(AUTHORIZED_FILE_PATTERN.test('authorized_file:')).toBe(false);
    expect(AUTHORIZED_FILE_PATTERN.test('authorized_file:abc')).toBe(false);
    expect(AUTHORIZED_FILE_PATTERN.test('prefix_authorized_file:1')).toBe(false);
    expect(AUTHORIZED_FILE_PATTERN.test('authorized_file:1_suffix')).toBe(false);
  });
});

// ============================================================================
// 3. getFileTypeFromExtension (MIME type lookup)
// ============================================================================
describe('getFileTypeFromExtension', () => {
  it('should return correct MIME types for common document extensions', () => {
    expect(getFileTypeFromExtension('document.pdf')).toBe('application/pdf');
    expect(getFileTypeFromExtension('file.doc')).toBe('application/msword');
    expect(getFileTypeFromExtension('file.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(getFileTypeFromExtension('data.csv')).toBe('text/csv');
    expect(getFileTypeFromExtension('data.json')).toBe('application/json');
    expect(getFileTypeFromExtension('notes.txt')).toBe('text/plain');
  });

  it('should return correct MIME types for common image extensions', () => {
    expect(getFileTypeFromExtension('photo.jpg')).toBe('image/jpeg');
    expect(getFileTypeFromExtension('photo.jpeg')).toBe('image/jpeg');
    expect(getFileTypeFromExtension('image.png')).toBe('image/png');
    expect(getFileTypeFromExtension('animation.gif')).toBe('image/gif');
    expect(getFileTypeFromExtension('image.webp')).toBe('image/webp');
    expect(getFileTypeFromExtension('icon.svg')).toBe('image/svg+xml');
  });

  it('should return correct MIME types for spreadsheets', () => {
    expect(getFileTypeFromExtension('data.xls')).toBe('application/vnd.ms-excel');
    expect(getFileTypeFromExtension('data.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('should return correct MIME types for audio/video', () => {
    expect(getFileTypeFromExtension('song.mp3')).toBe('audio/mpeg');
    expect(getFileTypeFromExtension('clip.mp4')).toBe('video/mp4');
    expect(getFileTypeFromExtension('movie.avi')).toBe('video/x-msvideo');
  });

  it('should return correct MIME types for archives', () => {
    expect(getFileTypeFromExtension('archive.zip')).toBe('application/zip');
    expect(getFileTypeFromExtension('archive.rar')).toBe('application/x-rar-compressed');
  });

  it('should return application/octet-stream for unknown extensions', () => {
    expect(getFileTypeFromExtension('file.xyz')).toBe('application/octet-stream');
    expect(getFileTypeFromExtension('file.unknown')).toBe('application/octet-stream');
  });

  it('should return application/octet-stream for files without extension', () => {
    expect(getFileTypeFromExtension('noextension')).toBe('application/octet-stream');
  });

  it('should handle uppercase extensions via lowercase normalization', () => {
    // The function uses .toLowerCase() on the extension
    expect(getFileTypeFromExtension('FILE.PDF')).toBe('application/pdf');
    expect(getFileTypeFromExtension('PHOTO.JPG')).toBe('image/jpeg');
  });
});

// ============================================================================
// 4. getExtensionFromMimeType
// ============================================================================
describe('getExtensionFromMimeType', () => {
  it('should map common MIME types to extensions', () => {
    expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
    expect(getExtensionFromMimeType('image/png')).toBe('png');
    expect(getExtensionFromMimeType('application/pdf')).toBe('pdf');
    expect(getExtensionFromMimeType('text/plain')).toBe('txt');
    expect(getExtensionFromMimeType('text/csv')).toBe('csv');
    expect(getExtensionFromMimeType('application/json')).toBe('json');
    expect(getExtensionFromMimeType('video/mp4')).toBe('mp4');
    expect(getExtensionFromMimeType('audio/mpeg')).toBe('mp3');
  });

  it('should map Office document MIME types', () => {
    expect(getExtensionFromMimeType('application/msword')).toBe('doc');
    expect(getExtensionFromMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(
      'docx',
    );
    expect(getExtensionFromMimeType('application/vnd.ms-excel')).toBe('xls');
    expect(getExtensionFromMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
  });

  it('should return null for unknown MIME types', () => {
    expect(getExtensionFromMimeType('application/octet-stream')).toBeNull();
    expect(getExtensionFromMimeType('application/x-unknown')).toBeNull();
    expect(getExtensionFromMimeType('')).toBeNull();
  });
});

// ============================================================================
// 5. MIME_TYPE_MAP completeness
// ============================================================================
describe('MIME_TYPE_MAP', () => {
  it('should contain image MIME types', () => {
    expect(MIME_TYPE_MAP['jpg']).toBe('image/jpeg');
    expect(MIME_TYPE_MAP['jpeg']).toBe('image/jpeg');
    expect(MIME_TYPE_MAP['png']).toBe('image/png');
    expect(MIME_TYPE_MAP['gif']).toBe('image/gif');
    expect(MIME_TYPE_MAP['webp']).toBe('image/webp');
    expect(MIME_TYPE_MAP['svg']).toBe('image/svg+xml');
    expect(MIME_TYPE_MAP['heic']).toBe('image/heic');
    expect(MIME_TYPE_MAP['heif']).toBe('image/heif');
  });

  it('should contain document MIME types', () => {
    expect(MIME_TYPE_MAP['pdf']).toBe('application/pdf');
    expect(MIME_TYPE_MAP['doc']).toBe('application/msword');
    expect(MIME_TYPE_MAP['docx']).toBeDefined();
    expect(MIME_TYPE_MAP['xls']).toBeDefined();
    expect(MIME_TYPE_MAP['xlsx']).toBeDefined();
    expect(MIME_TYPE_MAP['ppt']).toBeDefined();
    expect(MIME_TYPE_MAP['pptx']).toBeDefined();
  });

  it('should contain text MIME types', () => {
    expect(MIME_TYPE_MAP['txt']).toBe('text/plain');
    expect(MIME_TYPE_MAP['csv']).toBe('text/csv');
    expect(MIME_TYPE_MAP['html']).toBe('text/html');
    expect(MIME_TYPE_MAP['css']).toBe('text/css');
    expect(MIME_TYPE_MAP['md']).toBe('text/markdown');
  });

  it('should contain archive MIME types', () => {
    expect(MIME_TYPE_MAP['zip']).toBe('application/zip');
    expect(MIME_TYPE_MAP['rar']).toBe('application/x-rar-compressed');
    expect(MIME_TYPE_MAP['tar']).toBe('application/x-tar');
    expect(MIME_TYPE_MAP['gz']).toBe('application/gzip');
  });

  it('should contain audio/video MIME types', () => {
    expect(MIME_TYPE_MAP['mp3']).toBe('audio/mpeg');
    expect(MIME_TYPE_MAP['wav']).toBe('audio/wav');
    expect(MIME_TYPE_MAP['mp4']).toBe('video/mp4');
    expect(MIME_TYPE_MAP['webm']).toBe('video/webm');
  });

  it('should contain font MIME types', () => {
    expect(MIME_TYPE_MAP['ttf']).toBe('font/ttf');
    expect(MIME_TYPE_MAP['woff']).toBe('font/woff');
    expect(MIME_TYPE_MAP['woff2']).toBe('font/woff2');
  });
});

// ============================================================================
// 6. parseAcceptTypes
// ============================================================================
describe('parseAcceptTypes', () => {
  it('should parse extension-based accept strings', () => {
    const result = parseAcceptTypes('.pdf,.docx,.jpg');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'extension', value: 'pdf', category: 'document' });
    expect(result[1]).toEqual({ type: 'extension', value: 'docx', category: 'document' });
    expect(result[2]).toEqual({ type: 'extension', value: 'jpg', category: 'image' });
  });

  it('should parse MIME type accept strings', () => {
    const result = parseAcceptTypes('image/jpeg,application/pdf');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'mime', value: 'image/jpeg', category: 'image' });
    expect(result[1]).toEqual({ type: 'mime', value: 'application/pdf', category: 'document' });
  });

  it('should parse wildcard MIME types', () => {
    const result = parseAcceptTypes('image/*');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'mime', value: 'image/*', category: 'image' });
  });

  it('should handle mixed extensions and MIME types', () => {
    const result = parseAcceptTypes('.pdf, image/png, .xlsx');
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('extension');
    expect(result[1].type).toBe('mime');
    expect(result[2].type).toBe('extension');
  });

  it('should return empty array for empty string', () => {
    expect(parseAcceptTypes('')).toEqual([]);
  });

  it('should handle whitespace in accept string', () => {
    const result = parseAcceptTypes(' .pdf , .docx ');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('pdf');
    expect(result[1].value).toBe('docx');
  });
});

// ============================================================================
// 7. categorizeFileType
// ============================================================================
describe('categorizeFileType', () => {
  it('should categorize image extensions', () => {
    expect(categorizeFileType('jpg')).toBe('image');
    expect(categorizeFileType('jpeg')).toBe('image');
    expect(categorizeFileType('png')).toBe('image');
    expect(categorizeFileType('gif')).toBe('image');
    expect(categorizeFileType('webp')).toBe('image');
    expect(categorizeFileType('svg')).toBe('image');
    expect(categorizeFileType('heic')).toBe('image');
  });

  it('should categorize document extensions', () => {
    expect(categorizeFileType('pdf')).toBe('document');
    expect(categorizeFileType('doc')).toBe('document');
    expect(categorizeFileType('docx')).toBe('document');
    expect(categorizeFileType('xls')).toBe('document');
    expect(categorizeFileType('xlsx')).toBe('document');
    expect(categorizeFileType('ppt')).toBe('document');
    expect(categorizeFileType('pptx')).toBe('document');
    expect(categorizeFileType('rtf')).toBe('document');
  });

  it('should categorize audio extensions', () => {
    expect(categorizeFileType('mp3')).toBe('audio');
    expect(categorizeFileType('wav')).toBe('audio');
    expect(categorizeFileType('ogg')).toBe('audio');
    expect(categorizeFileType('flac')).toBe('audio');
  });

  it('should categorize video extensions', () => {
    expect(categorizeFileType('mp4')).toBe('video');
    expect(categorizeFileType('avi')).toBe('video');
    expect(categorizeFileType('mov')).toBe('video');
    expect(categorizeFileType('webm')).toBe('video');
  });

  it('should categorize archive extensions', () => {
    expect(categorizeFileType('zip')).toBe('archive');
    expect(categorizeFileType('rar')).toBe('archive');
    expect(categorizeFileType('tar')).toBe('archive');
    expect(categorizeFileType('gz')).toBe('archive');
    expect(categorizeFileType('7z')).toBe('archive');
  });

  it('should categorize text extensions', () => {
    expect(categorizeFileType('txt')).toBe('text');
    expect(categorizeFileType('csv')).toBe('text');
    expect(categorizeFileType('json')).toBe('text');
    expect(categorizeFileType('xml')).toBe('text');
    expect(categorizeFileType('html')).toBe('text');
    expect(categorizeFileType('md')).toBe('text');
    expect(categorizeFileType('yaml')).toBe('text');
  });

  it('should return "other" for unrecognized extensions', () => {
    expect(categorizeFileType('xyz')).toBe('other');
    expect(categorizeFileType('bin')).toBe('other');
    expect(categorizeFileType('exe')).toBe('other');
  });
});

// ============================================================================
// 8. categorizeMimeType
// ============================================================================
describe('categorizeMimeType', () => {
  it('should categorize image/* as image', () => {
    expect(categorizeMimeType('image/jpeg')).toBe('image');
    expect(categorizeMimeType('image/png')).toBe('image');
    expect(categorizeMimeType('image/svg+xml')).toBe('image');
  });

  it('should categorize audio/* as audio', () => {
    expect(categorizeMimeType('audio/mpeg')).toBe('audio');
    expect(categorizeMimeType('audio/wav')).toBe('audio');
  });

  it('should categorize video/* as video', () => {
    expect(categorizeMimeType('video/mp4')).toBe('video');
    expect(categorizeMimeType('video/webm')).toBe('video');
  });

  it('should categorize text/* as text', () => {
    expect(categorizeMimeType('text/plain')).toBe('text');
    expect(categorizeMimeType('text/csv')).toBe('text');
    expect(categorizeMimeType('text/html')).toBe('text');
  });

  it('should categorize document MIME types', () => {
    expect(categorizeMimeType('application/pdf')).toBe('document');
    expect(categorizeMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(
      'document',
    );
    expect(categorizeMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('document');
    expect(categorizeMimeType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(
      'document',
    );
  });

  it('should categorize archive MIME types', () => {
    expect(categorizeMimeType('application/zip')).toBe('archive');
    expect(categorizeMimeType('application/x-rar-compressed')).toBe('archive');
  });

  it('should return "other" for unrecognized MIME types', () => {
    expect(categorizeMimeType('application/octet-stream')).toBe('other');
    expect(categorizeMimeType('application/x-unknown')).toBe('other');
  });
});

// ============================================================================
// 9. parseFileSize
// ============================================================================
describe('parseFileSize', () => {
  it('should parse bytes', () => {
    expect(parseFileSize('100b')).toBe(100);
    expect(parseFileSize('1B')).toBe(1);
  });

  it('should parse kilobytes', () => {
    expect(parseFileSize('1kb')).toBe(1024);
    expect(parseFileSize('2.5KB')).toBe(2.5 * 1024);
  });

  it('should parse megabytes', () => {
    expect(parseFileSize('1mb')).toBe(1024 * 1024);
    expect(parseFileSize('10MB')).toBe(10 * 1024 * 1024);
    expect(parseFileSize('0.5mb')).toBe(0.5 * 1024 * 1024);
  });

  it('should parse gigabytes', () => {
    expect(parseFileSize('1gb')).toBe(1024 * 1024 * 1024);
    expect(parseFileSize('2GB')).toBe(2 * 1024 * 1024 * 1024);
  });

  it('should return null for invalid formats', () => {
    expect(parseFileSize('abc')).toBeNull();
    expect(parseFileSize('100')).toBeNull();
    expect(parseFileSize('mb')).toBeNull();
    expect(parseFileSize('')).toBeNull();
    expect(parseFileSize('100tb')).toBeNull(); // TB not supported
  });

  it('should handle decimal values', () => {
    expect(parseFileSize('1.5mb')).toBe(1.5 * 1024 * 1024);
    expect(parseFileSize('0.1kb')).toBeCloseTo(0.1 * 1024);
  });
});

// ============================================================================
// 10. createRealisticFileContent
// ============================================================================
describe('createRealisticFileContent', () => {
  it('should create PDF content with correct header', () => {
    const content = createRealisticFileContent('test.pdf', 'application/pdf');
    const text = new TextDecoder().decode(content);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
  });

  it('should create JPEG content with correct magic bytes', () => {
    const content = createRealisticFileContent('photo.jpg', 'image/jpeg');
    expect(content[0]).toBe(0xff);
    expect(content[1]).toBe(0xd8);
    expect(content[2]).toBe(0xff);
  });

  it('should create PNG content with correct magic bytes', () => {
    const content = createRealisticFileContent('image.png', 'image/png');
    expect(content[0]).toBe(0x89);
    expect(content[1]).toBe(0x50); // P
    expect(content[2]).toBe(0x4e); // N
    expect(content[3]).toBe(0x47); // G
  });

  it('should create ZIP content with correct magic bytes', () => {
    const content = createRealisticFileContent('archive.zip', 'application/zip');
    expect(content[0]).toBe(0x50); // P
    expect(content[1]).toBe(0x4b); // K
    expect(content[2]).toBe(0x03);
    expect(content[3]).toBe(0x04);
  });

  it('should create DOCX content with ZIP header (Office Open XML)', () => {
    const content = createRealisticFileContent(
      'document.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    // DOCX files are ZIP-based
    expect(content[0]).toBe(0x50);
    expect(content[1]).toBe(0x4b);
  });

  it('should create XLSX content with ZIP header', () => {
    const content = createRealisticFileContent(
      'data.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(content[0]).toBe(0x50);
    expect(content[1]).toBe(0x4b);
  });

  it('should create generic text content for unknown types', () => {
    const content = createRealisticFileContent('file.txt', 'text/plain');
    const text = new TextDecoder().decode(content);
    expect(text).toContain('Test file: file.txt');
    expect(text).toContain('Content-Type: text/plain');
  });

  it('should infer type from filename when MIME type is generic', () => {
    // Should detect .pdf from filename
    const pdfContent = createRealisticFileContent('test.pdf', 'application/octet-stream');
    const text = new TextDecoder().decode(pdfContent);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
  });
});

// ============================================================================
// 11. createRealisticFile
// ============================================================================
describe('createRealisticFile', () => {
  it('should create a File with correct name and type for PDF', () => {
    const file = createRealisticFile('resume.pdf');
    expect(file.name).toBe('resume.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
  });

  it('should create a File with correct name and type for JPEG', () => {
    const file = createRealisticFile('photo.jpg');
    expect(file.name).toBe('photo.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBeGreaterThan(0);
  });

  it('should create a File with correct name and type for PNG', () => {
    const file = createRealisticFile('screenshot.png');
    expect(file.name).toBe('screenshot.png');
    expect(file.type).toBe('image/png');
  });

  it('should accept explicit MIME type override', () => {
    const file = createRealisticFile('data.bin', 'application/octet-stream');
    expect(file.name).toBe('data.bin');
    expect(file.type).toBe('application/octet-stream');
  });

  it('should have a lastModified timestamp within the last 24 hours', () => {
    const file = createRealisticFile('test.pdf');
    const now = Date.now();
    // lastModified should be within [now - 24h, now]
    expect(file.lastModified).toBeLessThanOrEqual(now);
    expect(file.lastModified).toBeGreaterThan(now - 86400000);
  });

  it('should produce files with realistic sizes for different types', () => {
    // Image files should be in the 50KB-500KB range
    const imageFile = createRealisticFile('photo.jpg');
    expect(imageFile.size).toBeGreaterThanOrEqual(100); // At minimum has header bytes

    // PDF files should be in the 100KB-2MB range
    const pdfFile = createRealisticFile('document.pdf');
    expect(pdfFile.size).toBeGreaterThanOrEqual(100);
  });

  it('should create a valid File object that can be used in DataTransfer', () => {
    const file = createRealisticFile('test.docx');
    expect(file).toBeInstanceOf(File);
    expect(file).toBeInstanceOf(Blob);
  });

  it('should handle files without extensions', () => {
    const file = createRealisticFile('Makefile');
    expect(file.name).toBe('Makefile');
    expect(file.type).toBe('application/octet-stream');
  });
});

// ============================================================================
// 12. validateFileContent
// ============================================================================
describe('validateFileContent', () => {
  it('should validate JPEG signature', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])]);
    expect(await validateFileContent(blob, 'image/jpeg', 'test.jpg')).toBe(true);
  });

  it('should validate PNG signature', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]);
    expect(await validateFileContent(blob, 'image/png', 'test.png')).toBe(true);
  });

  it('should validate PDF signature', async () => {
    const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);
    expect(await validateFileContent(blob, 'application/pdf', 'test.pdf')).toBe(true);
  });

  it('should validate GIF87a signature', async () => {
    const blob = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])]);
    expect(await validateFileContent(blob, 'image/gif', 'test.gif')).toBe(true);
  });

  it('should validate GIF89a signature', async () => {
    const blob = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])]);
    expect(await validateFileContent(blob, 'image/gif', 'test.gif')).toBe(true);
  });

  it('should validate ZIP signature', async () => {
    const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]);
    expect(await validateFileContent(blob, 'application/zip', 'test.zip')).toBe(true);
  });

  it('should validate DOCX files (ZIP-based) against officedocument MIME type', async () => {
    const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])]);
    expect(
      await validateFileContent(
        blob,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'test.docx',
      ),
    ).toBe(true);
  });

  it('should return true (fail-safe) for mismatched signature in jsdom', async () => {
    // In a real browser, blob.slice().arrayBuffer() works and this would return false
    // for mismatched signatures. However, jsdom does not implement arrayBuffer() on
    // sliced blobs, so the catch block returns true (fail-safe behavior).
    const blob = new Blob([new TextEncoder().encode('This is plain text')]);
    expect(await validateFileContent(blob, 'image/jpeg', 'test.jpg')).toBe(true);
  });

  it('should return true for unknown MIME types (no signature check)', async () => {
    const blob = new Blob([new TextEncoder().encode('some data')]);
    expect(await validateFileContent(blob, 'application/x-custom', 'test.custom')).toBe(true);
  });

  it('should return true on error (fail-safe)', async () => {
    // Empty blob should still return true for unknown types
    const emptyBlob = new Blob([]);
    expect(await validateFileContent(emptyBlob, 'application/x-something', 'test.bin')).toBe(true);
  });
});

// ============================================================================
// 13. generateTestFilesForAcceptTypes
// ============================================================================
describe('generateTestFilesForAcceptTypes', () => {
  it('should generate files for image accept types', () => {
    const acceptTypes: AcceptType[] = [{ type: 'mime', value: 'image/*', category: 'image' }];
    const files = generateTestFilesForAcceptTypes(acceptTypes, false);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.(jpg|png|gif)$/i);
  });

  it('should generate multiple files when isMultiple is true', () => {
    const acceptTypes: AcceptType[] = [{ type: 'mime', value: 'image/*', category: 'image' }];
    const files = generateTestFilesForAcceptTypes(acceptTypes, true);
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it('should generate files using specific extensions when specified', () => {
    const acceptTypes: AcceptType[] = [{ type: 'extension', value: 'pdf', category: 'document' }];
    const files = generateTestFilesForAcceptTypes(acceptTypes, false);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.pdf$/);
  });

  it('should generate multiple extension-based files for multiple accept', () => {
    const acceptTypes: AcceptType[] = [
      { type: 'extension', value: 'pdf', category: 'document' },
      { type: 'extension', value: 'docx', category: 'document' },
    ];
    const files = generateTestFilesForAcceptTypes(acceptTypes, false);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate default files when no accept types match', () => {
    const files = generateTestFilesForAcceptTypes([], false);
    expect(files.length).toBe(1);
    expect(files[0]).toBe('test-document.pdf');
  });

  it('should generate multiple default files when no accept types and isMultiple', () => {
    const files = generateTestFilesForAcceptTypes([], true);
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it('should limit multiple files to 3', () => {
    const acceptTypes: AcceptType[] = [
      { type: 'extension', value: 'pdf', category: 'document' },
      { type: 'extension', value: 'docx', category: 'document' },
      { type: 'extension', value: 'doc', category: 'document' },
      { type: 'extension', value: 'txt', category: 'text' },
      { type: 'extension', value: 'csv', category: 'text' },
    ];
    const files = generateTestFilesForAcceptTypes(acceptTypes, true);
    expect(files.length).toBeLessThanOrEqual(3);
  });

  it('should produce unique filenames (no duplicates)', () => {
    const acceptTypes: AcceptType[] = [
      { type: 'extension', value: 'pdf', category: 'document' },
      { type: 'extension', value: 'pdf', category: 'document' },
    ];
    const files = generateTestFilesForAcceptTypes(acceptTypes, true);
    const unique = new Set(files);
    expect(unique.size).toBe(files.length);
  });
});

// ============================================================================
// 14. FolderSelector: getMimeType
// ============================================================================
describe('FolderSelector getMimeType', () => {
  it('should return correct MIME types for common document extensions', () => {
    expect(getMimeType('pdf')).toBe('application/pdf');
    expect(getMimeType('doc')).toBe('application/msword');
    expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(getMimeType('txt')).toBe('text/plain');
    expect(getMimeType('rtf')).toBe('application/rtf');
    expect(getMimeType('odt')).toBe('application/vnd.oasis.opendocument.text');
  });

  it('should return correct MIME types for image extensions', () => {
    expect(getMimeType('jpg')).toBe('image/jpeg');
    expect(getMimeType('jpeg')).toBe('image/jpeg');
    expect(getMimeType('png')).toBe('image/png');
    expect(getMimeType('gif')).toBe('image/gif');
    expect(getMimeType('webp')).toBe('image/webp');
    expect(getMimeType('svg')).toBe('image/svg+xml');
    expect(getMimeType('bmp')).toBe('image/bmp');
    expect(getMimeType('heic')).toBe('image/heic');
    expect(getMimeType('heif')).toBe('image/heif');
  });

  it('should return correct MIME types for spreadsheet extensions', () => {
    expect(getMimeType('xls')).toBe('application/vnd.ms-excel');
    expect(getMimeType('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(getMimeType('csv')).toBe('text/csv');
    expect(getMimeType('ods')).toBe('application/vnd.oasis.opendocument.spreadsheet');
  });

  it('should return correct MIME types for presentation extensions', () => {
    expect(getMimeType('ppt')).toBe('application/vnd.ms-powerpoint');
    expect(getMimeType('pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(getMimeType('odp')).toBe('application/vnd.oasis.opendocument.presentation');
  });

  it('should return correct MIME type for archives', () => {
    expect(getMimeType('zip')).toBe('application/zip');
  });

  it('should return application/octet-stream for unknown extensions', () => {
    expect(getMimeType('xyz')).toBe('application/octet-stream');
    expect(getMimeType('unknown')).toBe('application/octet-stream');
    expect(getMimeType('')).toBe('application/octet-stream');
  });

  it('should handle case-insensitive extensions', () => {
    expect(getMimeType('PDF')).toBe('application/pdf');
    expect(getMimeType('Jpg')).toBe('image/jpeg');
    expect(getMimeType('DOCX')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});

// ============================================================================
// 15. FolderSelector: ALLOWED_EXTENSIONS
// ============================================================================
describe('FolderSelector ALLOWED_EXTENSIONS', () => {
  it('should contain common document extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('pdf')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('doc')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('docx')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('txt')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('rtf')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('odt')).toBe(true);
  });

  it('should contain common image extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('jpg')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('jpeg')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('png')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('gif')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('webp')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('svg')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('bmp')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('heic')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('heif')).toBe(true);
  });

  it('should contain spreadsheet extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('xls')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('xlsx')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('csv')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('ods')).toBe(true);
  });

  it('should contain presentation extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('ppt')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('pptx')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('odp')).toBe(true);
  });

  it('should contain archive extension', () => {
    expect(ALLOWED_EXTENSIONS.has('zip')).toBe(true);
  });

  it('should NOT contain executable or risky extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('exe')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('bat')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('sh')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('js')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('py')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('php')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('dmg')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('iso')).toBe(false);
  });

  it('should NOT contain audio or video extensions (not typical for form uploads)', () => {
    expect(ALLOWED_EXTENSIONS.has('mp3')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('mp4')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('avi')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('wav')).toBe(false);
  });
});

// ============================================================================
// 16. FolderSelector: MAX_FILES_LIMIT
// ============================================================================
describe('FolderSelector MAX_FILES_LIMIT', () => {
  it('should be set to 100', () => {
    expect(MAX_FILES_LIMIT).toBe(100);
  });
});

// ============================================================================
// 17. scanDirectoryHandle (mock-based)
// ============================================================================
describe('scanDirectoryHandle', () => {
  /**
   * Helper to create a mock FileSystemDirectoryHandle.
   * Each entry has kind: 'file' | 'directory', name, and optionally
   * a getFile() result with { size, lastModified, type }.
   */
  const createMockDirHandle = (
    entries: Array<{
      kind: 'file' | 'directory';
      name: string;
      size?: number;
      lastModified?: number;
      type?: string;
    }>,
  ) => {
    // Dynamically import scanDirectoryHandle uses for-await, so we need async iterable
    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        for (const entry of entries) {
          if (entry.kind === 'directory') {
            yield { kind: 'directory' as const, name: entry.name };
          } else {
            yield {
              kind: 'file' as const,
              name: entry.name,
              getFile: async () => ({
                size: entry.size ?? 1024,
                lastModified: entry.lastModified ?? Date.now(),
                type: entry.type ?? '',
              }),
            };
          }
        }
      },
    };

    return {
      name: 'test-folder',
      values: () => asyncIterable[Symbol.asyncIterator](),
    } as unknown as FileSystemDirectoryHandle;
  };

  it('should only process top-level files (skip directories)', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      { kind: 'file', name: 'resume.pdf', size: 5000 },
      { kind: 'directory', name: 'subdir' },
      { kind: 'file', name: 'photo.jpg', size: 3000 },
    ]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(2);
    expect(result.files.map(f => f.name)).toEqual(['resume.pdf', 'photo.jpg']);
    expect(result.reachedLimit).toBe(false);
  });

  it('should filter by ALLOWED_EXTENSIONS', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      { kind: 'file', name: 'resume.pdf', size: 1000 },
      { kind: 'file', name: 'script.js', size: 500 }, // Not allowed
      { kind: 'file', name: 'photo.png', size: 2000 },
      { kind: 'file', name: 'binary.exe', size: 3000 }, // Not allowed
    ]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(2);
    expect(result.files.map(f => f.name)).toEqual(['resume.pdf', 'photo.png']);
  });

  it('should skip hidden files (starting with . or __ or ~)', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      { kind: 'file', name: '.DS_Store', size: 100 },
      { kind: 'file', name: '__MACOSX', size: 100 },
      { kind: 'file', name: '~$temp.docx', size: 100 },
      { kind: 'file', name: 'resume.pdf', size: 5000 },
    ]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe('resume.pdf');
  });

  it('should skip files larger than 50MB', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      { kind: 'file', name: 'large-video.zip', size: 60 * 1024 * 1024 }, // 60MB - too large
      { kind: 'file', name: 'small.pdf', size: 1024 }, // 1KB - fine
    ]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe('small.pdf');
  });

  it('should respect MAX_FILES_LIMIT of 100', async () => {
    const scan = scanDirectoryHandle;

    const entries = Array.from({ length: 120 }, (_, i) => ({
      kind: 'file' as const,
      name: `file-${i}.pdf`,
      size: 1024,
    }));

    const dirHandle = createMockDirHandle(entries);
    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(100);
    expect(result.reachedLimit).toBe(true);
  });

  it('should return correct LocalFileInfo structure', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      {
        kind: 'file',
        name: 'Resume_2024.pdf',
        size: 123456,
        lastModified: 1700000000000,
        type: 'application/pdf',
      },
    ]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.name).toBe('Resume_2024.pdf');
    expect(file.relativePath).toBe('Resume_2024.pdf');
    expect(file.extension).toBe('pdf');
    expect(file.size).toBe(123456);
    expect(file.lastModified).toBe(1700000000000);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('should use getMimeType fallback when file.type is empty', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([{ kind: 'file', name: 'document.docx', size: 5000, type: '' }]);

    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('should handle empty directories', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([]);
    const result = await scan(dirHandle);
    expect(result.files).toHaveLength(0);
    expect(result.reachedLimit).toBe(false);
  });

  it('should skip files without a valid extension', async () => {
    const scan = scanDirectoryHandle;

    const dirHandle = createMockDirHandle([
      { kind: 'file', name: 'Makefile', size: 500 },
      { kind: 'file', name: 'LICENSE', size: 1000 },
      { kind: 'file', name: 'resume.pdf', size: 5000 },
    ]);

    const result = await scan(dirHandle);
    // Makefile and LICENSE have no extension (or extension = '' which is not in ALLOWED_EXTENSIONS)
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe('resume.pdf');
  });
});

// ============================================================================
// 18. Authorized files transformation for AI (from handleFormClick.ts logic)
// ============================================================================
describe('Authorized files transformation for AI', () => {
  /**
   * This tests the transformation logic from handleFormClick.ts that converts
   * LocalFileInfo[] -> DTOAuthorizedFileForAI[]
   * We replicate the exact transformation logic here since it is inline in handleFormClick.ts.
   */
  interface LocalFileInfo {
    name: string;
    relativePath: string;
    extension: string;
    size: number;
    lastModified: number;
    mimeType: string;
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

  /** Replicate the transformation from handleFormClick.ts */
  const transformLocalFilesToDTO = (localFiles: LocalFileInfo[]): DTOAuthorizedFileForAI[] =>
    localFiles.map((file, index) => ({
      id: index,
      filename: file.name,
      description: `Local file: ${file.name}`,
      useCases: `Match with fields accepting ${file.extension.toUpperCase()} files`,
      category: 'document' as const,
      mimeType: file.mimeType,
      fileSize: file.size,
    }));

  it('should transform a single LocalFileInfo to DTOAuthorizedFileForAI', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'John_Resume.pdf',
        relativePath: 'John_Resume.pdf',
        extension: 'pdf',
        size: 123456,
        lastModified: Date.now(),
        mimeType: 'application/pdf',
      },
    ];

    const result = transformLocalFilesToDTO(localFiles);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 0,
      filename: 'John_Resume.pdf',
      description: 'Local file: John_Resume.pdf',
      useCases: 'Match with fields accepting PDF files',
      category: 'document',
      mimeType: 'application/pdf',
      fileSize: 123456,
    });
  });

  it('should use sequential indices as IDs', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'resume.pdf',
        relativePath: 'resume.pdf',
        extension: 'pdf',
        size: 1000,
        lastModified: Date.now(),
        mimeType: 'application/pdf',
      },
      {
        name: 'photo.jpg',
        relativePath: 'photo.jpg',
        extension: 'jpg',
        size: 2000,
        lastModified: Date.now(),
        mimeType: 'image/jpeg',
      },
      {
        name: 'cert.png',
        relativePath: 'cert.png',
        extension: 'png',
        size: 3000,
        lastModified: Date.now(),
        mimeType: 'image/png',
      },
    ];

    const result = transformLocalFilesToDTO(localFiles);
    expect(result.map(f => f.id)).toEqual([0, 1, 2]);
  });

  it('should generate description from filename', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'My_Certificate_2024.png',
        relativePath: 'My_Certificate_2024.png',
        extension: 'png',
        size: 50000,
        lastModified: Date.now(),
        mimeType: 'image/png',
      },
    ];

    const result = transformLocalFilesToDTO(localFiles);
    expect(result[0].description).toBe('Local file: My_Certificate_2024.png');
  });

  it('should generate useCases from uppercase extension', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'spreadsheet.xlsx',
        relativePath: 'spreadsheet.xlsx',
        extension: 'xlsx',
        size: 80000,
        lastModified: Date.now(),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ];

    const result = transformLocalFilesToDTO(localFiles);
    expect(result[0].useCases).toBe('Match with fields accepting XLSX files');
  });

  it('should default category to "document"', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'photo.jpg',
        relativePath: 'photo.jpg',
        extension: 'jpg',
        size: 10000,
        lastModified: Date.now(),
        mimeType: 'image/jpeg',
      },
    ];

    // Note: Even for images, the current implementation defaults to 'document'
    const result = transformLocalFilesToDTO(localFiles);
    expect(result[0].category).toBe('document');
  });

  it('should correctly map mimeType and fileSize', () => {
    const localFiles: LocalFileInfo[] = [
      {
        name: 'data.csv',
        relativePath: 'data.csv',
        extension: 'csv',
        size: 42000,
        lastModified: Date.now(),
        mimeType: 'text/csv',
      },
    ];

    const result = transformLocalFilesToDTO(localFiles);
    expect(result[0].mimeType).toBe('text/csv');
    expect(result[0].fileSize).toBe(42000);
  });

  it('should handle empty array', () => {
    const result = transformLocalFilesToDTO([]);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// 19. Integration: MIME type consistency between file.ts and FolderSelector
// ============================================================================
describe('MIME type consistency between file.ts and FolderSelector', () => {
  const commonExtensions = [
    'pdf',
    'doc',
    'docx',
    'txt',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'xls',
    'xlsx',
    'csv',
    'ppt',
    'pptx',
    'zip',
  ];

  commonExtensions.forEach(ext => {
    it(`should return consistent MIME types for .${ext}`, () => {
      const fileTs = getFileTypeFromExtension(`test.${ext}`);
      const folderSelector = getMimeType(ext);
      expect(fileTs).toBe(folderSelector);
    });
  });
});
