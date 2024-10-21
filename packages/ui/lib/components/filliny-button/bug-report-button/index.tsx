import React from 'react';
import { Bug } from 'lucide-react';
import { Button } from '../../ui/button';
import type { ButtonComponentProps } from '../button-wrapper';

const BugReportButton: React.FC<ButtonComponentProps> = () => {
  const gatherBugDetails = async () => {
    try {
      const visitingUrl = window.location.href;
      const bugDetails = {
        websiteUrl: visitingUrl,
      };

      const queryString = new URLSearchParams(bugDetails as Record<string, string>).toString();
      window.location.href = `http://localhost:3000/dashboard/bug-report?${queryString}`;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button
      variant={'default'}
      size={'icon'}
      className="filliny-size-9 filliny-rounded-full filliny-bg-black filliny-text-white hover:filliny-bg-black"
      onClick={gatherBugDetails}>
      <Bug className="filliny-size-4" />
    </Button>
  );
};

export { BugReportButton };
