import type React from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "../../ui/button";
import type { ButtonComponentProps } from "../button-wrapper";
import { getConfig } from "@extension/shared";

const SupportRequestButton: React.FC<ButtonComponentProps> = () => {
  const gatherBugDetails = async () => {
    try {
      const visitingUrl = window.location.href;
      const bugDetails = {
        websiteUrl: visitingUrl,
      };

      const config = getConfig();

      // Define the support request path directly
      const supportRequestPath = "/auth/dashboard/support-request";
      const queryString = new URLSearchParams(bugDetails as Record<string, string>).toString();

      // Combine base URL with path
      window.location.href = `${config.baseURL}${supportRequestPath}?${queryString}`;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button
      variant={"default"}
      size={"icon"}
      className="filliny-size-10 filliny-min-h-10 filliny-min-w-10 filliny-overflow-hidden !filliny-rounded-full filliny-text-white"
      onClick={gatherBugDetails}>
      <HelpCircle className="filliny-size-4" />
    </Button>
  );
};

export { SupportRequestButton };
