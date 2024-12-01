import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import type { DTOFillingWebsite, DTOProfileFillingForm } from '@extension/storage';
import { WebsiteFormFields } from './StepperForms/StepperForm1';

const websiteSchema = z.object({
  fillingWebsites: z.array(
    z.object({
      websiteUrl: z.string().url().min(1, { message: 'Website URL is required' }),
      isRootLoad: z.boolean().default(false),
      fillingContext: z.string().max(500).default(''),
    }),
  ),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: DTOFillingWebsite;
  profile: DTOProfileFillingForm;
  onSubmit: (data: DTOFillingWebsite) => Promise<void>;
}

export function SingleWebsiteEditModal({ open, onOpenChange, website, onSubmit }: Props) {
  const methods = useForm({
    defaultValues: {
      fillingWebsites: [website],
    },
    resolver: zodResolver(websiteSchema),
  });

  const handleSubmit = methods.handleSubmit(async data => {
    await onSubmit(data.fillingWebsites[0]);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:filliny-max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Website Settings</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit} className="filliny-space-y-4">
            <WebsiteFormFields index={0} />

            <div className="filliny-flex filliny-justify-end filliny-gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
