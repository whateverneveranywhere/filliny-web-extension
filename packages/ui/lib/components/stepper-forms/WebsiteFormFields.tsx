import { RHFShadcnCheckbox, RHFShadcnTextField, RHFShadcnFileDrop } from '../rhf';
import { getConfig } from '@extension/shared';

// Get base URL for example placeholder
const config = getConfig();
const baseExampleURL = config.baseURL;

interface WebsiteFormFieldsProps {
  index: number;
}

/**
 * Form fields for editing a single website configuration.
 * Used in StepperForm1 and SingleWebsiteEditModal.
 */
export const WebsiteFormFields = ({ index }: WebsiteFormFieldsProps) => (
  <div className="filliny-grid filliny-gap-4">
    <RHFShadcnTextField
      placeholder={baseExampleURL}
      name={`fillingWebsites[${index}].websiteUrl`}
      title="Website's URL"
    />
    <RHFShadcnCheckbox
      name={`fillingWebsites[${index}].isRootLoad`}
      title="Load it in the entire website instead of the exact given URL"
    />
    <RHFShadcnFileDrop
      name={`fillingWebsites[${index}].fillingContext`}
      title="Filling context"
      placeholder="Enter any specific instructions or context for filling this website's forms"
      rows={10}
    />
  </div>
);
