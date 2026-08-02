"use strict";

/* =========================================
   PAY54 ENTERPRISE
   NOTIFICATION ENGINE
   Version: 11.0.0
========================================= */

(() => {
  const LS = Object.freeze({

    QUEUE:
        "pay54_notification_queue",

    HISTORY:
        "pay54_notification_history",

    SETTINGS:
        "pay54_notification_settings"

});
  const NOTIFICATION_QUEUE = [];

const NOTIFICATION_HISTORY = [];
  const NOTIFICATION_STATUS =
Object.freeze({

    QUEUED:
        "QUEUED",

    PROCESSING:
        "PROCESSING",

    SENT:
        "SENT",

    FAILED:
        "FAILED",

    CANCELLED:
        "CANCELLED"

});
  const NOTIFICATION_PRIORITY =
Object.freeze({

    LOW:
        "LOW",

    NORMAL:
        "NORMAL",

    HIGH:
        "HIGH",

    CRITICAL:
        "CRITICAL"

});
  const NOTIFICATION_CHANNEL =
Object.freeze({

    IN_APP:
        "IN_APP",

    PUSH:
        "PUSH",

    EMAIL:
        "EMAIL",

    SMS:
        "SMS",

    WEBHOOK:
        "WEBHOOK",

    SLACK:
        "SLACK",

    TEAMS:
        "TEAMS"

});
  const NOTIFICATION_METRICS = {

    queued: 0,

    sent: 0,

    failed: 0,

    cancelled: 0

};
  function getNotificationHealth(){

    return {

        queued:

            NOTIFICATION_QUEUE.length,

        history:

            NOTIFICATION_HISTORY.length,

        metrics:

            {

                ...NOTIFICATION_METRICS

            }

    };

}
  window.PAY54_NOTIFICATIONS = {

    getNotificationHealth

};
  console.log(

    "✅ PAY54 Notification Engine Loaded"

);

})();
