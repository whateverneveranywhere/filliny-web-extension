import { AuthorizedFilesSection } from '../authorized-files';
import { RHFShadcnTextField, RHFShadcnFileDrop } from '../rhf';

interface StepperForm2Props {
  profileId?: string;
}

const StepperForm2 = ({ profileId }: StepperForm2Props) => (
  <div className="filliny-grid filliny-gap-6">
    <RHFShadcnTextField name="profileName" title="Filling profile's name" />

    <RHFShadcnFileDrop
      name="defaultFillingContext"
      title="Default Filling context"
      rows={12}
      placeholder="Enter default instructions or context for filling forms"
    />

    {/* Authorized Files Section - only shown when editing an existing profile */}
    {profileId && (
      <div className="filliny-border-t filliny-border-border filliny-pt-6">
        <AuthorizedFilesSection profileId={profileId} />
      </div>
    )}
  </div>
);

export default StepperForm2;
