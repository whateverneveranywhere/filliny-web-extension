'use client';

import React from 'react';
import { Label } from '@radix-ui/react-label';
import { Check, X, Info } from 'lucide-react';
import { usePOVListQuery, useTonesListQuery } from '@extension/shared';
import { Badge } from '../components/ui/badge';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Separator } from '../components/ui/separator';
import type { DTOFillingPrefrences, DTOFillingWebsite } from '@extension/storage';
import { cn } from '../utils';

interface Props {
  matchingWebsite: DTOFillingWebsite;
  preferences: DTOFillingPrefrences;
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

const ActiveProfileWebsitePreview: React.FC<Props> = ({ matchingWebsite, preferences }) => {
  const { websiteUrl, isRootLoad, fillingContext } = matchingWebsite;
  const { data: povList } = usePOVListQuery();
  const { data: tonesList } = useTonesListQuery();

  const toneLabel = tonesList?.find(tone => tone.value === String(preferences.toneId))?.label || preferences.toneId;
  const povLabel = povList?.find(pov => pov.value === String(preferences.povId))?.label || preferences.povId;

  return (
    <WebsitePreviewCard
      websiteURL={websiteUrl}
      isRootLoad={isRootLoad}
      hideExpandTrigger
      defaultExpanded
      className="filliny-bg-card/50 filliny-backdrop-blur">
      <div className="filliny-space-y-4">
        {/* Context Section */}
        <div className="filliny-space-y-2">
          <Label className="filliny-text-sm filliny-font-semibold filliny-text-muted-foreground">Filling Context</Label>
          <p className="filliny-rounded-lg filliny-bg-muted/50 filliny-p-3 filliny-text-sm">
            {fillingContext || 'No context provided'}
          </p>
        </div>

        <Separator className="filliny-my-4" />

        {/* Preferences Section */}
        <div className="filliny-space-y-1">
          <PreferenceItem
            label="Root Load"
            value={<StatusBadge condition={isRootLoad} />}
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
  );
};

export { ActiveProfileWebsitePreview };
