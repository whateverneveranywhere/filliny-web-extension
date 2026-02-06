import { cn } from '../../utils';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { FileText, Image, FileSpreadsheet, FileArchive, FileAudio, FileVideo, File } from 'lucide-react';
import type { LocalFileInfo } from '@extension/storage';

interface LocalFilesListProps {
  files: LocalFileInfo[];
  className?: string;
}

/**
 * Get icon component based on file type/extension
 */
const getFileIcon = (extension: string, mimeType: string) => {
  // Check by mime type category first
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.startsWith('video/')) return FileVideo;

  // Check by extension
  const ext = extension.toLowerCase();
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (documentExts.includes(ext)) return FileText;
  if (spreadsheetExts.includes(ext)) return FileSpreadsheet;
  if (archiveExts.includes(ext)) return FileArchive;

  return File;
};

/**
 * Get badge color class based on file category
 */
const getBadgeClass = (extension: string, mimeType: string): string => {
  if (mimeType.startsWith('image/')) {
    return 'filliny-bg-purple-100 filliny-text-purple-800 dark:filliny-bg-purple-900 dark:filliny-text-purple-200';
  }
  if (mimeType.startsWith('audio/')) {
    return 'filliny-bg-pink-100 filliny-text-pink-800 dark:filliny-bg-pink-900 dark:filliny-text-pink-200';
  }
  if (mimeType.startsWith('video/')) {
    return 'filliny-bg-red-100 filliny-text-red-800 dark:filliny-bg-red-900 dark:filliny-text-red-200';
  }

  const ext = extension.toLowerCase();
  if (['pdf', 'doc', 'docx'].includes(ext)) {
    return 'filliny-bg-blue-100 filliny-text-blue-800 dark:filliny-bg-blue-900 dark:filliny-text-blue-200';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'filliny-bg-green-100 filliny-text-green-800 dark:filliny-bg-green-900 dark:filliny-text-green-200';
  }
  if (['zip', 'rar', '7z'].includes(ext)) {
    return 'filliny-bg-amber-100 filliny-text-amber-800 dark:filliny-bg-amber-900 dark:filliny-text-amber-200';
  }

  return 'filliny-bg-gray-100 filliny-text-gray-800 dark:filliny-bg-gray-900 dark:filliny-text-gray-200';
};

/**
 * Format file size to human readable string
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const LocalFilesList = ({ files, className }: LocalFilesListProps) => {
  if (files.length === 0) {
    return (
      <div
        className={cn(
          'filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-py-6',
          'filliny-text-center filliny-text-muted-foreground',
          className,
        )}>
        <File className="filliny-mb-2 filliny-h-8 filliny-w-8 filliny-opacity-50" />
        <p className="filliny-text-sm">No files in this folder</p>
      </div>
    );
  }

  return (
    <ScrollArea
      className={cn(
        'filliny-h-[180px] filliny-w-full filliny-rounded-md filliny-border',
        '[&>[data-radix-scroll-area-viewport]>div]:!filliny-block',
        className,
      )}>
      <div className="filliny-p-2 filliny-space-y-1 filliny-w-full filliny-max-w-full">
        {files.map((file, index) => {
          const Icon = getFileIcon(file.extension, file.mimeType);
          const badgeClass = getBadgeClass(file.extension, file.mimeType);

          return (
            <div
              key={`${file.relativePath}-${index}`}
              className={cn(
                'filliny-flex filliny-items-center filliny-gap-2 filliny-p-2 filliny-rounded-md filliny-overflow-hidden',
                'hover:filliny-bg-muted/50 filliny-transition-colors',
              )}>
              {/* File Icon */}
              <div
                className={cn(
                  'filliny-flex filliny-h-8 filliny-w-8 filliny-shrink-0 filliny-items-center filliny-justify-center',
                  'filliny-rounded-md',
                  badgeClass,
                )}>
                <Icon className="filliny-h-4 filliny-w-4" />
              </div>

              {/* File Info */}
              <div className="filliny-flex-1 filliny-min-w-0 filliny-overflow-hidden">
                <p className="filliny-text-sm filliny-font-medium filliny-truncate" title={file.name}>
                  {file.name}
                </p>
                {file.relativePath !== file.name && (
                  <p
                    className="filliny-text-xs filliny-text-muted-foreground filliny-truncate"
                    title={file.relativePath}>
                    {file.relativePath}
                  </p>
                )}
              </div>

              {/* File Metadata */}
              <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-shrink-0">
                <Badge variant="outline" className="filliny-text-xs filliny-uppercase filliny-whitespace-nowrap">
                  {file.extension || '?'}
                </Badge>
                <span className="filliny-text-xs filliny-text-muted-foreground filliny-w-14 filliny-text-right filliny-whitespace-nowrap">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};

export { LocalFilesList };
