import { Textarea } from '../ui/textarea';
import { animationClasses } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { extractTextFromFile, isAcceptedFileType, DEFAULT_ACCEPTED_FILE_TYPES } from '@/lib/utils/file-processing';
import { Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useController } from 'react-hook-form';
import { toast } from 'sonner';
import type React from 'react';

interface RHFShadcnFileDropProps {
  name: string;
  title?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  accept?: string;
}

const RHFShadcnFileDrop = ({
  name,
  title,
  placeholder,
  rows = 4,
  className,
  accept = DEFAULT_ACCEPTED_FILE_TYPES,
}: RHFShadcnFileDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    field,
    fieldState: { error },
  } = useController({ name });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        const extractedText = await extractTextFromFile(file);
        field.onChange(extractedText);
        toast.success('File processed successfully');
      } catch (err) {
        console.error('File processing error:', err);
        toast.error(err instanceof Error ? err.message : 'Error processing file');
      } finally {
        setIsProcessing(false);
      }
    },
    [field],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (!isAcceptedFileType(file, accept)) {
        toast.error(`Invalid file type. Supported types: ${accept}`);
        return;
      }

      await processFile(file);
    },
    [accept, processFile],
  );

  return (
    <div className="filliny-space-y-2">
      {title && (
        <label className="filliny-text-sm filliny-font-medium filliny-leading-none peer-disabled:filliny-cursor-not-allowed peer-disabled:filliny-opacity-70">
          {title}
        </label>
      )}
      <div
        className={cn(
          'filliny-relative filliny-rounded-md filliny-border filliny-border-input',
          animationClasses.transitionSlow,
          isDragging && 'filliny-border-primary filliny-bg-accent/50 filliny-scale-[1.02] filliny-shadow-lg',
          error && 'filliny-border-destructive',
          className,
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        <Textarea
          {...field}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn(
            'filliny-min-h-[80px] filliny-w-full filliny-resize-none filliny-bg-transparent filliny-p-3',
            animationClasses.transitionOpacity,
            isDragging && 'filliny-opacity-50',
          )}
        />
        <div
          className={cn(
            'filliny-absolute filliny-inset-0 filliny-flex filliny-items-center filliny-justify-center filliny-bg-background/80 filliny-backdrop-blur-sm',
            animationClasses.transitionSlow,
            isDragging
              ? 'filliny-opacity-100 filliny-scale-100'
              : 'filliny-opacity-0 filliny-scale-95 filliny-pointer-events-none',
          )}>
          <div
            className={cn(
              'filliny-flex filliny-flex-col filliny-items-center filliny-gap-3',
              animationClasses.transitionSlow,
            )}>
            <Upload
              className={cn(
                'filliny-h-10 filliny-w-10 filliny-text-muted-foreground',
                animationClasses.transitionSlow,
                isDragging && 'filliny-scale-125 filliny-text-primary',
                isDragging && animationClasses.bounce,
              )}
            />
            <span
              className={cn(
                'filliny-text-center filliny-text-sm filliny-text-muted-foreground',
                animationClasses.transitionColors,
                isDragging && 'filliny-text-primary filliny-font-medium',
              )}>
              Drop your file here to extract content
            </span>
            <span className="filliny-text-xs filliny-text-muted-foreground filliny-max-w-[80%] filliny-text-center">
              Supports {accept.replace(/\./g, '')} files
            </span>
          </div>
        </div>
        {isProcessing && (
          <div
            className={cn(
              'filliny-absolute filliny-inset-0 filliny-flex filliny-flex-col filliny-gap-3 filliny-items-center filliny-justify-center filliny-bg-background/90 filliny-backdrop-blur-sm',
              animationClasses.fadeInSlow,
            )}>
            <Loader2 className={cn('filliny-h-8 filliny-w-8 filliny-text-primary', animationClasses.spin)} />
            <span className="filliny-text-sm filliny-text-muted-foreground">Extracting content...</span>
          </div>
        )}
      </div>
      {error && (
        <p
          className={cn(
            'filliny-text-sm filliny-text-destructive filliny-flex filliny-items-center filliny-gap-1',
            animationClasses.slideInBottom,
          )}>
          <span className="filliny-rounded-full filliny-bg-destructive/20 filliny-p-0.5 filliny-flex filliny-items-center filliny-justify-center">
            <span className="filliny-h-1 filliny-w-1 filliny-rounded-full filliny-bg-destructive" />
          </span>
          {error.message}
        </p>
      )}
    </div>
  );
};

export default RHFShadcnFileDrop;
