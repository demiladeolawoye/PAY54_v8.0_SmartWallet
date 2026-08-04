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
   DELIVERED:
    "DELIVERED",

READ:
    "READ",

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
   /* =========================
   NOTIFICATION CATEGORIES
========================= */

const NOTIFICATION_CATEGORY = Object.freeze({

    SYSTEM:
        "SYSTEM",

    TRANSACTIONS:
        "TRANSACTIONS",

    CARDS:
        "CARDS",

    SECURITY:
        "SECURITY",

    COMPLIANCE:
        "COMPLIANCE",

    WALLET:
        "WALLET",

    SAVINGS:
        "SAVINGS",

    PAYMENTS:
        "PAYMENTS",

    MARKETING:
        "MARKETING",

    SUPPORT:
        "SUPPORT"

});
   const NOTIFICATION_METRICS = {

    queued: 0,

    sent: 0,

    failed: 0,

    cancelled: 0

};
   const RETRY_CONFIG = Object.freeze({

    MAX_ATTEMPTS: 3

});
   /* =========================
   USER NOTIFICATION
   PREFERENCES
========================= */

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({

    TRANSACTIONS: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    CARDS: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    SECURITY: {

        EMAIL: true,

        PUSH: true,

        SMS: true

    },

    COMPLIANCE: {

        EMAIL: true,

        PUSH: true,

        SMS: true

    },

    WALLET: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    SAVINGS: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    PAYMENTS: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    MARKETING: {

        EMAIL: false,

        PUSH: false,

        SMS: false

    },

    SUPPORT: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    },

    SYSTEM: {

        EMAIL: true,

        PUSH: true,

        SMS: false

    }

});
   const SCHEDULER_CONFIG = Object.freeze({

    POLL_INTERVAL_MS: 1000

});

   let notificationScheduler = null;
   let notificationPreferences =

    structuredClone(

        DEFAULT_NOTIFICATION_PREFERENCES

    );
   
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
   LOAD PREFERENCES
========================= */

function loadNotificationPreferences(){

    try{

        const saved = JSON.parse(

            localStorage.getItem(

                LS.SETTINGS

            )

        );

        if(saved){

            notificationPreferences = saved;

        }

    }catch(error){

        console.warn(

            "[PAY54 Notifications]",

            error

        );

    }

}

/* =========================
   SAVE PREFERENCES
========================= */

function saveNotificationPreferences(){

    localStorage.setItem(

        LS.SETTINGS,

        JSON.stringify(

            notificationPreferences

        )

    );

}
 /* =========================
   QUEUE NOTIFICATION
========================= */

