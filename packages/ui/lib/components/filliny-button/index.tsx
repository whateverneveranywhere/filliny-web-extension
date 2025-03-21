import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useStorage } from "@extension/shared";
import { LogoButton } from "./logo-button";
import { FillinyVisionButton } from "./filliny-vision-button";
import { SupportRequestButton } from "./support-request-button";
import { ButtonWrapper, type ButtonComponentProps } from "./button-wrapper";
import { FillinyTestModeFillerButton } from "./test-mode-button";
import { positionStorage } from "@extension/storage";
import { DragButton } from "./drag-button";

interface ButtonConfig {
  Component: React.FC<ButtonComponentProps>;
  position: CSSProperties;
  tooltipContent: string;
}

interface Position {
  x: number;
  y: number;
}

const buttonComponents: ButtonConfig[] = [
  {
    Component: FillinyTestModeFillerButton,
    position: { top: "-28px", left: "-8px" },
    tooltipContent: "Test form filling functionality",
  },
  { Component: DragButton, position: { top: "15px", left: "-25px" }, tooltipContent: "Drag to reposition the button" },
  {
    Component: SupportRequestButton,
    position: { top: "32px", left: "-8px" },
    tooltipContent: "Get help or report an issue",
  },
  {
    Component: FillinyVisionButton,
    position: { top: "-10px", left: "-25px" },
    tooltipContent: "Highlight fillable form fields",
  },
];

const DraggableButton = ({ position }: { position: Position }) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "filliny-button",
  });

  const style: CSSProperties = {
    position: "fixed",
    top: position.y,
    right: 10,
    transform: CSS.Transform.toString(transform),
    touchAction: "none",
    zIndex: 1000000000000,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="filliny-group filliny-flex filliny-size-16 filliny-transform-gpu filliny-cursor-pointer filliny-items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div ref={nodeRef} className="filliny-relative">
        <div className="filliny-absolute filliny-z-[1000000000000]">
          <div className="filliny-pointer-events-auto">
            <LogoButton isHovered={isHovered} isDragging={isDragging} />
          </div>
        </div>
        {buttonComponents.map((button, index) => {
          if (button.Component === DragButton) {
            return (
              <ButtonWrapper
                key={index}
                isHovered={isHovered}
                isDragging={isDragging}
                position={button.position}
                tooltipContent={button.tooltipContent}>
                <div ref={dragHandleRef} {...attributes} {...listeners}>
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
              position={button.position}
              tooltipContent={button.tooltipContent}>
              <button.Component isHovered={isHovered} isDragging={isDragging} />
            </ButtonWrapper>
          );
        })}
      </div>
    </div>
  );
};

const FillinyButton: React.FC = () => {
  const savedPosition = useStorage(positionStorage);
  const [position, setPosition] = useState<Position>(savedPosition);

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
    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <DraggableButton position={position} />
    </DndContext>
  );
};

export { FillinyButton };
