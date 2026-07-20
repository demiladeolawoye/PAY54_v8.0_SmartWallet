/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/validator.js
   Version: v11.0.0
   Module: WP-003C Enterprise Validation Engine
   ------------------------------------------------------------------------
   Responsibilities

   • Central validation engine
   • Rule-based validation
   • Financial validation
   • Security validation
   • Input validation
   • Payload validation
   • Event Bus integration
   • Zero duplicated validation logic
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

/* ========================================================================
   VALIDATION EVENTS
======================================================================== */

const VALIDATION_EVENTS =
Object.freeze({

    PASSED:
        "validation.passed",

    FAILED:
        "validation.failed",

    WARNING:
        "validation.warning"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publishValidationEvent(

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

                    "validator"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_VALIDATOR]",

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

function isNumber(value){

    return (

        typeof value === "number" &&

        Number.isFinite(value)

    );

}

function isInteger(value){

    return Number.isInteger(value);

}

function isBoolean(value){

    return typeof value === "boolean";

}

function isArray(value){

    return Array.isArray(value);

}

function isFunction(value){

    return typeof value === "function";

}

function isDefined(value){

    return (

        value !== undefined &&

        value !== null

    );

}

function normalizeString(value){

    return isString(value)

        ? value.trim()

        : "";

}

/* ========================================================================
   VALIDATION RESULT FACTORY
======================================================================== */

function createResult(

    valid = true,

    message = "",

    code = "OK",

    details = {}

){

    return {

        valid,

        message,

        code,

        details,

        timestamp:

            new Date()

            .toISOString()

    };

}
  /* ========================================================================
   CORE PATTERNS
======================================================================== */

const REGEX = Object.freeze({

    EMAIL:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    PHONE_E164:
        /^\+?[1-9]\d{7,14}$/,

    UUID:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

    ISO_CURRENCY:
        /^[A-Z]{3}$/,

    WALLET_ID:
        /^PAY54-[A-Z0-9]{8,32}$/,

    TRANSACTION_REFERENCE:
        /^[A-Z0-9_-]{8,64}$/,

    ACCOUNT_REFERENCE:
        /^[A-Z0-9]{6,40}$/,

    USERNAME:
        /^[A-Za-z0-9._-]{3,32}$/

});

/* ========================================================================
   RULE HELPERS
======================================================================== */

function pass(

    message = "Validation passed",

    details = {}

){

    return createResult(

        true,

        message,

        "OK",

        details

    );

}

function fail(

    message,

    code,

    details = {}

){

    return createResult(

        false,

        message,

        code,

        details

    );

}

/* ========================================================================
   STRING VALIDATION
======================================================================== */

function validateRequired(

    value,

    field = "Value"

){

    if(

        !isDefined(value)

    ){

        publishValidationEvent(

            VALIDATION_EVENTS.FAILED,

            {

                field,

                reason:"Required"

            }

        );

        return fail(

            `${field} is required`,

            "REQUIRED"

        );

    }

    if(

        isString(value) &&

        normalizeString(value) === ""

    ){

        publishValidationEvent(

            VALIDATION_EVENTS.FAILED,

            {

                field,

                reason:"Empty"

            }

        );

        return fail(

            `${field} cannot be empty`,

            "EMPTY"

        );

    }

    publishValidationEvent(

        VALIDATION_EVENTS.PASSED,

        {

            field

        }

    );

    return pass();

}

function validateLength(

    value,

    minimum,

    maximum,

    field = "Value"

){

    const text =

        normalizeString(value);

    if(

        text.length < minimum

    ){

        return fail(

            `${field} is too short`,

            "MIN_LENGTH",

            {

                minimum

            }

        );

    }

    if(

        text.length > maximum

    ){

        return fail(

            `${field} exceeds maximum length`,

            "MAX_LENGTH",

            {

                maximum

            }

        );

    }

    return pass();

}

/* ========================================================================
   EMAIL
======================================================================== */

function validateEmail(

    value

){

    const email =

        normalizeString(value);

    if(

        !REGEX.EMAIL.test(email)

    ){

        publishValidationEvent(

            VALIDATION_EVENTS.FAILED,

            {

                validator:"email"

            }

        );

        return fail(

            "Invalid email address",

            "INVALID_EMAIL"

        );

    }

    publishValidationEvent(

        VALIDATION_EVENTS.PASSED,

        {

            validator:"email"

        }

    );

    return pass();

}

/* ========================================================================
   PHONE
======================================================================== */

function validatePhone(

    value

){

    const phone =

        normalizeString(value);

    if(

        !REGEX.PHONE_E164.test(phone)

    ){

        return fail(

            "Invalid phone number",

            "INVALID_PHONE"

        );

    }

    return pass();

}

/* ========================================================================
   UUID
======================================================================== */

function validateUUID(

    value

){

    if(

        !REGEX.UUID.test(

            normalizeString(value)

        )

    ){

        return fail(

            "Invalid UUID",

            "INVALID_UUID"

        );

    }

    return pass();

}

/* ========================================================================
   CURRENCY
======================================================================== */

function validateCurrency(

    value

){

    const currency =

        normalizeString(value)

        .toUpperCase();

    if(

        !REGEX.ISO_CURRENCY.test(

            currency

        )

    ){

        return fail(

            "Invalid currency code",

            "INVALID_CURRENCY"

        );

    }

    return pass();

}

/* ========================================================================
   MONEY
======================================================================== */

function validateAmount(

    amount,

    minimum = 0,

    maximum = Number.MAX_SAFE_INTEGER

){

    if(

        !isNumber(amount)

    ){

        return fail(

            "Amount must be numeric",

            "INVALID_AMOUNT"

        );

    }

    if(

        amount < minimum

    ){

        return fail(

            "Amount below minimum",

            "MIN_AMOUNT",

            {

                minimum

            }

        );

    }

    if(

        amount > maximum

    ){

        return fail(

            "Amount exceeds maximum",

            "MAX_AMOUNT",

            {

                maximum

            }

        );

    }

    return pass();

}

/* ========================================================================
   WALLET ID
======================================================================== */

function validateWalletId(

    walletId

){

    if(

        !REGEX.WALLET_ID.test(

            normalizeString(walletId)

        )

    ){

        return fail(

            "Invalid wallet identifier",

            "INVALID_WALLET_ID"

        );

    }

    return pass();

}

/* ========================================================================
   TRANSACTION REFERENCE
======================================================================== */

function validateTransactionReference(

    reference

){

    if(

        !REGEX.TRANSACTION_REFERENCE.test(

            normalizeString(reference)

        )

    ){

        return fail(

            "Invalid transaction reference",

            "INVALID_REFERENCE"

        );

    }

    return pass();

}
  /* ========================================================================
   FINANCIAL VALIDATION
======================================================================== */

function validateBalance(

    balance,

    minimum = 0

){

    if(

        !isNumber(balance)

    ){

        return fail(

            "Invalid balance",

            "INVALID_BALANCE"

        );

    }

    if(

        balance < minimum

    ){

        return fail(

            "Balance below minimum",

            "MIN_BALANCE",

            {

                minimum

            }

        );

    }

    return pass();

}

function validateExchangeRate(

    rate

){

    if(

        !isNumber(rate)

    ){

        return fail(

            "Invalid exchange rate",

            "INVALID_RATE"

        );

    }

    if(

        rate <= 0

    ){

        return fail(

            "Exchange rate must be greater than zero",

            "INVALID_RATE"

        );

    }

    return pass();

}

/* ========================================================================
   PAYMENT LIMITS
======================================================================== */

function validateLimit(

    amount,

    minimum,

    maximum,

    field = "Amount"

){

    const result =

        validateAmount(

            amount,

            minimum,

            maximum

        );

    if(

        !result.valid

    ){

        return fail(

            `${field} outside permitted range`,

            result.code,

            {

                minimum,

                maximum

            }

        );

    }

    return pass();

}

/* ========================================================================
   ACCOUNT NUMBER
======================================================================== */

function validateAccountNumber(

    accountNumber

){

    const value =

        normalizeString(

            accountNumber

        );

    if(

        !/^\d{6,20}$/

        .test(value)

    ){

        return fail(

            "Invalid account number",

            "INVALID_ACCOUNT_NUMBER"

        );

    }

    return pass();

}

/* ========================================================================
   SORT CODE (UK)
======================================================================== */

function validateSortCode(

    sortCode

){

    const value =

        normalizeString(

            sortCode

        )

        .replace(

            /-/g,

            ""

        );

    if(

        !/^\d{6}$/

        .test(value)

    ){

        return fail(

            "Invalid sort code",

            "INVALID_SORT_CODE"

        );

    }

    return pass();

}

/* ========================================================================
   IBAN
======================================================================== */

function validateIBAN(

    iban

){

    const value =

        normalizeString(

            iban

        )

        .replace(

            /\s+/g,

            ""

        )

        .toUpperCase();

    if(

        value.length < 15 ||

        value.length > 34

    ){

        return fail(

            "Invalid IBAN length",

            "INVALID_IBAN"

        );

    }

    if(

        !/^[A-Z]{2}[0-9A-Z]+$/

        .test(value)

    ){

        return fail(

            "Invalid IBAN",

            "INVALID_IBAN"

        );

    }

    return pass();

}

/* ========================================================================
   CARD NUMBER (LUHN)
======================================================================== */

function validateCardNumber(

    cardNumber

){

    const digits =

        normalizeString(

            cardNumber

        )

        .replace(

            /\s+/g,

            ""

        );

    if(

        !/^\d{12,19}$/

        .test(digits)

    ){

        return fail(

            "Invalid card number",

            "INVALID_CARD"

        );

    }

    let sum = 0;

    let doubleDigit = false;

    for(

        let i =

            digits.length - 1;

        i >= 0;

        i--

    ){

        let digit =

            Number(

                digits.charAt(i)

            );

        if(

            doubleDigit

        ){

            digit *= 2;

            if(

                digit > 9

            ){

                digit -= 9;

            }

        }

        sum += digit;

        doubleDigit =

            !doubleDigit;

    }

    if(

        sum % 10 !== 0

    ){

        return fail(

            "Card checksum failed",

            "INVALID_CARD"

        );

    }

    return pass();

}

/* ========================================================================
   CARD EXPIRY
======================================================================== */

function validateCardExpiry(

    month,

    year

){

    if(

        !isInteger(month) ||

        !isInteger(year)

    ){

        return fail(

            "Invalid expiry date",

            "INVALID_EXPIRY"

        );

    }

    if(

        month < 1 ||

        month > 12

    ){

        return fail(

            "Invalid expiry month",

            "INVALID_EXPIRY"

        );

    }

    const today =

        new Date();

    const expiry =

        new Date(

            year,

            month

        );

    if(

        expiry <= today

    ){

        return fail(

            "Card has expired",

            "CARD_EXPIRED"

        );

    }

    return pass();

}

/* ========================================================================
   CVV
======================================================================== */

function validateCVV(

    cvv

){

    if(

        !/^\d{3,4}$/

        .test(

            normalizeString(cvv)

        )

    ){

        return fail(

            "Invalid CVV",

            "INVALID_CVV"

        );

    }

    return pass();

}

/* ========================================================================
   FX PAIR
======================================================================== */

function validateCurrencyPair(

    fromCurrency,

    toCurrency

){

    const from =

        validateCurrency(

            fromCurrency

        );

    if(

        !from.valid

    ){

        return from;

    }

    const to =

        validateCurrency(

            toCurrency

        );

    if(

        !to.valid

    ){

        return to;

    }

    if(

        fromCurrency ===

        toCurrency

    ){

        return fail(

            "Currencies must differ",

            "INVALID_FX_PAIR"

        );

    }

    return pass();

}
  /* ========================================================================
   SECURITY VALIDATION
======================================================================== */

/* ========================================================================
   PASSWORD
======================================================================== */

function validatePassword(

    password,

    options = {}

){

    const config = {

        minLength: options.minLength ?? 12,

        requireUpper: options.requireUpper ?? true,

        requireLower: options.requireLower ?? true,

        requireDigit: options.requireDigit ?? true,

        requireSpecial: options.requireSpecial ?? true

    };

    const value = normalizeString(password);

    if(value.length < config.minLength){

        return fail(

            "Password does not meet minimum length",

            "PASSWORD_LENGTH"

        );

    }

    if(config.requireUpper && !/[A-Z]/.test(value)){

        return fail(

            "Password must contain an uppercase letter",

            "PASSWORD_UPPERCASE"

        );

    }

    if(config.requireLower && !/[a-z]/.test(value)){

        return fail(

            "Password must contain a lowercase letter",

            "PASSWORD_LOWERCASE"

        );

    }

    if(config.requireDigit && !/\d/.test(value)){

        return fail(

            "Password must contain a number",

            "PASSWORD_DIGIT"

        );

    }

    if(

        config.requireSpecial &&

        !/[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(value)

    ){

        return fail(

            "Password must contain a special character",

            "PASSWORD_SPECIAL"

        );

    }

    return pass();

}

/* ========================================================================
   PIN
======================================================================== */

function validatePIN(

    pin,

    length = 4

){

    const value = normalizeString(pin);

    const regex =

        new RegExp(

            `^\\d{${length}}$`

        );

    if(

        !regex.test(value)

    ){

        return fail(

            "Invalid PIN",

            "INVALID_PIN"

        );

    }

    return pass();

}

/* ========================================================================
   OTP
======================================================================== */

function validateOTP(

    otp,

    length = 6

){

    const value = normalizeString(otp);

    const regex =

        new RegExp(

            `^\\d{${length}}$`

        );

    if(

        !regex.test(value)

    ){

        return fail(

            "Invalid one-time password",

            "INVALID_OTP"

        );

    }

    return pass();

}

/* ========================================================================
   SESSION TOKEN
======================================================================== */

function validateSessionId(

    sessionId

){

    return validateUUID(sessionId);

}

/* ========================================================================
   API TOKEN
======================================================================== */

function validateApiToken(

    token

){

    const value = normalizeString(token);

    if(

        value.length < 32

    ){

        return fail(

            "Invalid API token",

            "INVALID_API_TOKEN"

        );

    }

    return pass();

}

/* ========================================================================
   CSRF TOKEN
======================================================================== */

function validateCSRFToken(

    token

){

    const value = normalizeString(token);

    if(

        value.length < 32

    ){

        return fail(

            "Invalid CSRF token",

            "INVALID_CSRF"

        );

    }

    return pass();

}

/* ========================================================================
   JSON PAYLOAD
======================================================================== */

function validatePayload(

    payload

){

    if(

        !isObject(payload)

    ){

        return fail(

            "Payload must be an object",

            "INVALID_PAYLOAD"

        );

    }

    return pass();

}

/* ========================================================================
   FILE VALIDATION
======================================================================== */

function validateFile(

    file,

    options = {}

){

    if(

        !file

    ){

        return fail(

            "No file supplied",

            "FILE_REQUIRED"

        );

    }

    const maxSize =

        options.maxSize ??

        5 * 1024 * 1024;

    if(

        file.size >

        maxSize

    ){

        return fail(

            "File exceeds maximum size",

            "FILE_TOO_LARGE"

        );

    }

    if(

        Array.isArray(

            options.allowedTypes

        ) &&

        options.allowedTypes.length > 0

    ){

        if(

            !options.allowedTypes.includes(

                file.type

            )

        ){

            return fail(

                "Unsupported file type",

                "INVALID_FILE_TYPE"

            );

        }

    }

    return pass();

}

/* ========================================================================
   SECURITY PATTERN DETECTION
======================================================================== */

const SECURITY_PATTERNS = Object.freeze({

    XSS: /<script|javascript:|onerror=|onload=|<iframe|<object/i,

    SQL: /('|--|;|\/\*|\*\/|\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i

});

function detectXSS(

    value

){

    if(

        !isString(value)

    ){

        return pass();

    }

    if(

        SECURITY_PATTERNS.XSS.test(value)

    ){

        return fail(

            "Potential XSS payload detected",

            "XSS_DETECTED"

        );

    }

    return pass();

}

function detectSQLInjection(

    value

){

    if(

        !isString(value)

    ){

        return pass();

    }

    if(

        SECURITY_PATTERNS.SQL.test(value)

    ){

        return fail(

            "Potential SQL injection detected",

            "SQL_INJECTION"

        );

    }

    return pass();

}

/* ========================================================================
   COMPOSITE SECURITY VALIDATION
======================================================================== */

function validateSecureInput(

    value,

    field = "Input"

){

    const required =

        validateRequired(

            value,

            field

        );

    if(

        !required.valid

    ){

        return required;

    }

    const xss =

        detectXSS(value);

    if(

        !xss.valid

    ){

        return xss;

    }

    const sql =

        detectSQLInjection(value);

    if(

        !sql.valid

    ){

        return sql;

    }

    return pass();

}
  /* ========================================================================
   VALIDATION REGISTRY
======================================================================== */

const VALIDATORS = Object.freeze({

    required:
        validateRequired,

    length:
        validateLength,

    email:
        validateEmail,

    phone:
        validatePhone,

    uuid:
        validateUUID,

    currency:
        validateCurrency,

    amount:
        validateAmount,

    walletId:
        validateWalletId,

    transactionReference:
        validateTransactionReference,

    balance:
        validateBalance,

    exchangeRate:
        validateExchangeRate,

    limit:
        validateLimit,

    accountNumber:
        validateAccountNumber,

    sortCode:
        validateSortCode,

    iban:
        validateIBAN,

    cardNumber:
        validateCardNumber,

    cardExpiry:
        validateCardExpiry,

    cvv:
        validateCVV,

    currencyPair:
        validateCurrencyPair,

    password:
        validatePassword,

    pin:
        validatePIN,

    otp:
        validateOTP,

    sessionId:
        validateSessionId,

    apiToken:
        validateApiToken,

    csrfToken:
        validateCSRFToken,

    payload:
        validatePayload,

    file:
        validateFile,

    xss:
        detectXSS,

    sqlInjection:
        detectSQLInjection,

    secureInput:
        validateSecureInput

});

/* ========================================================================
   VALIDATOR DISPATCHER
======================================================================== */

function run(

    validator,

    ...args

){

    const fn =

        VALIDATORS[validator];

    if(

        !isFunction(fn)

    ){

        return fail(

            `Unknown validator: ${validator}`,

            "UNKNOWN_VALIDATOR"

        );

    }

    return fn(...args);

}

function list(){

    return Object.keys(

        VALIDATORS

    ).sort();

}

function has(

    validator

){

    return Object.prototype.hasOwnProperty.call(

        VALIDATORS,

        validator

    );

}

/* ========================================================================
   PUBLIC API
======================================================================== */

const validator = Object.freeze({

    version:
        VERSION,

    run,

    has,

    list,

    validators:
        VALIDATORS,

    required:
        validateRequired,

    length:
        validateLength,

    email:
        validateEmail,

    phone:
        validatePhone,

    uuid:
        validateUUID,

    currency:
        validateCurrency,

    amount:
        validateAmount,

    walletId:
        validateWalletId,

    transactionReference:
        validateTransactionReference,

    balance:
        validateBalance,

    exchangeRate:
        validateExchangeRate,

    limit:
        validateLimit,

    accountNumber:
        validateAccountNumber,

    sortCode:
        validateSortCode,

    iban:
        validateIBAN,

    cardNumber:
        validateCardNumber,

    cardExpiry:
        validateCardExpiry,

    cvv:
        validateCVV,

    currencyPair:
        validateCurrencyPair,

    password:
        validatePassword,

    pin:
        validatePIN,

    otp:
        validateOTP,

    sessionId:
        validateSessionId,

    apiToken:
        validateApiToken,

    csrfToken:
        validateCSRFToken,

    payload:
        validatePayload,

    file:
        validateFile,

    xss:
        detectXSS,

    sqlInjection:
        detectSQLInjection,

    secureInput:
        validateSecureInput

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "validator",

    {

        value: validator,

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

    "Enterprise Validator",

    VERSION,

    "loaded"

);

})();
