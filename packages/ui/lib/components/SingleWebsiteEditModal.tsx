import { WebsiteFormFields } from './stepper-forms/WebsiteFormFields';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { WebsiteEditSchema } from '@extension/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import type { WebsiteEditFormValues } from '@extension/shared';
import type { DTOFillingWebsite, DTOProfileFillingForm } from '@extension/storage';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: DTOFillingWebsite;
  profile: DTOProfileFillingForm;
  onSubmit: (data: DTOFillingWebsite) => Promise<void>;
}

export const SingleWebsiteEditModal = ({ open, onOpenChange, website, onSubmit }: Props) => {
  const methods = useForm<WebsiteEditFormValues>({
    defaultValues: {
      fillingWebsites: [website],
    },
    resolver: zodResolver(WebsiteEditSchema),
    mode: 'onChange',
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
};
