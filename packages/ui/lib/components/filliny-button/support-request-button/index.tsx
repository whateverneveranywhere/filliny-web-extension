import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import type { ButtonComponentProps } from '../button-wrapper';
import { getConfig } from '@extension/shared';

const SupportRequestButton: React.FC<ButtonComponentProps> = () => {
  const gatherBugDetails = async () => {
    try {
      const visitingUrl = window.location.href;
      const bugDetails = {
        websiteUrl: visitingUrl,
      };

      const config = getConfig();

      const queryString = new URLSearchParams(bugDetails as Record<string, string>).toString();
      window.location.href = `${config.baseURL}/dashboard/support-request?${queryString}`;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button
      variant={'default'}
      size={'icon'}
      className="filliny-size-9 filliny-overflow-hidden !filliny-rounded-full filliny-text-white"
      onClick={gatherBugDetails}>
      <HelpCircle className="filliny-size-4" />
    </Button>
  );
};

export { SupportRequestButton };