import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation bottom sheet with a cancel / confirm button pair. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="sheet-title">{title}</h3>
      {body && <p className="sheet-body muted">{body}</p>}
      <div
        className="row"
        style={{ gap: "0.7rem", marginTop: "1.2rem", justifyContent: "flex-end" }}
      >
        <button className="btn ghost" onClick={onClose}>
          Avbryt
        </button>
        <button className="btn blaze" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
