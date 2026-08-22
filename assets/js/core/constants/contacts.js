"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACT CONSTANTS
   File: assets/js/core/constants/contacts.js
   Version: v1.0.0

   Purpose
   -------
   Canonical constants for the PAY54 Contacts Engine.

   Responsibilities
   ----------------
   • Contact storage keys
   • Contact event names
   • Contact types
   • Beneficiary types
   • Contact status
   • Default groups
   • Validation limits
   • Search configuration

========================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

if(!window.PAY54_CONSTANTS){

    throw new Error(
        "PAY54 Constants Registry must load before contacts.js"
    );

}

const MODULES =
window.PAY54_CONSTANTS.get("MODULES");

if(!MODULES){

    throw new Error(
        "PAY54 Module identifiers must load before contacts.js"
    );

}

/* ========================================================================
   CONTACT CONSTANTS
======================================================================== */

const CONTACTS = Object.freeze({

    VERSION: "1.0.0",

    STORAGE_KEYS: Object.freeze({

        CONTACTS:
            "pay54_contacts",

        BENEFICIARIES:
            "pay54_beneficiaries",

        RECENT:
            "pay54_recent_contacts",

        GROUPS:
            "pay54_contact_groups",

        META:
            "pay54_contact_meta",

        SETTINGS:
            "pay54_contact_settings"

    }),

    TYPES: Object.freeze({

        PERSONAL:
            "PERSONAL",

        BUSINESS:
            "BUSINESS",

        MERCHANT:
            "MERCHANT",

        PAY54:
            "PAY54",

        BANK:
            "BANK",

        QR:
            "QR",

        CRYPTO:
            "CRYPTO",

        INTERNATIONAL:
            "INTERNATIONAL"

    }),

    BENEFICIARY_TYPES: Object.freeze({

        BANK:
            "BANK",

        WALLET:
            "WALLET",

        CARD:
            "CARD",

        QR:
            "QR",

        CRYPTO:
            "CRYPTO"

    }),

    STATUS: Object.freeze({

        ACTIVE:
            "ACTIVE",

        BLOCKED:
            "BLOCKED",

        ARCHIVED:
            "ARCHIVED",

        VERIFIED:
            "VERIFIED",

        FAVOURITE:
            "FAVOURITE"

    }),

    GROUPS: Object.freeze({

        FAMILY:
            "Family",

        FRIENDS:
            "Friends",

        BUSINESS:
            "Business",

        MERCHANTS:
            "Merchants",

        UTILITIES:
            "Utilities",

        PAY54:
            "PAY54"

    }),

    VALIDATION: Object.freeze({

        MAX_CONTACTS:
            5000,

        MAX_GROUPS:
            100,

        MAX_NAME_LENGTH:
            100,

        MAX_ALIAS_LENGTH:
            50,

        MAX_NOTE_LENGTH:
            250

    }),

    SEARCH: Object.freeze({

        MIN_QUERY_LENGTH:
            2,

        MAX_RESULTS:
            100

    }),

    EVENTS: Object.freeze({

        CREATED:
            "contacts.created",

        UPDATED:
            "contacts.updated",

        DELETED:
            "contacts.deleted",

        IMPORTED:
            "contacts.imported",

        EXPORTED:
            "contacts.exported",

        SEARCHED:
            "contacts.searched",

        GROUP_CREATED:
            "contacts.group.created",

        GROUP_UPDATED:
            "contacts.group.updated",

        GROUP_DELETED:
            "contacts.group.deleted",

        ERROR:
            "contacts.error"

    })

});

/* ========================================================================
   REGISTRATION
======================================================================== */

window.PAY54_CONSTANTS.register(

    MODULES.CONTACTS,

    Object.freeze(CONTACTS)

);

if(

    !window.PAY54_CONSTANTS.has(

        MODULES.CONTACTS

    )

){

    throw new Error(

        "Failed to register PAY54 Contact Constants."

    );

}

/* ========================================================================
   STARTUP
======================================================================== */

console.info(

    "✅ PAY54 Contact Constants",

    CONTACTS.VERSION,

    "loaded."

);

})();
