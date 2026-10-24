"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS MANAGEMENT UI
   File: assets/js/ui/contacts.js
   Version: v1.0.0

   Purpose
   -------
   Enterprise contact-management experience for PAY54.

   Responsibilities
   ----------------
   • List PAY54 contacts
   • Search contacts
   • Display favourites
   • View contact details
   • Create contacts
   • Edit contacts
   • Favourite / unfavourite contacts
   • Archive contacts
   • Block / unblock contacts
   • Delete contacts with confirmation
   • Preserve the Contacts Service as the domain boundary
   • Provide mobile-first accessible interaction
   • Provide runtime health diagnostics
   • Integrate additively with PAY54_UI

   Architecture
   ------------
   Contacts Storage
        ↓
   Contacts Domain Engine
        ↓
   Contacts Service
        ↓
   Contacts Management UI

   Rules
   -----
   • Never access localStorage
   • Never access PAY54_CONTACTS_STORAGE
   • Never duplicate Contacts domain rules
   • Never execute payment logic
   • Never mutate service-returned contacts directly

   Dependencies
   ------------
   window.PAY54_CONTACTS_SERVICE
   window.PAY54_MODALS

   Optional Dependencies
   ---------------------
   window.PAY54_EVENTS
   window.PAY54_TOAST
   window.PAY54_CONTACTS_PICKER

   Public API
   ----------
   window.PAY54_CONTACTS_UI
   window.PAY54_UI.openContacts

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    const MODULE_ID =
        "contacts.ui";

    const STYLE_ID =
        "pay54-contacts-management-styles";

    const SERVICE =
        GLOBAL.PAY54_CONTACTS_SERVICE;

    const MODALS =
        GLOBAL.PAY54_MODALS;

    const EVENTS =
        GLOBAL.PAY54_EVENTS || null;

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    if (
        !SERVICE ||
        typeof SERVICE !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_UI] Contacts Service unavailable."
        );

    }

    if (
        SERVICE.version !== "1.0.0"
    ) {

        throw new Error(
            `[PAY54_CONTACTS_UI] Unsupported Contacts Service version: ${
                SERVICE.version || "unknown"
            }.`
        );

    }

    if (
        !MODALS ||
        typeof MODALS.openModal !== "function"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_UI] PAY54 Modal Engine unavailable."
        );

    }

    const REQUIRED_SERVICE_METHODS =
        Object.freeze([
            "getContacts",
            "getContactById",
            "searchContacts",
            "createContact",
            "updateContact",
            "deleteContact",
            "setFavourite",
            "setStatus",
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
                `[PAY54_CONTACTS_UI] Contacts Service API unavailable: ${method}.`
            );

        }

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

        views:
            0,

        searches:
            0,

        creates:
            0,

        updates:
            0,

        deletes:
            0,

        favouriteChanges:
            0,

        statusChanges:
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
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

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

    function recordError(
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
            `[PAY54_CONTACTS_UI] ${message}`
        );

    }

    function publish(
        eventName,
        payload = {}
    ) {

        try {

            if (
                EVENTS &&
                typeof EVENTS.publish ===
                "function"
            ) {

                EVENTS.publish(
                    eventName,
                    payload,
                    {
                        source:
                            MODULE_ID
                    }
                );

            }

        } catch (
            error
        ) {

            console.warn(
                "[PAY54_CONTACTS_UI] Event publication failed.",
                error
            );

        }

    }

    function getContactId(
        contact
    ) {

        return cleanString(
            contact?.id
        );

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

        const direct =
            [
                contact.displayName,
                contact.name,
                contact.fullName
            ];

        for (
            const candidate
            of direct
        ) {

            const value =
                cleanString(candidate);

            if (
                value
            ) {

                return value;

            }

        }

        const combined =
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

        return (
            combined ||
            cleanString(contact.pay54Id) ||
            cleanString(contact.phone) ||
            cleanString(contact.email) ||
            "PAY54 Contact"
        );

    }

    function getIdentity(
        contact
    ) {

        return (
            cleanString(contact?.pay54Id) ||
            cleanString(contact?.phone) ||
            cleanString(contact?.email)
        );

    }

    function initials(
        contact
    ) {

        const words =
            getDisplayName(contact)
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

    function getStatus(
        contact
    ) {

        return (
            cleanString(
                contact?.status
            ) ||
            "active"
        ).toLowerCase();

    }

    function isBlocked(
        contact
    ) {

        return (
            getStatus(contact) ===
            "blocked"
        );

    }

    function isArchived(
        contact
    ) {

        return (
            getStatus(contact) ===
            "archived"
        );

    }

    function safeServiceCall(
        method,
        ...args
    ) {

        if (
            typeof SERVICE[method] !==
            "function"
        ) {

            throw new Error(
                `[PAY54_CONTACTS_UI] Contacts Service method unavailable: ${method}.`
            );

        }

        return SERVICE[method](
            ...args
        );

    }

    
    /* ======================================================================
       RENDER HELPERS
    ====================================================================== */

    function renderEmpty(
        title,
        copy
    ) {

        return `
            <div
                class="p54-contacts-empty"
                role="status"
            >
                <div
                    class="p54-contacts-empty-icon"
                    aria-hidden="true"
                >
                    👥
                </div>

                <div
                    class="p54-contacts-empty-title"
                >
                    ${escapeHTML(title)}
                </div>

                <div
                    class="p54-contacts-empty-copy"
                >
                    ${escapeHTML(copy)}
                </div>
            </div>
        `;

    }

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
            getIdentity(contact);

        const favourite =
            isFavourite(contact);

        const status =
            getStatus(contact);

        return `
            <div
                class="p54-contact-row"
                data-contact-row="${escapeHTML(id)}"
            >
                <div
                    class="p54-contact-avatar"
                    aria-hidden="true"
                >
                    ${escapeHTML(initials(contact))}
                </div>

                <button
                    type="button"
                    class="p54-contact-main"
                    data-contact-open="${escapeHTML(id)}"
                    aria-label="Open ${escapeHTML(name)}"
                >
                    <div
                        class="p54-contact-name"
                    >
                        ${escapeHTML(name)}
                    </div>

                    ${
                        identity
                            ? `
                                <div
                                    class="p54-contact-identity"
                                >
                                    ${escapeHTML(identity)}
                                </div>
                            `
                            : ""
                    }

                    ${
                        status !== "active"
                            ? `
                                <div
                                    class="p54-contact-badges"
                                >
                                    <span
                                        class="p54-contact-badge p54-contact-badge--${escapeHTML(status)}"
                                    >
                                        ${escapeHTML(status)}
                                    </span>
                                </div>
                            `
                            : ""
                    }
                </button>

                <button
                    type="button"
                    class="p54-contact-favourite"
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

    function filterByView(
        contacts,
        view
    ) {

        const safe =
            Array.isArray(contacts)
                ? contacts
                : [];

        switch (
            view
        ) {

            case "favourites":

                return safe.filter(
                    isFavourite
                );

            case "blocked":

                return safe.filter(
                    isBlocked
                );

            case "archived":

                return safe.filter(
                    isArchived
                );

            case "active":

                return safe.filter(
                    contact =>
                        !isBlocked(contact) &&
                        !isArchived(contact)
                );

            default:

                return safe;

        }

    }

    /* ======================================================================
       CONTACT FORM
    ====================================================================== */

    function openContactForm(
        contact = null,
        onSaved = null
    ) {

        const editing =
            Boolean(
                contact &&
                getContactId(contact)
            );

        const title =
            editing
                ? "Edit contact"
                : "Add contact";

        MODALS.openModal({

            title,

            bodyHTML: `
                <form
                    class="p54-contact-form"
                    data-contact-form
                    novalidate
                >
                    <div
                        class="p54-contact-form-row"
                    >
                        <label
                            class="p54-contact-form-field"
                        >
                            <span
                                class="p54-contact-form-label"
                            >
                                First name
                            </span>

                            <input
                                class="p54-contact-input"
                                name="firstName"
                                type="text"
                                maxlength="100"
                                autocomplete="given-name"
                                value="${escapeHTML(contact?.firstName || "")}"
                            >
                        </label>

                        <label
                            class="p54-contact-form-field"
                        >
                            <span
                                class="p54-contact-form-label"
                            >
                                Last name
                            </span>

                            <input
                                class="p54-contact-input"
                                name="lastName"
                                type="text"
                                maxlength="100"
                                autocomplete="family-name"
                                value="${escapeHTML(contact?.lastName || "")}"
                            >
                        </label>
                    </div>

                    <label
                        class="p54-contact-form-field"
                    >
                        <span
                            class="p54-contact-form-label"
                        >
                            PAY54 ID
                        </span>

                        <input
                            class="p54-contact-input"
                            name="pay54Id"
                            type="text"
                            autocomplete="off"
                            value="${escapeHTML(contact?.pay54Id || "")}"
                        >
                    </label>

                    <label
                        class="p54-contact-form-field"
                    >
                        <span
                            class="p54-contact-form-label"
                        >
                            Phone
                        </span>

                        <input
                            class="p54-contact-input"
                            name="phone"
                            type="tel"
                            autocomplete="tel"
                            value="${escapeHTML(contact?.phone || "")}"
                        >
                    </label>

                    <label
                        class="p54-contact-form-field"
                    >
                        <span
                            class="p54-contact-form-label"
                        >
                            Email
                        </span>

                        <input
                            class="p54-contact-input"
                            name="email"
                            type="email"
                            autocomplete="email"
                            value="${escapeHTML(contact?.email || "")}"
                        >
                    </label>

                    <label
                        class="p54-contact-form-field"
                    >
                        <span
                            class="p54-contact-form-label"
                        >
                            Alias
                        </span>

                        <input
                            class="p54-contact-input"
                            name="alias"
                            type="text"
                            maxlength="50"
                            autocomplete="off"
                            value="${escapeHTML(contact?.alias || "")}"
                        >
                    </label>

                    <label
                        class="p54-contact-form-field"
                    >
                        <span
                            class="p54-contact-form-label"
                        >
                            Note
                        </span>

                        <textarea
                            class="p54-contact-textarea"
                            name="note"
                            maxlength="250"
                        >${escapeHTML(contact?.note || "")}</textarea>
                    </label>

                    <div
                        class="p54-contact-form-actions"
                    >
                        <button
                            type="button"
                            class="p54-contact-cancel"
                            data-contact-cancel
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="p54-contact-submit"
                        >
                            ${
                                editing
                                    ? "Save changes"
                                    : "Add contact"
                            }
                        </button>
                    </div>
                </form>
            `,

            onMount: ({
                modal,
                close
            }) => {

                const form =
                    modal.querySelector(
                        "[data-contact-form]"
                    );

                const cancel =
                    modal.querySelector(
                        "[data-contact-cancel]"
                    );

                cancel?.addEventListener(
                    "click",
                    close
                );

                form?.addEventListener(
                    "submit",
                    event => {

                        event.preventDefault();

                        const data =
                            new FormData(form);

                        const payload = {

                            firstName:
                                cleanString(
                                    data.get("firstName")
                                ),

                            lastName:
                                cleanString(
                                    data.get("lastName")
                                ),

                            pay54Id:
                                cleanString(
                                    data.get("pay54Id")
                                ),

                            phone:
                                cleanString(
                                    data.get("phone")
                                ),

                            email:
                                cleanString(
                                    data.get("email")
                                ),

                            alias:
                                cleanString(
                                    data.get("alias")
                                ),

                            note:
                                cleanString(
                                    data.get("note")
                                )

                        };

                        if (
                            !payload.firstName &&
                            !payload.lastName &&
                            !payload.pay54Id &&
                            !payload.phone &&
                            !payload.email
                        ) {

                            toast(
                                "Enter a contact name or identity."
                            );

                            return;

                        }

                        try {

                            let saved;

                            if (
                                editing
                            ) {

                                saved =
                                    safeServiceCall(
                                        "updateContact",
                                        getContactId(contact),
                                        payload
                                    );

                                STATE.updates++;

                                publish(
                                    "contacts.ui.updated",
                                    {
                                        contactId:
                                            getContactId(contact)
                                    }
                                );

                                toast(
                                    "Contact updated."
                                );

                            } else {

                                saved =
                                    safeServiceCall(
                                        "createContact",
                                        payload
                                    );

                                STATE.creates++;

                                publish(
                                    "contacts.ui.created",
                                    {
                                        contactId:
                                            getContactId(saved)
                                    }
                                );

                                toast(
                                    "Contact added."
                                );

                            }

                            close();

                            if (
                                typeof onSaved ===
                                "function"
                            ) {

                                onSaved(
                                    clone(saved)
                                );

                            }

                        } catch (
                            error
                        ) {

                            recordError(
                                error
                            );

                            console.error(
                                "[PAY54_CONTACTS_UI] Contact save failed.",
                                error
                            );

                            toast(
                                error?.message ||
                                "Unable to save contact."
                            );

                        }

                    }
                );

            }

        });

    }

    /* ======================================================================
       DELETE CONFIRMATION
    ====================================================================== */

    function confirmDelete(
        contact,
        onDeleted = null
    ) {

        const id =
            getContactId(contact);

        if (
            !id
        ) {

            return;

        }

        const name =
            getDisplayName(contact);

        MODALS.openModal({

            title:
                "Delete contact",

            bodyHTML: `
                <div
                    class="p54-contact-confirm"
                >
                    <p>
                        Delete
                        <strong>
                            ${escapeHTML(name)}
                        </strong>?
                        This removes the contact from your PAY54 contacts.
                    </p>

                    <div
                        class="p54-contact-confirm-actions"
                    >
                        <button
                            type="button"
                            class="p54-contact-cancel"
                            data-delete-cancel
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            class="p54-contact-submit"
                            data-delete-confirm
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `,

            onMount: ({
                modal,
                close
            }) => {

                modal
                    .querySelector(
                        "[data-delete-cancel]"
                    )
                    ?.addEventListener(
                        "click",
                        close
                    );

                modal
                    .querySelector(
                        "[data-delete-confirm]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            try {

                                safeServiceCall(
                                    "deleteContact",
                                    id
                                );

                                STATE.deletes++;

                                publish(
                                    "contacts.ui.deleted",
                                    {
                                        contactId:
                                            id
                                    }
                                );

                                toast(
                                    "Contact deleted."
                                );

                                close();

                                if (
                                    typeof onDeleted ===
                                    "function"
                                ) {

                                    onDeleted(
                                        id
                                    );

                                }

                            } catch (
                                error
                            ) {

                                recordError(
                                    error
                                );

                                console.error(
                                    "[PAY54_CONTACTS_UI] Contact deletion failed.",
                                    error
                                );

                                toast(
                                    error?.message ||
                                    "Unable to delete contact."
                                );

                            }

                        }
                    );

            }

        });

    }

    /* ======================================================================
       CONTACT DETAILS
    ====================================================================== */

    function openContact(
        contactOrId,
        onChanged = null
    ) {

        ensureStyles();

        const contact =
            typeof contactOrId ===
            "object"
                ? clone(contactOrId)
                : SERVICE.getContactById(
                    cleanString(contactOrId)
                );

        if (
            !contact
        ) {

            toast(
                "Contact is no longer available."
            );

            return;

        }

        const id =
            getContactId(contact);

        const name =
            getDisplayName(contact);

        const identity =
            getIdentity(contact);

        const favourite =
            isFavourite(contact);

        const blocked =
            isBlocked(contact);

        const archived =
            isArchived(contact);

        STATE.views++;

        MODALS.openModal({

            title:
                "Contact",

            bodyHTML: `
                <div
                    class="p54-contact-detail"
                >
                    <div
                        class="p54-contact-detail-head"
                    >
                        <div
                            class="p54-contact-detail-avatar"
                            aria-hidden="true"
                        >
                            ${escapeHTML(initials(contact))}
                        </div>

                        <div
                            class="p54-contact-detail-name"
                        >
                            ${escapeHTML(name)}
                        </div>

                        ${
                            identity
                                ? `
                                    <div
                                        class="p54-contact-detail-identity"
                                    >
                                        ${escapeHTML(identity)}
                                    </div>
                                `
                                : ""
                        }
                    </div>

                    <div
                        class="p54-contact-fields"
                    >
                        ${
                            contact.pay54Id
                                ? `
                                    <div class="p54-contact-field">
                                        <div class="p54-contact-field-label">
                                            PAY54 ID
                                        </div>
                                        <div class="p54-contact-field-value">
                                            ${escapeHTML(contact.pay54Id)}
                                        </div>
                                    </div>
                                `
                                : ""
                        }

                        ${
                            contact.phone
                                ? `
                                    <div class="p54-contact-field">
                                        <div class="p54-contact-field-label">
                                            Phone
                                        </div>
                                        <div class="p54-contact-field-value">
                                            ${escapeHTML(contact.phone)}
                                        </div>
                                    </div>
                                `
                                : ""
                        }

                        ${
                            contact.email
                                ? `
                                    <div class="p54-contact-field">
                                        <div class="p54-contact-field-label">
                                            Email
                                        </div>
                                        <div class="p54-contact-field-value">
                                            ${escapeHTML(contact.email)}
                                        </div>
                                    </div>
                                `
                                : ""
                        }

                        ${
                            contact.alias
                                ? `
                                    <div class="p54-contact-field">
                                        <div class="p54-contact-field-label">
                                            Alias
                                        </div>
                                        <div class="p54-contact-field-value">
                                            ${escapeHTML(contact.alias)}
                                        </div>
                                    </div>
                                `
                                : ""
                        }

                        <div class="p54-contact-field">
                            <div class="p54-contact-field-label">
                                Status
                            </div>
                            <div class="p54-contact-field-value">
                                ${escapeHTML(getStatus(contact))}
                            </div>
                        </div>

                        ${
                            contact.note
                                ? `
                                    <div class="p54-contact-field">
                                        <div class="p54-contact-field-label">
                                            Note
                                        </div>
                                        <div class="p54-contact-field-value">
                                            ${escapeHTML(contact.note)}
                                        </div>
                                    </div>
                                `
                                : ""
                        }
                    </div>

                    <div
                        class="p54-contact-actions"
                    >
                        <button
                            type="button"
                            class="p54-contact-action p54-contact-action--primary"
                            data-detail-edit
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="p54-contact-action"
                            data-detail-favourite
                        >
                            ${
                                favourite
                                    ? "Unfavourite"
                                    : "Favourite"
                            }
                        </button>

                        <button
                            type="button"
                            class="p54-contact-action"
                            data-detail-block
                        >
                            ${
                                blocked
                                    ? "Unblock"
                                    : "Block"
                            }
                        </button>

                        <button
                            type="button"
                            class="p54-contact-action"
                            data-detail-archive
                        >
                            ${
                                archived
                                    ? "Restore"
                                    : "Archive"
                            }
                        </button>

                        <button
                            type="button"
                            class="p54-contact-action p54-contact-action--danger"
                            data-detail-delete
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `,

            onMount: ({
                modal,
                close
            }) => {

                function changed() {

                    if (
                        typeof onChanged ===
                        "function"
                    ) {

                        onChanged();

                    }

                }

                modal
                    .querySelector(
                        "[data-detail-edit]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            close();

                            openContactForm(
                                contact,
                                changed
                            );

                        }
                    );

                modal
                    .querySelector(
                        "[data-detail-favourite]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            try {

                                SERVICE.setFavourite(
                                    id,
                                    !favourite
                                );

                                STATE.favouriteChanges++;

                                toast(
                                    favourite
                                        ? "Removed from favourites."
                                        : "Added to favourites."
                                );

                                close();

                                changed();

                            } catch (
                                error
                            ) {

                                recordError(
                                    error
                                );

                                toast(
                                    error?.message ||
                                    "Unable to update favourite."
                                );

                            }

                        }
                    );

                modal
                    .querySelector(
                        "[data-detail-block]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            try {

                                if (
                                    blocked &&
                                    typeof SERVICE.unblockContact ===
                                    "function"
                                ) {

                                    SERVICE.unblockContact(
                                        id
                                    );

                                } else if (
                                    !blocked &&
                                    typeof SERVICE.blockContact ===
                                    "function"
                                ) {

                                    SERVICE.blockContact(
                                        id
                                    );

                                } else {

                                    SERVICE.setStatus(
                                        id,
                                        blocked
                                            ? "active"
                                            : "blocked"
                                    );

                                }

                                STATE.statusChanges++;

                                toast(
                                    blocked
                                        ? "Contact unblocked."
                                        : "Contact blocked."
                                );

                                close();

                                changed();

                            } catch (
                                error
                            ) {

                                recordError(
                                    error
                                );

                                toast(
                                    error?.message ||
                                    "Unable to update contact status."
                                );

                            }

                        }
                    );

                modal
                    .querySelector(
                        "[data-detail-archive]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            try {

                                if (
                                    !archived &&
                                    typeof SERVICE.archiveContact ===
                                    "function"
                                ) {

                                    SERVICE.archiveContact(
                                        id
                                    );

                                } else {

                                    SERVICE.setStatus(
                                        id,
                                        archived
                                            ? "active"
                                            : "archived"
                                    );

                                }

                                STATE.statusChanges++;

                                toast(
                                    archived
                                        ? "Contact restored."
                                        : "Contact archived."
                                );

                                close();

                                changed();

                            } catch (
                                error
                            ) {

                                recordError(
                                    error
                                );

                                toast(
                                    error?.message ||
                                    "Unable to update contact status."
                                );

                            }

                        }
                    );

                modal
                    .querySelector(
                        "[data-detail-delete]"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            close();

                            confirmDelete(
                                contact,
                                changed
                            );

                        }
                    );

            }

        });

    }

    /* ======================================================================
       CONTACTS MANAGEMENT
    ====================================================================== */

    function open(
        options = {}
    ) {

        ensureStyles();

        const health =
            SERVICE.getHealth();

        if (
            health?.healthy !==
            true
        ) {

            throw new Error(
                "[PAY54_CONTACTS_UI] Contacts Service is not healthy."
            );

        }

        const title =
            cleanString(
                options.title
            ) ||
            "Contacts";

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
                    class="p54-contacts-ui"
                    data-contacts-management
                >
                    <div
                        class="p54-contacts-toolbar"
                    >
                        <input
                            type="search"
                            class="p54-contacts-search"
                            data-contacts-management-search
                            placeholder="Search contacts"
                            aria-label="Search contacts"
                            autocomplete="off"
                            spellcheck="false"
                        >

                        <button
                            type="button"
                            class="p54-contacts-add"
                            data-contacts-add
                        >
                            + Add contact
                        </button>
                    </div>

                    <div
                        class="p54-contacts-tabs"
                        role="tablist"
                        aria-label="Contact filters"
                    >
                        <button
                            type="button"
                            class="p54-contacts-tab is-active"
                            data-contact-view="active"
                            role="tab"
                            aria-selected="true"
                        >
                            Contacts
                        </button>

                        <button
                            type="button"
                            class="p54-contacts-tab"
                            data-contact-view="favourites"
                            role="tab"
                            aria-selected="false"
                        >
                            Favourites
                        </button>

                        <button
                            type="button"
                            class="p54-contacts-tab"
                            data-contact-view="blocked"
                            role="tab"
                            aria-selected="false"
                        >
                            Blocked
                        </button>

                        <button
                            type="button"
                            class="p54-contacts-tab"
                            data-contact-view="archived"
                            role="tab"
                            aria-selected="false"
                        >
                            Archived
                        </button>

                        <button
                            type="button"
                            class="p54-contacts-tab"
                            data-contact-view="all"
                            role="tab"
                            aria-selected="false"
                        >
                            All
                        </button>
                    </div>

                    <div
                        class="p54-contacts-summary"
                    >
                        <span
                            data-contacts-summary
                        >
                            Contacts
                        </span>

                        <span
                            data-contacts-count
                        >
                            0
                        </span>
                    </div>

                    <div
                        class="p54-contacts-list"
                        data-contacts-management-results
                        aria-live="polite"
                    ></div>
                </div>
            `,

            onMount: ({
                modal
            }) => {

                const search =
                    modal.querySelector(
                        "[data-contacts-management-search]"
                    );

                const results =
                    modal.querySelector(
                        "[data-contacts-management-results]"
                    );

                const count =
                    modal.querySelector(
                        "[data-contacts-count]"
                    );

                const summary =
                    modal.querySelector(
                        "[data-contacts-summary]"
                    );

                const add =
                    modal.querySelector(
                        "[data-contacts-add]"
                    );

                const tabs =
                    [
                        ...modal.querySelectorAll(
                            "[data-contact-view]"
                        )
                    ];

                let currentView =
                    "active";

                let currentContacts =
                    new Map();

                let searchTimer =
                    null;

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
                        ?.querySelectorAll(
                            "[data-contact-open]"
                        )
                        .forEach(
                            button => {

                                button.addEventListener(
                                    "click",
                                    () => {

                                        const id =
                                            cleanString(
                                                button.dataset
                                                    .contactOpen
                                            );

                                        const contact =
                                            currentContacts.get(
                                                id
                                            ) ||
                                            SERVICE.getContactById(
                                                id
                                            );

                                        if (
                                            !contact
                                        ) {

                                            toast(
                                                "Contact is no longer available."
                                            );

                                            render();

                                            return;

                                        }

                                        openContact(
                                            contact,
                                            render
                                        );

                                    }
                                );

                            }
                        );

                    results
                        ?.querySelectorAll(
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
                                            );

                                        if (
                                            !contact
                                        ) {

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

                                            render();

                                        } catch (
                                            error
                                        ) {

                                            recordError(
                                                error
                                            );

                                            toast(
                                                error?.message ||
                                                "Unable to update favourite."
                                            );

                                        }

                                    }
                                );

                            }
                        );

                }

                function render() {

                    try {

                        const query =
                            cleanString(
                                search?.value
                            );

                        let contacts;

                        if (
                            query
                        ) {

                            STATE.searches++;

                            contacts =
                                SERVICE.searchContacts(
                                    query
                                );

                        } else {

                            contacts =
                                SERVICE.getContacts();

                        }

                        contacts =
                            Array.isArray(contacts)
                                ? contacts
                                : [];

                        const visible =
                            query
                                ? contacts
                                : filterByView(
                                    contacts,
                                    currentView
                                );

                        indexContacts(
                            visible
                        );

                        if (
                            count
                        ) {

                            count.textContent =
                                String(
                                    visible.length
                                );

                        }

                        if (
                            summary
                        ) {

                            summary.textContent =
                                query
                                    ? "Search results"
                                    : (
                                        currentView ===
                                        "favourites"
                                            ? "Favourites"
                                            : currentView ===
                                                "blocked"
                                                ? "Blocked"
                                                : currentView ===
                                                    "archived"
                                                    ? "Archived"
                                                    : currentView ===
                                                        "all"
                                                        ? "All contacts"
                                                        : "Contacts"
                                    );

                        }

                        if (
                            !results
                        ) {

                            return;

                        }

                        if (
                            visible.length ===
                            0
                        ) {

                            results.innerHTML =
                                renderEmpty(
                                    query
                                        ? "No matching contacts"
                                        : "No contacts here",
                                    query
                                        ? "Try another name, PAY54 ID, phone number or email."
                                        : "Contacts matching this view will appear here."
                                );

                            return;

                        }

                        results.innerHTML =
                            visible
                                .map(
                                    renderContact
                                )
                                .join("");

                        bindRows();

                    } catch (
                        error
                    ) {

                        recordError(
                            error
                        );

                        if (
                            results
                        ) {

                            results.innerHTML = `
                                <div
                                    class="p54-contacts-error"
                                    role="alert"
                                >
                                    Contacts could not be loaded.
                                    Please try again.
                                </div>
                            `;

                        }

                        console.error(
                            "[PAY54_CONTACTS_UI] Contacts render failed.",
                            error
                        );

                    }

                }

                tabs.forEach(
                    tab => {

                        tab.addEventListener(
                            "click",
                            () => {

                                currentView =
                                    cleanString(
                                        tab.dataset
                                            .contactView
                                    ) ||
                                    "active";

                                tabs.forEach(
                                    item => {

                                        const selected =
                                            item ===
                                            tab;

                                        item.classList
                                            .toggle(
                                                "is-active",
                                                selected
                                            );

                                        item.setAttribute(
                                            "aria-selected",
                                            selected
                                                ? "true"
                                                : "false"
                                        );

                                    }
                                );

                                if (
                                    search
                                ) {

                                    search.value =
                                        "";

                                }

                                render();

                            }
                        );

                    }
                );

                search?.addEventListener(
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
                                render,
                                120
                            );

                    }
                );

                add?.addEventListener(
                    "click",
                    () => {

                        openContactForm(
                            null,
                            render
                        );

                    }
                );

                render();

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

            moduleId:
                MODULE_ID,

            version:
                VERSION,

            service:
                clone(
                    serviceHealth
                ),

            pickerAvailable:
                Boolean(
                    GLOBAL.PAY54_CONTACTS_PICKER
                ),

            opened:
                STATE.opened,

            openedAt:
                STATE.openedAt,

            views:
                STATE.views,

            searches:
                STATE.searches,

            creates:
                STATE.creates,

            updates:
                STATE.updates,

            deletes:
                STATE.deletes,

            favouriteChanges:
                STATE.favouriteChanges,

            statusChanges:
                STATE.statusChanges,

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

            openContacts:
                open,

            openContact,

            addContact:
                (
                    onSaved = null
                ) =>
                    openContactForm(
                        null,
                        onSaved
                    ),

            editContact:
                (
                    contact,
                    onSaved = null
                ) =>
                    openContactForm(
                        contact,
                        onSaved
                    ),

            health:
                getHealth,

            getHealth

        });

    /* ======================================================================
       EXPORT
    ====================================================================== */

    GLOBAL.PAY54_CONTACTS_UI =
        API;

    GLOBAL.PAY54_UI =
        GLOBAL.PAY54_UI ||
        {};

    if (
        typeof GLOBAL.PAY54_UI
            .openContacts !==
        "function"
    ) {

        GLOBAL.PAY54_UI
            .openContacts =
            open;

    }

    STATE.ready =
        true;

    console.info(
        `✅ PAY54 Contacts Management UI ${VERSION} loaded.`
    );

})();
