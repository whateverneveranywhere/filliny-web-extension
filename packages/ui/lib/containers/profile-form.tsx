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
  notifyProfileUpdate,
  MessageType,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { ProfileFormValues, Step } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';
import type { FieldPath } from 'react-hook-form';

type ProfileFormTypes = ProfileFormValues;

/**
 * Known field paths for ProfileFormTypes.
 * Used to convert step config strings to type-safe FieldPath values.
 */
const PROFILE_FIELD_PATHS = new Set<FieldPath<ProfileFormTypes>>([
  'profileName',
  'defaultFillingContext',
  'fillingWebsites',
  'preferences',
  'preferences.isFormal',
  'preferences.isGapFillingAllowed',
  'preferences.toneId',
  'preferences.povId',
]);

/**
 * Convert a string to a FieldPath<ProfileFormTypes> if it is a known valid path.
 * Returns undefined for unknown paths.
 */
const toProfileFieldPath = (path: string): FieldPath<ProfileFormTypes> | undefined =>
  PROFILE_FIELD_PATHS.has(path as FieldPath<ProfileFormTypes>) ? (path as FieldPath<ProfileFormTypes>) : undefined;

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
  onDirtyChange?: (isDirty: boolean) => void;
}

const ProfileForm = ({ id, onFormSubmit, onDirtyChange }: Props) => {
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

  const {
    handleSubmit,
    trigger,
    reset,
    control,
    formState: { isDirty },
  } = methods;

  // Watch fillingWebsites to get the current array length for dynamic field validation
  const fillingWebsites = useWatch({ control, name: 'fillingWebsites' });

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
      fillingWebsites: formData.fillingWebsites.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring to omit isNew from spread
        ({ isNew, ...rest }) => rest,
      ),
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
      const websiteCount = transformedData.fillingWebsites.length;

      if (isEdit) {
        await editProfile({ id, data: transformedData });
        // Update storage so content scripts get the updated profile immediately
        // Use the transformed data with the existing profile ID to construct the updated profile
        const updatedProfile: DTOProfileFillingForm = {
          ...transformedData,
          id: editingItem?.id,
        };
        await profileStorage.setDefaultProfile(updatedProfile);
        // Notify content scripts about the profile update
        await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
        toast({
          title: 'Profile Updated',
          description: `"${formData.profileName}" has been saved with ${websiteCount} website${websiteCount !== 1 ? 's' : ''}.`,
        });
      } else {
        const createdResponse = await createProfile({ data: transformedData });
        // The mutation's onSuccess already stores the full merged profile in storage.
        // Construct the same full profile here for the notification to be consistent.
        const fullProfile: DTOProfileFillingForm = { ...transformedData, id: createdResponse.id };
        await profileStorage.setDefaultProfile(fullProfile);
        // Notify content scripts about the profile update
        await notifyProfileUpdate(MessageType.PROFILE_UPDATED);
        toast({
          title: 'Profile Created!',
          description: `"${formData.profileName}" is ready. Visit your websites to start filling forms.`,
        });
      }

      onFormSubmit();
      reset();
    } catch (error) {
      console.error('Error submitting profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to save profile. Please try again.';
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
        title: 'Filling context',
        content: <StepperForm2 profileId={isEdit ? id : undefined} />,
        fields: ['profileName', 'defaultFillingContext'],
      },
      {
        title: 'Preferences',
        content: <StepperForm3 />,
        fields: ['preferences.isFormal', 'preferences.isGapFillingAllowed', 'preferences.povId', 'preferences.toneId'],
      },
    ],
    [isEdit, id],
  );

  // Get expanded field paths for a step, handling dynamic array fields
  const getStepFieldPaths = useCallback(
    (stepIndex: number): FieldPath<ProfileFormTypes>[] => {
      const stepFields = steps[stepIndex]?.fields || [];
      const expandedFields: FieldPath<ProfileFormTypes>[] = [];

      for (const field of stepFields) {
        if (field === 'fillingWebsites') {
          // For fillingWebsites, we need to validate each item's websiteUrl field
          // which is the required field in the schema
          if (fillingWebsites && fillingWebsites.length > 0) {
            for (let i = 0; i < fillingWebsites.length; i++) {
              // Dynamic array paths like `fillingWebsites.0.websiteUrl` are valid FieldPath values
              // but cannot be pre-registered in PROFILE_FIELD_PATHS since indices are dynamic.
              const websiteUrlPath: FieldPath<ProfileFormTypes> = `fillingWebsites.${i}.websiteUrl`;
              expandedFields.push(websiteUrlPath);
            }
          }
          // Also include the array itself to catch array-level errors
          expandedFields.push('fillingWebsites');
        } else {
          const fieldPath = toProfileFieldPath(field);
          if (fieldPath) {
            expandedFields.push(fieldPath);
          }
        }
      }

      return expandedFields;
    },
    [steps, fillingWebsites],
  );

  // Validate fields for a specific step
  const validateStep = useCallback(
    async (stepIndex: number): Promise<boolean> => {
      const fieldPaths = getStepFieldPaths(stepIndex);
      if (fieldPaths.length === 0) return true;
      return trigger(fieldPaths);
    },
    [getStepFieldPaths, trigger],
  );

  // Validate all steps from start to end (inclusive)
  const validateStepsRange = useCallback(
    async (startStep: number, endStep: number): Promise<boolean> => {
      for (let step = startStep; step <= endStep; step++) {
        const isValid = await validateStep(step);
        if (!isValid) {
          // Navigate to the first invalid step to show errors
          setCurrentStep(step);
          return false;
        }
      }
      return true;
    },
    [validateStep],
  );

  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, validateStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    async (targetStep: number) => {
      // Only allow going back without validation
      if (targetStep < currentStep) {
        setCurrentStep(targetStep);
        return;
      }

      // For forward navigation, validate all steps from current to target-1
      // We validate up to target-1 because we need to ensure all intermediate steps are valid
      const isValid = await validateStepsRange(currentStep, targetStep - 1);
      if (isValid) {
        setCurrentStep(targetStep);
      }
    },
    [currentStep, validateStepsRange],
  );

  // Handle finish with full form validation
  const handleFinish = useCallback(async () => {
    // First validate all steps to ensure proper error display
    const allStepsValid = await validateStepsRange(0, steps.length - 1);
    if (!allStepsValid) {
      return;
    }
    // If all steps are valid, submit the form
    await onSubmit();
  }, [validateStepsRange, steps.length, onSubmit]);

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
        handleFinish={handleFinish}
        handleNext={handleNext}
        handlePrev={handlePrev}
        onStepClick={handleStepClick}
      />
    </FormProvider>
  );
};

export { ProfileForm };
export type { ProfileFormTypes };
