import { RHFShadcnSelect, RHFShadcnSwitch } from '../rhf';
import { usePOVListQuery, useTonesListQuery } from '@extension/shared';

const StepperForm3 = () => {
  const { data: povList, isLoading: isLoadingPOVs } = usePOVListQuery();
  const { data: tonesList, isLoading: isLoadingTones } = useTonesListQuery();
  return (
    <>
      <div className="filliny-grid filliny-gap-4">
        <RHFShadcnSwitch name="preferences.isFormal" title="Use formal tone" />
        <RHFShadcnSwitch name="preferences.isGapFillingAllowed" title="Guess-complete missing context" />
        <RHFShadcnSelect
          isFullWidth
          loading={isLoadingPOVs}
          options={povList || []}
          name="preferences.povId"
          placeholder="Select POV"
          title="POV"
        />
        <RHFShadcnSelect
          isFullWidth
          loading={isLoadingTones}
          options={tonesList || []}
          name="preferences.toneId"
          placeholder="Select Tone"
          title="Tone"
        />
      </div>
    </>
  );
};

export default StepperForm3;
