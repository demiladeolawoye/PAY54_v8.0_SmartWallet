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
 /* =========================
   STORAGE HELPERS
========================= */

function saveQueue(){

    localStorage.setItem(

        LS.QUEUE,

        JSON.stringify(

            NOTIFICATION_QUEUE

        )

    );

}

function saveHistory(){

    localStorage.setItem(

        LS.HISTORY,

        JSON.stringify(

            NOTIFICATION_HISTORY

        )

    );

}

function loadQueue(){

    try{

        const queue = JSON.parse(

            localStorage.getItem(

                LS.QUEUE

            )

        );

        if(Array.isArray(queue)){

            NOTIFICATION_QUEUE.push(

                ...queue

            );

        }

    }catch(error){

        console.warn(

            "[PAY54 Notifications]",

            error

        );

    }

}

function loadHistory(){

    try{

        const history = JSON.parse(

            localStorage.getItem(

                LS.HISTORY

            )

        );

        if(Array.isArray(history)){

            NOTIFICATION_HISTORY.push(

                ...history

            );

        }

    }catch(error){

        console.warn(

            "[PAY54 Notifications]",

            error

        );

    }

}  
 /* =========================
   QUEUE NOTIFICATION
========================= */

function queueNotification({

    channel,

    priority =

        NOTIFICATION_PRIORITY.NORMAL,

    recipient,

    title,

    message,

    payload = {}

}){

    const notification = {

        id:

            crypto?.randomUUID?.() ||

            ("NTF-" + Date.now()),

        channel,

        priority,

        recipient,

        title,

        message,

        payload,

        status:

            NOTIFICATION_STATUS.QUEUED,

        createdAt:

            new Date().toISOString()

    };

    NOTIFICATION_QUEUE.push(

        notification

    );

    NOTIFICATION_METRICS.queued++;

    saveQueue();

    return notification;

}  
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
   /* =========================
   GET QUEUE
========================= */

function getQueuedNotifications(){

    return [

        ...NOTIFICATION_QUEUE

    ];

}
  window.PAY54_NOTIFICATIONS = {

    getNotificationHealth

};
  console.log(

    "✅ PAY54 Notification Engine Loaded"

);

})();
