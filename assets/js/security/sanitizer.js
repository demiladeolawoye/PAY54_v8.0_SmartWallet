/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/sanitizer.js
   Version: v11.0.0
   Module: WP-003D Enterprise Sanitization Engine
   ------------------------------------------------------------------------
   Responsibilities

   • Enterprise sanitization engine
   • HTML sanitization
   • URL sanitization
   • JSON sanitization
   • Filename sanitization
   • Rich text normalization
   • API payload sanitization
   • Event Bus integration
   • Zero duplicated sanitization logic
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

/* ========================================================================
   SANITIZATION EVENTS
======================================================================== */

const SANITIZER_EVENTS =
Object.freeze({

    SANITIZED:
        "sanitizer.sanitized",

    WARNING:
        "sanitizer.warning",

    BLOCKED:
        "sanitizer.blocked"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publishSanitizerEvent(

    eventName,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                eventName,

                payload,

                {

                    source:

                    "sanitizer"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_SANITIZER]",

            eventName,

            error

        );

    }

}

/* ========================================================================
   ENGINE CONSTANTS
======================================================================== */

const VERSION =
"11.0.0";

/* ========================================================================
   UTILITIES
======================================================================== */

function isObject(value){

    return (

        value !== null &&

        typeof value === "object" &&

        !Array.isArray(value)

    );

}

function isString(value){

    return typeof value === "string";

}

function isArray(value){

    return Array.isArray(value);

}

function clone(value){

    if(

        typeof structuredClone === "function"

    ){

        return structuredClone(value);

    }

    return JSON.parse(

        JSON.stringify(value)

    );

}

function normalizeWhitespace(value){

    return value

        .replace(/\r\n/g,"\n")

        .replace(/\r/g,"\n")

        .replace(/[ \t]+/g," ")

        .trim();

}

/* ========================================================================
   SANITIZATION RESULT
======================================================================== */

function createResult(

    value,

    modified,

    warnings = []

){

    return {

        value,

        modified,

        warnings,

        timestamp:

            new Date()

            .toISOString()

    };

}
/* ========================================================================
   HTML SANITIZATION
======================================================================== */

const HTML_PATTERNS = Object.freeze({

    SCRIPT:
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,

    IFRAME:
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,

    OBJECT:
        /<object[\s\S]*?>[\s\S]*?<\/object>/gi,

    EMBED:
        /<embed[\s\S]*?>[\s\S]*?<\/embed>/gi,

    EVENT_ATTRIBUTES:
        /\son[a-z]+\s*=\s*(['"]).*?\1/gi,

    JAVASCRIPT_PROTOCOL:
        /javascript\s*:/gi

});

function sanitizeHTML(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            value,

            false

        );

    }

    let sanitized = value;

    const warnings = [];

    Object.entries(

        HTML_PATTERNS

    ).forEach(

        ([name,pattern])=>{

            if(

                pattern.test(sanitized)

            ){

                sanitized = sanitized.replace(

                    pattern,

                    ""

                );

                warnings.push(name);

            }

            pattern.lastIndex = 0;

        }

    );

    publishSanitizerEvent(

        SANITIZER_EVENTS.SANITIZED,

        {

            type:"html",

            modified:

                sanitized !== value

        }

    );

    return createResult(

        sanitized,

        sanitized !== value,

        warnings

    );

}

/* ========================================================================
   URL SANITIZATION
======================================================================== */

function sanitizeURL(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "",

            true

        );

    }

    const trimmed =

        normalizeWhitespace(value);

    try{

        const url =

            new URL(

                trimmed,

                window.location.origin

            );

        if(

            !["http:","https:"]

            .includes(

                url.protocol

            )

        ){

            publishSanitizerEvent(

                SANITIZER_EVENTS.BLOCKED,

                {

                    type:"url",

                    protocol:

                        url.protocol

                }

            );

            return createResult(

                "",

                true,

                [

                    "UNSUPPORTED_PROTOCOL"

                ]

            );

        }

        return createResult(

            url.toString(),

            url.toString() !== value

        );

    }catch{

        publishSanitizerEvent(

            SANITIZER_EVENTS.BLOCKED,

            {

                type:"url"

            }

        );

        return createResult(

            "",

            true,

            [

                "INVALID_URL"

            ]

        );

    }

}

/* ========================================================================
   TEXT SANITIZATION
======================================================================== */

function sanitizeText(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "",

            true

        );

    }

    const normalized =

        normalizeWhitespace(

            value

        )

        .replace(

            /\u0000/g,

            ""

        );

    return createResult(

        normalized,

        normalized !== value

    );

}

