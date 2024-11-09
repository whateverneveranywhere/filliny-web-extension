import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

import { DragButton } from './drag-button';
import { LogoButton } from './logo-button';
import { FillinyVisionButton } from './filliny-vision-button';
import { BugReportButton } from './bug-report-button';
import { ButtonWrapper, type ButtonComponentProps } from './button-wrapper';

interface ButtonConfig {
  Component: React.FC<ButtonComponentProps>;
  position: CSSProperties;
}

interface Position {
  x: number;
  y: number;
}

const buttonComponents: ButtonConfig[] = [
  // { Component: FillinyVisionButton, position: { top: '-25px', left: '-10px' } },
  { Component: DragButton, position: { top: '15px', left: '-25px' } },
  { Component: BugReportButton, position: { top: '30px', left: '-10px' } },
  { Component: FillinyVisionButton, position: { top: '-10px', left: '-25px' } }, // New button in between
];

const DraggableButton = ({ position }: { position: Position }) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: 'filliny-button',
  });

  const style: CSSProperties = {
    position: 'fixed',
    top: position.y,
    right: 30,
    transform: CSS.Transform.toString(transform),
    touchAction: 'none',
    zIndex: 1000000000000,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="filliny-group filliny-z-[10000000] filliny-flex filliny-size-16 filliny-transform-gpu filliny-cursor-pointer filliny-items-center filliny-p-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div ref={nodeRef} className="filliny-relative filliny-size-16">
        <LogoButton isHovered={isHovered} isDragging={isDragging} />
        {buttonComponents.map((button, index) => {
          if (button.Component === DragButton) {
            return (
              <ButtonWrapper key={index} isHovered={isHovered} isDragging={isDragging} position={button.position}>
                <div ref={dragHandleRef} {...attributes} {...listeners}>
                  <button.Component isHovered={isHovered} isDragging={isDragging} />
                </div>
              </ButtonWrapper>
            );
          }
          return (
            <ButtonWrapper key={index} isHovered={isHovered} isDragging={isDragging} position={button.position}>
              <button.Component isHovered={isHovered} isDragging={isDragging} />
            </ButtonWrapper>
          );
        })}
      </div>
    </div>
  );
};

const FillinyButton: React.FC = () => {
  const [position, setPosition] = useState<Position>({
    x: 0,
    y: window.innerHeight * 0.25,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    if (delta) {
      const newY = Math.min(Math.max(position.y + delta.y, 170), window.innerHeight - 120);

      setPosition(prev => ({
        ...prev,
        y: newY,
      }));
    }
  };

  return (
    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <DraggableButton position={position} />
    </DndContext>
  );
};

export { FillinyButton };
