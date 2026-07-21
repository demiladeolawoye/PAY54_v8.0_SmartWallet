/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/xss.js
   Version: v11.0.0
   Module: WP-003E Enterprise XSS Protection Engine
   ------------------------------------------------------------------------
   Responsibilities

   • Safe DOM rendering
   • Safe HTML rendering
   • Safe text rendering
   • Attribute protection
   • URL protection
   • Trusted rendering pipeline
   • CSP compatibility
   • Trusted Types compatibility hooks
   • DOM security utilities
   • Event Bus integration
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const SANITIZER =
window.PAY54_SECURITY?.sanitizer || null;

/* ========================================================================
   VERSION
======================================================================== */

const VERSION =
"11.0.0";

/* ========================================================================
   XSS EVENTS
======================================================================== */

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
        "xss.link"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publish(

    event,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                event,

                payload,

                {

                    source:

                    "xss"

                }

            );

        }

    }

    catch(error){

        console.error(

            "[PAY54_XSS]",

            error

        );

    }

}

/* ========================================================================
   UTILITIES
======================================================================== */

function isElement(

    value

){

    return (

        value instanceof Element

    );

}

function isString(

    value

){

    return typeof value === "string";

}

function result(

    success,

    warnings = []

){

    return {

        success,

        warnings,

        timestamp:

            new Date()

            .toISOString()

    };

}
  /* ========================================================================
   SAFE TEXT RENDERING
======================================================================== */

