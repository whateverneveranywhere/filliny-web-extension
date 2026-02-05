import { cn } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { FileText, Image, Award, File, Trash2, Edit2, Download } from 'lucide-react';
import type { DTOAuthorizedFile, AuthorizedFileCategory } from '@extension/shared';

interface AuthorizedFileCardProps {
  file: DTOAuthorizedFile;
  onEdit: (file: DTOAuthorizedFile) => void;
  onDelete: (file: DTOAuthorizedFile) => void;
  onDownload: (file: DTOAuthorizedFile) => void;
  isDeleting?: boolean;
}

const getCategoryIcon = (category: AuthorizedFileCategory) => {
  switch (category) {
    case 'resume':
      return FileText;
    case 'photo':
      return Image;
    case 'certificate':
      return Award;
    case 'document':
      return FileText;
    default:
      return File;
  }
};

const getCategoryColor = (category: AuthorizedFileCategory): string => {
  switch (category) {
    case 'resume':
      return 'filliny-bg-blue-100 filliny-text-blue-800 dark:filliny-bg-blue-900 dark:filliny-text-blue-200';
    case 'photo':
      return 'filliny-bg-purple-100 filliny-text-purple-800 dark:filliny-bg-purple-900 dark:filliny-text-purple-200';
    case 'certificate':
      return 'filliny-bg-amber-100 filliny-text-amber-800 dark:filliny-bg-amber-900 dark:filliny-text-amber-200';
    case 'document':
      return 'filliny-bg-green-100 filliny-text-green-800 dark:filliny-bg-green-900 dark:filliny-text-green-200';
    default:
      return 'filliny-bg-gray-100 filliny-text-gray-800 dark:filliny-bg-gray-900 dark:filliny-text-gray-200';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AuthorizedFileCard = ({ file, onEdit, onDelete, onDownload, isDeleting }: AuthorizedFileCardProps) => {
  const Icon = getCategoryIcon(file.category);

  return (
    <Card className="filliny-relative filliny-overflow-hidden">
      <CardContent className="filliny-p-4">
        <div className="filliny-flex filliny-items-start filliny-gap-3">
          {/* File Icon */}
          <div
            className={cn(
              'filliny-flex filliny-h-10 filliny-w-10 filliny-shrink-0 filliny-items-center filliny-justify-center filliny-rounded-lg',
              getCategoryColor(file.category),
            )}>
            <Icon className="filliny-h-5 filliny-w-5" />
          </div>

          {/* File Info */}
          <div className="filliny-flex-1 filliny-min-w-0">
            <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-mb-1">
              <h4 className="filliny-font-medium filliny-text-sm filliny-truncate" title={file.originalFilename}>
                {file.originalFilename}
              </h4>
              <Badge variant="outline" className="filliny-shrink-0 filliny-text-xs">
                {file.category}
              </Badge>
            </div>
            <p
              className="filliny-text-xs filliny-text-muted-foreground filliny-mb-1 filliny-truncate"
              title={file.description}>
              {file.description}
            </p>
            <p className="filliny-text-xs filliny-text-muted-foreground/70">
              {formatFileSize(file.fileSize)} • {file.extension.toUpperCase()}
            </p>
          </div>

          {/* Actions */}
          <div className="filliny-flex filliny-items-center filliny-gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="filliny-h-8 filliny-w-8"
              onClick={() => onDownload(file)}
              title="Download">
              <Download className="filliny-h-4 filliny-w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="filliny-h-8 filliny-w-8"
              onClick={() => onEdit(file)}
              title="Edit">
              <Edit2 className="filliny-h-4 filliny-w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="filliny-h-8 filliny-w-8 filliny-text-destructive hover:filliny-text-destructive"
              onClick={() => onDelete(file)}
              disabled={isDeleting}
              title="Delete">
              <Trash2 className="filliny-h-4 filliny-w-4" />
            </Button>
          </div>
        </div>

        {/* Use Cases */}
        {file.useCases && (
          <div className="filliny-mt-3 filliny-pt-3 filliny-border-t filliny-border-border">
            <p className="filliny-text-xs filliny-text-muted-foreground">
              <span className="filliny-font-medium">When to use:</span> {file.useCases}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { AuthorizedFileCard };
