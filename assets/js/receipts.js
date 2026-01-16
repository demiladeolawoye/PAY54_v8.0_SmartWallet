/* =========================
   PAY54 — Layer 3A Receipts v2
   File: assets/js/receipts.js
   Version: v805.2-L3A

   Requirements:
   - PAY54 branding at top
   - Referral CTA at bottom (clickable link)
========================= */

(() => {
  "use strict";

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildReceiptText(lines) {
    return (lines || []).filter(Boolean).join("\n");
  }

  function shareWhatsApp(text) {
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied ✅");
    } catch {
      alert("Copy failed (browser permissions).");
    }
  }

  // join link – update later to your production signup URL
  const JOIN_URL = "signup.html";

  function openReceiptModal({ openModal, title, tx, lines }) {
    const PAY54 = window.PAY54_LEDGER;
    const base = tx.base_currency;
    const equiv = tx.base_equiv;
    const fx = tx.fx_rate_used;

    const receiptText = buildReceiptText([
      "PAY54 Receipt",
      `Transaction ID: ${tx.id}`,
      "------------------------",
      ...lines,
      "------------------------",
      (tx.currency !== base)
        ? `FX Equivalent: ≈ ${PAY54.moneyFmt(base, equiv)} (rate ${fx.toFixed(4)} ${base}/${tx.currency})`
        : "",
      `Time: ${new Date(tx.created_at).toLocaleString()}`,
      "",
      "Join PAY54 — Earn rewards:",
      `${location.origin}/${JOIN_URL}`
    ].filter(Boolean));

    openModal({
      title: "Receipt",
      bodyHTML: `
        <div class="p54-receipt">
          <div style="font-weight:900; margin-bottom:6px;">PAY54 Receipt</div>
          <div class="muted" style="margin-bottom:10px;">${escapeHtml(title || "Transaction")}</div>

          <div class="muted" style="font-size:12px;">Transaction ID: ${escapeHtml(tx.id)}</div>
          <div class="p54-divider"></div>

          <pre style="margin:0; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;">${escapeHtml(receiptText)}</pre>

          <div class="p54-divider"></div>
          <div style="font-size:12px;">
            <a href="${JOIN_URL}" style="font-weight:900; text-decoration:underline;">Join PAY54 — Earn rewards</a>
          </div>
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="copyRcpt">Copy</button>
          <button class="p54-btn" type="button" id="waRcpt">WhatsApp</button>
          <button class="p54-btn primary" type="button" id="doneRcpt">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#doneRcpt").addEventListener("click", close);
        modal.querySelector("#copyRcpt").addEventListener("click", () => copyToClipboard(receiptText));
        modal.querySelector("#waRcpt").addEventListener("click", () => shareWhatsApp(receiptText));
      }
    });
  }

  window.PAY54_RECEIPTS = { openReceiptModal };
})();
