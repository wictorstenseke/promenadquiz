import { QRCodeSVG } from "qrcode.react";
import { liveContent } from "../lib/walk";
import { joinDisplayUrl, playUrl } from "../lib/shareUrl";
import type { Walk } from "../types";

/** Print-only A4 poster: walk name, a large QR that opens the play page, a scan
 *  prompt, and a typeable fallback (join address + code) for anyone who can't
 *  scan. Hidden on screen; shown only when the body carries `print-qr` (see
 *  styles.css and PrintMenu). The QR encodes the same play URL as SharePage via
 *  the shared playUrl helper, and the code is the walk id. */
export function QrPoster({ walk }: { walk: Walk }) {
  const live = liveContent(walk);
  const url = playUrl(walk.id);

  return (
    <div className="qr-only">
      <section className="qr-poster">
        <h1 className="qr-poster-title">{live.title || "Namnlös promenad"}</h1>
        <div className="qr-poster-code">
          <QRCodeSVG value={url} size={280} bgColor="#ffffff" fgColor="#000000" />
        </div>
        <p className="qr-poster-prompt">Skanna QR-koden för att starta</p>
        <div className="qr-poster-fallback">
          <div className="qr-poster-fallrow">
            <span className="qr-poster-falllabel">Gå till:</span>
            <span className="qr-poster-fallurl">{joinDisplayUrl()}</span>
          </div>
          <div className="qr-poster-fallrow">
            <span className="qr-poster-falllabel">och ange kod:</span>
            <span className="qr-poster-fallcode">{walk.id}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
