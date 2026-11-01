
"use strict";

/* PAY54 Enterprise Premium Cards UI v2.3.0
   WP-TITAN-CARDS-001D.7
   Canonical repository only.
   Demo cards are not payment instruments. */

(() => {
  const W = window;
  const VERSION = "2.3.0";
  const ui = W.PAY54_CARDS_UI || (W.PAY54_CARDS_UI = {});
  const $ = (root, selector) => root.querySelector(selector);

  const safe = value => String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]
  );

  const toast = message => {
    if (typeof W.PAY54_TOAST?.showToast === "function") {
      W.PAY54_TOAST.showToast(message);
    } else {
      console.info("[PAY54_CARDS_UI]", message);
    }
  };

  const report = error => {
    console.error("[PAY54_CARDS_UI]", error);
    toast(error?.message || "Card operation could not be completed.");
  };

  const engine = () => {
    if (
      typeof W.PAY54_CARDS?.getCards !== "function" ||
      typeof W.PAY54_CARDS?.getCardRepositoryStatus !== "function"
    ) {
      throw new Error("PAY54 Card Engine is unavailable.");
    }
    return W.PAY54_CARDS;
  };

  const modals = () => {
    if (typeof W.PAY54_MODALS?.openModal !== "function") {
      throw new Error("PAY54 modal service is unavailable.");
    }
    return W.PAY54_MODALS;
  };

  const authenticated = () =>
    W.PAY54_SECURITY?.session?.isAuthenticated?.() === true;

  const requireReady = () => {
    if (!authenticated()) {
      throw new Error("Session expired. Please sign in again.");
    }

    const e = engine();

    if (e.getCardRepositoryStatus().state !== "VALID") {
      throw new Error(
        "Card repository is unavailable. No changes were made."
      );
    }
    return e;
  };

  const development = () => {
    const c = W.PAY54_CONFIG;
    return (
      c?.isProduction?.() === false &&
      ["development", "test", "staging"].includes(
        c?.get?.("environment.name", "")
      ) &&
      c?.get?.("environment.realMoneyMode", true) === false &&
      c?.get?.("environment.allowDevelopmentProviders", false) === true
    );
  };

  const isVirtual = c =>
    c?.type === "virtual" ||
    c?.cardType === "virtual" ||
    c?.developmentVirtual === true ||
    c?.instrumentType === "virtual";

  const isDemo = c =>
    c?.developmentVirtual === true ||
    c?.development === true ||
    c?.referenceOnly === true ||
    c?.issuerIssued !== true;

  const contactlessEnabled = c =>
    c?.issuerIssued === true &&
    c?.contactlessEnabled === true &&
    c?.walletTokenized === true &&
    !isDemo(c);

  const network = c => {
    const n = String(c?.network || c?.scheme || "")
      .trim()
      .toLowerCase();

    return n === "visa"
      ? "Visa"
      : n === "mastercard"
        ? "Mastercard"
        : "PAY54";
  };

  const title = c =>
    String(
      c?.nickname ||
      (isVirtual(c) ? "PAY54 Virtual Card" : "Linked Card Reference")
    );

  const masked = c =>
    /^\d{4}$/.test(String(c?.last4 ?? ""))
      ? `••••  ••••  ••••  ${c.last4}`
      : "••••  ••••  ••••  ••••";

  const displayExpiry = c =>
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(c?.expiry ?? ""))
      ? c.expiry
      : "Not available";

  const cards = () => requireReady().getCards();

  const contactlessSVG = `
    <svg viewBox="0 0 32 32"
         aria-hidden="true"
         focusable="false">
      <path
        d="M9 11c4 3 4 7 0 10
           M14 7c7 5 7 13 0 18
           M19 3c10 8 10 18 0 26"
        fill="none"
        stroke="currentColor"
        stroke-width="2.3"
        stroke-linecap="round"/>
    </svg>
  `;

  function face(c, index) {
    const virtual = isVirtual(c);
    const demo = isDemo(c);
    const active = contactlessEnabled(c);
    const shape = virtual ? "virtual" : "linked";
    const label = demo ? "DEMO · NOT FOR PAYMENT" : "CARD";

    return `
      <article
        class="p54c-item"
        role="group"
        aria-roledescription="slide"
        aria-label="Card ${index + 1}: ${safe(title(c))}">

        <div class="p54c-face ${shape}${c.frozen ? " is-frozen" : ""}">
          <div class="p54c-line">
            <strong class="p54c-logo">PAY54</strong>
            <span class="p54c-network">${safe(network(c))}</span>
          </div>

          <div class="p54c-line">
            <span class="p54c-chip" aria-hidden="true"></span>
            <span
              class="p54c-contactless"
              title="${active
                ? "Contactless enabled by issuer"
                : "Illustration only — contactless disabled"}">
              ${contactlessSVG}
            </span>
          </div>

          <div class="p54c-pan">${safe(masked(c))}</div>

          <div class="p54c-line p54c-bottom">
            <div>
              <small>${safe(label)}</small>
              <strong>${safe(title(c))}</strong>
            </div>
            <div class="p54c-exp">
              <small>EXPIRY</small>
              <strong>${safe(displayExpiry(c))}</strong>
            </div>
          </div>
        </div>

        <div class="p54c-info">
          <div>
            <strong>${safe(title(c))}</strong>
            <p>
              ${virtual ? "Virtual card" : "Linked card reference"}
              · ${demo ? "Non-spendable demo" : "Issuer-backed record"}
            </p>
          </div>
          <span class="p54c-status ${c.frozen ? "frozen" : "active"}">
            ${c.frozen ? "Frozen" : "Active"}
          </span>
        </div>

        <div class="p54c-flags">
          ${c.default
            ? '<span class="p54c-chiplabel">Default</span>'
            : ""}
          <span class="p54c-chiplabel">
            ${demo ? "Demo" : "Issuer record"}
          </span>
          <span class="p54c-chiplabel">
            ${active
              ? "Contactless enabled"
              : "Contactless not enabled"}
          </span>
        </div>

        <div class="p54c-actions">
          <button type="button" class="p54-btn"
            data-action="details" data-id="${safe(c.id)}">
            Details
          </button>

          <button type="button" class="p54-btn"
            data-action="activity" data-id="${safe(c.id)}">
            Activity
          </button>

          <button type="button" class="p54-btn"
            data-action="freeze" data-id="${safe(c.id)}">
            ${c.frozen ? "Unfreeze" : "Freeze"}
          </button>

          <button type="button" class="p54-btn"
            data-action="default" data-id="${safe(c.id)}"
            ${c.default ? "disabled" : ""}>
            ${c.default ? "Default" : "Set Default"}
          </button>

          <button type="button" class="p54-btn danger"
            data-action="remove" data-id="${safe(c.id)}">
            Remove
          </button>
        </div>
      </article>
    `;
  }

  function workspace() {
    const list = cards();

    return `
      <section class="p54c-root" aria-label="PAY54 cards management">
        <header class="p54c-header">
          <div>
            <h3>My Cards</h3>
            <p>Manage your virtual cards and linked references.</p>
          </div>
          <span class="p54c-chiplabel">
            ${list.length} card${list.length === 1 ? "" : "s"}
          </span>
        </header>

        <div class="p54c-toolbar">
          <button type="button" class="p54-btn primary"
            data-action="create"
            ${!development() || list.some(isVirtual) ? "disabled" : ""}>
            + Create Virtual Card
          </button>
          <button type="button" class="p54-btn"
            data-action="link"
            ${!development() ? "disabled" : ""}>
            + Link Existing Card
          </button>
        </div>

        <p class="p54c-note" role="note">
          Development cards and linked references are not issued
          payment instruments. The contactless graphic is illustrative
          unless issuer-enabled capability is explicitly confirmed.
        </p>

        ${list.length ? `
          <div class="p54c-carousel-head">
            <strong>Your cards</strong>
            <div class="p54c-nav">
              <button type="button" data-action="prev"
                aria-label="Previous card">‹</button>
              <span data-counter aria-live="polite">
                1 / ${list.length}
              </span>
              <button type="button" data-action="next"
                aria-label="Next card">›</button>
            </div>
          </div>

          <div class="p54c-track" tabindex="0"
            role="region" aria-label="Swipeable cards">
            ${list.map(face).join("")}
          </div>
        ` : `
          <div class="p54c-empty">
            No cards saved. Create a development card
            or link a reference.
          </div>
        `}
      </section>
    `;
  }

  function verifiedChange(action, validate) {
    const e = requireReady();
    const previous = e.getCardRepositoryStatus();

    action(e);

    const next = e.getCardRepositoryStatus();

    if (
      next.state !== "VALID" ||
      next.metadata?.revision !==
        previous.metadata?.revision + 1 ||
      !validate(e)
    ) {
      throw new Error(
        "Card update could not be verified. Do not repeat it " +
        "until the repository is inspected."
      );
    }
  }

  function detail(c) {
    const activity = requireReady().getCardTransactions?.(c.id) || [];

    modals().openModal({
      title: "Card Details",
      bodyHTML: `
        <div class="p54c-detail">
          <h3>${safe(title(c))}</h3>
          <dl>
            <div><dt>Card type</dt><dd>
              ${isVirtual(c) ? "Virtual" : "Linked reference"}
            </dd></div>
            <div><dt>Network / label</dt><dd>
              ${safe(network(c))}
            </dd></div>
            <div><dt>Card number</dt><dd>
              ${safe(masked(c))}
            </dd></div>
            <div><dt>Expiry</dt><dd>
              ${safe(displayExpiry(c))}
            </dd></div>
            <div><dt>Status</dt><dd>
              ${c.frozen ? "Frozen" : "Active"}
            </dd></div>
            <div><dt>Default</dt><dd>
              ${c.default ? "Yes" : "No"}
            </dd></div>
            <div><dt>Contactless</dt><dd>
              ${contactlessEnabled(c)
                ? "Issuer-enabled"
                : "Not enabled"}
            </dd></div>
            <div><dt>Payment capability</dt><dd>
              ${isDemo(c)
                ? "Demo only — unavailable"
                : "Subject to issuer verification"}
            </dd></div>
            <div><dt>Recorded activity</dt><dd>
              ${activity.length} record${activity.length === 1 ? "" : "s"}
            </dd></div>
          </dl>
          <button type="button" class="p54-btn" data-close>
            Close
          </button>
        </div>`,
      onMount: ({modal, close}) =>
        $(modal, "[data-close]")?.addEventListener("click", close)
    });
  }

  function activity(c) {
    const entries = requireReady().getCardTransactions?.(c.id) || [];

    const rows = entries.slice(0, 30).map(tx => {
      const label = String(
        tx?.description || tx?.type || "Card activity"
      );
      const date = String(tx?.created || tx?.createdAt || "");
      const amount =
        typeof tx?.amount === "number" && Number.isFinite(tx.amount)
          ? `${safe(tx.currency || "")} ${safe(
              tx.amount.toLocaleString(undefined, {
                maximumFractionDigits: 2
              })
            )}`
          : "Amount unavailable";

      return `
        <li>
          <strong>${safe(label)}</strong>
          <span>${safe(date)}</span>
          <span>${amount}</span>
        </li>
      `;
    }).join("");

    modals().openModal({
      title: "Card Activity",
      bodyHTML: `
        <div class="p54c-detail">
          <h3>${safe(title(c))}</h3>
          <p>
            Recorded card activity only.
            This is not a bank statement.
          </p>

          ${entries.length
            ? `<ul class="p54c-history">${rows}</ul>
              ${entries.length > 30
                ? "<p>Showing the 30 most recent records.</p>"
                : ""}`
            : "<p>No card activity has been recorded.</p>"}

          <button type="button" class="p54-btn" data-close>
            Close
          </button>
        </div>`,
      onMount: ({modal, close}) =>
        $(modal, "[data-close]")?.addEventListener("click", close)
    });
  }

  function confirmRemove(c, refresh) {
    modals().openModal({
      title: "Remove Card Reference",
      bodyHTML: `
        <div class="p54c-detail">
          <p>
            Remove <strong>${safe(title(c))}</strong>
            from the development card repository?
          </p>
          <p>This cannot be undone through the Cards UI.</p>
          <div class="p54c-dialog-actions">
            <button type="button" class="p54-btn" data-cancel>
              Cancel
            </button>
            <button type="button" class="p54-btn danger"
              data-confirm>Remove</button>
          </div>
        </div>`,
      onMount: ({modal, close}) => {
        $(modal, "[data-cancel]")?.addEventListener("click", close);
        $(modal, "[data-confirm]")?.addEventListener("click", () => {
          try {
            verifiedChange(
              e => e.deleteCard(c.id),
              e => !e.getCardById(c.id)
            );
            close();
            refresh();
            toast("Card reference removed.");
          } catch (error) {
            report(error);
          }
        });
      }
    });
  }

  function createCard(refresh) {
    try {
      if (!development()) {
        throw new Error(
          "Demo card creation is disabled in this environment."
        );
      }

      if (cards().some(isVirtual)) {
        throw new Error(
          "A development virtual card already exists."
        );
      }

      modals().openModal({
        title: "Create Virtual Card",
        bodyHTML: `
          <div class="p54c-detail">
            <p>
              This will create a non-spendable PAY54 demo card,
              without a payment number or CVV.
            </p>
            <div class="p54c-dialog-actions">
              <button type="button" class="p54-btn"
                data-cancel>Cancel</button>
              <button type="button" class="p54-btn primary"
                data-confirm>Create Demo Card</button>
            </div>
          </div>`,
        onMount: ({modal, close}) => {
          $(modal, "[data-cancel]")?.addEventListener(
            "click", close
          );

          $(modal, "[data-confirm]")?.addEventListener(
            "click", () => {
              try {
                if (cards().some(isVirtual)) {
                  throw new Error(
                    "A virtual demo card already exists."
                  );
                }

                let created;

                verifiedChange(e => {
                  created = e.addCard({
                    type: "virtual",
                    cardType: "virtual",
                    developmentVirtual: true,
                    scheme: "PAY54",
                    nickname: "PAY54 Demo Virtual Card",
                    referenceOnly: true,
                    issuerIssued: false,
                    contactlessEnabled: false,
                    walletTokenized: false
                  });
                }, e => Boolean(
                  created?.id && e.getCardById(created.id)
                ));

                close();
                refresh();
                toast("Demo virtual card created.");
              } catch (error) {
                report(error);
              }
            }
          );
        }
      });
    } catch (error) {
      report(error);
    }
  }

  function linkCard(refresh) {
    try {
      if (!development()) {
        throw new Error(
          "Reference linking is disabled in this environment."
        );
      }

      requireReady();

      modals().openModal({
        title: "Link Existing Card Reference",
        bodyHTML: `
          <form class="p54c-form" novalidate>
            <p>
              Development reference only. Never enter
              a full card number, PIN or CVV.
            </p>

            <label>
              Card network
              <select name="network" class="p54-input">
                <option>Visa</option>
                <option>Mastercard</option>
              </select>
            </label>

            <label>
              Last four digits
              <input name="last4" class="p54-input"
                inputmode="numeric" maxlength="4"
                autocomplete="off" required>
            </label>

            <label>
              Nickname
              <input name="nickname" class="p54-input"
                maxlength="60" autocomplete="off">
            </label>

            <label>
              Expiry (optional MM/YY)
              <input name="expiry" class="p54-input"
                maxlength="5" autocomplete="off">
            </label>

            <div class="p54c-dialog-actions">
              <button type="button" class="p54-btn"
                data-cancel>Cancel</button>
              <button type="submit" class="p54-btn primary">
                Save Reference
              </button>
            </div>
          </form>`,
        onMount: ({modal, close}) => {
          $(modal, "[data-cancel]")?.addEventListener(
            "click", close
          );

          $(modal, "form")?.addEventListener("submit", event => {
            event.preventDefault();

            try {
              const form = event.currentTarget;
              const digits = form.elements
                .namedItem("last4").value.trim();
              const expiry = form.elements
                .namedItem("expiry").value.trim();
              const nickname = form.elements
                .namedItem("nickname").value.trim();

              if (!/^\d{4}$/.test(digits)) {
                throw new Error("Enter exactly four digits.");
              }

              if (
                expiry &&
                !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)
              ) {
                throw new Error("Expiry must be MM/YY.");
              }

              let created;

              verifiedChange(e => {
                created = e.addCard({
                  type: "linked-reference",
                  scheme: form.elements
                    .namedItem("network").value,
                  nickname: nickname || "Linked Card Reference",
                  last4: digits,
                  expiry,
                  referenceOnly: true,
                  issuerIssued: false,
                  contactlessEnabled: false
                });
              }, e => Boolean(
                created?.id && e.getCardById(created.id)
              ));

              close();
              refresh();
              toast("Linked card reference saved.");
            } catch (error) {
              report(error);
            }
          });
        }
      });
    } catch (error) {
      report(error);
    }
  }

  function openCards() {
    try {
      requireReady();

      modals().openModal({
        title: "PAY54 · My Cards",
        bodyHTML: workspace(),

        onMount: ({modal}) => {
          const body = $(modal, ".p54-modal-body");
          let position = 0;

          const updateCounter = () => {
            const track = $(modal, ".p54c-track");
            const slides = track?.querySelectorAll(".p54c-item") || [];

            if (!slides.length) return;

            const left = track.getBoundingClientRect().left;
            let closest = 0;
            let distance = Infinity;

            slides.forEach((el, i) => {
              const d = Math.abs(
                el.getBoundingClientRect().left - left
              );

              if (d < distance) {
                distance = d;
                closest = i;
              }
            });

            position = closest;

            const counter = $(modal, "[data-counter]");
            if (counter) {
              counter.textContent =
                `${position + 1} / ${slides.length}`;
            }
          };

          const refresh = () => {
            if (!body) return;

            body.innerHTML = workspace();

            const track = $(modal, ".p54c-track");
            track?.addEventListener("scroll", updateCounter, {
              passive: true
            });

            position = 0;
          };

          $(modal, ".p54c-track")?.addEventListener(
            "scroll", updateCounter, {passive: true}
          );

          modal.addEventListener("click", event => {
            const target = event.target.closest(
              "button[data-action]"
            );

            if (
              !target ||
              !modal.contains(target) ||
              target.disabled
            ) return;

            const action = target.dataset.action;

            try {
              if (action === "create") {
                return createCard(refresh);
              }

              if (action === "link") {
                return linkCard(refresh);
              }

              if (action === "prev" || action === "next") {
                const track = $(modal, ".p54c-track");
                const slides = [
                  ...(track?.querySelectorAll(".p54c-item") || [])
                ];

                const next = Math.min(
                  slides.length - 1,
                  Math.max(
                    0,
                    position + (action === "next" ? 1 : -1)
                  )
                );

                slides[next]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "start"
                });
                return;
              }

              const e = requireReady();
              const c = e.getCardById(target.dataset.id);

              if (!c) {
                throw new Error(
                  "Card no longer exists. Please reopen the card list."
                );
              }

              if (action === "details") {
                return detail(c);
              }

              if (action === "activity") {
                return activity(c);
              }

              if (action === "remove") {
                return confirmRemove(c, refresh);
              }

              if (action === "freeze") {
                verifiedChange(
                  x => x.toggleFreeze(c.id),
                  x => x.getCardById(c.id)?.frozen === !c.frozen
                );

                refresh();
                toast(c.frozen ? "Card unfrozen." : "Card frozen.");
              } else if (action === "default" && !c.default) {
                verifiedChange(
                  x => x.setDefault(c.id),
                  x => x.getCardById(c.id)?.default === true
                );

                refresh();
                toast("Default card updated.");
              }
            } catch (error) {
              report(error);
            }
          });
        }
      });
    } catch (error) {
      report(error);
    }
  }

  ui.version = VERSION;
  ui.openCards = openCards;

  console.info(
    `[PAY54_CARDS_UI] Premium Cards UI v${VERSION} ready.`
  );
})();
