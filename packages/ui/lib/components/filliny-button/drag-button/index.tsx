import React from 'react';
import { Move } from 'lucide-react';
import { Button } from '../../ui/button';
import type { ButtonComponentProps } from '../button-wrapper';

const DragButton: React.FC<ButtonComponentProps> = () => (
  <Button
    variant={'default'}
    size={'icon'}
    className="drag-handle filliny-size-9 filliny-rounded-full filliny-bg-black filliny-text-white hover:filliny-bg-black">
    <Move className="filliny-size-4 filliny-text-white" />
  </Button>
);

export { DragButton };