function setText(

    element,

    value

){

    if(

        !isElement(element)

    ){

        publish(

            XSS_EVENTS.WARNING,

            {

                operation:

                    "setText"

            }

        );

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    const text =

        String(

            value ?? ""

        );

    element.textContent =

        text;

    publish(

        XSS_EVENTS.RENDER,

        {

            type:

                "text"

        }

    );

    return result(true);

}

/* ========================================================================
   SAFE HTML RENDERING
======================================================================== */

function setHTML(

    element,

    html

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    if(

        !SANITIZER

    ){

        publish(

            XSS_EVENTS.BLOCKED,

            {

                operation:

                    "setHTML",

                reason:

                    "SANITIZER_UNAVAILABLE"

            }

        );

        return result(

            false,

            [

                "SANITIZER_UNAVAILABLE"

            ]

        );

    }

    const sanitized =

        SANITIZER.html(

            String(

                html ?? ""

            )

        );

    element.innerHTML =

        sanitized.value;

    publish(

        XSS_EVENTS.RENDER,

        {

            type:

                "html",

            modified:

                sanitized.modified

        }

    );

    return result(

        true,

        sanitized.warnings

    );

}

/* ========================================================================
   SAFE HTML APPEND
======================================================================== */

function appendHTML(

    element,

    html

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    if(

        !SANITIZER

    ){

        return result(

            false,

            [

                "SANITIZER_UNAVAILABLE"

            ]

        );

    }

    const sanitized =

        SANITIZER.html(

            String(

                html ?? ""

            )

        );

    element.insertAdjacentHTML(

        "beforeend",

        sanitized.value

    );

    publish(

        XSS_EVENTS.RENDER,

        {

            type:

                "append"

        }

    );

    return result(

        true,

        sanitized.warnings

    );

}

/* ========================================================================
   SAFE ELEMENT CLEAR
======================================================================== */

function clear(

    element

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    element.replaceChildren();

    publish(

        XSS_EVENTS.RENDER,

        {

            type:

                "clear"

        }

    );

    return result(true);

}

/* ========================================================================
   SAFE REPLACE CHILDREN
======================================================================== */

function replaceChildren(

    element,

    ...children

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    element.replaceChildren(

        ...children

    );

    publish(

        XSS_EVENTS.RENDER,

        {

            type:

                "replace"

        }

    );

    return result(true);

}

/* ========================================================================
   SAFE DOCUMENT FRAGMENT
======================================================================== */

function createFragment(){

    return document.createDocumentFragment();

}

/* ========================================================================
   SAFE TEXT NODE
======================================================================== */

function createTextNode(

    value

){

    return document.createTextNode(

        String(

            value ?? ""

        )

    );

}

/* ========================================================================
   SAFE ELEMENT CREATION
======================================================================== */

function createElement(

    tag

){

    if(

        !isString(tag)

    ){

        throw new TypeError(

            "Invalid tag"

        );

    }

    return document.createElement(

        tag.toLowerCase()

    );

}
  /* ========================================================================
   SAFE ATTRIBUTE SETTER
======================================================================== */

const BLOCKED_ATTRIBUTES = Object.freeze([

    "onabort",
    "onblur",
    "onchange",
    "onclick",
    "ondblclick",
    "onerror",
    "onfocus",
    "oninput",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onload",
    "onmousedown",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onreset",
    "onresize",
    "onscroll",
    "onsubmit",
    "onunload",
    "style"

]);

function setAttribute(

    element,

    name,

    value

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    const attribute =

        String(

            name ?? ""

        )

        .toLowerCase();

    if(

        BLOCKED_ATTRIBUTES.includes(

            attribute

        )

    ){

        publish(

            XSS_EVENTS.BLOCKED,

            {

                attribute

            }

        );

        return result(

            false,

            [

                "BLOCKED_ATTRIBUTE"

            ]

        );

    }

    const encoded =

        SANITIZER

            ? SANITIZER.encodeAttribute(

                value

            )

            : {

                value:

                    String(

                        value ?? ""

                    )

            };

    element.setAttribute(

        attribute,

        encoded.value

    );

    publish(

        XSS_EVENTS.ATTRIBUTE,

        {

            attribute

        }

    );

    return result(true);

}

/* ========================================================================
   SAFE ATTRIBUTE REMOVAL
======================================================================== */

function removeAttribute(

    element,

    attribute

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    element.removeAttribute(

        attribute

    );

    return result(true);

}

/* ========================================================================
   SAFE LINK BUILDER
======================================================================== */

function createLink(

    url,

    label

){

    const link =

        createElement(

            "a"

        );

    if(

        SANITIZER

    ){

        const safeURL =

            SANITIZER.url(

                url

            );

        link.href =

            safeURL.value;

    }

    else{

        link.href = "#";

    }

    link.rel =

        "noopener noreferrer";

    link.target =

        "_blank";

    setText(

        link,

        label

    );

    publish(

        XSS_EVENTS.LINK,

        {}

    );

    return link;

}

/* ========================================================================
   SAFE IMAGE SOURCE
======================================================================== */

function setImageSource(

    image,

    url

){

    if(

        !(image instanceof HTMLImageElement)

    ){

        return result(

            false,

            [

                "INVALID_IMAGE"

            ]

        );

    }

    const safe =

        SANITIZER

        ? SANITIZER.url(

            url

        )

        : {

            value:""

        };

    image.src =

        safe.value;

    return result(

        true,

        safe.warnings || []

    );

}

/* ========================================================================
   SAFE IFRAME SOURCE
======================================================================== */

function setIframeSource(

    iframe,

    url

){

    if(

        !(iframe instanceof HTMLIFrameElement)

    ){

        return result(

            false,

            [

                "INVALID_IFRAME"

            ]

        );

    }

    return result(

        false,

        [

            "IFRAME_RENDERING_DISABLED"

        ]

    );

}

/* ========================================================================
   SAFE DOWNLOAD LINK
======================================================================== */

function createDownloadLink(

    url,

    filename,

    label

){

    const link =

        createLink(

            url,

            label

        );

    if(

        SANITIZER

    ){

        const safeName =

            SANITIZER.filename(

                filename

            );

        link.download =

            safeName.value;

    }

    return link;

}

/* ========================================================================
   SAFE BUTTON
======================================================================== */

function createButton(

    text,

    type = "button"

){

    const button =

        createElement(

            "button"

        );

    button.type =

        type;

    setText(

        button,

        text

    );

    return button;

}

/* ========================================================================
   SAFE LIST ITEM
======================================================================== */

function createListItem(

    text

){

    const li =

        createElement(

            "li"

        );

    setText(

        li,

        text

    );

    return li;

}
  /* ========================================================================
   TRUSTED TYPES SUPPORT
======================================================================== */

const TRUSTED_TYPES =

    window.trustedTypes || null;

let trustedPolicy = null;

function getTrustedPolicy(){

    if(

        !TRUSTED_TYPES

    ){

        return null;

    }

    if(

        trustedPolicy

    ){

        return trustedPolicy;

    }

    try{

        trustedPolicy =

            TRUSTED_TYPES.createPolicy(

                "pay54",

                {

                    createHTML(value){

                        return SANITIZER
                            ? SANITIZER.html(value).value
                            : String(value);

                    },

                    createScriptURL(value){

                        return SANITIZER
                            ? SANITIZER.url(value).value
                            : "";

                    }

                }

            );

    }

    catch{

        trustedPolicy = null;

    }

    return trustedPolicy;

}

/* ========================================================================
   SAFE TRUSTED HTML
======================================================================== */

function createTrustedHTML(

    html

){

    const policy =

        getTrustedPolicy();

    if(

        policy

    ){

        return policy.createHTML(

            html

        );

    }

    return SANITIZER

        ? SANITIZER.html(

            html

        ).value

        : String(html);

}

/* ========================================================================
   CSP DETECTION
======================================================================== */

function supportsCSP(){

    return Boolean(

        document.querySelector(

            'meta[http-equiv="Content-Security-Policy"]'

        )

    );

}

/* ========================================================================
   SAFE RENDER
======================================================================== */

function render(

    element,

    html

){

    if(

        !isElement(element)

    ){

        return result(

            false,

            [

                "INVALID_ELEMENT"

            ]

        );

    }

    element.innerHTML =

        createTrustedHTML(

            html

        );

    publish(

        XSS_EVENTS.RENDER,

        {

            trusted:

                Boolean(

                    getTrustedPolicy()

                )

        }

    );

    return result(true);

}

/* ========================================================================
   DOM MONITOR
======================================================================== */

let observer = null;

function startMonitoring(

    root = document.body

){

    if(

        observer ||

        !window.MutationObserver ||

        !root

    ){

        return;

    }

    observer =

        new MutationObserver(

            mutations=>{

                publish(

                    XSS_EVENTS.WARNING,

                    {

                        mutations:

                            mutations.length

                    }

                );

            }

        );

    observer.observe(

        root,

        {

            childList:true,

            subtree:true,

            attributes:true

        }

    );

}

/* ========================================================================
   STOP MONITOR
======================================================================== */

function stopMonitoring(){

    if(

        observer

    ){

        observer.disconnect();

        observer = null;

    }

}

/* ========================================================================
   SECURITY STATUS
======================================================================== */

function status(){

    return Object.freeze({

        version:

            VERSION,

        trustedTypes:

            Boolean(

                TRUSTED_TYPES

            ),

        trustedPolicy:

            Boolean(

                trustedPolicy

            ),

        csp:

            supportsCSP(),

        monitoring:

            Boolean(

                observer

            )

    });

}

/* ========================================================================
   SECURITY SELF TEST
======================================================================== */

function selfTest(){

    const report = {

        trustedTypes:

            Boolean(

                TRUSTED_TYPES

            ),

        sanitizer:

            Boolean(

                SANITIZER

            ),

        csp:

            supportsCSP(),

        monitoring:

            Boolean(

                observer

            )

    };

    publish(

        XSS_EVENTS.RENDER,

        {

            selfTest:true

        }

    );

    return Object.freeze(report);

}
  /* ========================================================================
   XSS REGISTRY
======================================================================== */

const XSS = Object.freeze({

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

/* ========================================================================
   DISPATCHER
======================================================================== */

function run(

    operation,

    ...args

){

    const fn =

        XSS[operation];

    if(

        typeof fn !== "function"

    ){

        publish(

            XSS_EVENTS.WARNING,

            {

                operation

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

){

    return Object.prototype.hasOwnProperty.call(

        XSS,

        operation

    );

}

function list(){

    return Object.keys(

        XSS

    ).sort();

}

/* ========================================================================
   PUBLIC API
======================================================================== */

const api = Object.freeze({

    version:

        VERSION,

    run,

    has,

    list,

    status,

    selfTest,

    operations:

        XSS,

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

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

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

/* ========================================================================
   STARTUP
======================================================================== */

publish(

    XSS_EVENTS.RENDER,

    {

        module:

            "xss",

        version:

            VERSION

    }

);

console.info(

    "[PAY54]",

    "Enterprise XSS Engine",

    VERSION,

    "loaded"

);

/* ========================================================================
   MODULE COMPLETE
======================================================================== */

})();  
