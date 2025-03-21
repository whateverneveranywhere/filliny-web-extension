import { ExternalLink } from "lucide-react";
import { getConfig } from "@extension/shared";
import { Alert } from "./Alert";

export default function NoTokensAlert() {
  const config = getConfig();
  console.log("[NoTokensAlert] Using URL:", config.baseURL);

  return (
    <Alert
      variant="destructive"
      title="No Tokens Available"
      description="Purchase AI tokens to start using AI features and form filling capabilities"
      buttonText="Purchase Tokens"
      buttonIcon={ExternalLink}
      onButtonClick={() => window.open(`${config.baseURL}/pricing?tab=token`, "_blank")}
    />
  );
}
