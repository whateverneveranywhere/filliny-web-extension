import { FormProvider as Form } from 'react-hook-form';
import type React from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

type Props<T extends FieldValues = FieldValues> = {
  children: React.ReactNode;
  methods: UseFormReturn<T>;
  onSubmit?: VoidFunction;
};

const FormProvider = <T extends FieldValues = FieldValues>({ children, onSubmit, methods }: Props<T>) => (
  <Form {...methods}>
    <form onSubmit={onSubmit} className="filliny-size-full">
      {children}
    </form>
  </Form>
);

export default FormProvider;
