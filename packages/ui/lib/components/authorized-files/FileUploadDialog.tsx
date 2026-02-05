import { cn } from '../../utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { AuthorizedFileCategory } from '@extension/shared';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, metadata: { description: string; useCases: string; category: AuthorizedFileCategory }) => void;
  isUploading?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  resume: '.pdf,.doc,.docx',
  photo: '.jpg,.jpeg,.png,.webp',
  certificate: '.pdf,.jpg,.jpeg,.png',
  document: '.pdf,.doc,.docx,.txt,.rtf',
  other: '*',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileUploadDialog = ({ open, onOpenChange, onUpload, isUploading }: FileUploadDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [useCases, setUseCases] = useState('');
  const [category, setCategory] = useState<AuthorizedFileCategory>('document');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setDescription('');
    setUseCases('');
    setCategory('document');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);

      // Auto-detect category from file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
        // Check if it might be a resume based on filename
        if (file.name.toLowerCase().includes('resume') || file.name.toLowerCase().includes('cv')) {
          setCategory('resume');
        } else if (file.name.toLowerCase().includes('certificate') || file.name.toLowerCase().includes('cert')) {
          setCategory('certificate');
        } else {
          setCategory('document');
        }
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
        setCategory('photo');
      }
    },
    [validateFile],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleSubmit = useCallback(() => {
    if (!selectedFile || !description.trim() || !useCases.trim()) {
      setError('Please fill in all fields');
      return;
    }

    onUpload(selectedFile, {
      description: description.trim(),
      useCases: useCases.trim(),
      category,
    });
  }, [selectedFile, description, useCases, category, onUpload]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:filliny-max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Authorized File</DialogTitle>
          <DialogDescription>Add a file that AI can use to fill forms automatically.</DialogDescription>
        </DialogHeader>

        <div className="filliny-grid filliny-gap-4 filliny-py-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              'filliny-relative filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-rounded-lg filliny-border-2 filliny-border-dashed filliny-p-6 filliny-transition-colors',
              dragActive
                ? 'filliny-border-primary filliny-bg-primary/5'
                : 'filliny-border-muted-foreground/25 hover:filliny-border-muted-foreground/50',
              selectedFile && 'filliny-border-primary filliny-bg-primary/5',
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}>
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES[category]}
              onChange={handleInputChange}
              className="filliny-absolute filliny-inset-0 filliny-cursor-pointer filliny-opacity-0"
            />

            {selectedFile ? (
              <div className="filliny-flex filliny-items-center filliny-gap-2">
                <span className="filliny-text-sm filliny-font-medium filliny-truncate filliny-max-w-[200px]">
                  {selectedFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="filliny-h-6 filliny-w-6"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}>
                  <X className="filliny-h-4 filliny-w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="filliny-mb-2 filliny-h-8 filliny-w-8 filliny-text-muted-foreground" />
                <p className="filliny-text-sm filliny-text-muted-foreground">Drag & drop or click to select</p>
                <p className="filliny-text-xs filliny-text-muted-foreground/70 filliny-mt-1">
                  Max {MAX_FILE_SIZE / (1024 * 1024)}MB
                </p>
              </>
            )}
          </div>

          {error && <p className="filliny-text-sm filliny-text-destructive">{error}</p>}

          {/* Category Select */}
          <div className="filliny-grid filliny-gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as AuthorizedFileCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resume">Resume / CV</SelectItem>
                <SelectItem value="photo">Photo / Headshot</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="filliny-grid filliny-gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., My professional resume"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Use Cases */}
          <div className="filliny-grid filliny-gap-2">
            <Label htmlFor="useCases">When to use</Label>
            <Textarea
              id="useCases"
              placeholder="e.g., Use for job applications, when resume is requested"
              value={useCases}
              onChange={e => setUseCases(e.target.value)}
              rows={2}
            />
            <p className="filliny-text-xs filliny-text-muted-foreground">Describe when AI should use this file</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || !description.trim() || !useCases.trim() || isUploading}
            loading={isUploading}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { FileUploadDialog };
