import React from 'react';
import { RHFShadcnComboBox, RHFShadcnSwitch } from '../RHF';
import { usePOVListQuery, useTonesListQuery } from '@extension/shared';

function StepperForm3() {
  const { data: povList, isLoading: isLoadingPOVs } = usePOVListQuery();
  const { data: tonesList, isLoading: isLoadingTones } = useTonesListQuery();
  return (
    <>
      <div className="filliny-grid filliny-gap-4">
        <RHFShadcnSwitch name="preferences.isFormal" title="Use formal tone" />
        <RHFShadcnSwitch name="preferences.isGapFillingAllowed" title="Guess-complete missing context" />
        <RHFShadcnComboBox
          isFullWidth
          loading={isLoadingPOVs}
          options={povList || []}
          name="preferences.povId"
          title="POV"
        />
        <RHFShadcnComboBox
          isFullWidth
          loading={isLoadingTones}
          options={tonesList || []}
          name="preferences.toneId"
          title="Tone"
        />
      </div>
    </>
  );
}

export default StepperForm3;