function queueNotification({

  channel,

category =

    NOTIFICATION_CATEGORY.SYSTEM,

tags = [],

priority =

    NOTIFICATION_PRIORITY.NORMAL,

recipient,

title,

message,

payload = {},

scheduledFor = null

}){

    const notification = {

        id:

            crypto?.randomUUID?.() ||

            ("NTF-" + Date.now()),

     channel,

category,

tags,

priority,

recipient,

title,

        message,

        payload,

        status:

            NOTIFICATION_STATUS.QUEUED,

        createdAt:

    new Date().toISOString(),

attempts: 0,
scheduledFor,
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
    providers:

    Object.keys(

        DELIVERY_PROVIDERS

    ).length,

templates:

    Object.keys(

        NOTIFICATION_TEMPLATES

    ).length,
       categories:

    Object.keys(

        NOTIFICATION_CATEGORY

    ).length,

retryLimit:

    RETRY_CONFIG.MAX_ATTEMPTS,

schedulerInterval:

    SCHEDULER_CONFIG.POLL_INTERVAL_MS,

schedulerRunning:

    notificationScheduler !== null,

delivered:

    NOTIFICATION_HISTORY.filter(

        item =>

            item.status ===

            NOTIFICATION_STATUS.DELIVERED

    ).length,

read:

    NOTIFICATION_HISTORY.filter(

        item =>

            item.status ===

            NOTIFICATION_STATUS.READ

    ).length,

unread:

    NOTIFICATION_HISTORY.filter(

        item =>

            item.status !==

            NOTIFICATION_STATUS.READ

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

    notification.scheduledFor &&

    new Date(

        notification.scheduledFor

    ) >

    new Date()

){

    continue;

}

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

    retryNotification(

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
   NOTIFICATION SCHEDULER
========================= */

function startNotificationScheduler(){

    if(

        notificationScheduler

    ){

        return notificationScheduler;

    }

    notificationScheduler = setInterval(

        processNotificationQueue,

        SCHEDULER_CONFIG.POLL_INTERVAL_MS

    );

    return notificationScheduler;

}
/* =========================
   STOP NOTIFICATION SCHEDULER
========================= */

function stopNotificationScheduler(){

    if(

        !notificationScheduler

    ){

        return;

    }

    clearInterval(

        notificationScheduler

    );

    notificationScheduler = null;

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
   NOTIFICATION TEMPLATES
========================= */

const NOTIFICATION_TEMPLATES = Object.freeze({

    PAYMENT_SUCCESS: {

        title:

            "Payment Successful",

        message:

            "{amount} has been sent to {recipient}."

    },

    PAYMENT_FAILED: {

        title:

            "Payment Failed",

        message:

            "Unable to send {amount} to {recipient}."

    },

    CARD_FROZEN: {

        title:

            "Card Frozen",

        message:

            "Your PAY54 card has been frozen."

    },

    CARD_UNFROZEN: {

        title:

            "Card Activated",

        message:

            "Your PAY54 card is active again."

    }

});
   /* =========================
   TEMPLATE RESOLVER
========================= */

function resolveTemplate(

    template,

    values = {}

){

    const definition =

        NOTIFICATION_TEMPLATES[

            template

        ];

    if(

        !definition

    ){

        return null;

    }

    let message =

        definition.message;

    Object.entries(

        values

    ).forEach(

        ([key,value])=>{

            message = message.replaceAll(

                `{${key}}`,

                value

            );

        }

    );

    return {

        title:

            definition.title,

        message

    };

}
   /* =========================
   SEND TEMPLATE
========================= */

function sendTemplate(

    template,

    options = {}

){

    const resolved =

        resolveTemplate(

            template,

            options.values

        );

    if(

        !resolved

    ){

        return null;

    }

    return queueNotification({

        ...options,

        title:

            resolved.title,

        message:

            resolved.message

    });

}
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

 if(

    !isNotificationEnabled(

        notification

    )

){

    return false;

}

return provider(

    notification

);

}
   /* =========================
   CHECK USER PREFERENCE
========================= */

function isNotificationEnabled(

    notification

){

    const category =

        notificationPreferences[

            notification.category

        ];

    if(

        !category

    ){

        return true;

    }

    return category[

        notification.route

    ] !== false;

}
   /* =========================
   RETRY DELIVERY
========================= */

function retryNotification(

    notification

){

    notification.attempts++;

    if(

        notification.attempts >

        RETRY_CONFIG.MAX_ATTEMPTS

    ){

        failNotification(

            notification.id,

            "Maximum retry attempts exceeded."

        );

        return false;

    }

    return dispatchNotification(

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

markNotificationDelivered(

    notification.id

);

return notification;

}
   /* =========================
   MARK DELIVERED
========================= */

function markNotificationDelivered(

    notificationId

){

    const notification =

        NOTIFICATION_HISTORY.find(

            item =>

                item.id ===

                notificationId

        );

    if(

        !notification

    ){

        return null;

    }

    notification.status =

        NOTIFICATION_STATUS.DELIVERED;

    notification.deliveredAt =

        new Date().toISOString();

    saveHistory();

    return notification;

}
   /* =========================
   MARK READ
========================= */

function markNotificationRead(

    notificationId

){

    const notification =

        NOTIFICATION_HISTORY.find(

            item =>

                item.id ===

                notificationId

        );

    if(

        !notification

    ){

        return null;

    }

    notification.status =

        NOTIFICATION_STATUS.READ;

    notification.readAt =

        new Date().toISOString();

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
   /* =========================
   GET UNREAD
========================= */

function getUnreadNotifications(){

    return NOTIFICATION_HISTORY.filter(

        notification =>

            notification.status !==

            NOTIFICATION_STATUS.READ

    );

}
   /* =========================
   FILTER BY CATEGORY
========================= */

function getNotificationsByCategory(

    category

){

    return NOTIFICATION_QUEUE.filter(

        notification =>

            notification.category ===

            category

    );

}
   /* =========================
   GET PREFERENCES
========================= */

function getNotificationPreferences(){

    return structuredClone(

        notificationPreferences

    );

}

/* =========================
   UPDATE PREFERENCES
========================= */

function updateNotificationPreference(

    category,

    channel,

    enabled

){

    if(

        !notificationPreferences[

            category

        ]

    ){

        return false;

    }

    notificationPreferences[

        category

    ][

        channel

    ] = enabled;

    saveNotificationPreferences();

    return true;

}

   loadNotificationPreferences();
   loadQueue();

loadHistory();
   startNotificationScheduler();
  window.PAY54_NOTIFICATIONS = {

    queueNotification,

    processNotificationQueue,

     startNotificationScheduler,

     stopNotificationScheduler,

     routeNotification,

     dispatchNotification,

     retryNotification,

     resolveTemplate,

    sendTemplate,

    completeNotification,

     markNotificationDelivered,

    markNotificationRead,

    failNotification,

   getQueuedNotifications,

     getUnreadNotifications,

    getNotificationsByCategory,

     getNotificationPreferences,

     updateNotificationPreference,

getNotificationHealth

};
  console.log(

    "✅ PAY54 Notification Engine Loaded"

);

})();
