import React from "react";
import { Button } from "../ui/button";
import type { StepperProps } from "@extension/shared";

function Stepper({ steps, handleNext, handlePrev, handleFinish, isLoading, currentStep }: StepperProps) {
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
    <div className="filliny-flex filliny-h-full filliny-flex-col filliny-justify-between">
      <div className="filliny-mb-4 filliny-flex filliny-justify-between">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`filliny-flex-1 filliny-py-2 filliny-text-center ${
              index === currentStep
                ? "filliny-font-bold filliny-text-blue-500"
                : "filliny-font-light filliny-text-gray-500"
            }`}>
            {step.title}
          </div>
        ))}
      </div>
      <div className="filliny-mb-4 filliny-flex-1 filliny-overflow-auto filliny-p-2">{steps[currentStep].content}</div>
      <div className="filliny-flex filliny-justify-between">
        <Button variant="secondary" type="button" onClick={prevStep} disabled={currentStep === 0}>
          Prev
        </Button>
        {currentStep === steps.length - 1 ? (
          <Button variant="default" type="button" disabled={isLoading} loading={isLoading} onClick={handleFinish}>
            Finish
          </Button>
        ) : (
          <Button variant="default" type="button" onClick={nextStep}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export { Stepper };
