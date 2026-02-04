import { ButtonWrapper } from './button-wrapper';
import { DragButton } from './drag-button';
import { FillinyVisionButton } from './filliny-vision-button';
import { LogoButton } from './logo-button';
import { FieldFillManager } from './search-button/components/FieldFillManager';
import { FillinyTestModeFillerButton } from './test-mode-button';
import { DndContext, useDraggable, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useStorage } from '@extension/shared';
import { positionStorage, fieldButtonsStorage } from '@extension/storage';
import { useState, useEffect, useCallback } from 'react';
import type { ButtonComponentProps } from './button-wrapper';
import type { DragEndEvent } from '@dnd-kit/core';

interface ButtonConfig {
  Component: React.FC<ButtonComponentProps>;
  tooltipContent: string;
}

interface Position {
  x: number;
  y: number;
}

const buttonComponents: ButtonConfig[] = [
  {
    Component: FillinyVisionButton,
    tooltipContent: 'Highlight fillable form fields',
  },
  {
    Component: FillinyTestModeFillerButton,
    tooltipContent: 'Test form filling functionality',
  },
  {
    Component: DragButton,
    tooltipContent: 'Drag to reposition the button',
  },
];

const DraggableButton = ({ position }: { position: Position }) => {
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: 'filliny-button',
  });

  // Build transform string safely - handle null/undefined transform
  const transformStyle = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    right: 10,
    transform: transformStyle,
    touchAction: 'none',
    zIndex: 9999999,
  };

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="filliny-group filliny-flex filliny-transform-gpu filliny-cursor-pointer filliny-items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <div className="filliny-flex filliny-flex-row filliny-items-center filliny-gap-1">
        {/* Secondary buttons - appear to the LEFT of main button */}
        {buttonComponents.map((button, index) => {
          if (button.Component === DragButton) {
            return (
              <ButtonWrapper
                key={index}
                isHovered={isHovered}
                isDragging={isDragging}
                tooltipContent={button.tooltipContent}>
                <div className="filliny-cursor-grab active:filliny-cursor-grabbing" {...attributes} {...listeners}>
                  <button.Component isHovered={isHovered} isDragging={isDragging} />
                </div>
              </ButtonWrapper>
            );
          }
          return (
            <ButtonWrapper
              key={index}
              isHovered={isHovered}
              isDragging={isDragging}
              tooltipContent={button.tooltipContent}>
              <button.Component isHovered={isHovered} isDragging={isDragging} />
            </ButtonWrapper>
          );
        })}
        {/* Main logo button - stays on the RIGHT with tooltip */}
        <div className="filliny-z-[9999999]">
          <ButtonWrapper isHovered={true} isDragging={false} tooltipContent="Autofill with AI">
            <LogoButton isHovered={isHovered} isDragging={isDragging} />
          </ButtonWrapper>
        </div>
      </div>
    </div>
  );
};

const FillinyButton: React.FC = () => {
  const savedPosition = useStorage(positionStorage);
  const fieldButtonSettings = useStorage(fieldButtonsStorage);
  const [position, setPosition] = useState<Position>(savedPosition);
  // Use MouseSensor and TouchSensor instead of PointerSensor for better Shadow DOM compatibility
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Sync position state with storage when savedPosition changes
  useEffect(() => {
    setPosition(savedPosition);
  }, [savedPosition]);

  // Store preference in DOM for easy access by field buttons
  useEffect(() => {
    if (fieldButtonSettings) {
      document.body.setAttribute('data-filliny-prefer-test-mode', String(fieldButtonSettings.preferTestMode));
    }
  }, [fieldButtonSettings]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { delta } = event;
    if (delta) {
      const newY = Math.min(Math.max(position.y + delta.y, 20), window.innerHeight - 150);

      const newPosition = {
        ...position,
        y: newY,
      };

      setPosition(newPosition);
      await positionStorage.setPosition(newPosition);
    }
  };

  return (
    <>
      <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <DraggableButton position={position} />
      </DndContext>
      {fieldButtonSettings?.enabled && <FieldFillManager />}
    </>
  );
};

export { FillinyButton };
