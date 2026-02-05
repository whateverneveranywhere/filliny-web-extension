import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useCallback, useEffect, useState } from 'react';
import type { DTOAuthorizedFile, AuthorizedFileCategory, DTOAuthorizedFileUpdate } from '@extension/shared';

interface FileMetadataDialogProps {
  file: DTOAuthorizedFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fileId: string, data: DTOAuthorizedFileUpdate) => void;
  isSaving?: boolean;
}

const FileMetadataDialog = ({ file, open, onOpenChange, onSave, isSaving }: FileMetadataDialogProps) => {
  const [description, setDescription] = useState('');
  const [useCases, setUseCases] = useState('');
  const [category, setCategory] = useState<AuthorizedFileCategory>('document');

  // Reset form when file changes
  useEffect(() => {
    if (file) {
      setDescription(file.description);
      setUseCases(file.useCases);
      setCategory(file.category);
    }
  }, [file]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(() => {
    if (!file || !description.trim() || !useCases.trim()) {
      return;
    }

    onSave(String(file.id), {
      description: description.trim(),
      useCases: useCases.trim(),
      category,
    });
  }, [file, description, useCases, category, onSave]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:filliny-max-w-md">
        <DialogHeader>
          <DialogTitle>Edit File Details</DialogTitle>
          <DialogDescription>
            Update the description and usage instructions for {file.originalFilename}
          </DialogDescription>
        </DialogHeader>

        <div className="filliny-grid filliny-gap-4 filliny-py-4">
          {/* Category Select */}
          <div className="filliny-grid filliny-gap-2">
            <Label htmlFor="edit-category">Category</Label>
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
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              placeholder="e.g., My professional resume"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Use Cases */}
          <div className="filliny-grid filliny-gap-2">
            <Label htmlFor="edit-useCases">When to use</Label>
            <Textarea
              id="edit-useCases"
              placeholder="e.g., Use for job applications, when resume is requested"
              value={useCases}
              onChange={e => setUseCases(e.target.value)}
              rows={2}
            />
            <p className="filliny-text-xs filliny-text-muted-foreground">Describe when AI should use this file</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || !useCases.trim() || isSaving}
            loading={isSaving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { FileMetadataDialog };
