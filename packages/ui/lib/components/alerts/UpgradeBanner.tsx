import { ExternalLink } from 'lucide-react';
import { getConfig, useActiveProfile, usePlanLimits } from '@extension/shared';
import { Alert } from './Alert';

export default function UpgradeBanner() {
  const { currentPlan, maxWebsites, hasReachedLimit } = usePlanLimits();
  const { activeProfile } = useActiveProfile();

  const websitesCount = activeProfile?.fillingWebsites?.length || 0;

  if (!hasReachedLimit(websitesCount)) {
    return null;
  }

  const title = `${currentPlan} • ${maxWebsites} websites`;
  const description = 'Upgrade your plan to add more websites and unlock additional features';
  const handleUpgrade = () => window.open(`${getConfig().baseURL}/pricing`, '_blank');

  return (
    <div className="filliny-w-full">
      <Alert
        variant="default"
        title={title}
        description={description}
        buttonText="Upgrade Now"
        buttonIcon={ExternalLink}
        onButtonClick={handleUpgrade}
      />
    </div>
  );
}
