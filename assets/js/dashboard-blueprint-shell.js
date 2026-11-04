
/* PAY54 Approved Dashboard Blueprint Shell v1.2.0.
 * Presentation only. Reuses existing PAY54 nodes and delegated action handlers.
 * Does not change ledger, cards, transactions, capability policy or execution gates.
 */
(() => {
  "use strict";

  const find = (selector, root = document) => root?.querySelector(selector) ?? null;
  const make = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const scroll = (target) => {
    const node = target === "top" ? find("header.dash-header") : document.getElementById(target);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const notifyUnavailable = (label) => {
    const message = `${label} is not available in this development preview.`;
    if (typeof window.PAY54_TOAST?.showToast === "function") {
      window.PAY54_TOAST.showToast(message);
    } else {
      console.info(`[PAY54 BLUEPRINT] ${message}`);
    }
  };

  const source = find("main.dash-grid");
  const header = find("header.dash-header");
  if (!source || !header || document.body.classList.contains("p54-blueprint")) return;

  const left = find(".left", source);
  const right = find(".right", source);
  const balance = find("#balanceCard", source);
  const moves = find(".money-moves-grid", left)?.closest(".card");
  const services = find(".services-grid", left)?.closest(".card");
  const recent = find("#recentTransactions", source)?.closest(".card");
  const recipients = find("#recipientDashboardWidget", source)?.closest(".card");
  const shortcuts = find(".shortcut-grid", right)?.closest(".card");
  const utilities = find(".utility-grid", right)?.closest(".card");
  const alerts = find("#alertsFeed", right)?.closest(".card");
  const news = find("#newsFeed", right)?.closest(".card");
  const walletList = find("#walletBalances", balance);

  if ([left, right, balance, moves, services, recent, shortcuts, utilities, alerts, news, walletList].some(item => !item)) {
    console.warn("[PAY54 BLUEPRINT] Required dashboard nodes unavailable; existing layout retained.");
    return;
  }

  // Preserve canonical action buttons before reordering the DOM.
  const serviceGrid = find(".services-grid", services);
  const originalServices = [...serviceGrid.children];
  const serviceByAction = new Map(originalServices.filter(node => node.dataset?.action)
    .map(node => [node.dataset.action, node]));
  const shortcutGrid = find(".shortcut-grid", shortcuts);
  const originalShortcuts = [...shortcutGrid.children];
  const moveGrid = find(".money-moves-grid", moves);

  const serviceDefs = [
    ["🌐", "Global Transfer", "Send money across borders", "fx"],
    ["🎁", "Gift Cards", "Buy, sell or convert gift cards", null],
    ["⚡", "PAY54 Pay", "Airtime, data, bills and more", "bills"],
    ["💳", "Cards", "Virtual, linked cards and controls", "cards"],
    ["💚", "Vaults", "Save, set goals and money pots", "savings"],
    ["▱", "Money Hub", "Financial products and tools", null],
    ["✈", "Travel & Connect", "eSIM, travel money and more", null],
    ["🛍", "Marketplace", "Shop, food, tickets and offers", "shop"],
    ["▥", "Invest", "Stocks, crypto and investment", "trading"],
    ["♟", "Agent+", "Cash services and local support", "agent"]
  ];

  try {
    const shell = make("div", "p54b-shell");
    const sidebar = make("aside", "p54b-sidebar");
    sidebar.setAttribute("aria-label", "PAY54 navigation");
    const logo = make("div", "p54b-wordmark");
    logo.append(make("span", "", "PAY"), make("strong", "", "54"));
    sidebar.append(logo);
    const sideNav = make("nav", "p54b-sidebar-nav");
    const navigationButtons = new Map();
    sideNav.setAttribute("aria-label", "Desktop dashboard navigation");

    for (const [symbol, label, target] of [
      ["⌂", "Dashboard", "top"], ["⇄", "Money Moves", "p54b-moves"],
      ["▦", "Services", "p54b-services"], ["▤", "Transactions", "p54b-recent"],
      ["♢", "Rewards", null], ["✉", "Messages", null], ["?", "Help & Support", null]
    ]) {
      const button = make("button", "p54b-side-link");
      button.type = "button";
      button.append(make("span", "p54b-nav-symbol", symbol), make("span", "", label));
      if (target === "top") button.classList.add("is-current");
      button.dataset.section = label;
      navigationButtons.set(label, button);
      button.addEventListener("click", () => {
        selectSection(label);
        if (target) scroll(target);
        else notifyUnavailable(label);
      });
      sideNav.append(button);
    }

    sidebar.append(sideNav);

    const selectSection = (section) => {
      for (const [name, button] of navigationButtons) {
        const active = name === section;
        button.classList.toggle("is-current", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }

      document.documentElement.dataset.pay54ActiveSection = section;

      for (const button of document.querySelectorAll(".p54b-bottom-item")) {
        const active = button.dataset.section === section;
        button.classList.toggle("is-current", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
    };

    const footer = make("div", "p54b-side-footer");
    footer.append(
      make("div", "p54b-side-muted", "Switch Profile · Personal"),
      make("div", "p54b-side-muted", "Settings")
    );
    sidebar.append(footer);

    const content = make("div", "p54b-content");
    shell.append(sidebar, content);
    header.before(shell);
    content.append(header);
    find(".brand", header)?.classList.add("p54b-hidden-brand");

    const greeting = make("div", "p54b-greeting");
    greeting.append(
      make("h1", "", "Good morning 👋"),
      make("p", "", "Welcome to your PAY54 Dashboard")
    );
    header.prepend(greeting);

    const top = make("div", "p54b-top");
    const wallets = make("section", "p54b-wallets-card card");
    const walletHeading = make("div", "p54b-wallets-heading");
    walletHeading.append(make("h2", "", "My Wallets"));

    const walletManage = make("button", "p54b-wallets-manage", "Manage Wallets");
    walletManage.type = "button";
    walletManage.setAttribute("aria-expanded", "false");
    walletHeading.append(walletManage);
    wallets.append(walletHeading, walletList);

    const walletSummary = make("p", "p54b-wallet-summary");
    wallets.insertBefore(walletSummary, walletList);

    const syncWalletCount = () => {
      const count = walletList.querySelectorAll(".wallet-balance-row").length;
      wallets.dataset.walletCount = String(count);
      wallets.classList.toggle("p54b-single-wallet", count === 1);
      walletSummary.textContent = count === 0 ? "No wallets displayed" :
        count === 1 ? "Your primary wallet" : `${count} displayed wallets`;
      walletManage.hidden = count <= 1;
    };

    const walletObserver = new MutationObserver(syncWalletCount);
    walletObserver.observe(walletList, { childList: true, subtree: true });
    syncWalletCount();

    const mobileManage = make("button", "p54b-mobile-wallet-manage", "My Wallets");
    mobileManage.type = "button";
    mobileManage.setAttribute("aria-controls", "p54b-wallet-panel");
    mobileManage.setAttribute("aria-expanded", "false");
    wallets.id = "p54b-wallet-panel";

    const toggleWallets = () => {
      const open = wallets.classList.toggle("p54b-expanded");
      mobileManage.setAttribute("aria-expanded", String(open));
      walletManage.setAttribute("aria-expanded", String(open));
      mobileManage.textContent = open ? "Hide Wallets" : "My Wallets";
      walletManage.textContent = open ? "Show Less" : "Manage Wallets";
    };

    mobileManage.addEventListener("click", toggleWallets);
    walletManage.addEventListener("click", toggleWallets);
    balance.append(mobileManage);

    find(".balance-delta", balance)?.setAttribute("hidden", "");
    for (const selector of [".balance-meta", ".identity", ".trust-chip", "#fxTicker"]) {
      find(selector, balance)?.classList.add("p54b-conceal");
    }
    balance.classList.add("p54b-balance");
    const label = find(".label", balance);
    if (label) label.textContent = "ACTIVE WALLET BALANCE";

    const mobileCurrency = make("div", "p54b-mobile-currencies");
    const currencyPills = find(".currency-pills", header);
    if (currencyPills) mobileCurrency.append(currencyPills);

    shortcutGrid.replaceChildren();
    for (const [symbol, title, action] of [
      ["🌐", "Global Transfer", "fx"], ["🎁", "Gift Cards", null],
      ["💳", "Cards", "cards"], ["⭐", "Rewards", null]
    ]) {
      const button = make("button", "p54b-shortcut");
      button.type = "button";
      button.append(
        make("span", "p54b-shortcut-icon", symbol),
        make("span", "p54b-shortcut-label", title)
      );
      if (action) button.dataset.action = action;
      else {
        button.disabled = true;
        button.title = `${title} is not yet available`;
      }
      shortcutGrid.append(button);
    }

    shortcuts.classList.add("p54b-shortcuts");
    const shortcutsTitle = find("h3", shortcuts);
    if (shortcutsTitle) shortcutsTitle.textContent = "Quick Shortcuts";
    const shortcutsSub = find(".sub", shortcuts);
    if (shortcutsSub) shortcutsSub.textContent = "Smart, high-demand actions for you";

    top.append(balance, wallets, shortcuts);

    const columns = make("div", "p54b-columns");
    const main = make("section", "p54b-main");
    const support = make("section", "p54b-support");
    columns.append(main, support);

    moves.id = "p54b-moves";
    services.id = "p54b-services";
    recent.id = "p54b-recent";
    const recentTitle = find("h3", recent);
    if (recentTitle) recentTitle.textContent = "Recent Activity";

    const request = serviceByAction.get("request");
    if (request) moveGrid.append(request);

    const moreMoney = make("button", "p54b-more-money", "••• More");
    moreMoney.type = "button";
    moreMoney.setAttribute("aria-expanded", "false");
    moreMoney.addEventListener("click", () => {
      const expanded = moveGrid.classList.toggle("p54b-show-all");
      moreMoney.setAttribute("aria-expanded", String(expanded));
      moreMoney.textContent = expanded ? "Less" : "••• More";
    });
    moveGrid.append(moreMoney);

    const overflow = make("div", "p54b-overflow");
    overflow.id = "p54b-secondary-services";
    overflow.hidden = true;

    for (const oldShortcut of originalShortcuts) overflow.append(oldShortcut);
    for (const node of originalServices) {
      if (node !== request) overflow.append(node);
    }

    serviceGrid.replaceChildren();

    for (const [symbol, title, subtitle, action] of serviceDefs) {
      const button = action && serviceByAction.has(action)
        ? serviceByAction.get(action) : make("button", "tile-btn");

      button.type = "button";
      button.classList.add("p54b-service-tile");
      button.replaceChildren(
        make("span", "t-icon", symbol),
        make("span", "t-title", title),
        make("span", "t-sub", subtitle)
      );
      if (!action) {
        button.disabled = true;
        button.title = `${title} is planned — unavailable in development preview`;
      }
      serviceGrid.append(button);
    }

    const viewAll = make("button", "p54b-see-all", "See All");
    viewAll.type = "button";
    viewAll.setAttribute("aria-controls", overflow.id);
    viewAll.setAttribute("aria-expanded", "false");
    viewAll.addEventListener("click", () => {
      overflow.hidden = !overflow.hidden;
      viewAll.setAttribute("aria-expanded", String(!overflow.hidden));
      viewAll.textContent = overflow.hidden ? "See All" : "Show Less";
    });
    services.append(viewAll, overflow);

    const servicesSub = find(".sub", services);
    if (servicesSub) servicesSub.textContent = "All your PAY54 services in one place";

    const promo = make("section", "p54b-promo");
    promo.setAttribute("aria-label", "Gift Cards development preview");
    const promoCopy = make("div", "p54b-promo-copy");
    promoCopy.append(
      make("h2", "", "Gift Cards Now on PAY54"),
      make("p", "", "Buy, sell and convert gift cards — planned service")
    );

    const cta = make("button", "p54b-promo-cta", "Explore Gift Cards →");
    cta.type = "button";
    cta.disabled = true;
    cta.title = "Gift Cards is not yet available";
    promoCopy.append(cta);

    const art = make("div", "p54b-gift-art");
    art.setAttribute("aria-hidden", "true");
    for (const [symbol, className] of [
      ["a", "amazon"], ["●", "apple"], ["▶", "play"]
    ]) {
      art.append(make("span", `p54b-gift ${className}`, symbol));
    }
    promo.append(promoCopy, art);

    const security = make("section", "p54b-security card");
    security.append(
      make("h3", "", "🛡 Security & Control"),
      make("p", "", "Development preview · No regulated status implied")
    );

    const newsBlock = make("div", "p54b-news");
    newsBlock.append(news);

// Approved desktop blueprint:
// Main column: Money Moves, Services, Gift Cards, News.
// Supporting column: Recent Activity, Alerts, Utilities, Security.

// PAY54 Phase 2E — approved independent dashboard columns.
// This keeps the Gift Cards banner directly below Services,
// regardless of the height of Recent Activity or Alerts.
// Existing financial action handlers and data nodes are retained.
main.append(moves, services, promo, newsBlock);
support.append(recent, alerts, utilities, security);


    if (recipients) {
      const details = make("details", "p54b-legacy");
      details.append(make("summary", "", "Recipients"), recipients);
      main.append(details);
    }

    const dashboard = make("main", "p54b-dashboard");
    source.replaceWith(dashboard);
   
dashboard.append(mobileCurrency, top, columns);
    content.append(dashboard);

    const mobileNav = make("nav", "p54b-bottom-nav");
    mobileNav.setAttribute("aria-label", "Mobile navigation");

    for (const [symbol, title, target] of [
      ["⌂", "Home", "top"],
      ["⇄", "Money Moves", "p54b-moves"],
      ["P54", "PAY54", "top"],
      ["▦", "Services", "p54b-services"],
      ["◷", "Transactions", "p54b-recent"]
    ]) {
      const button = make("button", "p54b-bottom-item");
      button.type = "button";
      button.append(
        make("span", "p54b-bottom-icon", symbol),
        make("span", "", title)
      );

      button.dataset.section = title === "Home" || title === "PAY54"
        ? "Dashboard" : title;

      if (title === "Home") button.classList.add("is-current");
      button.addEventListener("click", () => {
        selectSection(button.dataset.section);
        scroll(target);
      });
      mobileNav.append(button);
    }

    content.append(mobileNav);

    // Navigation-only observers. Never block, execute, or rewrite actions.
    // Pointer/keyboard events allow navigation feedback even if the
    // existing public-preview gate subsequently denies the click.
    const moneyActions = new Set([
      "send", "receive", "scan_pay", "add_money", "withdraw",
      "bank_transfer", "request"
    ]);
    const serviceActions = new Set([
      "fx", "bills", "cards", "savings", "shop", "trading", "agent",
      "merchantqr", "bet", "checkout", "risk", "atm", "pos"
    ]);

    const onActionSelected = (event) => {
      const actionElement = event.target instanceof Element
        ? event.target.closest("[data-action]") : null;
      const action = actionElement?.dataset.action;

      if (!action || !dashboard.contains(actionElement)) return;

      if (moneyActions.has(action)) selectSection("Money Moves");
      else if (serviceActions.has(action)) selectSection("Services");
    };

    document.addEventListener("pointerdown", onActionSelected, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") onActionSelected(event);
    }, true);
    document.addEventListener("click", onActionSelected, true);

    selectSection("Dashboard");

    find("#scanPayFab")?.classList.add("p54b-original-fab");

    document.body.classList.add("p54-blueprint");
    document.documentElement.dataset.pay54Blueprint = "1.2.1";


    console.info(
      "[PAY54 BLUEPRINT] v1.2.0 mounted; existing financial engines and preview gate preserved."
    );
  } catch (error) {
    console.error(
      "[PAY54 BLUEPRINT] Presentation integration error; financial state untouched.",
      error
    );
    document.body.classList.remove("p54-blueprint");
  }
})();
