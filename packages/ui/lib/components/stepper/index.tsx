import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import type { StepperProps } from '@extension/shared';

interface ExtendedStepperProps extends StepperProps {
  /** Optional badge to show next to a step title. Key is step index. */
  stepBadges?: Record<number, React.ReactNode>;
  /** Callback when a step tab is clicked. Receives the target step index. */
  onStepClick?: (stepIndex: number) => void;
}

const Stepper = ({
  steps,
  handleNext,
  handlePrev,
  handleFinish,
  isLoading,
  currentStep,
  stepBadges,
  onStepClick,
}: ExtendedStepperProps) => {
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
    <div className="filliny-flex filliny-h-[70vh] filliny-w-full filliny-min-w-0 filliny-flex-col filliny-overflow-hidden">
      {/* Fixed Header - Stepper Tabs */}
      <div className="filliny-flex filliny-shrink-0 filliny-border-b filliny-border-border filliny-px-4">
        {steps.map((step, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onStepClick?.(index)}
            className={`filliny-flex filliny-flex-1 filliny-cursor-pointer filliny-items-center filliny-justify-center filliny-gap-1.5 filliny-border-none filliny-bg-transparent filliny-py-2.5 filliny-text-center filliny-text-sm filliny-transition-colors hover:filliny-text-primary ${
              index === currentStep
                ? 'filliny-border-b-2 filliny-border-primary filliny-font-semibold filliny-text-primary'
                : 'filliny-font-normal filliny-text-muted-foreground'
            }`}>
            <span>{step.title}</span>
            {stepBadges?.[index]}
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="filliny-flex-1 filliny-overflow-hidden">
        <div className="filliny-min-w-0 filliny-overflow-hidden filliny-px-4 filliny-py-4">
          {steps[currentStep].content}
        </div>
      </ScrollArea>

      {/* Fixed Footer - Navigation Buttons */}
      <div className="filliny-flex filliny-shrink-0 filliny-items-center filliny-justify-between filliny-border-t filliny-border-border filliny-bg-background filliny-px-4 filliny-py-4">
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
