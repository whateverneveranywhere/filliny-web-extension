import { Button } from '../ui/button';
import type { StepperProps } from '@extension/shared';

const Stepper = ({ steps, handleNext, handlePrev, handleFinish, isLoading, currentStep }: StepperProps) => {
  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      handleNext();
    } else {
      handleFinish();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      handlePrev();
    }
  };

  return (
    <div className="filliny-flex filliny-h-full filliny-flex-col">
      <div className="filliny-flex filliny-border-b filliny-border-border">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`filliny-flex-1 filliny-py-2.5 filliny-text-center filliny-text-sm ${
              index === currentStep
                ? 'filliny-font-semibold filliny-text-primary filliny-border-b-2 filliny-border-primary'
                : 'filliny-font-normal filliny-text-muted-foreground'
            }`}>
            {step.title}
          </div>
        ))}
      </div>
      <div className="filliny-flex-1 filliny-overflow-auto filliny-px-4 filliny-py-4">{steps[currentStep].content}</div>
      <div className="filliny-flex filliny-items-center filliny-justify-between filliny-border-t filliny-border-border filliny-px-4 filliny-py-4">
        <Button variant="outline" size="sm" type="button" onClick={prevStep} disabled={currentStep === 0}>
          Prev
        </Button>
        {currentStep === steps.length - 1 ? (
          <Button
            variant="default"
            size="sm"
            type="button"
            disabled={isLoading}
            loading={isLoading}
            onClick={handleFinish}>
            Finish
          </Button>
        ) : (
          <Button variant="default" size="sm" type="button" onClick={nextStep}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export { Stepper };
