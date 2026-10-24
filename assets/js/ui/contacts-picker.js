"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS PICKER
   File: assets/js/ui/contacts-picker.js
   Version: v1.0.0

   Purpose
   -------
   Reusable PAY54 contact-selection UI.

   Responsibilities
   ----------------
   • Render PAY54 Contacts through the Contacts Service boundary
   • Search contacts by supported service identities
   • Display favourites and all contacts
   • Select a contact without coupling the picker to payment execution
   • Allow favourite state changes through the Contacts Service
   • Preserve mobile-first and accessible interaction
   • Integrate with the PAY54 Modal Engine
   • Never access Contacts Storage directly
   • Never access localStorage
   • Never duplicate Contacts domain rules

   Dependencies
   ------------
   window.PAY54_CONTACTS_SERVICE
   window.PAY54_MODALS

   Public API
   ----------
   window.PAY54_CONTACTS_PICKER

   Architecture
   ------------
   Contacts Storage
        ↓
   Contacts Domain Engine
        ↓
   Contacts Service
        ↓
   Contacts Picker
        ↓
   Recipient / Send / Request / Transfer flows

========================================================================== */

(() => {

    "use strict";

    const GLOBAL = window;

    const VERSION = "1.0.0";

    const MODULE_ID = "contacts.picker";

    const STYLE_ID =
        "pay54-contacts-picker-styles";

    const SERVICE =
        GLOBAL.PAY54_CONTACTS_SERVICE;

    const MODALS =
        GLOBAL.PAY54_MODALS;

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    if (
        !SERVICE ||
        typeof SERVICE !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_PICKER] Contacts Service unavailable."
        );

    }

    if (
        SERVICE.version !== "1.0.0"
    ) {

        throw new Error(
            `[PAY54_CONTACTS_PICKER] Unsupported Contacts Service version: ${
                SERVICE.version || "unknown"
            }.`
        );

    }

    const REQUIRED_SERVICE_METHODS =
        Object.freeze([
            "getContacts",
            "getFavourites",
            "searchContacts",
            "setFavourite",
            "getHealth"
        ]);

    for (
        const method
        of REQUIRED_SERVICE_METHODS
    ) {

        if (
            typeof SERVICE[method] !==
            "function"
        ) {

            throw new Error(
                `[PAY54_CONTACTS_PICKER] Contacts Service API unavailable: ${method}.`
            );

        }

    }

    if (
        !MODALS ||
        typeof MODALS.openModal !==
        "function"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_PICKER] PAY54 Modal Engine unavailable."
        );

    }

    /* ======================================================================
       INTERNAL STATE
    ====================================================================== */

    const STATE = {

        ready:
            false,

        opened:
            false,

        openedAt:
            null,

        selections:
            0,

        searches:
            0,

        favouriteChanges:
            0,

        lastError:
            null

    };

    /* ======================================================================
       UTILITIES
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();

    }

    function cleanString(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .trim();

    }

    function escapeHTML(
        value
    ) {

        return cleanString(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }

    function clone(
        value
    ) {

        if (
            value === undefined
        ) {

            return undefined;

        }

        if (
            typeof structuredClone ===
            "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch {

                /* JSON fallback */

            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function initials(
        contact
    ) {

        const name =
            getDisplayName(contact);

        const words =
            name
                .split(/\s+/u)
                .filter(Boolean)
                .slice(0, 2);

        if (
            words.length === 0
        ) {

            return "P";

        }

        return words
            .map(
                word =>
                    word.charAt(0)
                        .toUpperCase()
            )
            .join("");

    }

    function getDisplayName(
        contact
    ) {

        if (
            !contact ||
            typeof contact !== "object"
        ) {

            return "PAY54 Contact";

        }

        const directCandidates = [
            contact.displayName,
            contact.name,
            contact.fullName
        ];

        for (
            const candidate
            of directCandidates
        ) {

            const value =
                cleanString(candidate);

            if (
                value
            ) {

                return value;

            }

        }

        const combinedName =
            [
                cleanString(
                    contact.firstName
                ),
                cleanString(
                    contact.lastName
                )
            ]
                .filter(Boolean)
                .join(" ");

        if (
            combinedName
        ) {

            return combinedName;

        }

        return (
            cleanString(
                contact.pay54Id
            ) ||
            cleanString(
                contact.phone
            ) ||
            cleanString(
                contact.email
            ) ||
            "PAY54 Contact"
        );

    }

    function getSecondaryIdentity(
        contact
    ) {

        if (
            !contact ||
            typeof contact !== "object"
        ) {

            return "";

        }

        return (
            cleanString(
                contact.pay54Id
            ) ||
            cleanString(
                contact.phone
            ) ||
            cleanString(
                contact.email
            )
        );

    }

    function getContactId(
        contact
    ) {

        return cleanString(
            contact?.id
        );

    }

    function isFavourite(
        contact
    ) {

        return (
            contact?.favourite === true ||
            contact?.favorite === true ||
            contact?.isFavourite === true ||
            contact?.isFavorite === true
        );

    }

    function createErrorState(
        error
    ) {

        STATE.lastError = {

            message:
                error instanceof Error
                    ? error.message
                    : String(error),

            occurredAt:
                nowISO()

        };

    }

    function toast(
        message
    ) {

        if (
            typeof GLOBAL.PAY54_TOAST
                ?.showToast ===
            "function"
        ) {

            GLOBAL.PAY54_TOAST
                .showToast(message);

            return;

        }

        console.info(
            `[PAY54_CONTACTS_PICKER] ${message}`
        );

    }

    /* ======================================================================
       CONTACT RENDERING
    ====================================================================== */

    function renderContact(
        contact
    ) {

        const id =
            getContactId(contact);

        if (
            !id
        ) {

            return "";

        }

        const name =
            getDisplayName(contact);

        const identity =
            getSecondaryIdentity(contact);

        const favourite =
            isFavourite(contact);

        return `
            <div
                class="p54-contacts-picker__item"
                data-contact-row="${escapeHTML(id)}"
            >
                <button
                    type="button"
                    class="p54-contacts-picker__select"
                    data-contact-select="${escapeHTML(id)}"
                    aria-label="Select ${escapeHTML(name)}"
                >
                    <span
                        class="p54-contacts-picker__avatar"
                        aria-hidden="true"
                    >
                        ${escapeHTML(initials(contact))}
                    </span>

                    <span
                        class="p54-contacts-picker__details"
                    >
                        <span
                            class="p54-contacts-picker__name"
                        >
                            ${escapeHTML(name)}
                        </span>

                        ${
                            identity
                                ? `
                                    <span
                                        class="p54-contacts-picker__identity"
                                    >
                                        ${escapeHTML(identity)}
                                    </span>
                                `
                                : ""
                        }
                    </span>
                </button>

                <button
                    type="button"
                    class="p54-contacts-picker__favourite"
                    data-contact-favourite="${escapeHTML(id)}"
                    aria-label="${
                        favourite
                            ? "Remove from favourites"
                            : "Add to favourites"
                    }"
                    aria-pressed="${
                        favourite
                            ? "true"
                            : "false"
                    }"
                    title="${
                        favourite
                            ? "Remove from favourites"
                            : "Add to favourites"
                    }"
                >
                    ${
                        favourite
                            ? "★"
                            : "☆"
                    }
                </button>
            </div>
        `;

    }

    function renderEmpty(
        title,
        copy
    ) {

        return `
            <div
                class="p54-contacts-picker__empty"
                role="status"
            >
                <div
                    class="p54-contacts-picker__empty-icon"
                    aria-hidden="true"
                >
                    👤
                </div>

                <div
                    class="p54-contacts-picker__empty-title"
                >
                    ${escapeHTML(title)}
                </div>

                <div
                    class="p54-contacts-picker__empty-copy"
                >
                    ${escapeHTML(copy)}
                </div>
            </div>
        `;

    }

    function renderSection(
        title,
        contacts
    ) {

        const safeContacts =
            Array.isArray(contacts)
                ? contacts
                : [];

        return `
            <section
                class="p54-contacts-picker__section"
            >
                <div
                    class="p54-contacts-picker__heading"
                >
                    <h3
                        class="p54-contacts-picker__heading-title"
                    >
                        ${escapeHTML(title)}
                    </h3>

                    <span
                        class="p54-contacts-picker__count"
                    >
                        ${safeContacts.length}
                    </span>
                </div>

                <div
                    class="p54-contacts-picker__list"
                >
                    ${
                        safeContacts.length
                            ? safeContacts
                                .map(renderContact)
                                .join("")
                            : renderEmpty(
                                `No ${title.toLowerCase()}`,
                                "Contacts will appear here when available."
                            )
                    }
                </div>
            </section>
        `;

    }

    /* ======================================================================
       DATA
    ====================================================================== */

    function loadDefaultData() {

        const favourites =
            SERVICE.getFavourites();

        const contacts =
            SERVICE.getContacts();

        return {

            favourites:
                Array.isArray(favourites)
                    ? favourites
                    : [],

            contacts:
                Array.isArray(contacts)
                    ? contacts
                    : []

        };

    }

    function searchData(
        query
    ) {

        const value =
            cleanString(query);

        if (
            !value
        ) {

            return null;

        }

        STATE.searches++;

        const contacts =
            SERVICE.searchContacts(
                value
            );

        return Array.isArray(contacts)
            ? contacts
            : [];

    }

    /* ======================================================================
       OPEN PICKER
    ====================================================================== */

    function open(
        options = {}
    ) {

        ensureStyles();

        const serviceHealth =
            SERVICE.getHealth();

        if (
            serviceHealth?.healthy !==
            true
        ) {

            throw new Error(
                "[PAY54_CONTACTS_PICKER] Contacts Service is not healthy."
            );

        }

        const title =
            cleanString(
                options.title
            ) ||
            "Choose recipient";

        const subtitle =
            cleanString(
                options.subtitle
            ) ||
            "Search your PAY54 contacts and choose who you want to continue with.";

        const onSelect =
            typeof options.onSelect ===
            "function"
                ? options.onSelect
                : null;

        const closeOnSelect =
            options.closeOnSelect !==
            false;

        STATE.opened =
            true;

        STATE.openedAt =
            nowISO();

        STATE.lastError =
            null;

        MODALS.openModal({

            title,

            bodyHTML: `
                <div
                    class="p54-contacts-picker"
                    data-contacts-picker
                >
                    <p
                        class="p54-contacts-picker__intro"
                    >
                        ${escapeHTML(subtitle)}
                    </p>

                    <div
                        class="p54-contacts-picker__search-wrap"
                    >
                        <input
                            type="search"
                            class="p54-contacts-picker__search"
                            data-contacts-search
                            placeholder="Search name, PAY54 ID, phone or email"
                            aria-label="Search contacts"
                            autocomplete="off"
                            spellcheck="false"
                        >

                        <span
                            class="p54-contacts-picker__search-icon"
                            aria-hidden="true"
                        >
                            🔎
                        </span>
                    </div>

                    <div
                        data-contacts-results
                        aria-live="polite"
                    ></div>
                </div>
            `,

            onMount: ({
                modal,
                close
            }) => {

                const root =
                    modal.querySelector(
                        "[data-contacts-picker]"
                    );

                const searchInput =
                    modal.querySelector(
                        "[data-contacts-search]"
                    );

                const results =
                    modal.querySelector(
                        "[data-contacts-results]"
                    );

                if (
                    !root ||
                    !searchInput ||
                    !results
                ) {

                    createErrorState(
                        new Error(
                            "Contacts Picker DOM initialisation failed."
                        )
                    );

                    return;

                }

                let currentContacts =
                    new Map();

                function indexContacts(
                    contacts
                ) {

                    currentContacts =
                        new Map();

                    for (
                        const contact
                        of contacts
                    ) {

                        const id =
                            getContactId(
                                contact
                            );

                        if (
                            id
                        ) {

                            currentContacts.set(
                                id,
                                contact
                            );

                        }

                    }

                }

                function bindRows() {

                    results
                        .querySelectorAll(
                            "[data-contact-select]"
                        )
                        .forEach(
                            button => {

                                button.addEventListener(
                                    "click",
                                    () => {

                                        const id =
                                            cleanString(
                                                button.dataset
                                                    .contactSelect
                                            );

                                        const contact =
                                            currentContacts.get(
                                                id
                                            ) ||
                                            SERVICE.getContactById?.(
                                                id
                                            );

                                        if (
                                            !contact
                                        ) {

                                            toast(
                                                "Contact is no longer available."
                                            );

                                            renderDefault();

                                            return;

                                        }

                                        STATE.selections++;

                                        if (
                                            onSelect
                                        ) {

                                            try {

                                                onSelect(
                                                    clone(contact)
                                                );

                                            } catch (
                                                error
                                            ) {

                                                createErrorState(
                                                    error
                                                );

                                                console.error(
                                                    "[PAY54_CONTACTS_PICKER] Selection callback failed.",
                                                    error
                                                );

                                                return;

                                            }

                                        }

                                        if (
                                            closeOnSelect
                                        ) {

                                            STATE.opened =
                                                false;

                                            close();

                                        }

                                    }
                                );

                            }
                        );

                    results
                        .querySelectorAll(
                            "[data-contact-favourite]"
                        )
                        .forEach(
                            button => {

                                button.addEventListener(
                                    "click",
                                    () => {

                                        const id =
                                            cleanString(
                                                button.dataset
                                                    .contactFavourite
                                            );

                                        const contact =
                                            currentContacts.get(
                                                id
                                            ) ||
                                            SERVICE.getContactById?.(
                                                id
                                            );

                                        if (
                                            !contact
                                        ) {

                                            toast(
                                                "Contact is no longer available."
                                            );

                                            renderDefault();

                                            return;

                                        }

                                        try {

                                            SERVICE.setFavourite(
                                                id,
                                                !isFavourite(
                                                    contact
                                                )
                                            );

                                            STATE.favouriteChanges++;

                                            const query =
                                                cleanString(
                                                    searchInput.value
                                                );

                                            if (
                                                query
                                            ) {

                                                renderSearch(
                                                    query
                                                );

                                            } else {

                                                renderDefault();

                                            }

                                        } catch (
                                            error
                                        ) {

                                            createErrorState(
                                                error
                                            );

                                            console.error(
                                                "[PAY54_CONTACTS_PICKER] Favourite update failed.",
                                                error
                                            );

                                            toast(
                                                "Unable to update favourite."
                                            );

                                        }

                                    }
                                );

                            }
                        );

                }

                function renderDefault() {

                    try {

                        const data =
                            loadDefaultData();

                        const merged =
                            [
                                ...data.favourites,
                                ...data.contacts
                            ];

                        indexContacts(
                            merged
                        );

                        if (
                            data.contacts.length === 0
                        ) {

                            results.innerHTML =
                                renderEmpty(
                                    "No contacts yet",
                                    "Your PAY54 contacts will appear here when they are added."
                                );

                            return;

                        }

                        results.innerHTML =
                            [
                                data.favourites.length
                                    ? renderSection(
                                        "Favourites",
                                        data.favourites
                                    )
                                    : "",

                                renderSection(
                                    "All contacts",
                                    data.contacts
                                )
                            ]
                                .join("");

                        bindRows();

                    } catch (
                        error
                    ) {

                        createErrorState(
                            error
                        );

                        results.innerHTML = `
                            <div
                                class="p54-contacts-picker__error"
                                role="alert"
                            >
                                Contacts could not be loaded.
                                Please try again.
                            </div>
                        `;

                        console.error(
                            "[PAY54_CONTACTS_PICKER] Contacts load failed.",
                            error
                        );

                    }

                }

                function renderSearch(
                    query
                ) {

                    try {

                        const matches =
                            searchData(
                                query
                            );

                        if (
                            matches === null
                        ) {

                            renderDefault();

                            return;

                        }

                        indexContacts(
                            matches
                        );

                        if (
                            matches.length === 0
                        ) {

                            results.innerHTML =
                                renderEmpty(
                                    "No matching contacts",
                                    "Try another name, PAY54 ID, phone number or email."
                                );

                            return;

                        }

                        results.innerHTML =
                            renderSection(
                                "Search results",
                                matches
                            );

                        bindRows();

                    } catch (
                        error
                    ) {

                        createErrorState(
                            error
                        );

                        results.innerHTML = `
                            <div
                                class="p54-contacts-picker__error"
                                role="alert"
                            >
                                Search could not be completed.
                                Please try again.
                            </div>
                        `;

                        console.error(
                            "[PAY54_CONTACTS_PICKER] Search failed.",
                            error
                        );

                    }

                }

                let searchTimer =
                    null;

                searchInput.addEventListener(
                    "input",
                    () => {

                        if (
                            searchTimer
                        ) {

                            clearTimeout(
                                searchTimer
                            );

                        }

                        searchTimer =
                            setTimeout(
                                () => {

                                    const query =
                                        cleanString(
                                            searchInput.value
                                        );

                                    if (
                                        query
                                    ) {

                                        renderSearch(
                                            query
                                        );

                                    } else {

                                        renderDefault();

                                    }

                                },
                                120
                            );

                    }
                );

                renderDefault();

                requestAnimationFrame(
                    () => {

                        searchInput.focus({
                            preventScroll:
                                true
                        });

                    }
                );

            }

        });

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        let serviceHealth =
            null;

        try {

            serviceHealth =
                SERVICE.getHealth();

        } catch (
            error
        ) {

            serviceHealth = {

                healthy:
                    false,

                status:
                    "unavailable",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error)

            };

        }

        return {

            healthy:
                Boolean(
                    STATE.ready &&
                    serviceHealth?.healthy ===
                    true
                ),

            status:
                STATE.ready &&
                serviceHealth?.healthy ===
                    true
                    ? "ready"
                    : "degraded",

            module:
                MODULE_ID,

            version:
                VERSION,

            service:
                clone(
                    serviceHealth
                ),

            opened:
                STATE.opened,

            openedAt:
                STATE.openedAt,

            selections:
                STATE.selections,

            searches:
                STATE.searches,

            favouriteChanges:
                STATE.favouriteChanges,

            lastError:
                clone(
                    STATE.lastError
                )

        };

    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            version:
                VERSION,

            module:
                MODULE_ID,

            moduleId:
                MODULE_ID,

            open,

            openPicker:
                open,

            health:
                getHealth,

            getHealth

        });

    /* ======================================================================
       EXPORT
    ====================================================================== */

    GLOBAL.PAY54_CONTACTS_PICKER =
        API;

    /*
     * Additive UI namespace exposure.
     *
     * We intentionally do not overwrite any existing PAY54_UI function.
     */

    GLOBAL.PAY54_UI =
        GLOBAL.PAY54_UI ||
        {};

    if (
        typeof GLOBAL.PAY54_UI
            .openContactsPicker !==
        "function"
    ) {

        GLOBAL.PAY54_UI
            .openContactsPicker =
            open;

    }

    STATE.ready =
        true;

    console.info(
        `✅ PAY54 Contacts Picker ${VERSION} loaded.`
    );

})();
