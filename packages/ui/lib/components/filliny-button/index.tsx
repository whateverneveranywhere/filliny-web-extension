import Draggable from 'react-draggable';

import { DragButton } from './drag-button';
import { LogoButton } from './logo-button';
import { FillinyVisionButton } from './filliny-vision-button';
import { BugReportButton } from './bug-report-button';
import { ButtonWrapper, type ButtonComponentProps } from './button-wrapper';
import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';
// import { RecordFormButton } from './record-form-button';

interface ButtonConfig {
  Component: React.FC<ButtonComponentProps>;
  position: CSSProperties;
}

const buttonComponents: ButtonConfig[] = [
  { Component: FillinyVisionButton, position: { top: '-25px', left: '-10px' } }, // Top left
  // { Component: RecordFormButton, position: { top: '-10px', left: '-25px' } }, // New button in between
  { Component: DragButton, position: { top: '15px', left: '-25px' } }, // Left center adjusted
  { Component: BugReportButton, position: { top: '30px', left: '-10px' } }, // Bottom left adjusted
];

const FillinyButton: React.FC = () => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateBounds = () => ({
    top: 170,
    bottom: window.innerHeight - 120,
  });

  return (
    <Draggable
      axis="y"
      bounds={updateBounds()}
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={{ x: 0, y: window.innerHeight * 0.25 }} // 25% from the top
      onStart={() => setIsDragging(true)}
      onStop={() => setIsDragging(false)}>
      <div
        ref={nodeRef}
        className="filliny-group filliny-fixed filliny-z-[10000000] filliny-flex filliny-size-16 filliny-transform-gpu filliny-cursor-pointer filliny-items-center filliny-p-5"
        style={{ top: 0, right: 30, transform: 'translateY(0)' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        <div className="filliny-relative filliny-size-16">
          <LogoButton isHovered={isHovered} isDragging={isDragging} />
          {buttonComponents.map((button, index) => (
            <ButtonWrapper key={index} isHovered={isHovered} isDragging={isDragging} position={button.position}>
              <button.Component isHovered={isHovered} isDragging={isDragging} />
            </ButtonWrapper>
          ))}
        </div>
      </div>
    </Draggable>
  );
};

export { FillinyButton };
