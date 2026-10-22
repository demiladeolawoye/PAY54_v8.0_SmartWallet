(() => {
    "use strict";

    const ledger =
        window.PAY54_LEDGER;

    console.log(
        "=== PAY54 LEDGER STORAGE MIGRATION HARDENING CHECK ==="
    );

    if (!ledger) {
        console.error(
            "FAIL: PAY54_LEDGER unavailable."
        );
        return;
    }

    const status =
        ledger.getTransactionRepositoryStatus();

    const routing =
        ledger.inspectTransactionStorageRouting();

    const balances =
        ledger.getBalances();

    console.table({
        ledgerExists:
            true,

        routingApiAvailable:
            typeof ledger.inspectTransactionStorageRouting ===
            "function",

        activeStorageRoute:
            status.storageRoute ??
            "UNAVAILABLE",

        storageRoutingState:
            status.storageRoutingState ??
            "UNAVAILABLE",

        repositoryState:
            status.state,

        repositoryCode:
            status.code,

        recordCount:
            status.recordCount,

        revision:
            status.metadata?.revision ??
            "UNAVAILABLE",

        historyContinuity:
            status.historyContinuity ??
            "UNAVAILABLE",

        baselineType:
            status.baselineType ??
            "UNAVAILABLE",

        initializationContext:
            status.initializationContext ??
            "UNAVAILABLE",

        migrationRequired:
            status.migrationRequired,

        ngnBalance:
            balances.NGN,

        gbpBalance:
            balances.GBP,

        realMoneyFalse:
            window.PAY54_CONFIG?.get?.(
                "environment.realMoneyMode"
            ) === false
    });

    console.log(
        "Repository status:",
        status
    );

    console.log(
        "Storage routing:",
        routing
    );
})();
