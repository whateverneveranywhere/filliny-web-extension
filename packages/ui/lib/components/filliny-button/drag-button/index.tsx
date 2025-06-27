import { Button } from "../../ui/button";
import { Move } from "lucide-react";
import type { ButtonComponentProps } from "../button-wrapper";
import type React from "react";

const DragButton: React.FC<ButtonComponentProps> = () => (
  <Button
    variant={"default"}
    size={"icon"}
    className="filliny-size-10 filliny-min-h-10 filliny-min-w-10 filliny-overflow-hidden !filliny-rounded-full filliny-text-white">
    <Move className="filliny-size-4 filliny-text-white" />
  </Button>
);

export { DragButton };
