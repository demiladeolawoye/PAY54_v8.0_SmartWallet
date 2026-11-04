
/* PAY54 Dashboard Blueprint shell v1.0.0 — presentation only. */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const el = (tag, cls = "", text = "") => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const notice = (message) =>
    window.PAY54_TOAST?.showToast?.(message);
  const source = $("main.dash-grid");
  const header = $("header.dash-header");
  if (
    !source ||
    !header ||
    document.body.classList.contains("p54-blueprint")
  ) return;

  const left = $(".left", source);
  const right = $(".right", source);
  const balance = $("#balanceCard", source);
  const moves = left &&
    $(".money-moves-grid", left)?.closest(".card");
  const services = left &&
    $(".services-grid", left)?.closest(".card");
  const recent = $("#recentTransactions", source)?.closest(".card");
  const recipients = $("#recipientDashboardWidget", source)?.closest(".card");
  const shortcuts = right &&
    $(".shortcut-grid", right)?.closest(".card");
  const utilities = right &&
    $(".utility-grid", right)?.closest(".card");
  const alerts = right &&
    $("#alertsFeed", right)?.closest(".card");
  const news = right &&
    $("#newsFeed", right)?.closest(".card");

  if (
    [
      left, right, balance, moves, services,
      recent, shortcuts, utilities, alerts, news
    ].some(value => !value)
  ) {
    console.warn(
      "[PAY54 BLUEPRINT] Required dashboard nodes missing; original layout preserved."
    );
    return;
  }

  const scrollTo = target => {
    const node = target === "top"
      ? header
      : document.getElementById(target);

    node?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  const makeNavigationButton = (
    symbol, label, target, cls
  ) => {
    const button = el("button", cls);
    button.type = "button";
    button.append(
      el("span", "", symbol),
      el("span", "", label)
    );
    if (target === "top" && label === "Home") {
      button.classList.add("is-current");
    }
    button.addEventListener("click", () => {
      if (target === "unavailable") {
        notice(
          `${label} is not available in this development preview.`
        );
        return;
      }
      scrollTo(target);
    });
    return button;
  };

  try {
    const shell = el("div", "p54b-shell");
    const sidebar = el("aside", "p54b-sidebar");
    sidebar.setAttribute("aria-label", "Dashboard navigation");
    const logo = el("div", "p54b-wordmark");
    logo.append(
      el("span", "", "PAY"),
      el("strong", "", "54")
    );
    sidebar.append(logo);

    const sideNav = el("nav", "p54b-sidebar-nav");
    for (const [symbol, label, target] of [
      ["⌂", "Dashboard", "top"],
      ["⇄", "Money Moves", "p54b-moves"],
      ["▦", "Services", "p54b-services"],
      ["▤", "Transactions", "p54b-recent"],
      ["♢", "Rewards", "unavailable"],
      ["✉", "Messages", "unavailable"],
      ["?", "Help & Support", "unavailable"]
    ]) {
      const button = makeNavigationButton(
        symbol, label, target, "p54b-side-link"
      );
      if (label === "Dashboard") {
        button.classList.add("is-current");
      }
      sideNav.append(button);
    }
    sidebar.append(sideNav);

    const footer = el("div", "p54b-side-footer");
    footer.append(
      el("div", "p54b-side-muted", "Switch Profile · Personal"),
      el("div", "p54b-side-muted", "Settings")
    );
    sidebar.append(footer);

    const content = el("div", "p54b-content");
    shell.append(sidebar, content);
    header.before(shell);
    content.append(header);

    $(".brand", header)?.classList.add("p54b-hidden-brand");

    const greeting = el("div", "p54b-greeting");
    greeting.append(
      el("h1", "", "Good morning 👋"),
      el("p", "", "Welcome to your PAY54 Dashboard")
    );
    header.prepend(greeting);

    const top = el("div", "p54b-top");
    const wallets = el("section", "p54b-wallets-card card");
    wallets.append(el("h2", "", "My Wallets"));

    const walletList = $("#walletBalances", balance);
    if (walletList) wallets.append(walletList);

    const balanceDelta = $(".balance-delta", balance);
    if (balanceDelta) balanceDelta.hidden = true;

    for (const selector of [
      ".balance-meta",
      ".identity",
      ".trust-chip",
      "#fxTicker"
    ]) {
      $(selector, balance)?.classList.add("p54b-conceal");
    }

    balance.classList.add("p54b-balance");
    const balanceLabel = $(".label", balance);
    if (balanceLabel) {
      balanceLabel.textContent = "ACTIVE WALLET BALANCE";
    }

    const currencyPills = $(".currency-pills", header);
    const mobileCurrency = el(
      "div", "p54b-mobile-currencies"
    );
    if (currencyPills) {
      mobileCurrency.append(currencyPills);
    }

    const shortcutGrid = $(".shortcut-grid", shortcuts);
    const originalShortcuts = shortcutGrid
      ? [...shortcutGrid.children]
      : [];

    if (shortcutGrid) {
      shortcutGrid.replaceChildren();

      for (const [symbol, label, action] of [
        ["🌐", "Global Transfer", "fx"],
        ["🎁", "Gift Cards", null],
        ["💳", "Cards", "cards"],
        ["⭐", "Rewards", null]
      ]) {
        const button = el("button", "p54b-shortcut");
        button.type = "button";
        button.append(
          el("span", "p54b-shortcut-icon", symbol),
          el("span", "", label)
        );

        if (action) {
          button.dataset.action = action;
          button.addEventListener("click", () => {
            notice(
              `${label} is part of the development preview.`
            );
          });
        } else {
          button.disabled = true;
          button.title = `${label} is planned`;
        }
        shortcutGrid.append(button);
      }
    }

    shortcuts.classList.add("p54b-shortcuts");
    const shortcutsTitle = shortcuts.querySelector("h3");
    if (shortcutsTitle) {
      shortcutsTitle.textContent = "Quick Shortcuts";
    }
    const shortcutsSub = shortcuts.querySelector(".sub");
    if (shortcutsSub) {
      shortcutsSub.textContent =
        "Smart, high-demand actions for you";
    }

    top.append(balance, wallets, shortcuts);

    const columns = el("div", "p54b-columns");
    const main = el("section", "p54b-main");
    const support = el("section", "p54b-support");
    columns.append(main, support);

    moves.id = "p54b-moves";
    services.id = "p54b-services";
    recent.id = "p54b-recent";

    const recentTitle = recent.querySelector("h3");
    if (recentTitle) {
      recentTitle.textContent = "Recent Activity";
    }

    const moveGrid = $(".money-moves-grid", moves);
    const request = $('[data-action="request"]', services);
    if (request && moveGrid) moveGrid.append(request);

    const moreMoney = el(
      "button", "p54b-more-money", "••• More"
    );
    moreMoney.type = "button";
    moreMoney.setAttribute("aria-expanded", "false");

    moreMoney.addEventListener("click", () => {
      const expanded = moveGrid.classList.toggle(
        "p54b-show-all"
      );
      moreMoney.setAttribute(
        "aria-expanded", String(expanded)
      );
      moreMoney.textContent = expanded ? "Less" : "••• More";
    });
    moveGrid.append(moreMoney);

    for (const button of moveGrid.querySelectorAll(
      ".tile-btn"
    )) {
      $(".t-sub", button)?.classList.add("p54b-sr-only");
    }

    const serviceGrid = $(".services-grid", services);
    const existing = new Map(
      [...serviceGrid.querySelectorAll("[data-action]")]
        .map(button => [button.dataset.action, button])
    );

    const overflow = el("div", "p54b-overflow");
    overflow.hidden = true;
    for (const button of originalShortcuts) {
      overflow.append(button);
    }

    for (const [symbol, label, action] of [
      ["🌐", "Global Transfer", "fx"],
      ["🎁", "Gift Cards", null],
      ["⚡", "PAY54 Pay", "bills"],
      ["💳", "Cards", "cards"],
      ["💚", "Vaults", "savings"],
      ["▱", "Money Hub", null],
      ["✈", "Travel & Connect", null],
      ["🛍", "Marketplace", "shop"],
      ["▥", "Invest", "trading"],
      ["♟", "Agent+", "agent"]
    ]) {
      const button = action && existing.has(action)
        ? existing.get(action)
        : el("button", "tile-btn");

      button.type = "button";
      button.classList.add("p54b-service-tile");
      button.replaceChildren(
        el("span", "t-icon", symbol),
        el("span", "t-title", label)
      );

      if (!action) {
        button.disabled = true;
        button.title =
          `${label} is planned — unavailable in preview`;
      }
      serviceGrid.append(button);
    }

    for (const button of existing.values()) {
      if (!serviceGrid.contains(button)) {
        overflow.append(button);
      }
    }

    const viewAll = el(
      "button", "p54b-see-all", "See All"
    );
    viewAll.type = "button";
    viewAll.setAttribute("aria-expanded", "false");

    viewAll.addEventListener("click", () => {
      overflow.hidden = !overflow.hidden;
      viewAll.setAttribute(
        "aria-expanded", String(!overflow.hidden)
      );
    });

    services.append(viewAll, overflow);

    const servicesSub = services.querySelector(".sub");
    if (servicesSub) {
      servicesSub.textContent =
        "All your PAY54 services in one place";
    }

    const promotion = el("section", "p54b-promo");
    promotion.setAttribute(
      "aria-label", "Gift Cards development preview"
    );

    const promotionCopy = el("div", "p54b-promo-copy");
    promotionCopy.append(
      el("h2", "", "Gift Cards Now on PAY54"),
      el(
        "p", "",
        "Buy, sell and convert gift cards — planned service"
      )
    );

    const promotionCTA = el(
      "button",
      "p54b-promo-cta",
      "Explore Gift Cards →"
    );
    promotionCTA.type = "button";
    promotionCTA.disabled = true;
    promotionCTA.title =
      "Gift Cards is not yet available";
    promotionCopy.append(promotionCTA);

    const artwork = el("div", "p54b-gift-art");
    for (const [symbol, cls] of [
      ["a", "amazon"],
      ["●", "apple"],
      ["▶", "play"]
    ]) {
      artwork.append(
        el("span", `p54b-gift ${cls}`, symbol)
      );
    }
    promotion.append(promotionCopy, artwork);

    const security = el("section", "p54b-security card");
    security.append(
      el("h3", "", "🛡 Security & Control"),
      el(
        "p", "",
        "Development preview · No regulated status implied"
      )
    );

    const newsBrief = el("div", "p54b-news");
    newsBrief.append(news);

    main.append(moves, services, promotion, newsBrief);
    support.append(recent, alerts, utilities, security);

    if (recipients) {
      const legacy = el("details", "p54b-legacy");
      legacy.append(
        el("summary", "", "Recipients"),
        recipients
      );
      main.append(legacy);
    }

    const dashboard = el("main", "p54b-dashboard");
    source.replaceWith(dashboard);
    dashboard.append(mobileCurrency, top, columns);
    content.append(dashboard);

    const mobileNav = el("nav", "p54b-bottom-nav");
    mobileNav.setAttribute(
      "aria-label", "Mobile navigation"
    );

    for (const [symbol, label, target] of [
      ["⌂", "Home", "top"],
      ["⇄", "Money Moves", "p54b-moves"],
      ["54", "PAY54", "top"],
      ["▦", "Services", "p54b-services"],
      ["◷", "Transactions", "p54b-recent"]
    ]) {
      mobileNav.append(
        makeNavigationButton(
          symbol, label, target, "p54b-bottom-item"
        )
      );
    }

    content.append(mobileNav);
    $("#scanPayFab")?.classList.add(
      "p54b-original-fab"
    );

    document.body.classList.add("p54-blueprint");
    document.documentElement.dataset.pay54Blueprint =
      "1.0.0";

    console.info(
      "[PAY54 BLUEPRINT] Presentation layer mounted; financial engines unchanged."
    );
  } catch (error) {
    console.error(
      "[PAY54 BLUEPRINT] Integration failed", error
    );
    document.body.classList.remove("p54-blueprint");
  }
})();
