import type { Step } from '@extension/shared';
import {
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useFillingProfileById,
} from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../hooks/use-toast';
import { StepperForm1, StepperForm2, StepperForm3 } from '../components/StepperForms';
import { cn } from '../utils';
import FormProvider from '../components/RHF/FormProvider';
import { Stepper } from '../components/stepper';

// Zod schema for profile payload validation
const schema = z.object({
  profileName: z.string().min(1, { message: 'Profile name is required' }),
  defaultFillingContext: z.string().min(1, { message: 'Default context is required' }),
  preferences: z.object({
    isFormal: z.boolean(),
    isGapFillingAllowed: z.boolean(),
    toneId: z.string().min(1, { message: "Can't be empty" }),
    povId: z.string().min(1, { message: "Can't be empty" }),
  }),
  fillingWebsites: z
    .array(
      z.object({
        websiteUrl: z.string().url().min(1, { message: 'Website URL is required' }),
        isRootLoad: z.boolean().default(false),
        fillingContext: z.string().max(500),
        isNew: z.boolean().optional(),
      }),
    )
    .max(10),
});

interface Props {
  id?: string;
  onFormSubmit: () => void;
}

export type DTOFillingProfileForm = z.infer<typeof schema>;

function ProfileForm(props: Props) {
  const { id, onFormSubmit } = props;
  const isEdit = !!id;

  const { data: editingItem, isLoading: isLoadingEditingItem } = useFillingProfileById(id as string);

  const { mutateAsync: createFillingProfileMutation, isPending: isCreating } = useCreateFillingProfileMutation();
  const { mutateAsync: editFillingProfileMutation, isPending: isUpdating } = useEditFillingProfileMutation();
  const methods = useForm<DTOFillingProfileForm>({
    defaultValues: {
      fillingWebsites: [],
      profileName: '',
      defaultFillingContext: '',
      preferences: {
        isFormal: true,
        isGapFillingAllowed: false,
        povId: '',
        toneId: '',
      },
    },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const { handleSubmit, trigger, reset } = methods;

  const onSubmit = handleSubmit(async formData => {
    try {
      const transformedData: DTOProfileFillingForm = {
        ...formData,
        // filter out the user side isNew variable before sending to api
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fillingWebsites: formData.fillingWebsites.map(({ isNew, ...rest }) => rest),
        preferences: {
          ...formData.preferences,
          povId: Number(formData.preferences?.povId),
          toneId: Number(formData.preferences?.toneId),
        },
      };

      if (isEdit) {
        await editFillingProfileMutation({ id, data: transformedData });
        toast({ variant: 'default', title: 'Profile edited successfully' });
      } else {
        await createFillingProfileMutation({ data: transformedData });
        toast({ variant: 'default', title: 'Profile created successfully' });
      }

      onFormSubmit();
      reset();
    } catch (error) {
      console.log(error);
    }
  });

  useEffect(() => {
    if (editingItem && isEdit) {
      reset({
        ...editingItem,
        fillingWebsites: editingItem.fillingWebsites.map(item => ({
          ...item,
          isNew: false,
        })),
        preferences: {
          ...editingItem.preferences,
          povId: String(editingItem.preferences?.povId),
          toneId: String(editingItem.preferences?.toneId),
        },
      });
    }
  }, [editingItem]);

  const steps: Step[] = useMemo(
    () => [
      {
        title: 'Websites',
        content: <StepperForm1 />,
        fields: ['fillingWebsites'],
      },
      {
        title: 'General details',
        content: <StepperForm2 />,
        fields: ['profileName', 'defaultFillingContext'],
      },
      {
        title: 'Preferences',
        content: <StepperForm3 />,
        fields: ['preferences.isFormal', 'preferences.isGapFillingAllowed', 'preferences.povId', 'preferences.toneId'],
      },
    ],
    [],
  );

  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleNext = async () => {
    const { fields } = steps[currentStep];
    const isValid = await trigger(fields as (keyof DTOFillingProfileForm)[]);

    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return isLoadingEditingItem ? (
    <div className="filliny-flex filliny-size-full filliny-items-center filliny-justify-center filliny-p-20">
      <Loader2 className={cn('filliny-mr-2 filliny-h-10 filliny-w-10 filliny-animate-spin')} />
    </div>
  ) : (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stepper
        steps={steps}
        isLoading={isCreating || isUpdating}
        currentStep={currentStep}
        handleFinish={onSubmit}
        handleNext={handleNext}
        handlePrev={handlePrev}
      />
    </FormProvider>
  );
}

export { ProfileForm };
