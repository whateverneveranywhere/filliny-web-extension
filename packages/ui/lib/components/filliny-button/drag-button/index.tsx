import { Button } from '../../ui/button';
import { cn, iconButtonClasses } from '@/lib/utils';
import { Move } from 'lucide-react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

const DragButton: React.FC<ButtonComponentProps> = () => (
  <Button variant="default" size="icon" className={cn(iconButtonClasses, 'filliny-text-primary-foreground')}>
    <Move className="filliny-size-4" />
  </Button>
);

export { DragButton };