/* ========================================================================
   FILENAME SANITIZATION
======================================================================== */

function sanitizeFilename(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "file",

            true

        );

    }

    const sanitized =

        normalizeWhitespace(value)

        .replace(

            /[<>:"/\\|?*\x00-\x1F]/g,

            "_"

        )

        .replace(

            /\.+$/,

            ""

        );

    return createResult(

        sanitized,

        sanitized !== value

    );

}

/* ========================================================================
   EMAIL NORMALIZATION
======================================================================== */

function sanitizeEmail(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "",

            true

        );

    }

    const sanitized =

        normalizeWhitespace(

            value

        )

        .toLowerCase();

    return createResult(

        sanitized,

        sanitized !== value

    );

}
  /* ========================================================================
   ARRAY SANITIZATION
======================================================================== */

function sanitizeArray(

    values,

    sanitizer = sanitizeText

){

    if(

        !isArray(values)

    ){

        return createResult(

            [],

            true,

            [

                "INVALID_ARRAY"

            ]

        );

    }

    const sanitized = [];
    const warnings = [];
    let modified = false;

    values.forEach(item=>{

        const result =

            sanitizer(item);

        sanitized.push(

            result.value

        );

        modified ||=

            result.modified;

        if(

            result.warnings.length

        ){

            warnings.push(

                ...result.warnings

            );

        }

    });

    return createResult(

        sanitized,

        modified,

        warnings

    );

}

/* ========================================================================
   OBJECT SANITIZATION
======================================================================== */

function sanitizeObject(

    object,

    sanitizer = sanitizeText

){

    if(

        !isObject(object)

    ){

        return createResult(

            {},

            true,

            [

                "INVALID_OBJECT"

            ]

        );

    }

    const cloneObject = {};
    const warnings = [];
    let modified = false;

    Object.entries(object)

    .forEach(

        ([key,value])=>{

            let result;

            if(

                isString(value)

            ){

                result =

                    sanitizer(

                        value

                    );

            }

            else if(

                isArray(value)

            ){

                result =

                    sanitizeArray(

                        value,

                        sanitizer

                    );

            }

            else if(

                isObject(value)

            ){

                result =

                    sanitizeObject(

                        value,

                        sanitizer

                    );

            }

            else{

                result =

                    createResult(

                        value,

                        false

                    );

            }

            cloneObject[key] =

                result.value;

            modified ||=

                result.modified;

            if(

                result.warnings.length

            ){

                warnings.push(

                    ...result.warnings

                );

            }

        }

    );

    return createResult(

        cloneObject,

        modified,

        warnings

    );

}

/* ========================================================================
   JSON SANITIZATION
======================================================================== */

function sanitizeJSON(

    payload

){

    if(

        isString(payload)

    ){

        try{

            payload =

                JSON.parse(

                    payload

                );

        }

        catch{

            return createResult(

                {},

                true,

                [

                    "INVALID_JSON"

                ]

            );

        }

    }

    return sanitizeObject(

        payload

    );

}

/* ========================================================================
   API PAYLOAD SANITIZATION
======================================================================== */

function sanitizePayload(

    payload

){

    const result =

        sanitizeObject(

            payload

        );

    publishSanitizerEvent(

        SANITIZER_EVENTS.SANITIZED,

        {

            type:

                "payload",

            modified:

                result.modified

        }

    );

    return result;

}

/* ========================================================================
   QUERY PARAMETER SANITIZATION
======================================================================== */

function sanitizeQueryParameters(

    params

){

    if(

        !(params instanceof URLSearchParams)

    ){

        return createResult(

            {},

            true,

            [

                "INVALID_PARAMETERS"

            ]

        );

    }

    const clean = {};

    let modified = false;

    params.forEach(

        (value,key)=>{

            const result =

                sanitizeText(

                    value

                );

            clean[key] =

                result.value;

            modified ||=

                result.modified;

        }

    );

    return createResult(

        clean,

        modified

    );

}

/* ========================================================================
   DEEP SANITIZATION
======================================================================== */

function deepSanitize(

    value

){

    if(

        isString(value)

    ){

        return sanitizeText(

            value

        );

    }

    if(

        isArray(value)

    ){

        return sanitizeArray(

            value,

            deepSanitize

        );

    }

    if(

        isObject(value)

    ){

        return sanitizeObject(

            value,

            deepSanitize

        );

    }

    return createResult(

        clone(value),

        false

    );

}
 /* ========================================================================
   HTML OUTPUT ENCODING
======================================================================== */

