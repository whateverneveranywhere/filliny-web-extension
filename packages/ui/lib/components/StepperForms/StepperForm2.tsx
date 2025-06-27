import { RHFShadcnTextField, RHFShadcnFileDrop } from "../RHF";
import React from "react";

function StepperForm2() {
  return (
    <>
      {" "}
      <div className="filliny-grid filliny-gap-4">
        <RHFShadcnTextField name="profileName" title="Filling profile's name" />

        <RHFShadcnFileDrop
          name="defaultFillingContext"
          title="Default Filling context"
          rows={16}
          placeholder="Enter default instructions or context for filling forms"
        />
      </div>
    </>
  );
}

export default StepperForm2;
