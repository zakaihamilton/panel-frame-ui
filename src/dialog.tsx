"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Button, type ButtonVariant } from "./primitives.js";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  role?: "dialog" | "alertdialog";
  className?: string;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  closeOnBackdrop?: boolean;
  "aria-busy"?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  role = "dialog",
  className = "",
  showCloseButton = false,
  closeButtonLabel = "Close dialog",
  closeOnBackdrop = true,
  "aria-busy": ariaBusy,
  initialFocusRef,
}: DialogProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wasOpenRef = useRef(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !wasOpenRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (!dialog.open) dialog.showModal();
      const initialFocus =
        initialFocusRef?.current ??
        dialog.querySelector<HTMLElement>(
          'button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        ) ??
        dialog;
      initialFocus.focus();
    } else if (!open && wasOpenRef.current) {
      if (dialog.open) dialog.close();
      if (previousFocusRef.current?.isConnected)
        previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }

    wasOpenRef.current = open;
  }, [initialFocusRef, open]);

  return (
    <dialog
      aria-busy={ariaBusy || undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`pf-dialog ${className}`.trim()}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget)
          onOpenChange(false);
      }}
      onClose={() => {
        if (openRef.current) onOpenChange(false);
      }}
      ref={dialogRef}
      role={role}
      tabIndex={-1}
    >
      <div className="pf-dialog-panel">
        <header className="pf-dialog-header">
          <div className="pf-dialog-heading">
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              aria-label={closeButtonLabel}
              className="pf-dialog-close"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </header>
        {children ? <div className="pf-dialog-body">{children}</div> : null}
      </div>
    </dialog>
  );
}

export type AlertDialogProps = Omit<DialogProps, "role">;

export function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} role="alertdialog" />;
}

export type ConfirmDialogProps = Omit<DialogProps, "children" | "role"> & {
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function ConfirmDialog({
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  confirmDisabled = false,
  cancelDisabled = false,
  onConfirm,
  onCancel,
  onOpenChange,
  ...dialogProps
}: ConfirmDialogProps) {
  function cancel() {
    onCancel?.();
    onOpenChange(false);
  }

  return (
    <Dialog {...dialogProps} onOpenChange={onOpenChange} role="alertdialog">
      <div className="pf-dialog-actions">
        <Button disabled={cancelDisabled} onClick={cancel} variant="secondary">
          {cancelLabel}
        </Button>
        <Button
          disabled={confirmDisabled}
          onClick={onConfirm}
          variant={confirmVariant}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
