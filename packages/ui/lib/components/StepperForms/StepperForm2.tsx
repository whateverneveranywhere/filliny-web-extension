import React from "react";
import { RHFShadcnTextField, RHFShadcnTextarea } from "../RHF";

function StepperForm2() {
  return (
    <>
      {" "}
      <div className="filliny-grid filliny-gap-4">
        <RHFShadcnTextField name="profileName" title="Filling profile's name" />

        <RHFShadcnTextarea rows={8} name="defaultFillingContext" title="Default Filling context" />
      </div>
    </>
  );
}

export default StepperForm2;
