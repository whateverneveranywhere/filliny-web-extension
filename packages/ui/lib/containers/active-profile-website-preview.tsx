'use client';

import { animationClasses } from '../animations';
import { SingleWebsiteEditModal } from '../components/SingleWebsiteEditModal';
import { WebsitePreviewCard } from '../components/stepper-forms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { cn } from '../utils';
import { extractTextFromFile, isAcceptedFileType, DEFAULT_ACCEPTED_FILE_TYPES } from '../utils/file-processing';
import {
  usePOVListQuery,
  useTonesListQuery,
  useEditFillingProfileMutation,
  notifyProfileUpdate,
  MessageType,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { Check, X, Info, Pencil, ChevronDown, Upload, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DTOFillingPreferences, DTOFillingWebsite, DTOProfileFillingForm } from '@extension/storage';
import type React from 'react';

interface Props {
  matchingWebsite: DTOFillingWebsite;
  preferences: DTOFillingPreferences;
  profile: DTOProfileFillingForm;
}

interface PreferenceItemProps {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
}

const PreferenceItem = ({ label, value, tooltip }: PreferenceItemProps) => (
  <div className="filliny-flex filliny-items-center filliny-justify-between filliny-py-1.5">
    <div className="filliny-flex filliny-items-center filliny-gap-1.5">
      <span className="filliny-text-sm filliny-font-medium filliny-leading-none">{label}</span>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="filliny-h-4 filliny-w-4 filliny-text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="filliny-max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    {value}
  </div>
);

const StatusBadge = ({ condition }: { condition: boolean }) => (
  <Badge
    variant={condition ? 'default' : 'secondary'}
    className={cn(
      'filliny-flex filliny-items-center filliny-gap-2',
      condition ? 'filliny-bg-success/10 filliny-text-success' : 'filliny-bg-destructive/10 filliny-text-destructive',
    )}>
    {condition ? <Check className="filliny-h-3 filliny-w-3" /> : <X className="filliny-h-3 filliny-w-3" />}
    {condition ? 'Enabled' : 'Disabled'}
  </Badge>
);

const CONTEXT_COLLAPSED_HEIGHT = 72;

interface FillingContextPreviewProps {
  context: string;
  onFileDrop: (newContext: string) => Promise<void>;
}

const FillingContextPreview = ({ context, onFileDrop }: FillingContextPreviewProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const { toast } = useToast();

  const checkOverflow = useCallback(() => {
    const el = contentRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > CONTEXT_COLLAPSED_HEIGHT);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
  }, [context, checkOverflow]);

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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (!isAcceptedFileType(file, DEFAULT_ACCEPTED_FILE_TYPES)) {
        toast({
          variant: 'destructive',
          title: 'Unsupported file type',
          description: `Supported types: ${DEFAULT_ACCEPTED_FILE_TYPES.replace(/\./g, '')}`,
        });
        return;
      }

      setIsProcessing(true);
      try {
        const extractedText = await extractTextFromFile(file);
        await onFileDrop(extractedText);
      } catch (err) {
        console.error('File processing error:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to extract content from file',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileDrop, toast],
  );

  const displayText = context || 'No context provided';

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-1">
      <span className="filliny-text-xs filliny-font-medium filliny-text-muted-foreground">Filling Context</span>
      <div
        className={cn(
          'filliny-relative filliny-rounded-md filliny-border',
          animationClasses.transitionSlow,
          isDragging ? 'filliny-border-primary filliny-bg-accent/50' : 'filliny-border-transparent',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        <p
          ref={contentRef}
          className={cn(
            'filliny-text-sm filliny-leading-relaxed filliny-text-foreground/80 filliny-break-words filliny-overflow-hidden filliny-transition-all filliny-duration-200',
            !isExpanded && isOverflowing && 'filliny-max-h-[72px]',
            isDragging && 'filliny-opacity-30',
          )}>
          {displayText}
        </p>
        {isOverflowing && !isExpanded && !isDragging && !isProcessing && (
          <div className="filliny-pointer-events-none filliny-absolute filliny-inset-x-0 filliny-bottom-0 filliny-h-10 filliny-bg-gradient-to-t filliny-from-card filliny-to-transparent" />
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div
            className={cn(
              'filliny-absolute filliny-inset-0 filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-2 filliny-rounded-md filliny-bg-background/80 filliny-backdrop-blur-sm',
              animationClasses.fadeInFast,
            )}>
            <Upload className={cn('filliny-h-8 filliny-w-8 filliny-text-primary', animationClasses.bounce)} />
            <span className="filliny-text-xs filliny-font-medium filliny-text-primary">
              Drop file to update context
            </span>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div
            className={cn(
              'filliny-absolute filliny-inset-0 filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-2 filliny-rounded-md filliny-bg-background/90 filliny-backdrop-blur-sm',
              animationClasses.fadeInFast,
            )}>
            <Loader2 className={cn('filliny-h-6 filliny-w-6 filliny-text-primary', animationClasses.spin)} />
            <span className="filliny-text-xs filliny-text-muted-foreground">Extracting content...</span>
          </div>
        )}
      </div>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="filliny-inline-flex filliny-items-center filliny-gap-1 filliny-self-start filliny-text-xs filliny-text-muted-foreground filliny-transition-colors hover:filliny-text-foreground">
          <ChevronDown
            className={cn(
              'filliny-h-3 filliny-w-3 filliny-transition-transform filliny-duration-200',
              isExpanded && 'filliny-rotate-180',
            )}
          />
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

const ActiveProfileWebsitePreview: React.FC<Props> = ({ matchingWebsite, preferences, profile }) => {
  const { websiteUrl, isRootLoad } = matchingWebsite;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: povList } = usePOVListQuery();
  const { data: tonesList } = useTonesListQuery();
  const { mutateAsync: editProfile } = useEditFillingProfileMutation();
  const { toast } = useToast();

  const toneLabel = tonesList?.find(tone => tone.value === String(preferences.toneId))?.label || preferences.toneId;
  const povLabel = povList?.find(pov => pov.value === String(preferences.povId))?.label || preferences.povId;

  const handleQuickEdit = useCallback(
    async (updatedWebsite: DTOFillingWebsite) => {
      try {
        const updatedWebsites = profile.fillingWebsites.map(website =>
          website.websiteUrl === updatedWebsite.websiteUrl ? updatedWebsite : website,
        );

        const updatedProfile = {
          ...profile,
          fillingWebsites: updatedWebsites,
        };

        await editProfile({
          id: String(profile.id),
          data: updatedProfile,
        });

        await profileStorage.setDefaultProfile(updatedProfile);
        // Notify content scripts about the profile update so they re-evaluate visibility
        await notifyProfileUpdate(MessageType.PROFILE_UPDATED);

        toast({ title: 'Settings Saved', description: 'Your website settings have been updated.' });
      } catch (error) {
        console.error('Error updating website:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update website settings',
        });
      }
    },
    [profile, editProfile, toast],
  );

  const handleContextFileDrop = useCallback(
    async (newContext: string) => {
      await handleQuickEdit({ ...matchingWebsite, fillingContext: newContext });
    },
    [matchingWebsite, handleQuickEdit],
  );

  return (
    <>
      <WebsitePreviewCard
        websiteURL={websiteUrl}
        isRootLoad={isRootLoad}
        hideExpandTrigger
        defaultExpanded
        className=""
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditModalOpen(true)}
            className="filliny-h-8 filliny-w-8"
            title="Edit website settings">
            <Pencil className="filliny-h-4 filliny-w-4" />
          </Button>
        }>
        <div className="filliny-flex filliny-flex-col filliny-gap-4">
          {/* Context Section */}
          <FillingContextPreview context={matchingWebsite.fillingContext} onFileDrop={handleContextFileDrop} />

          <Separator />

          {/* Preferences Section */}
          <div className="filliny-flex filliny-flex-col filliny-gap-1">
            <PreferenceItem
              label="Root Load"
              value={<StatusBadge condition={matchingWebsite.isRootLoad} />}
              tooltip="When enabled, Filliny will work on all pages under this domain"
            />
            <PreferenceItem
              label="Formal Tone"
              value={<StatusBadge condition={preferences.isFormal} />}
              tooltip="Determines if the generated content should use formal language"
            />
            <PreferenceItem
              label="Gap Filling"
              value={<StatusBadge condition={preferences.isGapFillingAllowed} />}
              tooltip="Allows Filliny to fill in missing information when appropriate"
            />
            <PreferenceItem
              label="Tone"
              value={
                <Badge variant="outline" className="filliny-bg-primary/5">
                  {toneLabel}
                </Badge>
              }
              tooltip="The emotional tone used for generated content"
            />
            <PreferenceItem
              label="Point of View"
              value={
                <Badge variant="outline" className="filliny-bg-primary/5">
                  {povLabel}
                </Badge>
              }
              tooltip="The perspective used in generated content"
            />
          </div>
        </div>
      </WebsitePreviewCard>

      <SingleWebsiteEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        website={matchingWebsite}
        profile={profile}
        onSubmit={handleQuickEdit}
      />
    </>
  );
};

export { ActiveProfileWebsitePreview };
