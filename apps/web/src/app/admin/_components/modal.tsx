"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

const FOCUSABLE_SELECTOR = 'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  title: string;
  /** Non-dismissible is used by exactly one caller today: the re-auth modal (PRD §4.3) — losing it to a stray Escape or backdrop click would be worse than losing nothing. */
  dismissible?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

/**
 * Same focus-trap/scroll-lock bar as packages/command-palette's
 * <CommandPalette> (F2) — the mockup's modal had neither; this one
 * doesn't repeat that gap just because it's a different surface.
 */
export function Modal({ title, dismissible = true, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (dismissible && onClose) onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const current = document.activeElement;
      const isInside = current instanceof Node && dialogRef.current.contains(current);

      if (event.shiftKey) {
        if (!isInside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!isInside || current === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismissible, onClose]);

  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
  }, []);

  return createPortal(
    <div
      className="admin-modal-overlay"
      onClick={(event) => {
        if (dismissible && onClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Promise-free, consumer-owned-state version of the mockup's confirmDialog() — simpler to wire from a React event handler than a Promise-returning imperative call. */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  danger,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="admin-modal__actions">
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
