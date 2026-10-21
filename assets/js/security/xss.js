"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/xss.js
   Version: v12.0.0
   Module: Titan Enterprise XSS Protection Engine
   Status: Production Candidate

   Purpose
   -------
   Canonical safe-DOM rendering boundary for Project Titan.

   Security model
   --------------
   • Text rendering uses textContent only.
   • HTML rendering must pass through Sanitizer v12 strict allowlisting.
   • Active-content elements are rejected at creation time.
   • Event-handler, style and dangerous URL attributes are blocked.
   • URI-bearing attributes use context-specific URL policies.
   • Iframe source rendering remains disabled.
   • Trusted Types is used when available but never replaces sanitization.
   • Mutation monitoring is diagnostic only.
======================================================================== */

(() => {

    "use strict";

    /* ====================================================================
       IDENTITY
    ==================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.xss";

    const MODULE_NAME =
        "PAY54 Titan Enterprise XSS Protection Engine";

    const FILE_PATH =
        "assets/js/security/xss.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date().toISOString();

    /* ====================================================================
       DEPENDENCIES
    ==================================================================== */

    const REGISTRY =
        GLOBAL.PAY54_REGISTRY || null;

    const CONFIG =
        GLOBAL.PAY54_CONFIG || null;

    const EVENTS =
        GLOBAL.PAY54_EVENTS || null;

    const SANITIZER =
        GLOBAL.PAY54_SECURITY?.sanitizer || null;

    if (
        !REGISTRY ||
        typeof REGISTRY.registerModule !== "function"
    ) {
        throw new Error(
            "[PAY54_XSS] Platform Registry must load before XSS Protection."
        );
    }

    if (
        !CONFIG ||
        typeof CONFIG.get !== "function"
    ) {
        throw new Error(
            "[PAY54_XSS] Runtime Config must load before XSS Protection."
        );
    }

    if (
        !SANITIZER ||
        SANITIZER.version !== "12.0.0" ||
        typeof SANITIZER.html !== "function" ||
        typeof SANITIZER.url !== "function"
    ) {
        throw new Error(
            "[PAY54_XSS] Sanitizer v12 must load before XSS Protection."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existing =
        GLOBAL.PAY54_SECURITY?.xss || null;

    if (existing) {

        if (
            existing.id === MODULE_ID &&
            existing.version === VERSION &&
            typeof existing.health === "function" &&
            typeof existing.setHTML === "function"
        ) {
            console.info(
                "[PAY54_XSS] Existing Titan XSS Protection preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_XSS] PAY54_SECURITY.xss already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       EVENTS
    ==================================================================== */

    const XSS_EVENTS =
        Object.freeze({

            RENDER:
                "xss.render",

            BLOCKED:
                "xss.blocked",

            WARNING:
                "xss.warning",

            ATTRIBUTE:
                "xss.attribute",

            LINK:
                "xss.link",

            READY:
                "security.xss.ready"
        });

    /* ====================================================================
       STATE
    ==================================================================== */

    const state = {

        ready:
            false,

        readyAt:
            null,

        renders:
            0,

        blocked:
            0,

        warnings:
            0,

        attributeWrites:
            0,

        monitoring:
            false,

        lastError:
            null
    };

    function nowISO() {

        return new Date().toISOString();
    }


    function rememberError(
        error
    ) {

        state.lastError =
            Object.freeze({

                name:
                    error?.name || "Error",

                message:
                    error?.message || String(error),

                timestamp:
                    nowISO()
            });
    }


    function publish(
        eventName,
        payload = {}
    ) {

        try {

            if (
                !EVENTS ||
                typeof EVENTS.publish !== "function"
            ) {
                return false;
            }

            EVENTS.publish(
                eventName,
                Object.freeze({
                    moduleId: MODULE_ID,
                    occurredAt: nowISO(),
                    ...payload
                }),
                {
                    source: MODULE_ID
                }
            );

            return true;

        } catch (error) {

            rememberError(error);

            return false;
        }
    }

    /* ====================================================================
       RESULT / TYPE HELPERS
    ==================================================================== */

    function isElement(
        value
    ) {

        return Boolean(
            value &&
            value.nodeType === Node.ELEMENT_NODE
        );
    }


    function isNode(
        value
    ) {

        return Boolean(
            value &&
            typeof value.nodeType === "number"
        );
    }


    function result(
        success,
        warnings = [],
        details = {}
    ) {

        return Object.freeze({

            success:
                success === true,

            warnings:
                Object.freeze(
                    Array.from(
                        new Set(
                            Array.isArray(warnings)
                                ? warnings.map(String)
                                : []
                        )
                    )
                ),

            details:
                Object.freeze({
                    ...(
                        details &&
                        typeof details === "object"
                            ? details
                            : {}
                    )
                }),

            timestamp:
                nowISO()
        });
    }


    function blocked(
        reason,
        details = {}
    ) {

        state.blocked += 1;

        publish(
            XSS_EVENTS.BLOCKED,
            {
                reason,
                ...details
            }
        );

        return result(
            false,
            [reason],
            details
        );
    }

    /* ====================================================================
       ELEMENT / ATTRIBUTE POLICIES
    ==================================================================== */

    const BLOCKED_TAGS =
        new Set([

            "SCRIPT",
            "STYLE",
            "IFRAME",
            "FRAME",
            "FRAMESET",
            "OBJECT",
            "EMBED",
            "APPLET",
            "BASE",
            "META",
            "LINK",
            "TEMPLATE",
            "SVG",
            "MATH"
        ]);

    const URL_ATTRIBUTES =
        Object.freeze({

            href:
                "navigation",

            src:
                "resource",

            poster:
                "resource",

            cite:
                "navigation",

            action:
                "sameOrigin",

            formaction:
                "sameOrigin"
        });

    const ALWAYS_BLOCKED_ATTRIBUTES =
        new Set([

            "style",
            "srcdoc",
            "xmlns",
            "xlink:href"
        ]);


    function normalizeAttributeName(
        name
    ) {

        return String(
            name ?? ""
        )
        .trim()
        .toLowerCase();
    }


    function isEventAttribute(
        name
    ) {

        return /^on[a-z0-9_-]+$/i
            .test(name);
    }


    function assertCreatableTag(
        tag
    ) {

        const normalized =
            String(tag ?? "")
                .trim()
                .toUpperCase();

        if (
            !/^[A-Z][A-Z0-9-]*$/
                .test(normalized)
        ) {
            throw new TypeError(
                "[PAY54_XSS] Invalid element tag."
            );
        }

        if (
            BLOCKED_TAGS.has(normalized)
        ) {

            state.blocked += 1;

            publish(
                XSS_EVENTS.BLOCKED,
                {
                    reason:
                        "BLOCKED_ELEMENT_TAG",

                    tag:
                        normalized
                }
            );

            throw new Error(
                `[PAY54_XSS] Active-content element ${normalized} is not permitted.`
            );
        }

        return normalized.toLowerCase();
    }

    /* ====================================================================
       SAFE TEXT RENDERING
    ==================================================================== */

    function setText(
        element,
        value
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "setText"
                }
            );
        }

        element.textContent =
            String(value ?? "");

        state.renders += 1;

        publish(
            XSS_EVENTS.RENDER,
            {
                type:
                    "text"
            }
        );

        return result(true);
    }

    /* ====================================================================
       HTML SANITIZATION
    ==================================================================== */

    function sanitizeHTMLValue(
        html
    ) {

        return SANITIZER.html(
            String(html ?? "")
        );
    }

    /* ====================================================================
       TRUSTED TYPES
    ==================================================================== */

    const TRUSTED_TYPES =
        GLOBAL.trustedTypes || null;

    let trustedPolicy =
        null;


    function getTrustedPolicy() {

        if (!TRUSTED_TYPES) {
            return null;
        }

        if (trustedPolicy) {
            return trustedPolicy;
        }

        try {

            trustedPolicy =
                TRUSTED_TYPES.createPolicy(
                    "pay54-xss-v12",
                    {
                        createHTML(value) {

                            return sanitizeHTMLValue(
                                value
                            ).value;
                        }
                    }
                );

        } catch (error) {

            rememberError(error);

            trustedPolicy =
                null;
        }

        return trustedPolicy;
    }


    function createTrustedHTML(
        html
    ) {

        const sanitized =
            sanitizeHTMLValue(html);

        const policy =
            getTrustedPolicy();

        if (policy) {

            return policy.createHTML(
                sanitized.value
            );
        }

        return sanitized.value;
    }

    /* ====================================================================
       SAFE HTML RENDERING
    ==================================================================== */

    function setHTML(
        element,
        html
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "setHTML"
                }
            );
        }

        const sanitized =
            sanitizeHTMLValue(html);

        const policy =
            getTrustedPolicy();

        element.innerHTML =
            policy
                ? policy.createHTML(
                    sanitized.value
                )
                : sanitized.value;

        state.renders += 1;

        publish(
            XSS_EVENTS.RENDER,
            {
                type:
                    "html",

                modified:
                    sanitized.modified,

                trustedTypes:
                    Boolean(policy)
            }
        );

        return result(
            true,
            sanitized.warnings,
            {
                modified:
                    sanitized.modified
            }
        );
    }


    function appendHTML(
        element,
        html
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "appendHTML"
                }
            );
        }

        const sanitized =
            sanitizeHTMLValue(html);

        const template =
            document.createElement(
                "template"
            );

        const policy =
            getTrustedPolicy();

        template.innerHTML =
            policy
                ? policy.createHTML(
                    sanitized.value
                )
                : sanitized.value;

        element.append(
            template.content
        );

        state.renders += 1;

        publish(
            XSS_EVENTS.RENDER,
            {
                type:
                    "append",

                modified:
                    sanitized.modified
            }
        );

        return result(
            true,
            sanitized.warnings,
            {
                modified:
                    sanitized.modified
            }
        );
    }


    function render(
        element,
        html
    ) {

        return setHTML(
            element,
            html
        );
    }

    /* ====================================================================
       SAFE DOM UTILITIES
    ==================================================================== */

    function clear(
        element
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "clear"
                }
            );
        }

        element.replaceChildren();

        state.renders += 1;

        return result(true);
    }


    function replaceChildren(
        element,
        ...children
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "replaceChildren"
                }
            );
        }

        for (
            const child
            of children
        ) {

            if (
                !isNode(child) &&
                typeof child !== "string"
            ) {
                return blocked(
                    "INVALID_CHILD_NODE",
                    {
                        operation:
                            "replaceChildren"
                    }
                );
            }
        }

        element.replaceChildren(
            ...children
        );

        state.renders += 1;

        return result(true);
    }


    function createFragment() {

        return document
            .createDocumentFragment();
    }


    function createTextNode(
        value
    ) {

        return document.createTextNode(
            String(value ?? "")
        );
    }


    function createElement(
        tag
    ) {

        const safeTag =
            assertCreatableTag(tag);

        return document.createElement(
            safeTag
        );
    }

    /* ====================================================================
       SAFE ATTRIBUTE HANDLING
    ==================================================================== */

    function setAttribute(
        element,
        name,
        value
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "setAttribute"
                }
            );
        }

        const attribute =
            normalizeAttributeName(name);

        if (!attribute) {

            return blocked(
                "INVALID_ATTRIBUTE"
            );
        }

        if (
            isEventAttribute(attribute) ||
            ALWAYS_BLOCKED_ATTRIBUTES
                .has(attribute)
        ) {

            return blocked(
                "BLOCKED_ATTRIBUTE",
                {
                    attribute
                }
            );
        }

        if (
            Object.prototype
                .hasOwnProperty.call(
                    URL_ATTRIBUTES,
                    attribute
                )
        ) {

            const policy =
                URL_ATTRIBUTES[
                    attribute
                ];

            const safeURL =
                SANITIZER.url(
                    String(value ?? ""),
                    {
                        policy
                    }
                );

            if (!safeURL.value) {

                element.removeAttribute(
                    attribute
                );

                return blocked(
                    "UNSAFE_URL_ATTRIBUTE",
                    {
                        attribute
                    }
                );
            }

            element.setAttribute(
                attribute,
                safeURL.value
            );

            state.attributeWrites += 1;

            publish(
                XSS_EVENTS.ATTRIBUTE,
                {
                    attribute,
                    policy
                }
            );

            return result(
                true,
                safeURL.warnings
            );
        }

        if (
            attribute === "target"
        ) {

            const target =
                String(value ?? "")
                    .trim()
                    .toLowerCase();

            if (
                ![
                    "_blank",
                    "_self"
                ].includes(target)
            ) {
                return blocked(
                    "BLOCKED_TARGET"
                );
            }

            element.setAttribute(
                "target",
                target
            );

            if (
                target === "_blank"
            ) {

                const rel =
                    new Set(
                        String(
                            element.getAttribute(
                                "rel"
                            ) || ""
                        )
                        .split(/\s+/)
                        .filter(Boolean)
                    );

                rel.add(
                    "noopener"
                );

                rel.add(
                    "noreferrer"
                );

                element.setAttribute(
                    "rel",
                    Array.from(rel)
                        .join(" ")
                );
            }

            return result(true);
        }

        const encoded =
            SANITIZER.encodeAttribute(
                value
            );

        element.setAttribute(
            attribute,
            encoded.value
        );

        state.attributeWrites += 1;

        publish(
            XSS_EVENTS.ATTRIBUTE,
            {
                attribute
            }
        );

        return result(
            true,
            encoded.warnings
        );
    }


    function removeAttribute(
        element,
        attribute
    ) {

        if (!isElement(element)) {

            return blocked(
                "INVALID_ELEMENT",
                {
                    operation:
                        "removeAttribute"
                }
            );
        }

        element.removeAttribute(
            normalizeAttributeName(
                attribute
            )
        );

        return result(true);
    }

    /* ====================================================================
       SAFE LINK BUILDER
    ==================================================================== */

    function createLink(
        url,
        label
    ) {

        const link =
            createElement("a");

        const hrefResult =
            setAttribute(
                link,
                "href",
                url
            );

        if (
            hrefResult.success !== true
        ) {

            link.setAttribute(
                "href",
                "#"
            );
        }

        setAttribute(
            link,
            "target",
            "_blank"
        );

        setText(
            link,
            label
        );

        publish(
            XSS_EVENTS.LINK,
            {
                safe:
                    hrefResult.success === true
            }
        );

        return link;
    }

    /* ====================================================================
       SAFE DOWNLOAD LINK
    ==================================================================== */

    function createDownloadLink(
        url,
        filename,
        label
    ) {

        const link =
            createLink(
                url,
                label
            );

        const safeName =
            SANITIZER.filename(
                filename
            );

        link.download =
            safeName.value;

        return link;
    }

    /* ====================================================================
       SAFE BUTTON
    ==================================================================== */

    function createButton(
        text,
        type = "button"
    ) {

        const button =
            createElement(
                "button"
            );

        const normalizedType =
            String(type ?? "button")
                .toLowerCase();

        button.type =
            [
                "button",
                "submit",
                "reset"
            ].includes(
                normalizedType
            )
                ? normalizedType
                : "button";

        setText(
            button,
            text
        );

        return button;
    }

    /* ====================================================================
       SAFE LIST ITEM
    ==================================================================== */

    function createListItem(
        text
    ) {

        const item =
            createElement("li");

        setText(
            item,
            text
        );

        return item;
    }

    /* ====================================================================
       SAFE IMAGE SOURCE
    ==================================================================== */

    function setImageSource(
        image,
        url
    ) {

        if (
            !(
                image instanceof
                HTMLImageElement
            )
        ) {

            return blocked(
                "INVALID_IMAGE"
            );
        }

        const safe =
            SANITIZER.url(
                String(url ?? ""),
                {
                    policy:
                        "resource"
                }
            );

        if (!safe.value) {

            image.removeAttribute(
                "src"
            );

            return blocked(
                "UNSAFE_IMAGE_SOURCE"
            );
        }

        image.src =
            safe.value;

        return result(
            true,
            safe.warnings
        );
    }

    /* ====================================================================
       IFRAME SOURCE — DISABLED
    ==================================================================== */

    function setIframeSource(
        iframe,
        url
    ) {

        if (
            !(
                iframe instanceof
                HTMLIFrameElement
            )
        ) {

            return blocked(
                "INVALID_IFRAME"
            );
        }

        void url;

        iframe.removeAttribute(
            "src"
        );

        return blocked(
            "IFRAME_RENDERING_DISABLED"
        );
    }

    /* ====================================================================
       CSP DETECTION
    ==================================================================== */

    function supportsCSP() {

        return Boolean(
            document.querySelector(
                'meta[http-equiv="Content-Security-Policy"]'
            )
        );
    }

    /* ====================================================================
       DOM MONITOR
    ==================================================================== */

    let observer =
        null;


    function startMonitoring(
        root = document.body
    ) {

        if (
            observer ||
            !GLOBAL.MutationObserver ||
            !root
        ) {
            return false;
        }

        observer =
            new MutationObserver(
                mutations => {

                    state.warnings += 1;

                    publish(
                        XSS_EVENTS.WARNING,
                        {
                            type:
                                "DOM_MUTATION_OBSERVED",

                            mutations:
                                mutations.length
                        }
                    );
                }
            );

        observer.observe(
            root,
            {
                childList:
                    true,

                subtree:
                    true,

                attributes:
                    true
            }
        );

        state.monitoring =
            true;

        return true;
    }


    function stopMonitoring() {

        if (!observer) {

            state.monitoring =
                false;

            return false;
        }

        observer.disconnect();

        observer =
            null;

        state.monitoring =
            false;

        return true;
    }

    /* ====================================================================
       STATUS
    ==================================================================== */

    function status() {

        return Object.freeze({

            version:
                VERSION,

            sanitizer:
                SANITIZER.version,

            trustedTypes:
                Boolean(
                    TRUSTED_TYPES
                ),

            trustedPolicy:
                Boolean(
                    trustedPolicy
                ),

            cspMetaDetected:
                supportsCSP(),

            monitoring:
                state.monitoring,

            htmlPolicy:
                "SANITIZER_V12_STRICT_ALLOWLIST",

            iframeRendering:
                "DISABLED"
        });
    }

    /* ====================================================================
       SELF TEST
    ==================================================================== */

    function selfTest() {

        const container =
            document.createElement(
                "div"
            );

        const htmlResult =
            setHTML(
                container,
                '<p>PAY54</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'
            );

        const blockedScript =
            !container.innerHTML
                .toLowerCase()
                .includes(
                    "<script"
                );

        const blockedJavascript =
            !container.innerHTML
                .toLowerCase()
                .includes(
                    "javascript:"
                );

        let activeElementBlocked =
            false;

        try {

            createElement(
                "script"
            );

        } catch {

            activeElementBlocked =
                true;
        }

        return Object.freeze({

            ok:
                htmlResult.success === true &&
                blockedScript &&
                blockedJavascript &&
                activeElementBlocked,

            version:
                VERSION,

            sanitizerVersion:
                SANITIZER.version,

            blockedScript,

            blockedJavascript,

            activeElementBlocked,

            trustedTypes:
                Boolean(
                    TRUSTED_TYPES
                ),

            cspMetaDetected:
                supportsCSP()
        });
    }

    /* ====================================================================
       DISPATCH REGISTRY
    ==================================================================== */

    const OPERATIONS =
        Object.freeze({

            setText,
            setHTML,
            appendHTML,
            clear,
            replaceChildren,

            createElement,
            createFragment,
            createTextNode,

            setAttribute,
            removeAttribute,

            createLink,
            createDownloadLink,
            createButton,
            createListItem,

            setImageSource,
            setIframeSource,

            render,
            createTrustedHTML,

            startMonitoring,
            stopMonitoring,

            status,
            selfTest
        });


    function run(
        operation,
        ...args
    ) {

        const fn =
            OPERATIONS[
                operation
            ];

        if (
            typeof fn !== "function"
        ) {

            state.warnings += 1;

            publish(
                XSS_EVENTS.WARNING,
                {
                    operation,

                    warning:
                        "UNKNOWN_OPERATION"
                }
            );

            return result(
                false,
                [
                    "UNKNOWN_OPERATION"
                ]
            );
        }

        return fn(
            ...args
        );
    }


    function has(
        operation
    ) {

        return Object.prototype
            .hasOwnProperty.call(
                OPERATIONS,
                operation
            );
    }


    function list() {

        return Object.keys(
            OPERATIONS
        )
        .sort();
    }

    /* ====================================================================
       HEALTH / INTEGRITY
    ==================================================================== */

    function verifyIntegrity() {

        const errors =
            [];

        if (
            !SANITIZER ||
            SANITIZER.version !== "12.0.0" ||
            SANITIZER.health?.()?.healthy !== true
        ) {

            errors.push(
                "Sanitizer v12 is unavailable or unhealthy."
            );
        }

        if (
            !REGISTRY ||
            typeof REGISTRY.has !== "function"
        ) {

            errors.push(
                "Platform Registry is unavailable."
            );
        }

        if (
            !CONFIG ||
            typeof CONFIG.get !== "function"
        ) {

            errors.push(
                "Runtime Config is unavailable."
            );
        }

        const required = [

            "setText",
            "setHTML",
            "appendHTML",
            "createElement",
            "setAttribute",
            "createLink",
            "setImageSource",
            "setIframeSource"
        ];

        for (
            const name
            of required
        ) {

            if (!has(name)) {

                errors.push(
                    `Required XSS operation missing: ${name}.`
                );
            }
        }

        return Object.freeze({

            ok:
                errors.length === 0,

            status:
                errors.length === 0
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

            renders:
                state.renders,

            blocked:
                state.blocked,

            warnings:
                state.warnings,

            attributeWrites:
                state.attributeWrites,

            monitoring:
                state.monitoring,

            sanitizerVersion:
                SANITIZER.version,

            trustedTypesSupported:
                Boolean(
                    TRUSTED_TYPES
                ),

            cspMetaDetected:
                supportsCSP(),

            iframeRendering:
                "DISABLED",

            lastError:
                state.lastError,

            integrity
        });
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const api =
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

            status,
            selfTest,
            verifyIntegrity,
            health,

            operations:
                OPERATIONS,

            setText,
            setHTML,
            appendHTML,
            clear,
            replaceChildren,

            createElement,
            createFragment,
            createTextNode,

            setAttribute,
            removeAttribute,

            createLink,
            createDownloadLink,
            createButton,
            createListItem,

            setImageSource,
            setIframeSource,

            render,
            createTrustedHTML,

            startMonitoring,
            stopMonitoring
        });

    /* ====================================================================
       SECURITY ROOT
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
        "xss",
        {
            value:
                api,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    /* ====================================================================
       PLATFORM REGISTRY
    ==================================================================== */

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

            api,

            health
        })
    );

    /* ====================================================================
       READY
    ==================================================================== */

    state.ready =
        true;

    state.readyAt =
        nowISO();

    publish(
        XSS_EVENTS.READY,
        {
            version:
                VERSION,

            sanitizerVersion:
                SANITIZER.version,

            readyAt:
                state.readyAt
        }
    );

    console.info(
        `[PAY54_XSS] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
