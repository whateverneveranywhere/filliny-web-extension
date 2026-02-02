import FormProvider from '../components/rhf/FormProvider';
import { Stepper } from '../components/stepper';
import { StepperForm1, StepperForm2, StepperForm3 } from '../components/stepper-forms';
import { toast } from '../hooks/use-toast';
import { cn } from '../utils';
import {
  ProfileFormSchema,
  useCreateFillingProfileMutation,
  useEditFillingProfileMutation,
  useFillingProfileById,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ProfileFormValues, Step } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

export type ProfileFormTypes = ProfileFormValues;

const defaultFormValues: ProfileFormTypes = {
  profileName: '',
  defaultFillingContext: '',
  preferences: {
    isFormal: true,
    isGapFillingAllowed: false,
    toneId: '',
    povId: '',
  },
  fillingWebsites: [],
};

interface Props {
  id?: string;
  onFormSubmit: () => void;
}

function ProfileForm({ id, onFormSubmit }: Props) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const isEdit = !!id;

  const { data: editingItem, isLoading: isLoadingEditingItem } = useFillingProfileById(id as string);
  const { mutateAsync: createProfile, isPending: isCreating } = useCreateFillingProfileMutation();
  const { mutateAsync: editProfile, isPending: isUpdating } = useEditFillingProfileMutation();

  const methods = useForm<ProfileFormTypes>({
    defaultValues: defaultFormValues,
    resolver: zodResolver(ProfileFormSchema),
    mode: 'onChange',
  });

  const { handleSubmit, trigger, reset } = methods;

  // Update form when editing existing profile
  useEffect(() => {
    if (editingItem && isEdit) {
      reset({
        ...editingItem,
        fillingWebsites: editingItem.fillingWebsites.map(item => ({ ...item, isNew: false })),
        preferences: {
          ...editingItem.preferences,
          povId: String(editingItem.preferences?.povId),
          toneId: String(editingItem.preferences?.toneId),
        },
      });
    }
  }, [editingItem, isEdit, reset]);

  const transformFormData = useCallback(
    (formData: ProfileFormTypes): DTOProfileFillingForm => ({
      ...formData,
      // filter out the user side isNew variable before sending to api

      fillingWebsites: formData.fillingWebsites.map(({ isNew, ...rest }) => rest),
      preferences: {
        ...formData.preferences,
        povId: Number(formData.preferences?.povId),
        toneId: Number(formData.preferences?.toneId),
      },
    }),
    [],
  );

  const onSubmit = handleSubmit(async formData => {
    try {
      const transformedData = transformFormData(formData);

      if (isEdit) {
        await editProfile({ id, data: transformedData });
        toast({ variant: 'default', title: 'Profile edited successfully' });
      } else {
        const newProfile = await createProfile({ data: transformedData });
        await profileStorage.setDefaultProfile(newProfile);
        toast({ variant: 'default', title: 'Profile created successfully' });
      }

      onFormSubmit();
      reset();
    } catch (error) {
      console.error('Error submitting profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    }
  });

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

  const handleNext = useCallback(async () => {
    const { fields } = steps[currentStep];
    const isValid = await trigger(fields as (keyof ProfileFormTypes)[]);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps, trigger]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  if (isLoadingEditingItem) {
    return (
      <div className="filliny-flex filliny-size-full filliny-items-center filliny-justify-center filliny-p-20">
        <Loader2 className={cn('filliny-mr-2 filliny-h-10 filliny-w-10 filliny-animate-spin')} />
      </div>
    );
  }

  return (
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
