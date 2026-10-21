"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/sanitizer.js
   Version: v12.0.0
   Module: Titan Enterprise Sanitization Engine
   Status: Production Candidate
   ------------------------------------------------------------------------
   Responsibilities
   ----------------
   • Context-aware text, URL and HTML sanitization
   • Strict DOM allowlist HTML policy
   • Prototype-pollution-safe object/JSON sanitization
   • Filename, email, query and payload normalization
   • Output encoders for HTML, attributes, JavaScript and URL components
   • Security diagnostics, Registry and Event Bus integration

   Security model
   --------------
   • Sanitization does not replace server-side validation or authorization.
   • SQL-injection prevention remains a server-side responsibility.
   • HTML is parsed as DOM and rebuilt from an explicit allowlist.
   • Event-handler attributes, active content and unsafe URI schemes are
     always removed.
   • Objects containing __proto__, prototype or constructor keys are rejected.
======================================================================== */

(() => {

    "use strict";

    /* ====================================================================
       IDENTITY
    ==================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.sanitizer";

    const MODULE_NAME =
        "PAY54 Titan Enterprise Sanitization Engine";

    const FILE_PATH =
        "assets/js/security/sanitizer.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date().toISOString();

    /* ====================================================================
       DEPENDENCIES
    ==================================================================== */

    const REGISTRY =
        GLOBAL.PAY54_REGISTRY ||
        null;

    const CONFIG =
        GLOBAL.PAY54_CONFIG ||
        null;

    const EVENTS =
        GLOBAL.PAY54_EVENTS ||
        null;

    if (
        !REGISTRY ||
        typeof REGISTRY.registerModule !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SANITIZER] Platform Registry must load before Sanitizer."
        );
    }

    if (
        !CONFIG ||
        typeof CONFIG.get !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SANITIZER] Runtime Config must load before Sanitizer."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existingSanitizer =
        GLOBAL.PAY54_SECURITY?.sanitizer ||
        null;

    if (
        existingSanitizer
    ) {

        if (
            existingSanitizer.id ===
                MODULE_ID &&
            existingSanitizer.version ===
                VERSION &&
            typeof existingSanitizer.html ===
                "function" &&
            typeof existingSanitizer.health ===
                "function"
        ) {

            console.info(
                "[PAY54_SANITIZER] Existing Titan Sanitizer preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_SANITIZER] PAY54_SECURITY.sanitizer already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       EVENTS / STATE
    ==================================================================== */

    const SANITIZER_EVENTS =
        Object.freeze({

            SANITIZED:
                "sanitizer.sanitized",

            WARNING:
                "sanitizer.warning",

            BLOCKED:
                "sanitizer.blocked",

            READY:
                "security.sanitizer.ready"
        });

    const state = {

        ready:
            false,

        readyAt:
            null,

        operations:
            0,

        modified:
            0,

        blocked:
            0,

        warnings:
            0,

        lastError:
            null
    };

    function nowISO() {

        return new Date()
            .toISOString();
    }


    function rememberError(
        error
    ) {

        state.lastError =
            Object.freeze({

                name:
                    error?.name ||
                    "Error",

                message:
                    error?.message ||
                    String(
                        error
                    ),

                timestamp:
                    nowISO()
            });
    }


    function publishSanitizerEvent(
        eventName,
        payload = {}
    ) {

        try {

            if (
                !EVENTS ||
                typeof EVENTS.publish !==
                    "function"
            ) {

                return false;
            }

            EVENTS.publish(

                eventName,

                Object.freeze({

                    moduleId:
                        MODULE_ID,

                    occurredAt:
                        nowISO(),

                    ...payload
                }),

                {

                    source:
                        MODULE_ID
                }
            );

            return true;

        } catch (
            error
        ) {

            rememberError(
                error
            );

            return false;
        }
    }

    /* ====================================================================
       COMMON UTILITIES
    ==================================================================== */

    const UNSAFE_OBJECT_KEYS =
        new Set([

            "__proto__",

            "prototype",

            "constructor"
        ]);

    const MAX_RECURSION_DEPTH =
        32;

    const MAX_COLLECTION_LENGTH =
        10000;

    const CONTROL_CHARACTERS =
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;


    function isString(
        value
    ) {

        return typeof value ===
            "string";
    }


    function isPlainObject(
        value
    ) {

        if (
            !value ||
            typeof value !==
                "object" ||
            Array.isArray(
                value
            )
        ) {

            return false;
        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype ===
                Object.prototype ||
            prototype ===
                null
        );
    }


    function normalizeWhitespace(
        value
    ) {

        return String(
            value
        )
        .replace(
            /\r\n/g,
            "\n"
        )
        .replace(
            /\r/g,
            "\n"
        )
        .replace(
            /[ \t]+/g,
            " "
        )
        .trim();
    }


    function createResult(
        value,
        modified,
        warnings = []
    ) {

        const normalizedWarnings =
            Array.from(

                new Set(

                    Array.isArray(
                        warnings
                    )

                        ? warnings.map(
                            item =>
                                String(
                                    item
                                )
                        )

                        : []
                )
            );

        state.operations +=
            1;

        if (
            modified ===
                true
        ) {

            state.modified +=
                1;
        }

        if (
            normalizedWarnings.length >
                0
        ) {

            state.warnings +=
                normalizedWarnings.length;
        }

        return Object.freeze({

            value,

            modified:
                modified ===
                true,

            warnings:
                Object.freeze(
                    normalizedWarnings
                ),

            timestamp:
                nowISO()
        });
    }


    function blockedResult(
        value,
        warning
    ) {

        state.blocked +=
            1;

        publishSanitizerEvent(

            SANITIZER_EVENTS.BLOCKED,

            {
                warning
            }
        );

        return createResult(
            value,
            true,
            [
                warning
            ]
        );
    }


    function assertSafeKey(
        key,
        path
    ) {

        if (
            UNSAFE_OBJECT_KEYS.has(
                key
            )
        ) {

            throw new Error(
                `[PAY54_SANITIZER] Unsafe object key rejected at ${path}.${key}.`
            );
        }
    }


    function safeClone(
        value,
        depth = 0,
        seen = new WeakSet()
    ) {

        if (
            depth >
            MAX_RECURSION_DEPTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Maximum sanitization depth exceeded."
            );
        }

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return value;
        }

        if (
            seen.has(
                value
            )
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Circular object graph rejected."
            );
        }

        seen.add(
            value
        );

        if (
            Array.isArray(
                value
            )
        ) {

            if (
                value.length >
                MAX_COLLECTION_LENGTH
            ) {

                throw new Error(
                    "[PAY54_SANITIZER] Collection size exceeds safe limit."
                );
            }

            const result =
                value.map(
                    item =>
                        safeClone(
                            item,
                            depth + 1,
                            seen
                        )
                );

            seen.delete(
                value
            );

            return result;
        }

        if (
            !isPlainObject(
                value
            )
        ) {

            throw new TypeError(
                "[PAY54_SANITIZER] Only plain objects may be sanitized."
            );
        }

        const result =
            Object.create(
                null
            );

        for (
            const [
                key,
                child
            ]
            of Object.entries(
                value
            )
        ) {

            assertSafeKey(
                key,
                "value"
            );

            result[key] =
                safeClone(
                    child,
                    depth + 1,
                    seen
                );
        }

        seen.delete(
            value
        );

        return result;
    }

    /* ====================================================================
       URL SANITIZATION
    ==================================================================== */

    const URL_POLICIES =
        Object.freeze({

            navigation:
                Object.freeze({

                    schemes:
                        Object.freeze([
                            "http:",
                            "https:",
                            "mailto:",
                            "tel:"
                        ]),

                    allowRelative:
                        true,

                    sameOriginOnly:
                        false
                }),

            resource:
                Object.freeze({

                    schemes:
                        Object.freeze([
                            "http:",
                            "https:"
                        ]),

                    allowRelative:
                        true,

                    sameOriginOnly:
                        false
                }),

            sameOrigin:
                Object.freeze({

                    schemes:
                        Object.freeze([
                            "http:",
                            "https:"
                        ]),

                    allowRelative:
                        true,

                    sameOriginOnly:
                        true
                })
        });


    function getURLPolicy(
        name = "navigation"
    ) {

        return (
            URL_POLICIES[name] ||
            URL_POLICIES.navigation
        );
    }


    function sanitizeURL(
        value,
        options = {}
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        const trimmed =
            value
                .trim()
                .replace(
                    CONTROL_CHARACTERS,
                    ""
                );

        const policyName =
            isPlainObject(
                options
            ) &&
            options.policy

                ? String(
                    options.policy
                )

                : "navigation";

        const policy =
            getURLPolicy(
                policyName
            );

        const warnings =
            [];

        if (
            !trimmed
        ) {

            return createResult(
                "",
                original !==
                    ""
            );
        }

        try {

            const base =
                GLOBAL.location
                    ?.origin ||
                "https://pay54.invalid";

            const parsed =
                new URL(
                    trimmed,
                    base
                );

            const hasExplicitScheme =
                /^[a-zA-Z][a-zA-Z\d+.-]*:/
                    .test(
                        trimmed
                    );

            const isProtocolRelative =
                trimmed.startsWith(
                    "//"
                );

            const isRelative =
                !hasExplicitScheme &&
                !isProtocolRelative;

            if (
                isProtocolRelative
            ) {

                return blockedResult(
                    "",
                    "PROTOCOL_RELATIVE_URL_NOT_ALLOWED"
                );
            }

            if (
                !policy.schemes.includes(
                    parsed.protocol
                )
            ) {

                return blockedResult(
                    "",
                    "UNSAFE_URL_SCHEME"
                );
            }

            if (
                isRelative &&
                policy.allowRelative !==
                    true
            ) {

                return blockedResult(
                    "",
                    "RELATIVE_URL_NOT_ALLOWED"
                );
            }

            if (
                policy.sameOriginOnly ===
                    true &&
                parsed.origin !==
                    base
            ) {

                return blockedResult(
                    "",
                    "CROSS_ORIGIN_URL_NOT_ALLOWED"
                );
            }

            if (
                parsed.username ||
                parsed.password
            ) {

                warnings.push(
                    "URL_CREDENTIALS_REMOVED"
                );

                parsed.username =
                    "";

                parsed.password =
                    "";
            }

            const sanitized =
                isRelative

                    ? trimmed

                    : parsed.href;

            const modified =
                sanitized !==
                    original;

            if (
                modified ||
                warnings.length
            ) {

                publishSanitizerEvent(

                    SANITIZER_EVENTS.SANITIZED,

                    {

                        type:
                            "url",

                        policy:
                            policyName
                    }
                );
            }

            return createResult(
                sanitized,
                modified,
                warnings
            );

        } catch {

            return blockedResult(
                "",
                "INVALID_URL"
            );
        }
    }

    /* ====================================================================
       HTML SANITIZATION
    ==================================================================== */

    const ALLOWED_HTML_TAGS =
        new Set([

            "A",

            "ABBR",

            "B",

            "BR",

            "CODE",

            "DIV",

            "EM",

            "I",

            "LI",

            "MARK",

            "OL",

            "P",

            "SMALL",

            "SPAN",

            "STRONG",

            "S",

            "TIME",

            "U",

            "UL"
        ]);

    const DROP_CONTENT_TAGS =
        new Set([

            "SCRIPT",

            "STYLE",

            "IFRAME",

            "OBJECT",

            "EMBED",

            "TEMPLATE",

            "SVG",

            "MATH",

            "NOSCRIPT",

            "BASE",

            "META",

            "LINK",

            "FORM",

            "INPUT",

            "BUTTON",

            "TEXTAREA",

            "SELECT",

            "OPTION",

            "FRAME",

            "FRAMESET",

            "APPLET"
        ]);

    const GLOBAL_ALLOWED_ATTRIBUTES =
        new Set([

            "class",

            "id",

            "title",

            "role",

            "dir",

            "lang",

            "tabindex"
        ]);

    const TAG_ALLOWED_ATTRIBUTES =
        Object.freeze({

            A:
                new Set([
                    "href",
                    "target",
                    "rel"
                ]),

            TIME:
                new Set([
                    "datetime"
                ])
        });


    function isAllowedDataAttribute(
        name
    ) {

        return /^data-[a-z0-9_.:-]+$/i
            .test(
                name
            );
    }


    function isAllowedAriaAttribute(
        name
    ) {

        return /^aria-[a-z0-9_.:-]+$/i
            .test(
                name
            );
    }


    function sanitizeAttribute(
        element,
        attribute,
        warnings
    ) {

        const name =
            attribute.name
                .toLowerCase();

        const value =
            attribute.value;

        if (
            name.startsWith(
                "on"
            ) ||
            name ===
                "style" ||
            name ===
                "srcdoc" ||
            name ===
                "xmlns" ||
            name ===
                "formaction"
        ) {

            element.removeAttribute(
                attribute.name
            );

            warnings.push(
                "HTML_ATTRIBUTE_REMOVED"
            );

            return;
        }

        const tagAttributes =
            TAG_ALLOWED_ATTRIBUTES[
                element.tagName
            ] ||
            null;

        const allowed =
            GLOBAL_ALLOWED_ATTRIBUTES
                .has(
                    name
                ) ||
            tagAttributes
                ?.has(
                    name
                ) ||
            isAllowedDataAttribute(
                name
            ) ||
            isAllowedAriaAttribute(
                name
            );

        if (
            !allowed
        ) {

            element.removeAttribute(
                attribute.name
            );

            warnings.push(
                "HTML_ATTRIBUTE_REMOVED"
            );

            return;
        }

        if (
            name ===
                "href"
        ) {

            const result =
                sanitizeURL(
                    value,
                    {
                        policy:
                            "navigation"
                    }
                );

            if (
                !result.value
            ) {

                element.removeAttribute(
                    attribute.name
                );

                warnings.push(
                    "HTML_URL_REMOVED"
                );

            } else {

                element.setAttribute(
                    "href",
                    result.value
                );
            }
        }

        if (
            name ===
                "target"
        ) {

            const target =
                value
                    .toLowerCase();

            if (
                ![
                    "_blank",
                    "_self"
                ]
                .includes(
                    target
                )
            ) {

                element.removeAttribute(
                    attribute.name
                );

                warnings.push(
                    "HTML_TARGET_REMOVED"
                );

            } else if (
                target ===
                    "_blank"
            ) {

                const relTokens =
                    new Set(

                        (
                            element.getAttribute(
                                "rel"
                            ) ||
                            ""
                        )
                        .split(
                            /\s+/
                        )
                        .filter(
                            Boolean
                        )
                    );

                relTokens.add(
                    "noopener"
                );

                relTokens.add(
                    "noreferrer"
                );

                element.setAttribute(
                    "rel",
                    Array.from(
                        relTokens
                    )
                    .join(
                        " "
                    )
                );
            }
        }

        if (
            name ===
                "rel"
        ) {

            const tokens =
                new Set(

                    value
                        .toLowerCase()
                        .split(
                            /\s+/
                        )
                        .filter(
                            token =>
                                [
                                    "noopener",
                                    "noreferrer",
                                    "nofollow"
                                ]
                                .includes(
                                    token
                                )
                        )
                );

            element.setAttribute(
                "rel",
                Array.from(
                    tokens
                )
                .join(
                    " "
                )
            );
        }
    }


    function sanitizeDOMContainer(
        container
    ) {

        const warnings =
            [];

        let modified =
            false;

        function processNode(
            node
        ) {

            for (
                const child
                of Array.from(
                    node.childNodes
                )
            ) {

                if (
                    child.nodeType ===
                    Node.COMMENT_NODE
                ) {

                    child.remove();

                    warnings.push(
                        "HTML_COMMENT_REMOVED"
                    );

                    modified =
                        true;

                    continue;
                }

                if (
                    child.nodeType !==
                    Node.ELEMENT_NODE
                ) {

                    continue;
                }

                const element =
                    child;

                const tag =
                    element.tagName
                        .toUpperCase();

                if (
                    DROP_CONTENT_TAGS.has(
                        tag
                    )
                ) {

                    element.remove();

                    warnings.push(
                        "HTML_ACTIVE_CONTENT_REMOVED"
                    );

                    modified =
                        true;

                    continue;
                }

                if (
                    !ALLOWED_HTML_TAGS.has(
                        tag
                    )
                ) {

                    const fragment =
                        document
                            .createDocumentFragment();

                    while (
                        element.firstChild
                    ) {

                        fragment.appendChild(
                            element.firstChild
                        );
                    }

                    element.replaceWith(
                        fragment
                    );

                    warnings.push(
                        "HTML_TAG_UNWRAPPED"
                    );

                    modified =
                        true;

                    processNode(
                        node
                    );

                    continue;
                }

                const beforeAttributes =
                    element.attributes
                        .length;

                for (
                    const attribute
                    of Array.from(
                        element.attributes
                    )
                ) {

                    sanitizeAttribute(
                        element,
                        attribute,
                        warnings
                    );
                }

                if (
                    element.attributes
                        .length !==
                    beforeAttributes
                ) {

                    modified =
                        true;
                }

                processNode(
                    element
                );
            }
        }

        processNode(
            container
        );

        return {

            modified,

            warnings
        };
    }


    function sanitizeHTML(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        if (
            !GLOBAL.document
                ?.createElement
        ) {

            return blockedResult(
                "",
                "DOM_SANITIZER_UNAVAILABLE"
            );
        }

        const template =
            document.createElement(
                "template"
            );

        template.innerHTML =
            value;

        const outcome =
            sanitizeDOMContainer(
                template.content
            );

        const sanitized =
            template.innerHTML;

        const modified =
            outcome.modified ||
            sanitized !==
                value;

        if (
            modified
        ) {

            publishSanitizerEvent(

                SANITIZER_EVENTS.SANITIZED,

                {

                    type:
                        "html",

                    warnings:
                        outcome
                            .warnings
                            .length
                }
            );
        }

        return createResult(
            sanitized,
            modified,
            outcome.warnings
        );
    }

    /* ====================================================================
       TEXT / EMAIL / FILENAME
    ==================================================================== */

    function sanitizeText(
        value,
        options = {}
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        let sanitized =
            value.replace(
                CONTROL_CHARACTERS,
                ""
            );

        if (
            options
                ?.normalizeWhitespace !==
            false
        ) {

            sanitized =
                normalizeWhitespace(
                    sanitized
                );
        }

        if (
            Number.isFinite(
                options?.maxLength
            ) &&
            options.maxLength >=
                0
        ) {

            sanitized =
                sanitized.slice(
                    0,
                    options.maxLength
                );
        }

        return createResult(
            sanitized,
            sanitized !==
                original
        );
    }


    function sanitizeFilename(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        let sanitized =
            value
                .replace(
                    CONTROL_CHARACTERS,
                    ""
                )
                .replace(
                    /[\\/:*?"<>|]/g,
                    "_"
                )
                .replace(
                    /\.\.+/g,
                    "."
                )
                .replace(
                    /^\.+/,
                    ""
                )
                .replace(
                    /[. ]+$/g,
                    ""
                )
                .trim();

        if (
            sanitized.length >
            255
        ) {

            sanitized =
                sanitized.slice(
                    0,
                    255
                );
        }

        if (
            !sanitized
        ) {

            sanitized =
                "file";
        }

        return createResult(
            sanitized,
            sanitized !==
                original
        );
    }


    function sanitizeEmail(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        const sanitized =
            value
                .replace(
                    CONTROL_CHARACTERS,
                    ""
                )
                .trim()
                .toLowerCase()
                .slice(
                    0,
                    254
                );

        return createResult(
            sanitized,
            sanitized !==
                original
        );
    }

    /* ====================================================================
       ARRAY / OBJECT / JSON
    ==================================================================== */

    function sanitizeArray(
        value,
        sanitizer = sanitizeText,
        depth = 0
    ) {

        if (
            !Array.isArray(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        if (
            depth >
            MAX_RECURSION_DEPTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Maximum sanitization depth exceeded."
            );
        }

        if (
            value.length >
            MAX_COLLECTION_LENGTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Collection size exceeds safe limit."
            );
        }

        const output =
            [];

        const warnings =
            [];

        let modified =
            false;

        for (
            const item
            of value
        ) {

            let result;

            if (
                Array.isArray(
                    item
                )
            ) {

                result =
                    sanitizeArray(
                        item,
                        sanitizer,
                        depth + 1
                    );

            } else if (
                isPlainObject(
                    item
                )
            ) {

                result =
                    sanitizeObject(
                        item,
                        sanitizer,
                        depth + 1
                    );

            } else {

                result =
                    sanitizer(
                        item
                    );
            }

            output.push(
                result.value
            );

            modified ||=
                result.modified ===
                true;

            warnings.push(
                ...(
                    result.warnings ||
                    []
                )
            );
        }

        return createResult(
            output,
            modified,
            warnings
        );
    }


    function sanitizeObject(
        value,
        sanitizer = sanitizeText,
        depth = 0
    ) {

        if (
            !isPlainObject(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        if (
            depth >
            MAX_RECURSION_DEPTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Maximum sanitization depth exceeded."
            );
        }

        const keys =
            Object.keys(
                value
            );

        if (
            keys.length >
            MAX_COLLECTION_LENGTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Object size exceeds safe limit."
            );
        }

        const output =
            Object.create(
                null
            );

        const warnings =
            [];

        let modified =
            false;

        for (
            const [
                key,
                child
            ]
            of Object.entries(
                value
            )
        ) {

            assertSafeKey(
                key,
                "value"
            );

            let result;

            if (
                Array.isArray(
                    child
                )
            ) {

                result =
                    sanitizeArray(
                        child,
                        sanitizer,
                        depth + 1
                    );

            } else if (
                isPlainObject(
                    child
                )
            ) {

                result =
                    sanitizeObject(
                        child,
                        sanitizer,
                        depth + 1
                    );

            } else {

                result =
                    sanitizer(
                        child
                    );
            }

            output[key] =
                result.value;

            modified ||=
                result.modified ===
                true;

            warnings.push(
                ...(
                    result.warnings ||
                    []
                )
            );
        }

        return createResult(
            output,
            modified,
            warnings
        );
    }


    function deepScalarSanitizer(
        value
    ) {

        return isString(
            value
        )

            ? sanitizeText(
                value
            )

            : createResult(
                value,
                false
            );
    }


    function sanitizeJSON(
        value
    ) {

        if (
            isString(
                value
            )
        ) {

            try {

                const parsed =
                    JSON.parse(
                        value
                    );

                const result =
                    deepSanitize(
                        parsed
                    );

                const serialized =
                    JSON.stringify(
                        result.value
                    );

                return createResult(

                    serialized,

                    result.modified ||
                    serialized !==
                        value,

                    result.warnings
                );

            } catch {

                return blockedResult(
                    null,
                    "INVALID_JSON"
                );
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {

            return sanitizeArray(
                value,
                deepScalarSanitizer
            );
        }

        if (
            isPlainObject(
                value
            )
        ) {

            return sanitizeObject(
                value,
                deepScalarSanitizer
            );
        }

        return createResult(
            value,
            false
        );
    }


    function deepSanitize(
        value,
        depth = 0
    ) {

        if (
            depth >
            MAX_RECURSION_DEPTH
        ) {

            throw new Error(
                "[PAY54_SANITIZER] Maximum sanitization depth exceeded."
            );
        }

        if (
            isString(
                value
            )
        ) {

            return sanitizeText(
                value
            );
        }

        if (
            Array.isArray(
                value
            )
        ) {

            return sanitizeArray(
                value,
                deepScalarSanitizer,
                depth + 1
            );
        }

        if (
            isPlainObject(
                value
            )
        ) {

            return sanitizeObject(
                value,
                deepScalarSanitizer,
                depth + 1
            );
        }

        return createResult(
            value,
            false
        );
    }


    function sanitizePayload(
        value
    ) {

        return deepSanitize(
            value
        );
    }


    function sanitizeQueryParameters(
        value
    ) {

        if (
            value instanceof
            URLSearchParams
        ) {

            const output =
                new URLSearchParams();

            let modified =
                false;

            for (
                const [
                    key,
                    child
                ]
                of value.entries()
            ) {

                const safeKey =
                    sanitizeText(
                        key,
                        {
                            maxLength:
                                128
                        }
                    );

                const safeValue =
                    sanitizeText(
                        child,
                        {
                            maxLength:
                                2048
                        }
                    );

                output.append(
                    safeKey.value,
                    safeValue.value
                );

                modified ||=
                    safeKey.modified ||
                    safeValue.modified;
            }

            return createResult(
                output,
                modified
            );
        }

        return sanitizeObject(

            value,

            child =>

                isString(
                    child
                )

                    ? sanitizeText(
                        child,
                        {
                            maxLength:
                                2048
                        }
                    )

                    : createResult(
                        child,
                        false
                    )
        );
    }

    /* ====================================================================
       OUTPUT ENCODERS
    ==================================================================== */

    const HTML_ENTITIES =
        Object.freeze({

            "&":
                "&amp;",

            "<":
                "&lt;",

            ">":
                "&gt;",

            "\"":
                "&quot;",

            "'":
                "&#39;"
        });


    function encodeHTML(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const encoded =
            value.replace(

                /[&<>"']/g,

                char =>
                    HTML_ENTITIES[
                        char
                    ]
            );

        return createResult(
            encoded,
            encoded !==
                value
        );
    }


    function encodeAttribute(
        value
    ) {

        return encodeHTML(
            String(
                value ??
                ""
            )
        );
    }


    function encodeJavaScript(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const encoded =
            value.replace(

                /[\\'"\n\r\u2028\u2029<>]/g,

                char => {

                    const code =
                        char
                            .charCodeAt(
                                0
                            )
                            .toString(
                                16
                            )
                            .padStart(
                                4,
                                "0"
                            );

                    return (
                        `\\u${code}`
                    );
                }
            );

        return createResult(
            encoded,
            encoded !==
                value
        );
    }


    function encodeURLComponent(
        value
    ) {

        const source =
            String(
                value ??
                ""
            );

        const encoded =
            encodeURIComponent(
                source
            );

        return createResult(
            encoded,
            encoded !==
                source
        );
    }

    /* ====================================================================
       SPECIALIZED SANITIZERS
    ==================================================================== */

    function sanitizeLogValue(
        value
    ) {

        if (
            isString(
                value
            )
        ) {

            return sanitizeText(
                value,
                {
                    maxLength:
                        2048
                }
            );
        }

        return deepSanitize(
            value
        );
    }


    function sanitizePaymentReference(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        const sanitized =
            normalizeWhitespace(
                value
            )
            .replace(
                /[^\p{L}\p{N} ._\-/#@]/gu,
                ""
            )
            .slice(
                0,
                140
            );

        return createResult(
            sanitized,
            sanitized !==
                original
        );
    }


    function sanitizeDisplayName(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return createResult(
                value,
                false
            );
        }

        const original =
            value;

        const sanitized =
            normalizeWhitespace(
                value
            )
            .replace(
                /[<>]/g,
                ""
            )
            .slice(
                0,
                120
            );

        return createResult(
            sanitized,
            sanitized !==
                original
        );
    }


    function sanitizeSecurePayload(
        value
    ) {

        const cloned =
            safeClone(
                value
            );

        return deepSanitize(
            cloned
        );
    }

    /* ====================================================================
       SANITIZER REGISTRY
    ==================================================================== */

    const SANITIZERS =
        Object.freeze({

            html:
                sanitizeHTML,

            url:
                sanitizeURL,

            text:
                sanitizeText,

            filename:
                sanitizeFilename,

            email:
                sanitizeEmail,

            array:
                sanitizeArray,

            object:
                sanitizeObject,

            json:
                sanitizeJSON,

            payload:
                sanitizePayload,

            queryParameters:
                sanitizeQueryParameters,

            deep:
                deepSanitize,

            encodeHTML,

            encodeAttribute,

            encodeJavaScript,

            encodeURLComponent,

            log:
                sanitizeLogValue,

            paymentReference:
                sanitizePaymentReference,

            displayName:
                sanitizeDisplayName,

            securePayload:
                sanitizeSecurePayload
        });


    function run(
        name,
        ...args
    ) {

        const sanitizer =
            SANITIZERS[
                name
            ];

        if (
            typeof sanitizer !==
            "function"
        ) {

            publishSanitizerEvent(

                SANITIZER_EVENTS.WARNING,

                {

                    sanitizer:
                        name,

                    warning:
                        "UNKNOWN_SANITIZER"
                }
            );

            return createResult(

                null,

                false,

                [
                    "UNKNOWN_SANITIZER"
                ]
            );
        }

        return sanitizer(
            ...args
        );
    }


    function has(
        name
    ) {

        return Object
            .prototype
            .hasOwnProperty
            .call(
                SANITIZERS,
                name
            );
    }


    function list() {

        return Object.keys(
            SANITIZERS
        )
        .sort();
    }

    /* ====================================================================
       HEALTH
    ==================================================================== */

    function verifyIntegrity() {

        const errors =
            [];

        if (
            !GLOBAL.document
                ?.createElement
        ) {

            errors.push(
                "DOM APIs required for HTML sanitization are unavailable."
            );
        }

        if (
            !REGISTRY ||
            typeof REGISTRY.has !==
                "function"
        ) {

            errors.push(
                "Platform Registry is unavailable."
            );
        }

        if (
            !CONFIG ||
            typeof CONFIG.get !==
                "function"
        ) {

            errors.push(
                "Runtime Config is unavailable."
            );
        }

        const required = [

            "html",

            "url",

            "text",

            "object",

            "deep",

            "encodeHTML",

            "encodeAttribute"
        ];

        for (
            const name
            of required
        ) {

            if (
                !has(
                    name
                )
            ) {

                errors.push(
                    `Required sanitizer missing: ${name}.`
                );
            }
        }

        return Object.freeze({

            ok:
                errors.length ===
                0,

            status:
                errors.length ===
                    0

                    ? "HEALTHY"

                    : "DEGRADED",

            errors:
                Object.freeze(
                    errors
                ),

            checkedAt:
                nowISO()
        });
    }


    function health() {

        const integrity =
            verifyIntegrity();

        return Object.freeze({

            ok:
                integrity.ok,

            healthy:
                integrity.ok,

            status:
                integrity.status,

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            startedAt:
                STARTED_AT,

            ready:
                state.ready,

            readyAt:
                state.readyAt,

            operations:
                state.operations,

            modified:
                state.modified,

            blocked:
                state.blocked,

            warnings:
                state.warnings,

            lastError:
                state.lastError,

            htmlPolicy:
                "STRICT_ALLOWLIST",

            urlPolicies:
                Object.freeze(
                    Object.keys(
                        URL_POLICIES
                    )
                ),

            integrity
        });
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const sanitizer =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            run,

            has,

            list,

            sanitizers:
                SANITIZERS,

            html:
                sanitizeHTML,

            url:
                sanitizeURL,

            text:
                sanitizeText,

            filename:
                sanitizeFilename,

            email:
                sanitizeEmail,

            array:
                sanitizeArray,

            object:
                sanitizeObject,

            json:
                sanitizeJSON,

            payload:
                sanitizePayload,

            queryParameters:
                sanitizeQueryParameters,

            deep:
                deepSanitize,

            encodeHTML,

            encodeAttribute,

            encodeJavaScript,

            encodeURLComponent,

            log:
                sanitizeLogValue,

            paymentReference:
                sanitizePaymentReference,

            displayName:
                sanitizeDisplayName,

            securePayload:
                sanitizeSecurePayload,

            verifyIntegrity,

            health
        });

    /* ====================================================================
       PAY54 SECURITY ROOT / REGISTRY
    ==================================================================== */

    if (
        !GLOBAL.PAY54_SECURITY
    ) {

        Object.defineProperty(

            GLOBAL,

            "PAY54_SECURITY",

            {

                value:
                    {},

                writable:
                    false,

                configurable:
                    false,

                enumerable:
                    true
            }
        );
    }

    Object.defineProperty(

        GLOBAL.PAY54_SECURITY,

        "sanitizer",

        {

            value:
                sanitizer,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    REGISTRY.registerModule(

        MODULE_ID,

        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            type:
                "security",

            layer:
                "layer.security",

            path:
                FILE_PATH,

            api:
                sanitizer,

            health
        })
    );

    state.ready =
        true;

    state.readyAt =
        nowISO();

    publishSanitizerEvent(

        SANITIZER_EVENTS.READY,

        {

            version:
                VERSION,

            readyAt:
                state.readyAt,

            htmlPolicy:
                "STRICT_ALLOWLIST"
        }
    );

    console.info(
        `[PAY54_SANITIZER] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
