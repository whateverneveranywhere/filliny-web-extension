import { Alert } from "./Alert";
import { getConfig, useActiveProfile, usePlanLimits } from "@extension/shared";
import { ExternalLink } from "lucide-react";

export default function UpgradeBanner() {
  const { currentPlan, maxWebsites, hasReachedLimit } = usePlanLimits();
  const { activeProfile } = useActiveProfile();
  const config = getConfig();
  console.log("[UpgradeBanner] Using URL:", config.baseURL);

  const websitesCount = activeProfile?.fillingWebsites?.length || 0;

  if (!hasReachedLimit(websitesCount)) {
    return null;
  }

  const title = `${currentPlan} • ${maxWebsites} websites`;
  const description = "Upgrade your plan to add more websites and unlock additional features";
  const handleUpgrade = () => window.open(`${config.baseURL}/pricing`, "_blank");

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
