import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Floating bottom sheet shell: slide-in animation, backdrop tap, Escape, and
 *  drag-down-to-dismiss. Content (title, body, actions) is passed as children. */
export function Sheet({ open, onClose, children }: Props) {
  const [mounted, setMounted] = useState(open);
  // `shown` drives the open/close transforms. It flips a frame *after* mount so
  // the browser paints the closed position first — otherwise the sheet pops in
  // at its final spot instead of sliding up.
  const [shown, setShown] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDrag(0); // clear any leftover drag from a previous drag-dismiss
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShown(true)),
      );
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (start.current === null) return;
    setDrag(Math.max(0, e.clientY - start.current));
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > 110) onClose();
    else setDrag(0);
  };

  return (
    <div
      className="sheet-overlay"
      data-open={shown}
      onClick={onClose}
      onTransitionEnd={() => !open && setMounted(false)}
    >
      <div
        className="sheet"
        data-open={shown}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <button className="sheet-close" onClick={onClose} aria-label="Stäng">
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
