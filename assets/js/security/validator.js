"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/validator.js
   Version: v12.0.0
   Module: Titan Enterprise Validation Engine
   Status: Production Candidate
   ------------------------------------------------------------------------
   Purpose
   -------
   Canonical client-side validation surface for PAY54.

   Security model
   --------------
   • Validation improves correctness and UX but never replaces server-side
     validation, authorization, parameterised queries or anti-fraud controls.
   • XSS / SQL checks are heuristic signals only.
   • File MIME validation is advisory client-side validation only.
   • Token validation checks structure only; authenticity belongs to issuer.
======================================================================== */

(() => {

    "use strict";

    /* ====================================================================
       IDENTITY
    ==================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.validator";

    const MODULE_NAME =
        "PAY54 Titan Enterprise Validation Engine";

    const FILE_PATH =
        "assets/js/security/validator.js";

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
            "[PAY54_VALIDATOR] Platform Registry must load before Validator."
        );
    }

    if (
        !CONFIG ||
        typeof CONFIG.get !==
            "function"
    ) {

        throw new Error(
            "[PAY54_VALIDATOR] Runtime Config must load before Validator."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existing =
        GLOBAL.PAY54_SECURITY?.validator ||
        null;

    if (
        existing
    ) {

        if (
            existing.id ===
                MODULE_ID &&
            existing.version ===
                VERSION &&
            typeof existing.health ===
                "function" &&
            typeof existing.run ===
                "function"
        ) {

            console.info(
                "[PAY54_VALIDATOR] Existing Titan Validator preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_VALIDATOR] PAY54_SECURITY.validator already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       EVENTS
    ==================================================================== */

    const VALIDATION_EVENTS =
        Object.freeze({

            PASSED:
                "validation.passed",

            FAILED:
                "validation.failed",

            WARNING:
                "validation.warning",

            READY:
                "security.validator.ready"
        });

    /* ====================================================================
       PRIVATE STATE
    ==================================================================== */

    const state = {

        ready:
            false,

        readyAt:
            null,

        validations:
            0,

        passed:
            0,

        failed:
            0,

        warnings:
            0,

        lastError:
            null
    };

    /* ====================================================================
       CORE PATTERNS
    ==================================================================== */

    const REGEX =
        Object.freeze({

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

    const UNSAFE_OBJECT_KEYS =
        new Set([

            "__proto__",

            "prototype",

            "constructor"
        ]);

    const MAX_PAYLOAD_DEPTH =
        32;

    const MAX_PAYLOAD_KEYS =
        10000;

    /*
     * These patterns are telemetry / suspicious-input signals only.
     * They are not PAY54's XSS or SQL-injection security boundary.
     */
    const SECURITY_PATTERNS =
        Object.freeze({

            XSS:
                /(?:<\s*script\b|javascript\s*:|on(?:error|load|click|mouseover|focus)\s*=|<\s*(?:iframe|object|embed|svg|math)\b)/i,

            SQL:
                /(?:--|\/\*|\*\/|\bunion\s+select\b|\bselect\s+.+\s+from\b|\binsert\s+into\b|\bupdate\s+.+\s+set\b|\bdelete\s+from\b|\bdrop\s+(?:table|database)\b)/i
        });

    /* ====================================================================
       UTILITIES
    ==================================================================== */

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


    function publish(
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


    function isString(
        value
    ) {

        return typeof value ===
            "string";
    }


    function isNumber(
        value
    ) {

        return (
            typeof value ===
                "number" &&
            Number.isFinite(
                value
            )
        );
    }


    function isInteger(
        value
    ) {

        return Number.isInteger(
            value
        );
    }


    function normalizeString(
        value
    ) {

        return isString(
            value
        )

            ? value.trim()

            : "";
    }

    /* ====================================================================
       RESULT FACTORY
    ==================================================================== */

    function createResult(
        valid = true,
        message = "",
        code = "OK",
        details = {}
    ) {

        state.validations +=
            1;

        if (
            valid === true
        ) {

            state.passed +=
                1;

        } else {

            state.failed +=
                1;
        }

        const result =
            Object.freeze({

                valid:
                    valid === true,

                message:
                    String(
                        message ||
                        ""
                    ),

                code:
                    String(
                        code ||
                        (
                            valid
                                ? "OK"
                                : "INVALID"
                        )
                    ),

                details:
                    Object.freeze({
                        ...(
                            isPlainObject(
                                details
                            )

                                ? details

                                : {}
                        )
                    }),

                timestamp:
                    nowISO()
            });

        publish(

            valid

                ? VALIDATION_EVENTS.PASSED

                : VALIDATION_EVENTS.FAILED,

            {

                code:
                    result.code
            }
        );

        return result;
    }


    function pass(
        message = "Validation passed",
        details = {}
    ) {

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
    ) {

        return createResult(
            false,
            message,
            code,
            details
        );
    }

    /* ====================================================================
       REQUIRED / LENGTH
    ==================================================================== */

    function validateRequired(
        value,
        field = "Value"
    ) {

        if (
            value === undefined ||
            value === null
        ) {

            return fail(
                `${field} is required`,
                "REQUIRED"
            );
        }

        if (
            isString(
                value
            ) &&
            normalizeString(
                value
            ) ===
                ""
        ) {

            return fail(
                `${field} cannot be empty`,
                "EMPTY"
            );
        }

        return pass();
    }


    function validateLength(
        value,
        minimum,
        maximum,
        field = "Value"
    ) {

        const min =
            Number(
                minimum
            );

        const max =
            Number(
                maximum
            );

        if (
            !Number.isInteger(
                min
            ) ||
            !Number.isInteger(
                max
            ) ||
            min < 0 ||
            max < min
        ) {

            return fail(
                "Invalid length constraints",
                "INVALID_LENGTH_CONSTRAINT"
            );
        }

        const text =
            normalizeString(
                value
            );

        if (
            text.length <
            min
        ) {

            return fail(
                `${field} is too short`,
                "MIN_LENGTH",
                {
                    minimum:
                        min
                }
            );
        }

        if (
            text.length >
            max
        ) {

            return fail(
                `${field} exceeds maximum length`,
                "MAX_LENGTH",
                {
                    maximum:
                        max
                }
            );
        }

        return pass();
    }

    /* ====================================================================
       EMAIL / PHONE / UUID
    ==================================================================== */

    function validateEmail(
        value
    ) {

        const email =
            normalizeString(
                value
            )
            .toLowerCase();

        if (
            email.length >
                254 ||
            !REGEX.EMAIL.test(
                email
            )
        ) {

            return fail(
                "Invalid email address",
                "INVALID_EMAIL"
            );
        }

        return pass();
    }


    function validatePhone(
        value
    ) {

        const phone =
            normalizeString(
                value
            )
            .replace(
                /[\s()-]/g,
                ""
            );

        return REGEX.PHONE_E164.test(
            phone
        )

            ? pass()

            : fail(
                "Invalid phone number",
                "INVALID_PHONE"
            );
    }


    function validateUUID(
        value
    ) {

        return REGEX.UUID.test(
            normalizeString(
                value
            )
        )

            ? pass()

            : fail(
                "Invalid UUID",
                "INVALID_UUID"
            );
    }

    /* ====================================================================
       CURRENCY / MONEY
    ==================================================================== */

    function validateCurrency(
        value
    ) {

        const currency =
            normalizeString(
                value
            )
            .toUpperCase();

        return REGEX.ISO_CURRENCY.test(
            currency
        )

            ? pass()

            : fail(
                "Invalid currency code",
                "INVALID_CURRENCY"
            );
    }


    function validateAmount(
        amount,
        minimum = 0,
        maximum = Number.MAX_SAFE_INTEGER
    ) {

        if (
            !isNumber(
                amount
            )
        ) {

            return fail(
                "Amount must be numeric",
                "INVALID_AMOUNT"
            );
        }

        if (
            !isNumber(
                minimum
            ) ||
            !isNumber(
                maximum
            ) ||
            minimum >
                maximum
        ) {

            return fail(
                "Invalid amount range",
                "INVALID_AMOUNT_RANGE"
            );
        }

        if (
            amount <
            minimum
        ) {

            return fail(
                "Amount below minimum",
                "MIN_AMOUNT",
                {
                    minimum
                }
            );
        }

        if (
            amount >
            maximum
        ) {

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


    function validateBalance(
        balance,
        minimum = 0
    ) {

        if (
            !isNumber(
                balance
            )
        ) {

            return fail(
                "Invalid balance",
                "INVALID_BALANCE"
            );
        }

        if (
            !isNumber(
                minimum
            )
        ) {

            return fail(
                "Invalid minimum balance",
                "INVALID_BALANCE_RANGE"
            );
        }

        if (
            balance <
            minimum
        ) {

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
    ) {

        return (
            isNumber(
                rate
            ) &&
            rate > 0
        )

            ? pass()

            : fail(
                "Exchange rate must be greater than zero",
                "INVALID_RATE"
            );
    }


    function validateLimit(
        amount,
        minimum,
        maximum,
        field = "Amount"
    ) {

        const result =
            validateAmount(
                amount,
                minimum,
                maximum
            );

        return result.valid

            ? pass()

            : fail(

                `${field} outside permitted range`,

                result.code,

                {
                    minimum,
                    maximum
                }
            );
    }

    /* ====================================================================
       IDENTIFIERS
    ==================================================================== */

    function validateWalletId(
        walletId
    ) {

        return REGEX.WALLET_ID.test(

            normalizeString(
                walletId
            )
            .toUpperCase()
        )

            ? pass()

            : fail(
                "Invalid wallet identifier",
                "INVALID_WALLET_ID"
            );
    }


    function validateTransactionReference(
        reference
    ) {

        return REGEX.TRANSACTION_REFERENCE.test(

            normalizeString(
                reference
            )
            .toUpperCase()
        )

            ? pass()

            : fail(
                "Invalid transaction reference",
                "INVALID_REFERENCE"
            );
    }

    /* ====================================================================
       BANK ACCOUNT
    ==================================================================== */

    function validateAccountNumber(
        accountNumber
    ) {

        const value =
            normalizeString(
                accountNumber
            )
            .replace(
                /\s+/g,
                ""
            );

        return /^\d{6,20}$/.test(
            value
        )

            ? pass()

            : fail(
                "Invalid account number",
                "INVALID_ACCOUNT_NUMBER"
            );
    }


    function validateSortCode(
        sortCode
    ) {

        const value =
            normalizeString(
                sortCode
            )
            .replace(
                /[\s-]/g,
                ""
            );

        return /^\d{6}$/.test(
            value
        )

            ? pass()

            : fail(
                "Invalid sort code",
                "INVALID_SORT_CODE"
            );
    }

    /* ====================================================================
       IBAN
    ==================================================================== */

    function ibanMod97(
        value
    ) {

        const rearranged =
            value.slice(
                4
            ) +
            value.slice(
                0,
                4
            );

        let remainder =
            0;

        for (
            const char
            of rearranged
        ) {

            const expanded =
                /[A-Z]/.test(
                    char
                )

                    ? String(
                        char.charCodeAt(
                            0
                        ) -
                        55
                    )

                    : char;

            for (
                const digit
                of expanded
            ) {

                remainder =
                    (
                        remainder *
                        10 +
                        Number(
                            digit
                        )
                    ) %
                    97;
            }
        }

        return remainder;
    }


    function validateIBAN(
        iban
    ) {

        const value =
            normalizeString(
                iban
            )
            .replace(
                /\s+/g,
                ""
            )
            .toUpperCase();

        if (
            value.length <
                15 ||
            value.length >
                34
        ) {

            return fail(
                "Invalid IBAN length",
                "INVALID_IBAN"
            );
        }

        if (
            !/^[A-Z]{2}\d{2}[A-Z0-9]+$/
                .test(
                    value
                )
        ) {

            return fail(
                "Invalid IBAN",
                "INVALID_IBAN"
            );
        }

        return ibanMod97(
            value
        ) ===
            1

            ? pass()

            : fail(
                "IBAN checksum failed",
                "INVALID_IBAN"
            );
    }

    /* ====================================================================
       CARD NUMBER — LUHN
    ==================================================================== */

    function validateCardNumber(
        cardNumber
    ) {

        const digits =
            normalizeString(
                cardNumber
            )
            .replace(
                /[\s-]/g,
                ""
            );

        if (
            !/^\d{12,19}$/.test(
                digits
            )
        ) {

            return fail(
                "Invalid card number",
                "INVALID_CARD"
            );
        }

        let sum =
            0;

        let doubleDigit =
            false;

        for (
            let index =
                digits.length -
                1;

            index >=
                0;

            index -=
                1
        ) {

            let digit =
                Number(
                    digits.charAt(
                        index
                    )
                );

            if (
                doubleDigit
            ) {

                digit *=
                    2;

                if (
                    digit >
                    9
                ) {

                    digit -=
                        9;
                }
            }

            sum +=
                digit;

            doubleDigit =
                !doubleDigit;
        }

        return (
            sum %
            10 ===
            0
        )

            ? pass()

            : fail(
                "Card checksum failed",
                "INVALID_CARD"
            );
    }

    /* ====================================================================
       CARD EXPIRY
    ==================================================================== */

    function normalizeExpiryYear(
        year
    ) {

        if (
            !isInteger(
                year
            )
        ) {

            return null;
        }

        if (
            year >=
                0 &&
            year <=
                99
        ) {

            return (
                2000 +
                year
            );
        }

        return year;
    }


    function validateCardExpiry(
        month,
        year
    ) {

        if (
            !isInteger(
                month
            ) ||
            !isInteger(
                year
            )
        ) {

            return fail(
                "Invalid expiry date",
                "INVALID_EXPIRY"
            );
        }

        if (
            month <
                1 ||
            month >
                12
        ) {

            return fail(
                "Invalid expiry month",
                "INVALID_EXPIRY"
            );
        }

        const normalizedYear =
            normalizeExpiryYear(
                year
            );

        if (
            !normalizedYear ||
            normalizedYear <
                2000 ||
            normalizedYear >
                2200
        ) {

            return fail(
                "Invalid expiry year",
                "INVALID_EXPIRY"
            );
        }

        /*
         * First instant of the following month.
         * Card remains valid throughout the printed expiry month.
         */
        const expiryEnd =
            new Date(
                normalizedYear,
                month,
                1,
                0,
                0,
                0,
                0
            );

        return expiryEnd >
            new Date()

            ? pass()

            : fail(
                "Card has expired",
                "CARD_EXPIRED"
            );
    }


    function validateCVV(
        cvv
    ) {

        return /^\d{3,4}$/.test(
            normalizeString(
                cvv
            )
        )

            ? pass()

            : fail(
                "Invalid CVV",
                "INVALID_CVV"
            );
    }

    /* ====================================================================
       FX
    ==================================================================== */

    function validateCurrencyPair(
        fromCurrency,
        toCurrency
    ) {

        const from =
            normalizeString(
                fromCurrency
            )
            .toUpperCase();

        const to =
            normalizeString(
                toCurrency
            )
            .toUpperCase();

        const fromResult =
            validateCurrency(
                from
            );

        if (
            !fromResult.valid
        ) {

            return fromResult;
        }

        const toResult =
            validateCurrency(
                to
            );

        if (
            !toResult.valid
        ) {

            return toResult;
        }

        return from ===
            to

            ? fail(
                "Currencies must differ",
                "INVALID_FX_PAIR"
            )

            : pass();
    }

    /* ====================================================================
       PASSWORD / PIN / OTP
    ==================================================================== */

    function validatePassword(
        password,
        options = {}
    ) {

        if (
            !isString(
                password
            )
        ) {

            return fail(
                "Invalid password",
                "INVALID_PASSWORD"
            );
        }

        const policy = {

            minLength:
                Number.isInteger(
                    options.minLength
                )

                    ? options.minLength

                    : 12,

            maxLength:
                Number.isInteger(
                    options.maxLength
                )

                    ? options.maxLength

                    : 128,

            requireUpper:
                options.requireUpper ??
                true,

            requireLower:
                options.requireLower ??
                true,

            requireDigit:
                options.requireDigit ??
                true,

            requireSpecial:
                options.requireSpecial ??
                true
        };

        if (
            password.length <
            policy.minLength
        ) {

            return fail(
                "Password does not meet minimum length",
                "PASSWORD_LENGTH"
            );
        }

        if (
            password.length >
            policy.maxLength
        ) {

            return fail(
                "Password exceeds maximum length",
                "PASSWORD_MAX_LENGTH"
            );
        }

        if (
            policy.requireUpper &&
            !/[A-Z]/.test(
                password
            )
        ) {

            return fail(
                "Password must contain an uppercase letter",
                "PASSWORD_UPPERCASE"
            );
        }

        if (
            policy.requireLower &&
            !/[a-z]/.test(
                password
            )
        ) {

            return fail(
                "Password must contain a lowercase letter",
                "PASSWORD_LOWERCASE"
            );
        }

        if (
            policy.requireDigit &&
            !/\d/.test(
                password
            )
        ) {

            return fail(
                "Password must contain a number",
                "PASSWORD_DIGIT"
            );
        }

        if (
            policy.requireSpecial &&
            !/[^A-Za-z0-9\s]/
                .test(
                    password
                )
        ) {

            return fail(
                "Password must contain a special character",
                "PASSWORD_SPECIAL"
            );
        }

        return pass();
    }


    function validatePIN(
        pin,
        length = 4
    ) {

        if (
            !Number.isInteger(
                length
            ) ||
            length <
                4 ||
            length >
                12
        ) {

            return fail(
                "Invalid PIN length policy",
                "INVALID_PIN_POLICY"
            );
        }

        const value =
            normalizeString(
                pin
            );

        const regex =
            new RegExp(
                `^\\d{${length}}$`
            );

        return regex.test(
            value
        )

            ? pass()

            : fail(
                "Invalid PIN",
                "INVALID_PIN"
            );
    }


    function validateOTP(
        otp,
        length = 6
    ) {

        if (
            !Number.isInteger(
                length
            ) ||
            length <
                4 ||
            length >
                12
        ) {

            return fail(
                "Invalid OTP length policy",
                "INVALID_OTP_POLICY"
            );
        }

        const value =
            normalizeString(
                otp
            );

        const regex =
            new RegExp(
                `^\\d{${length}}$`
            );

        return regex.test(
            value
        )

            ? pass()

            : fail(
                "Invalid one-time password",
                "INVALID_OTP"
            );
    }

    /* ====================================================================
       SESSION / TOKEN STRUCTURE
    ==================================================================== */

    function validateSessionId(
        sessionId
    ) {

        return validateUUID(
            sessionId
        );
    }


    function validateTokenStructure(
        token,
        code,
        message
    ) {

        const value =
            normalizeString(
                token
            );

        if (
            value.length <
                32 ||
            value.length >
                4096 ||
            /\s/.test(
                value
            )
        ) {

            return fail(
                message,
                code
            );
        }

        return pass(
            "Token structure valid",
            {
                authenticityVerified:
                    false
            }
        );
    }


    function validateApiToken(
        token
    ) {

        return validateTokenStructure(
            token,
            "INVALID_API_TOKEN",
            "Invalid API token"
        );
    }


    function validateCSRFToken(
        token
    ) {

        return validateTokenStructure(
            token,
            "INVALID_CSRF",
            "Invalid CSRF token"
        );
    }

    /* ====================================================================
       PAYLOAD VALIDATION
    ==================================================================== */

    function inspectPayload(
        value,
        depth = 0,
        seen = new WeakSet(),
        counter = {
            keys:
                0
        }
    ) {

        if (
            depth >
            MAX_PAYLOAD_DEPTH
        ) {

            throw new Error(
                "Maximum payload depth exceeded."
            );
        }

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return;
        }

        if (
            seen.has(
                value
            )
        ) {

            throw new Error(
                "Circular payload rejected."
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
                MAX_PAYLOAD_KEYS
            ) {

                throw new Error(
                    "Payload collection exceeds safe limit."
                );
            }

            for (
                const item
                of value
            ) {

                inspectPayload(
                    item,
                    depth + 1,
                    seen,
                    counter
                );
            }

            seen.delete(
                value
            );

            return;
        }

        if (
            !isPlainObject(
                value
            )
        ) {

            throw new Error(
                "Payload must contain only plain objects and arrays."
            );
        }

        for (
            const [
                key,
                child
            ]
            of Object.entries(
                value
            )
        ) {

            counter.keys +=
                1;

            if (
                counter.keys >
                MAX_PAYLOAD_KEYS
            ) {

                throw new Error(
                    "Payload exceeds safe key limit."
                );
            }

            if (
                UNSAFE_OBJECT_KEYS.has(
                    key
                )
            ) {

                throw new Error(
                    `Unsafe payload key rejected: ${key}.`
                );
            }

            inspectPayload(
                child,
                depth + 1,
                seen,
                counter
            );
        }

        seen.delete(
            value
        );
    }


    function validatePayload(
        payload
    ) {

        if (
            !isPlainObject(
                payload
            )
        ) {

            return fail(
                "Payload must be an object",
                "INVALID_PAYLOAD"
            );
        }

        try {

            inspectPayload(
                payload
            );

            return pass();

        } catch (
            error
        ) {

            return fail(
                error.message,
                "INVALID_PAYLOAD_STRUCTURE"
            );
        }
    }

    /* ====================================================================
       FILE VALIDATION
    ==================================================================== */

    function validateFile(
        file,
        options = {}
    ) {

        if (
            !file ||
            typeof file !==
                "object"
        ) {

            return fail(
                "No file supplied",
                "FILE_REQUIRED"
            );
        }

        const maxSize =
            Number.isFinite(
                options.maxSize
            )

                ? options.maxSize

                : 5 *
                  1024 *
                  1024;

        if (
            !Number.isFinite(
                file.size
            ) ||
            file.size <
                0
        ) {

            return fail(
                "Invalid file size",
                "INVALID_FILE_SIZE"
            );
        }

        if (
            file.size >
            maxSize
        ) {

            return fail(
                "File exceeds maximum size",
                "FILE_TOO_LARGE",
                {
                    maxSize
                }
            );
        }

        if (
            Array.isArray(
                options.allowedTypes
            ) &&
            options.allowedTypes.length >
                0
        ) {

            const type =
                String(
                    file.type ||
                    ""
                )
                .toLowerCase();

            const allowed =
                options.allowedTypes
                    .map(
                        item =>
                            String(
                                item
                            )
                            .toLowerCase()
                    );

            if (
                !allowed.includes(
                    type
                )
            ) {

                return fail(
                    "Unsupported file type",
                    "INVALID_FILE_TYPE",
                    {
                        mimeTypeTrusted:
                            false
                    }
                );
            }
        }

        if (
            Array.isArray(
                options.allowedExtensions
            ) &&
            options.allowedExtensions.length >
                0
        ) {

            const name =
                String(
                    file.name ||
                    ""
                )
                .toLowerCase();

            const extension =
                name.includes(
                    "."
                )

                    ? name.slice(
                        name.lastIndexOf(
                            "."
                        )
                    )

                    : "";

            const allowed =
                options.allowedExtensions
                    .map(
                        item => {

                            const value =
                                String(
                                    item
                                )
                                .toLowerCase();

                            return value.startsWith(
                                "."
                            )

                                ? value

                                : `.${value}`;
                        }
                    );

            if (
                !allowed.includes(
                    extension
                )
            ) {

                return fail(
                    "Unsupported file extension",
                    "INVALID_FILE_EXTENSION",
                    {
                        extension
                    }
                );
            }
        }

        return pass(
            "Client-side file checks passed",
            {
                mimeTypeTrusted:
                    false
            }
        );
    }

    /* ====================================================================
       SECURITY HEURISTICS
    ==================================================================== */

    function detectXSS(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return pass(
                "No XSS heuristic signal",
                {
                    heuristicOnly:
                        true
                }
            );
        }

        if (
            SECURITY_PATTERNS.XSS.test(
                value
            )
        ) {

            state.warnings +=
                1;

            publish(
                VALIDATION_EVENTS.WARNING,
                {
                    signal:
                        "XSS_HEURISTIC"
                }
            );

            return fail(
                "Potential XSS payload detected",
                "XSS_DETECTED",
                {
                    heuristicOnly:
                        true
                }
            );
        }

        return pass(
            "No XSS heuristic signal",
            {
                heuristicOnly:
                    true
            }
        );
    }


    function detectSQLInjection(
        value
    ) {

        if (
            !isString(
                value
            )
        ) {

            return pass(
                "No SQL heuristic signal",
                {
                    heuristicOnly:
                        true
                }
            );
        }

        if (
            SECURITY_PATTERNS.SQL.test(
                value
            )
        ) {

            state.warnings +=
                1;

            publish(
                VALIDATION_EVENTS.WARNING,
                {
                    signal:
                        "SQL_HEURISTIC"
                }
            );

            return fail(
                "Potential SQL injection pattern detected",
                "SQL_INJECTION",
                {
                    heuristicOnly:
                        true
                }
            );
        }

        return pass(
            "No SQL heuristic signal",
            {
                heuristicOnly:
                    true
            }
        );
    }


    function validateSecureInput(
        value,
        field = "Input"
    ) {

        const required =
            validateRequired(
                value,
                field
            );

        if (
            !required.valid
        ) {

            return required;
        }

        if (
            !isString(
                value
            )
        ) {

            return fail(
                `${field} must be text`,
                "INVALID_SECURE_INPUT_TYPE"
            );
        }

        const xss =
            detectXSS(
                value
            );

        if (
            !xss.valid
        ) {

            return xss;
        }

        const sql =
            detectSQLInjection(
                value
            );

        if (
            !sql.valid
        ) {

            return sql;
        }

        return pass(
            "Input passed client-side heuristic checks",
            {
                heuristicOnly:
                    true
            }
        );
    }

    /* ====================================================================
       VALIDATOR REGISTRY
    ==================================================================== */

    const VALIDATORS =
        Object.freeze({

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


    function run(
        name,
        ...args
    ) {

        const validator =
            VALIDATORS[
                name
            ];

        return typeof validator ===
            "function"

            ? validator(
                ...args
            )

            : fail(
                `Unknown validator: ${name}`,
                "UNKNOWN_VALIDATOR"
            );
    }


    function list() {

        return Object.keys(
            VALIDATORS
        )
        .sort();
    }


    function has(
        name
    ) {

        return Object
            .prototype
            .hasOwnProperty
            .call(
                VALIDATORS,
                name
            );
    }

    /* ====================================================================
       HEALTH
    ==================================================================== */

    function verifyIntegrity() {

        const errors =
            [];

        const required = [

            "required",

            "email",

            "currency",

            "amount",

            "balance",

            "iban",

            "cardNumber",

            "cardExpiry",

            "cvv",

            "password",

            "pin",

            "otp",

            "payload",

            "file",

            "secureInput"
        ];

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
                    `Required validator missing: ${name}.`
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

            validations:
                state.validations,

            passed:
                state.passed,

            failed:
                state.failed,

            warnings:
                state.warnings,

            lastError:
                state.lastError,

            xssDetection:
                "HEURISTIC_ONLY",

            sqlInjectionDetection:
                "HEURISTIC_ONLY",

            tokenValidation:
                "STRUCTURE_ONLY",

            fileMimeValidation:
                "CLIENT_HINT_ONLY",

            integrity
        });
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const validator =
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
                validateSecureInput,

            verifyIntegrity,

            health
        });

    /* ====================================================================
       PAY54 SECURITY ROOT
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

        "validator",

        {

            value:
                validator,

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

            api:
                validator,

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

        VALIDATION_EVENTS.READY,

        {

            version:
                VERSION,

            readyAt:
                state.readyAt
        }
    );

    console.info(
        `[PAY54_VALIDATOR] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
