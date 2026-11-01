
"use strict";

/* ==========================================================================
   PAY54 Enterprise Cards UI v2.4.0
   WP-TITAN-CARDS-001D.8

   Responsive carousel, accessible controls and session-expiry hardening.
   Uses the canonical Card Engine only.
   No automatic repository or financial mutations.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const VERSION = "2.4.0";
  const UI = W.PAY54_CARDS_UI || (W.PAY54_CARDS_UI = {});

  const escape = value =>
    String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);

  const qs = (root, selector) => root.querySelector(selector);

  const notify = message => {
    if (typeof W.PAY54_TOAST?.showToast === "function") {
      W.PAY54_TOAST.showToast(message);
    } else {
      console.info("[PAY54_CARDS_UI]", message);
    }
  };

  const report = error => {
    console.error("[PAY54_CARDS_UI]", error);
    notify(error?.message || "Card operation was not completed.");
  };

  function modalService() {
    if (typeof W.PAY54_MODALS?.openModal !== "function") {
      throw new Error("Card modal service unavailable.");
    }
    return W.PAY54_MODALS;
  }

  const authenticated = () =>
    W.PAY54_SECURITY?.session?.isAuthenticated?.() === true;

  function requireReady() {
    if (!authenticated()) {
      throw new Error("Session expired. Sign in again to manage cards.");
    }

    const engine = W.PAY54_CARDS;

    if (
      !engine ||
      typeof engine.getCardRepositoryStatus !== "function" ||
      typeof engine.getCards !== "function"
    ) {
      throw new Error("Card Engine unavailable.");
    }

    if (engine.getCardRepositoryStatus()?.state !== "VALID") {
      throw new Error(
        "Card repository unavailable; no changes made."
      );
    }

    return engine;
  }

  function isDevelopment() {
    const config = W.PAY54_CONFIG;

    return (
      config?.isProduction?.() === false &&
      ["development", "test", "staging"].includes(
        config?.get?.("environment.name", "")
      ) &&
      config?.get?.("environment.realMoneyMode", true) === false &&
      config?.get?.(
        "environment.allowDevelopmentProviders",
        false
      ) === true
    );
  }

  const isVirtual = card =>
    card?.type === "virtual" ||
    card?.cardType === "virtual" ||
    card?.instrumentType === "virtual" ||
    card?.developmentVirtual === true ||
    card?.development === true;

  const isDemo = card =>
    card?.issuerIssued !== true ||
    card?.referenceOnly === true ||
    card?.development === true ||
    card?.developmentVirtual === true;

  function network(card) {
    const value = String(
      card?.network || card?.scheme || ""
    ).trim().toLowerCase();

    return value === "visa"
      ? "Visa"
      : value === "mastercard"
        ? "Mastercard"
        : "PAY54";
  }

  const label = card =>
    String(
      card?.nickname ||
      (
        isVirtual(card)
          ? "PAY54 Virtual Card"
          : "Linked Card Reference"
      )
    );

  const masked = card =>
    /^\d{4}$/.test(String(card?.last4 ?? ""))
      ? `•••• •••• •••• ${card.last4}`
      : "•••• •••• •••• ••••";

  const expiry = card =>
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(
      String(card?.expiry ?? "")
    )
      ? card.expiry
      : "Unavailable";

  const issuerContactless = card =>
    !isDemo(card) &&
    card?.contactlessEnabled === true &&
    card?.walletTokenized === true;

  const getCard = (engine, id) =>
    engine.getCardById?.(id) ||
    engine.getCards().find(card => card.id === id) ||
    null;

  const contactlessArt = `
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

  function cardMarkup(card, index) {
    const demo = isDemo(card);
    const contactless = issuerContactless(card);
    const id = escape(card.id);

    return `
      <article
        class="p54c-item"
        role="group"
        aria-roledescription="slide"
        aria-label="Card ${index + 1}: ${escape(label(card))}">

        <div class="p54c-face ${isVirtual(card) ? "virtual" : "linked"}${card.frozen ? " is-frozen" : ""}">

          <div class="p54c-line">
            <strong class="p54c-logo">PAY54</strong>
            <span class="p54c-network">${escape(network(card))}</span>
          </div>

          <div class="p54c-line">
            <span class="p54c-chip" aria-hidden="true"></span>
            <span
              class="p54c-contactless"
              title="${contactless
                ? "Issuer-enabled contactless"
                : "Contactless illustration only — not enabled"}">
              ${contactlessArt}
            </span>
          </div>

          <div class="p54c-pan">${escape(masked(card))}</div>

          <div class="p54c-line p54c-bottom">
            <div>
              <small>${demo
                ? "DEMO · NOT FOR PAYMENT"
                : "CARD RECORD"}</small>
              <strong>${escape(label(card))}</strong>
            </div>

            <div class="p54c-exp">
              <small>EXPIRY</small>
              <strong>${escape(expiry(card))}</strong>
            </div>
          </div>
        </div>

        <div class="p54c-info">
          <div>
            <strong>${escape(label(card))}</strong>
            <p>
              ${isVirtual(card) ? "Virtual card" : "Linked reference"}
              · ${demo ? "Demo only" : "Issuer record"}
            </p>
          </div>

          <span class="p54c-status ${card.frozen ? "frozen" : "active"}">
            ${card.frozen ? "Frozen" : "Active"}
          </span>
        </div>

        <div class="p54c-flags">
          ${card.default
            ? '<span class="p54c-chiplabel">Default</span>'
            : ""}

          <span class="p54c-chiplabel">
            ${demo ? "Demo" : "Issuer record"}
          </span>

          <span class="p54c-chiplabel">
            ${contactless
              ? "Contactless enabled"
              : "Contactless not enabled"}
          </span>
        </div>

        <div class="p54c-actions">
          <button class="p54-btn"
                  type="button"
                  data-card-action="details"
                  data-id="${id}">
            Details
          </button>

          <button class="p54-btn"
                  type="button"
                  data-card-action="activity"
                  data-id="${id}">
            Activity
          </button>

          <button class="p54-btn"
                  type="button"
                  data-card-action="freeze"
                  data-id="${id}">
            ${card.frozen ? "Unfreeze" : "Freeze"}
          </button>

          <button class="p54-btn"
                  type="button"
                  data-card-action="default"
                  data-id="${id}"
                  ${card.default ? "disabled" : ""}>
            ${card.default ? "Default" : "Set Default"}
          </button>

          <button class="p54-btn danger"
                  type="button"
                  data-card-action="remove"
                  data-id="${id}">
            Remove
          </button>
        </div>
      </article>
    `;
  }

  function workspace() {
    const list = requireReady().getCards();
    const hasVirtual = list.some(isVirtual);

    return `
      <section class="p54c-root"
               aria-label="PAY54 card management">

        <header class="p54c-header">
          <div>
            <h3>My Cards</h3>
            <p>Manage cards and linked references.</p>
          </div>

          <span class="p54c-chiplabel">
            ${list.length} card${list.length === 1 ? "" : "s"}
          </span>
        </header>

        <div class="p54c-toolbar">
          <button
            class="p54-btn primary"
            type="button"
            data-card-action="create"
            ${!isDevelopment() || hasVirtual ? "disabled" : ""}>
            + Create Virtual Card
          </button>

          <button
            class="p54-btn"
            type="button"
            data-card-action="link"
            ${!isDevelopment() ? "disabled" : ""}>
            + Link Existing Card
          </button>
        </div>

        <p class="p54c-note" role="note">
          Demo cards and linked references are not payment
          instruments. Contactless artwork is illustrative
          unless issuer capability is verified.
        </p>

        ${list.length ? `
          <div class="p54c-carousel-head">
            <strong>Your cards</strong>

            <div class="p54c-nav">
              <button
                type="button"
                data-card-action="prev"
                aria-label="Previous card">‹</button>

              <span data-card-counter aria-live="polite">
                1 / ${list.length}
              </span>

              <button
                type="button"
                data-card-action="next"
                aria-label="Next card">›</button>
            </div>
          </div>

          <div class="p54c-track"
               tabindex="0"
               role="region"
               aria-label="Swipeable card collection">
            ${list.map(cardMarkup).join("")}
          </div>
        ` : `
          <div class="p54c-empty">
            No cards saved.
          </div>
        `}
      </section>
    `;
  }

  function verifiedMutation(mutate, verify) {
    const engine = requireReady();
    const before = engine.getCardRepositoryStatus();

    mutate(engine);

    const after = engine.getCardRepositoryStatus();

    if (
      after.state !== "VALID" ||
      after.metadata?.revision !==
        before.metadata?.revision + 1 ||
      !verify(engine)
    ) {
      throw new Error(
        "Card operation was not verified. Inspect repository " +
        "state before retrying."
      );
    }
  }

  function showDetail(card) {
    const rows = [
      [
        "Card type",
        isVirtual(card) ? "Virtual" : "Linked reference"
      ],
      ["Network label", network(card)],
      ["Masked number", masked(card)],
      ["Expiry", expiry(card)],
      ["State", card.frozen ? "Frozen" : "Active"],
      ["Default", card.default ? "Yes" : "No"],
      [
        "Payment capability",
        isDemo(card)
          ? "Demo — unavailable"
          : "Requires issuer confirmation"
      ],
      [
        "Contactless",
        issuerContactless(card)
          ? "Issuer-enabled"
          : "Not enabled"
      ]
    ];

    modalService().openModal({
      title: "Card Details",

      bodyHTML: `
        <div class="p54c-detail">
          <h3>${escape(label(card))}</h3>

          <dl>
            ${rows.map(([name, value]) => `
              <div>
                <dt>${escape(name)}</dt>
                <dd>${escape(value)}</dd>
              </div>
            `).join("")}
          </dl>

          <button class="p54-btn"
                  type="button"
                  data-close>
            Close
          </button>
        </div>
      `,

      onMount: ({ modal, close }) => {
        qs(modal, "[data-close]")
          ?.addEventListener("click", close);
      }
    });
  }

  function showActivity(card) {
    const engine = requireReady();
    const entries =
      engine.getCardTransactions?.(card.id) || [];

    const lines = entries.slice(0, 30).map(tx => {
      const amount = Number.isFinite(tx?.amount)
        ? `${String(tx.currency || "")} ${tx.amount.toLocaleString(
            undefined,
            { maximumFractionDigits: 2 }
          )}`
        : "Amount unavailable";

      return `
        <li>
          <strong>${escape(
            tx.description || tx.type || "Card activity"
          )}</strong>

          <span>${escape(
            tx.created || tx.createdAt || ""
          )}</span>

          <span>${escape(amount)}</span>
        </li>
      `;
    }).join("");

    modalService().openModal({
      title: "Card Activity",

      bodyHTML: `
        <div class="p54c-detail">
          <h3>${escape(label(card))}</h3>

          <p>
            Recorded card activity only;
            not a bank statement.
          </p>

          ${entries.length
            ? `
              <ul class="p54c-history">${lines}</ul>
              ${entries.length > 30
                ? "<p>Showing 30 records.</p>"
                : ""}
            `
            : "<p>No card activity recorded.</p>"
          }

          <button class="p54-btn"
                  type="button"
                  data-close>
            Close
          </button>
        </div>
      `,

      onMount: ({ modal, close }) => {
        qs(modal, "[data-close]")
          ?.addEventListener("click", close);
      }
    });
  }

  function confirmRemove(card, refresh) {
    modalService().openModal({
      title: "Remove Card Reference",

      bodyHTML: `
        <div class="p54c-detail">
          <p>
            Remove
            <strong>${escape(label(card))}</strong>
            from this development repository?
          </p>

          <p>
            This cannot be undone from the Cards UI.
          </p>

          <div class="p54c-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    data-cancel>
              Cancel
            </button>

            <button class="p54-btn danger"
                    type="button"
                    data-confirm>
              Remove
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        qs(modal, "[data-cancel]")
          ?.addEventListener("click", close);

        qs(modal, "[data-confirm]")
          ?.addEventListener("click", () => {
            try {
              verifiedMutation(
                engine => engine.deleteCard(card.id),
                engine => !getCard(engine, card.id)
              );

              close();
              refresh();
              notify("Card record removed.");
            } catch (error) {
              report(error);
            }
          });
      }
    });
  }

  function createVirtual(refresh) {
    if (!isDevelopment()) {
      throw new Error(
        "Demo card creation is unavailable."
      );
    }

    if (requireReady().getCards().some(isVirtual)) {
      throw new Error(
        "A development virtual card already exists."
      );
    }

    modalService().openModal({
      title: "Create Virtual Card",

      bodyHTML: `
        <div class="p54c-detail">
          <p>
            Create one non-spendable PAY54 demo card
            without payment credentials.
          </p>

          <div class="p54c-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    data-cancel>
              Cancel
            </button>

            <button class="p54-btn primary"
                    type="button"
                    data-confirm>
              Create Demo Card
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        qs(modal, "[data-cancel]")
          ?.addEventListener("click", close);

        qs(modal, "[data-confirm]")
          ?.addEventListener("click", () => {
            try {
              if (
                !isDevelopment() ||
                requireReady().getCards().some(isVirtual)
              ) {
                throw new Error(
                  "Virtual card already exists or creation is disabled."
                );
              }

              let created;

              verifiedMutation(engine => {
                created = engine.addCard({
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
              }, engine => Boolean(
                created?.id &&
                getCard(engine, created.id)
              ));

              close();
              refresh();
              notify("Demo card created.");
            } catch (error) {
              report(error);
            }
          });
      }
    });
  }

  function linkReference(refresh) {
    if (!isDevelopment()) {
      throw new Error(
        "Reference linking is unavailable."
      );
    }

    requireReady();

    modalService().openModal({
      title: "Link Existing Card Reference",

      bodyHTML: `
        <form class="p54c-form" novalidate>
          <p>
            Development reference only.
            Do not enter a full card number, PIN or CVV.
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
            <input
              name="last4"
              class="p54-input"
              maxlength="4"
              inputmode="numeric"
              autocomplete="off"
              required>
          </label>

          <label>
            Nickname
            <input
              name="nickname"
              class="p54-input"
              maxlength="60"
              autocomplete="off">
          </label>

          <label>
            Expiry (optional MM/YY)
            <input
              name="expiry"
              class="p54-input"
              maxlength="5"
              autocomplete="off">
          </label>

          <div class="p54c-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    data-cancel>
              Cancel
            </button>

            <button class="p54-btn primary"
                    type="submit">
              Save Reference
            </button>
          </div>
        </form>
      `,

      onMount: ({ modal, close }) => {
        qs(modal, "[data-cancel]")
          ?.addEventListener("click", close);

        qs(modal, "form")
          ?.addEventListener("submit", event => {
            event.preventDefault();

            try {
              if (!isDevelopment()) {
                throw new Error(
                  "Reference linking is disabled."
                );
              }

              const elements =
                event.currentTarget.elements;

              const last4 =
                elements.namedItem("last4").value.trim();

              const exp =
                elements.namedItem("expiry").value.trim();

              const nickname =
                elements.namedItem("nickname").value.trim();

              if (!/^\d{4}$/.test(last4)) {
                throw new Error(
                  "Enter exactly four digits."
                );
              }

              if (
                exp &&
                !/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)
              ) {
                throw new Error(
                  "Expiry must be MM/YY."
                );
              }

              let created;

              verifiedMutation(engine => {
                created = engine.addCard({
                  type: "linked-reference",
                  scheme:
                    elements.namedItem("network").value,
                  nickname:
                    nickname || "Linked Card Reference",
                  last4,
                  expiry: exp,
                  referenceOnly: true,
                  issuerIssued: false,
                  contactlessEnabled: false
                });
              }, engine => Boolean(
                created?.id &&
                getCard(engine, created.id)
              ));

              close();
              refresh();
              notify("Reference saved.");
            } catch (error) {
              report(error);
            }
          });
      }
    });
  }

  function openCards() {
    try {
      requireReady();

      modalService().openModal({
        title: "PAY54 · My Cards",
        bodyHTML: workspace(),

        onMount: ({ modal }) => {
          modal.classList.add("p54c-modal");

          const body =
            qs(modal, ".p54-modal-body");

          let selectedIndex = 0;
          let expired = false;
          let scrollFrame = null;

          function showExpired() {
            if (expired || authenticated()) {
              return;
            }

            expired = true;

            if (body) {
              body.innerHTML = `
                <div class="p54c-expired" role="alert">
                  <h3>Session expired</h3>

                  <p>
                    Sign in again to manage your cards.
                    No card changes were made by this screen.
                  </p>

                  <a class="p54-btn primary"
                     href="login.html">
                    Sign In Again
                  </a>
                </div>
              `;
            }
          }

          const monitor = W.setInterval(() => {
            if (!modal.isConnected) {
              W.clearInterval(monitor);
              return;
            }

            showExpired();
          }, 1500);

          modal.addEventListener(
            "keydown",
            showExpired
          );

          modal.addEventListener(
            "pointerdown",
            showExpired
          );

          const visibilityController =
            new AbortController();

          const visibilityMonitor =
            W.setInterval(() => {
              if (!modal.isConnected) {
                visibilityController.abort();
                W.clearInterval(visibilityMonitor);
              }
            }, 1500);

          document.addEventListener(
            "visibilitychange",
            () => {
              if (
                document.visibilityState === "visible" &&
                modal.isConnected
              ) {
                showExpired();
              }
            },
            { signal: visibilityController.signal }
          );

          function updatePosition() {
            const track = qs(modal, ".p54c-track");

            const slides = [
              ...(track?.querySelectorAll(".p54c-item") || [])
            ];

            if (!track || !slides.length) {
              return;
            }

            const left =
              track.getBoundingClientRect().left;

            let bestDistance = Infinity;

            slides.forEach((slide, index) => {
              const distance = Math.abs(
                slide.getBoundingClientRect().left - left
              );

              if (distance < bestDistance) {
                bestDistance = distance;
                selectedIndex = index;
              }
            });

            const counter =
              qs(modal, "[data-card-counter]");

            if (counter) {
              counter.textContent =
                `${selectedIndex + 1} / ${slides.length}`;
            }

            const previous =
              qs(modal, '[data-card-action="prev"]');

            const next =
              qs(modal, '[data-card-action="next"]');

            if (previous) {
              previous.disabled =
                selectedIndex === 0;
            }

            if (next) {
              next.disabled =
                selectedIndex === slides.length - 1;
            }
          }

          function bindScroll() {
            const track = qs(modal, ".p54c-track");

            track?.addEventListener(
              "scroll",
              () => {
                if (scrollFrame !== null) {
                  cancelAnimationFrame(scrollFrame);
                }

                scrollFrame =
                  requestAnimationFrame(() => {
                    scrollFrame = null;
                    updatePosition();
                  });
              },
              { passive: true }
            );

            updatePosition();
          }

          function refresh() {
            if (expired || !body) {
              return;
            }

            if (!authenticated()) {
              showExpired();
              return;
            }

            body.innerHTML = workspace();
            selectedIndex = 0;
            bindScroll();
          }

          bindScroll();

          modal.addEventListener(
            "click",
            event => {
              const button = event.target.closest(
                "button[data-card-action]"
              );

              if (
                !button ||
                !modal.contains(button) ||
                button.disabled ||
                expired
              ) {
                return;
              }

              if (!authenticated()) {
                showExpired();
                return;
              }

              try {
                const action =
                  button.dataset.cardAction;

                if (action === "create") {
                  return createVirtual(refresh);
                }

                if (action === "link") {
                  return linkReference(refresh);
                }

                if (
                  action === "prev" ||
                  action === "next"
                ) {
                  const slides = [
                    ...(qs(modal, ".p54c-track")
                      ?.querySelectorAll(".p54c-item") || [])
                  ];

                  const next = Math.max(
                    0,
                    Math.min(
                      slides.length - 1,
                      selectedIndex +
                        (action === "next" ? 1 : -1)
                    )
                  );

                  slides[next]?.scrollIntoView({
                    behavior: matchMedia(
                      "(prefers-reduced-motion: reduce)"
                    ).matches
                      ? "auto"
                      : "smooth",
                    block: "nearest",
                    inline: "start"
                  });

                  return;
                }

                const engine = requireReady();

                const card = getCard(
                  engine,
                  button.dataset.id
                );

                if (!card) {
                  throw new Error(
                    "Card record no longer exists."
                  );
                }

                if (action === "details") {
                  return showDetail(card);
                }

                if (action === "activity") {
                  return showActivity(card);
                }

                if (action === "remove") {
                  return confirmRemove(
                    card,
                    refresh
                  );
                }

                if (action === "freeze") {
                  verifiedMutation(
                    value => value.toggleFreeze(card.id),
                    value =>
                      getCard(value, card.id)?.frozen ===
                      !card.frozen
                  );

                  refresh();

                  notify(
                    card.frozen
                      ? "Card unfrozen."
                      : "Card frozen."
                  );

                } else if (
                  action === "default" &&
                  !card.default
                ) {
                  verifiedMutation(
                    value => value.setDefault(card.id),
                    value =>
                      getCard(value, card.id)?.default === true
                  );

                  refresh();
                  notify("Default card updated.");
                }

              } catch (error) {
                report(error);
              }
            }
          );

          modal.addEventListener(
            "keydown",
            event => {
              if (
                expired ||
                !authenticated() ||
                event.target !==
                  qs(modal, ".p54c-track")
              ) {
                return;
              }

              if (
                event.key !== "ArrowLeft" &&
                event.key !== "ArrowRight"
              ) {
                return;
              }

              event.preventDefault();

              qs(
                modal,
                `[data-card-action="${event.key === "ArrowRight" ? "next" : "prev"}"]`
              )?.click();
            }
          );
        }
      });

    } catch (error) {
      report(error);
    }
  }

  UI.version = VERSION;
  UI.openCards = openCards;

  console.info(
    `[PAY54_CARDS_UI] Premium Cards UI v${VERSION} ready.`
  );
})();
