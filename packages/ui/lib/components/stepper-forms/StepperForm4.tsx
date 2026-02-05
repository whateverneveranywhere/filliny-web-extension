import { AuthorizedFilesSection } from '../authorized-files';

interface StepperForm4Props {
  profileId: string | undefined;
}

const StepperForm4 = ({ profileId }: StepperForm4Props) => <AuthorizedFilesSection profileId={profileId} />;

export default StepperForm4;