const HTML_ENTITIES = Object.freeze({

    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
    "/": "&#47;"

});

function encodeHTML(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "",

            true

        );

    }

    const encoded =

        value.replace(

            /[&<>"'/]/g,

            character =>

                HTML_ENTITIES[character]

        );

    return createResult(

        encoded,

        encoded !== value

    );

}

/* ========================================================================
   ATTRIBUTE ENCODING
======================================================================== */

function encodeAttribute(

    value

){

    return encodeHTML(

        normalizeWhitespace(

            String(

                value ?? ""

            )

        )

    );

}

/* ========================================================================
   JAVASCRIPT STRING ENCODING
======================================================================== */

function encodeJavaScript(

    value

){

    if(

        !isString(value)

    ){

        return createResult(

            "",

            true

        );

    }

    const encoded =

        value.replace(

            /[\u2028\u2029\\'"]/g,

            character => {

                switch(character){

                    case "\\":
                        return "\\\\";

                    case "'":
                        return "\\'";

                    case "\"":
                        return "\\\"";

                    case "\u2028":
                        return "\\u2028";

                    case "\u2029":
                        return "\\u2029";

                    default:
                        return character;

                }

            }

        );

    return createResult(

        encoded,

        encoded !== value

    );

}

/* ========================================================================
   URL COMPONENT ENCODING
======================================================================== */

function encodeURLComponent(

    value

){

    const encoded =

        encodeURIComponent(

            normalizeWhitespace(

                String(

                    value ?? ""

                )

            )

        );

    return createResult(

        encoded,

        encoded !== value

    );

}

/* ========================================================================
   LOG SANITIZATION
======================================================================== */

function sanitizeLogValue(

    value

){

    if(

        isString(value)

    ){

        return sanitizeText(

            value

                .replace(

                    /[\r\n]+/g,

                    " "

                )

        );

    }

    return deepSanitize(

        value

    );

}

/* ========================================================================
   PAYMENT MEMO SANITIZATION
======================================================================== */

function sanitizePaymentReference(

    value

){

    const result =

        sanitizeText(

            value

        );

    result.value =

        result.value

        .replace(

            /[^A-Za-z0-9\s\-_.]/g,

            ""

        )

        .substring(

            0,

            140

        );

    result.modified =

        result.modified ||

        result.value !== value;

    return result;

}

/* ========================================================================
   DISPLAY NAME SANITIZATION
======================================================================== */

function sanitizeDisplayName(

    value

){

    const result =

        sanitizeText(

            value

        );

    result.value =

        result.value

        .replace(

            /\s{2,}/g,

            " "

        )

        .substring(

            0,

            80

        );

    result.modified =

        result.modified ||

        result.value !== value;

    return result;

}

/* ========================================================================
   SECURITY PIPELINE
======================================================================== */

function sanitizeSecurePayload(

    payload

){

    const result =

        deepSanitize(

            payload

        );

    publishSanitizerEvent(

        SANITIZER_EVENTS.SANITIZED,

        {

            type:

                "secure-payload",

            modified:

                result.modified,

            warningCount:

                result.warnings.length

        }

    );

    return result;

}
  /* ========================================================================
   SANITIZER REGISTRY
======================================================================== */

const SANITIZERS = Object.freeze({

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

    encodeHTML:
        encodeHTML,

    encodeAttribute:
        encodeAttribute,

    encodeJavaScript:
        encodeJavaScript,

    encodeURLComponent:
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

/* ========================================================================
   SANITIZER DISPATCHER
======================================================================== */

function run(

    sanitizer,

    ...args

){

    const fn =

        SANITIZERS[sanitizer];

    if(

        typeof fn !== "function"

    ){

        publishSanitizerEvent(

            SANITIZER_EVENTS.WARNING,

            {

                sanitizer

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

    return fn(...args);

}

function has(

    sanitizer

){

    return Object.prototype.hasOwnProperty.call(

        SANITIZERS,

        sanitizer

    );

}

function list(){

    return Object.keys(

        SANITIZERS

    ).sort();

}

/* ========================================================================
   PUBLIC API
======================================================================== */

const sanitizer = Object.freeze({

    version:
        VERSION,

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
        sanitizeSecurePayload

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "sanitizer",

    {

        value: sanitizer,

        writable: false,

        configurable: false,

        enumerable: true

    }

);

/* ========================================================================
   STARTUP
======================================================================== */

console.info(

    "[PAY54]",

    "Enterprise Sanitizer",

    VERSION,

    "loaded"

);

/* ========================================================================
   MODULE COMPLETE
======================================================================== */

})();
