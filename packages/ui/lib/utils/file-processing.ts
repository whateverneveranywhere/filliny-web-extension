import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Supported file types for text extraction
 */
export type SupportedFileType = 'txt' | 'md' | 'docx' | 'pdf' | 'xlsx' | 'xls' | 'csv' | 'rtf';

/**
 * Default accepted file extensions
 */
export const DEFAULT_ACCEPTED_FILE_TYPES = '.docx,.pdf,.xlsx,.txt,.csv,.rtf,.md';

/**
 * Detect file type from file name
 */
export const detectFileType = (file: File): SupportedFileType | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) return null;

  const supportedTypes: SupportedFileType[] = ['txt', 'md', 'docx', 'pdf', 'xlsx', 'xls', 'csv', 'rtf'];
  return supportedTypes.includes(extension as SupportedFileType) ? (extension as SupportedFileType) : null;
};

/**
 * Validate if a file has an accepted type
 */
export const isAcceptedFileType = (file: File, acceptedTypes: string): boolean => {
  const normalizedTypes = acceptedTypes.split(',').map(type => type.replace('.', '').toLowerCase().trim());
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return normalizedTypes.some(type => fileExtension === type);
};

/**
 * Process PDF files - only available in browser environments
 */
export const processPDF = async (file: File): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing is only available in browser environments');
  }

  // Dynamically import PDF.js only in the browser
  const pdfjsLib = await import('pdfjs-dist');

  // Set the worker source to use the extension's own worker file
  // The worker should be included in the extension's assets
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Use the extension's assets path for Chrome extensions
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('assets/pdf.worker.js');
  } else {
    // Fallback for non-extension environments (not used in this case)
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const textContent: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Use type assertion for content.items to avoid TypeScript errors
    type PossibleTextItem = { str?: string; [key: string]: unknown };

    const pageText = content.items
      .filter((item: PossibleTextItem) => typeof item === 'object' && item && 'str' in item)
      .map((item: PossibleTextItem) => String(item.str))
      .join(' ');
    textContent.push(pageText);
  }

  return textContent.join('\n\n');
};

/**
 * Process DOCX files
 */
export const processDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Process Excel/CSV files (xlsx, xls, csv)
 */
export const processSpreadsheet = async (file: File, isRawCsv = false): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: isRawCsv });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_txt(firstSheet);
};

/**
 * Process plain text files (txt, md, rtf)
 */
export const processTextFile = async (file: File): Promise<string> => file.text();

/**
 * Extract text content from a file based on its type
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = detectFileType(file);

  if (!fileType) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    throw new Error(`Unsupported file type: ${extension}`);
  }

  let extractedText = '';

  switch (fileType) {
    case 'txt':
    case 'md':
    case 'rtf':
      extractedText = await processTextFile(file);
      break;

    case 'docx':
      extractedText = await processDOCX(file);
      break;

    case 'pdf':
      try {
        extractedText = await processPDF(file);
      } catch (error) {
        console.error('PDF processing error:', error);
        throw new Error('Failed to process PDF file. PDF.js may not be available in this environment.');
      }
      break;

    case 'xlsx':
    case 'xls':
      extractedText = await processSpreadsheet(file);
      break;

    case 'csv':
      extractedText = await processSpreadsheet(file, true);
      break;
  }

  if (!extractedText.trim()) {
    throw new Error('No text content could be extracted from the file');
  }

  return extractedText;
};
