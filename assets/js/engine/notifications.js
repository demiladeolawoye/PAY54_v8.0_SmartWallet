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
  function getNotificationHealth(){

    return {

        queued:

            NOTIFICATION_QUEUE.length,

        history:

            NOTIFICATION_HISTORY.length,
       processing:

    NOTIFICATION_QUEUE.filter(

        item =>

            item.status ===

            NOTIFICATION_STATUS.PROCESSING

    ).length,

        metrics:

            {

                ...NOTIFICATION_METRICS

            }

    };

}
   /* =========================
   PROCESS QUEUE
========================= */

function processNotificationQueue(){

    for(

        const notification of

        NOTIFICATION_QUEUE

    ){

        if(

            notification.status !==

            NOTIFICATION_STATUS.QUEUED

        ){

            continue;

        }

        notification.status =

            NOTIFICATION_STATUS.PROCESSING;
     notification.route =

    routeNotification(

        notification

    );

if(

    !notification.route

){

    failNotification(

        notification.id,

        "Unsupported notification channel."

    );

    continue;

}
  const delivered =

    dispatchNotification(

        notification

    );

if(

    delivered

){

    completeNotification(

        notification.id

    );

}else{

    failNotification(

        notification.id,

        "Delivery provider failed."

    );

}     

    }

    saveQueue();

}
   /* =========================
   CHANNEL ROUTER
========================= */

function routeNotification(

    notification

){

    switch(

        notification.channel

    ){

        case NOTIFICATION_CHANNEL.IN_APP:

            return "IN_APP";

        case NOTIFICATION_CHANNEL.EMAIL:

            return "EMAIL";

        case NOTIFICATION_CHANNEL.PUSH:

            return "PUSH";

        case NOTIFICATION_CHANNEL.SMS:

            return "SMS";

        case NOTIFICATION_CHANNEL.WEBHOOK:

            return "WEBHOOK";

        case NOTIFICATION_CHANNEL.SLACK:

            return "SLACK";

        case NOTIFICATION_CHANNEL.TEAMS:

            return "TEAMS";

        default:

            return null;

    }

}
   /* =========================
   DELIVERY PROVIDERS
========================= */

const DELIVERY_PROVIDERS = Object.freeze({

    IN_APP(notification){

        return true;

    },

    EMAIL(notification){

        return true;

    },

    PUSH(notification){

        return true;

    },

    SMS(notification){

        return true;

    },

    WEBHOOK(notification){

        return true;

    },

    SLACK(notification){

        return true;

    },

    TEAMS(notification){

        return true;

    }

});
   /* =========================
   DISPATCH DELIVERY
========================= */

function dispatchNotification(

    notification

){

    const provider =

        DELIVERY_PROVIDERS[

            notification.route

        ];

    if(

        !provider

    ){

        return false;

    }

    return provider(

        notification

    );

}
   /* =========================
   COMPLETE NOTIFICATION
========================= */

function completeNotification(

    notificationId

){

    const notification =

        NOTIFICATION_QUEUE.find(

            item =>

                item.id ===

                notificationId

        );

    if(!notification){

        return null;

    }

    notification.status =

        NOTIFICATION_STATUS.SENT;

    notification.sentAt =

        new Date().toISOString();

    NOTIFICATION_HISTORY.push(

        notification

    );

    const index =

        NOTIFICATION_QUEUE.indexOf(

            notification

        );

    if(index > -1){

        NOTIFICATION_QUEUE.splice(

            index,

            1

        );

    }

    NOTIFICATION_METRICS.sent++;
   if(

    NOTIFICATION_METRICS.queued > 0

){

    NOTIFICATION_METRICS.queued--;

}

    saveQueue();

    saveHistory();

    return notification;

}
   /* =========================
   FAIL NOTIFICATION
========================= */

function failNotification(

    notificationId,

    reason

){

    const notification =

        NOTIFICATION_QUEUE.find(

            item =>

                item.id ===

                notificationId

        );

    if(!notification){

        return null;

    }

    notification.status =

        NOTIFICATION_STATUS.FAILED;

    notification.failureReason =

        reason;

    notification.failedAt =

        new Date().toISOString();

    NOTIFICATION_METRICS.failed++;
   if(

    NOTIFICATION_METRICS.queued > 0

){

    NOTIFICATION_METRICS.queued--;

}

    saveQueue();

    return notification;

}
   /* =========================
   GET QUEUE
========================= */

function getQueuedNotifications(){

    return [

        ...NOTIFICATION_QUEUE

    ];

}
   loadQueue();

loadHistory();
   processNotificationQueue();
  window.PAY54_NOTIFICATIONS = {

    queueNotification,

    processNotificationQueue,

     routeNotification,

     dispatchNotification,

    completeNotification,

    failNotification,

    getQueuedNotifications,

    getNotificationHealth

};
  console.log(

    "✅ PAY54 Notification Engine Loaded"

);

})();
