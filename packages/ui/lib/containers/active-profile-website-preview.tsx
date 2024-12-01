'use client';

import React, { useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Check, X, Info, Pencil, Trash } from 'lucide-react';
import { usePOVListQuery, useTonesListQuery, useEditFillingProfileMutation } from '@extension/shared';
import { Badge } from '../components/ui/badge';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Separator } from '../components/ui/separator';
import type { DTOFillingPrefrences, DTOFillingWebsite, DTOProfileFillingForm } from '@extension/storage';
import { cn } from '../utils';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { SingleWebsiteEditModal } from '../components/SingleWebsiteEditModal';
import { profileStrorage } from '@extension/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

interface Props {
  matchingWebsite: DTOFillingWebsite;
  preferences: DTOFillingPrefrences;
  profile: DTOProfileFillingForm;
}

interface PreferenceItemProps {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
}

const PreferenceItem = ({ label, value, tooltip }: PreferenceItemProps) => (
  <div className="filliny-flex filliny-items-center filliny-justify-between filliny-py-2">
    <div className="filliny-flex filliny-items-center filliny-gap-2">
      <Label className="filliny-font-medium">{label}</Label>
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
      condition ? 'filliny-bg-green-500/10 filliny-text-green-500' : 'filliny-bg-red-500/10 filliny-text-red-500',
    )}>
    {condition ? <Check className="filliny-h-3 filliny-w-3" /> : <X className="filliny-h-3 filliny-w-3" />}
    {condition ? 'Enabled' : 'Disabled'}
  </Badge>
);

const ActiveProfileWebsitePreview: React.FC<Props> = ({ matchingWebsite, preferences, profile }) => {
  const { websiteUrl, isRootLoad } = matchingWebsite;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: povList } = usePOVListQuery();
  const { data: tonesList } = useTonesListQuery();
  const { mutateAsync: editProfile } = useEditFillingProfileMutation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const toneLabel = tonesList?.find(tone => tone.value === String(preferences.toneId))?.label || preferences.toneId;
  const povLabel = povList?.find(pov => pov.value === String(preferences.povId))?.label || preferences.povId;

  const handleQuickEdit = async (updatedWebsite: DTOFillingWebsite) => {
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

      await profileStrorage.setDefaultProfile(updatedProfile);

      toast({ title: 'Website settings updated successfully' });
    } catch (error) {
      console.error('Error updating website:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update website settings',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const updatedProfile = {
        ...profile,
        fillingWebsites: profile.fillingWebsites.filter(website => website.websiteUrl !== matchingWebsite.websiteUrl),
      };

      await editProfile({
        id: String(profile.id),
        data: updatedProfile,
      });

      await profileStrorage.setDefaultProfile(updatedProfile);

      toast({ title: 'Website removed from profile successfully' });
    } catch (error) {
      console.error('Error removing website:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove website',
      });
    }
  };

  return (
    <>
      <WebsitePreviewCard
        websiteURL={websiteUrl}
        isRootLoad={isRootLoad}
        hideExpandTrigger
        defaultExpanded
        className="filliny-bg-card/50 filliny-backdrop-blur"
        actions={
          <div className="filliny-flex filliny-gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditModalOpen(true)}
              className="filliny-h-8 filliny-w-8 hover:filliny-bg-primary/10"
              title="Edit website settings">
              <Pencil className="filliny-h-4 filliny-w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="filliny-h-8 filliny-w-8 hover:filliny-bg-destructive/10 hover:filliny-text-destructive"
              title="Remove website from profile">
              <Trash className="filliny-h-4 filliny-w-4 filliny-text-destructive" />
            </Button>
          </div>
        }>
        <div className="filliny-space-y-4">
          {/* Context Section */}
          <div className="filliny-space-y-2">
            <Label className="filliny-text-sm filliny-font-semibold filliny-text-muted-foreground">
              Filling Context
            </Label>
            <p className="filliny-rounded-lg filliny-bg-muted/50 filliny-p-3 filliny-text-sm">
              {matchingWebsite.fillingContext || 'No context provided'}
            </p>
          </div>

          <Separator className="filliny-my-4" />

          {/* Preferences Section */}
          <div className="filliny-space-y-1">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this website from your profile? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="filliny-bg-destructive hover:filliny-bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
