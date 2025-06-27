import {
  Button,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Drawer as ShadcnDrawer,
} from "../ui";
import type React from "react";

interface Props {
  hideFooter?: boolean;
  isSubmitDisabled?: boolean;
  open: boolean;
  isLoading?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  submitBtnText?: string;
  cancelBtnText?: string;
  children: React.ReactNode;
}

function Drawer(props: Props) {
  const {
    hideFooter = false,
    onOpenChange,
    open,
    title,
    description,
    onConfirm,
    onCancel,
    submitBtnText,
    cancelBtnText,
    children,
    isSubmitDisabled,
    isLoading,
  } = props;
  return (
    <ShadcnDrawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="filliny-mx-auto filliny-w-full">
          <DrawerHeader>
            <DrawerTitle className="filliny-text-center">{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}{" "}
          </DrawerHeader>
          <div className="filliny-p-2">{children}</div>
          {!hideFooter && (
            <DrawerFooter>
              <Button loading={isLoading} disabled={isSubmitDisabled || isLoading} type="submit" onClick={onConfirm}>
                {submitBtnText || "Submit"}
              </Button>
              <DrawerClose asChild>
                <Button onClick={onCancel} variant="outline">
                  {cancelBtnText || "Cancel"}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </ShadcnDrawer>
  );
}

export { Drawer };
