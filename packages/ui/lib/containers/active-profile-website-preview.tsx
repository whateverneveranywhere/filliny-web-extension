'use client';

import React, { useCallback } from 'react';

import { Label } from '@radix-ui/react-label';

import { Check, X } from 'lucide-react';
import { usePOVListQuery, useTonesListQuery } from '@extension/shared';
import { Badge } from '../components';
import { WebsitePreviewCard } from '../components/StepperForms/WebsitePreviewCard';
import type { DTOFillingPrefrences, DTOFillingWebsite } from '@extension/storage';

interface Props {
  matchingWebsite: DTOFillingWebsite;
  preferences: DTOFillingPrefrences;
}

const ActiveProfileWebsitePreview: React.FC<Props> = ({ matchingWebsite, preferences }) => {
  const { websiteUrl, isRootLoad, fillingContext } = matchingWebsite;

  const { data: povList } = usePOVListQuery();
  const { data: tonesList } = useTonesListQuery();

  const toneLabel = tonesList?.find(tone => tone.value === String(preferences.toneId))?.label || preferences.toneId;
  const povLabel = povList?.find(pov => pov.value === String(preferences.povId))?.label || preferences.povId;

  const renderBadge = useCallback(
    (condition: boolean) => (
      <Badge className="flex items-center justify-center" variant={'outline'}>
        {condition ? <Check className="mr-2 text-green-500" /> : <X className="mr-2 text-red-500" />}
        {condition ? 'Yes' : 'No'}
      </Badge>
    ),
    [],
  );

  return (
    <>
      <WebsitePreviewCard websiteURL={websiteUrl} isRootLoad={isRootLoad} hideExpandTrigger defaultExpanded>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex w-full max-w-md flex-col items-start justify-start gap-2">
            <Label className="w-full text-center font-semibold">Filling Context</Label>
            <p className="w-full">{fillingContext}</p>
          </div>
          <div className="flex w-full max-w-md items-center justify-between">
            <Label className="font-semibold">Root Load:</Label>
            {renderBadge(isRootLoad)}
          </div>
          <div className="flex w-full max-w-md items-center justify-between">
            <Label className="font-semibold">Formal Tone:</Label>
            {renderBadge(preferences.isFormal)}
          </div>
          <div className="flex w-full max-w-md items-center justify-between">
            <Label className="font-semibold">Gap Filling Allowed:</Label>
            {renderBadge(preferences.isGapFillingAllowed)}
          </div>
          <div className="flex w-full max-w-md items-center justify-between">
            <Label className="font-semibold">Tone:</Label>
            <span>{toneLabel}</span>
          </div>
          <div className="flex w-full max-w-md items-center justify-between">
            <Label className="font-semibold">Point of View:</Label>
            <span>{povLabel}</span>
          </div>
        </div>
      </WebsitePreviewCard>
    </>
  );
};

export { ActiveProfileWebsitePreview };
