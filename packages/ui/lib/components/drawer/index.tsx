import {
  Button,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Drawer as ShadcnDrawer,
} from '../ui';
import type React from 'react';

interface Props {
  hideFooter?: boolean;
  isSubmitDisabled?: boolean;
  open: boolean;
  isLoading?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /**
   * Called when user tries to close drawer.
   * Return `true` to allow close, `false` to prevent it.
   * If not provided, close is always allowed.
   */
  onInterceptClose?: () => boolean;
  title: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  submitBtnText?: string;
  cancelBtnText?: string;
  children: React.ReactNode;
}

const Drawer = (props: Props) => {
  const {
    hideFooter = false,
    onOpenChange,
    onInterceptClose,
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

  const handleOpenChange = (isOpen: boolean) => {
    // If trying to close and we have an intercept handler
    if (!isOpen && onInterceptClose) {
      const shouldClose = onInterceptClose();
      if (!shouldClose) {
        return; // Prevent close
      }
    }
    onOpenChange(isOpen);
  };

  return (
    <ShadcnDrawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="filliny-flex filliny-w-full filliny-min-w-0 filliny-flex-col filliny-overflow-hidden filliny-px-4">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}{' '}
          </DrawerHeader>
          <div className="filliny-min-w-0 filliny-overflow-hidden">{children}</div>
          {!hideFooter && (
            <DrawerFooter>
              <Button loading={isLoading} disabled={isSubmitDisabled || isLoading} type="submit" onClick={onConfirm}>
                {submitBtnText || 'Submit'}
              </Button>
              <DrawerClose asChild>
                <Button onClick={onCancel} variant="outline">
                  {cancelBtnText || 'Cancel'}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </ShadcnDrawer>
  );
};

export { Drawer };
