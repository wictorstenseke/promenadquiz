import { useEffect, useRef, useState } from "react";
import { ChevronIcon, PrinterIcon } from "./Icons";

/** Print dropdown: "Skriv ut" ▾ with three outputs — the per-station question
 *  sheets (portrait), the answer slips / talonger (landscape), and the QR poster
 *  (portrait). The talonger and QR paths toggle `body.print-talonger` /
 *  `body.print-qr` so the print stylesheet swaps which print-only block is shown;
 *  the class is cleared once printing finishes. The question/talonger items show
 *  only when `printable`; the QR poster is always available. */
export function PrintMenu({ printable }: { printable: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    const clear = () =>
      document.body.classList.remove("print-talonger", "print-qr");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  function printQuestions() {
    setOpen(false);
    window.print();
  }

  function printTalonger() {
    setOpen(false);
    document.body.classList.add("print-talonger");
    window.print();
  }

  function printQr() {
    setOpen(false);
    document.body.classList.add("print-qr");
    window.print();
  }

  return (
    <div className="print-menu" ref={wrap}>
      <button
        className="btn ghost sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <PrinterIcon size={16} /> Skriv ut (beta) <ChevronIcon size={14} />
      </button>
      {open && (
        <div className="print-menu-pop" role="menu">
          {printable && (
            <button className="menu-item" role="menuitem" onClick={printQuestions}>
              Skriv ut frågor
            </button>
          )}
          {printable && (
            <button className="menu-item" role="menuitem" onClick={printTalonger}>
              Skriv ut talonger
            </button>
          )}
          <button className="menu-item" role="menuitem" onClick={printQr}>
            Skriv ut QR-affisch
          </button>
        </div>
      )}
    </div>
  );
}
