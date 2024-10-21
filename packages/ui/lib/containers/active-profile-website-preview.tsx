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
      <Badge className="filliny-flex filliny-items-center filliny-justify-center" variant={'outline'}>
        {condition ? (
          <Check className="filliny-mr-2 filliny-text-green-500" />
        ) : (
          <X className="filliny-mr-2 filliny-text-red-500" />
        )}
        {condition ? 'Yes' : 'No'}
      </Badge>
    ),
    [],
  );

  return (
    <>
      <WebsitePreviewCard websiteURL={websiteUrl} isRootLoad={isRootLoad} hideExpandTrigger defaultExpanded>
        <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4">
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-flex-col filliny-items-start filliny-justify-start filliny-gap-2">
            <Label className="filliny-w-full filliny-text-center filliny-font-semibold">Filling Context</Label>
            <p className="filliny-w-full">{fillingContext}</p>
          </div>
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center filliny-justify-between">
            <Label className="filliny-font-semibold">Root Load:</Label>
            {renderBadge(isRootLoad)}
          </div>
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center filliny-justify-between">
            <Label className="filliny-font-semibold">Formal Tone:</Label>
            {renderBadge(preferences.isFormal)}
          </div>
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center filliny-justify-between">
            <Label className="filliny-font-semibold">Gap Filling Allowed:</Label>
            {renderBadge(preferences.isGapFillingAllowed)}
          </div>
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center filliny-justify-between">
            <Label className="filliny-font-semibold">Tone:</Label>
            <span>{toneLabel}</span>
          </div>
          <div className="filliny-flex filliny-w-full filliny-max-w-md filliny-items-center filliny-justify-between">
            <Label className="filliny-font-semibold">Point of View:</Label>
            <span>{povLabel}</span>
          </div>
        </div>
      </WebsitePreviewCard>
    </>
  );
};

export { ActiveProfileWebsitePreview };
