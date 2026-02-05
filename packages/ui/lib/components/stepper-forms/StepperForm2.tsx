import { AuthorizedFilesSection } from '../authorized-files';
import { RHFShadcnTextField, RHFShadcnTextarea } from '../rhf';

interface StepperForm2Props {
  profileId?: string;
}

const StepperForm2 = ({ profileId }: StepperForm2Props) => (
  <div className="filliny-grid filliny-gap-6">
    <RHFShadcnTextField name="profileName" title="Filling profile's name" />

    <RHFShadcnTextarea
      name="defaultFillingContext"
      title="Default Filling context"
      rows={6}
      placeholder="Enter default instructions or context for filling forms (e.g., your professional summary, contact info, preferences)"
    />

    {/* Authorized Files Section - for selecting a folder with files AI can suggest for uploads */}
    {profileId ? (
      <div className="filliny-border-t filliny-border-border filliny-pt-6">
        <AuthorizedFilesSection profileId={profileId} />
      </div>
    ) : (
      <div className="filliny-border-t filliny-border-border filliny-pt-6">
        <div className="filliny-rounded-md filliny-bg-muted/30 filliny-p-4">
          <h3 className="filliny-text-sm filliny-font-medium filliny-mb-1">Authorized Files</h3>
          <p className="filliny-text-xs filliny-text-muted-foreground">
            Save the profile first to configure authorized files for AI to use when filling file upload fields.
          </p>
        </div>
      </div>
    )}
  </div>
);

export default StepperForm2;
