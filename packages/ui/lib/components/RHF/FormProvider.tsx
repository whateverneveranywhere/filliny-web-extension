import type React from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider as Form } from "react-hook-form";

type Props = {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: UseFormReturn<any>;
  onSubmit?: VoidFunction;
};

function FormProvider({ children, onSubmit, methods }: Props) {
  return (
    <Form {...methods}>
      <form onSubmit={onSubmit} className="filliny-size-full">
        {children}
      </form>
    </Form>
  );
}

export default FormProvider;
