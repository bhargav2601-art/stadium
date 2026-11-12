"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function ModalDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (ref.current) ref.current.returnValue = "";
        onClose();
      }}
      onClick={(event) => {
        const dialog = ref.current;
        if (!dialog) return;
        const rect = dialog.getBoundingClientRect();
        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (outside) onClose();
      }}
      className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-0 text-[var(--ink)] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold text-[var(--navy-900)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
