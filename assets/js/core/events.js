"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File        : assets/js/core/events.js
   Version     : 11.0.0
   Namespace   : PAY54_EVENTS

   Enterprise Event Bus

   Features
   --------
   ✓ Publish / Subscribe
   ✓ Wildcard listeners
   ✓ Namespaces
   ✓ Once listeners
   ✓ Listener priorities
   ✓ Async publishing
   ✓ Sync publishing
   ✓ Event history
   ✓ Diagnostics
   ✓ Performance metrics
   ✓ Replay
   ✓ Memory-safe unsubscribe
   ✓ Duplicate listener protection
   ✓ Zero dependencies
   ✓ Backward compatible

   Copyright © PAY54
======================================================================== */

(function () {

"use strict";

/* ========================================================================
   CONSTANTS
======================================================================== */

const VERSION = "11.0.0";

const MAX_HISTORY = 500;

const MAX_NAMESPACE_DEPTH = 12;

const ROOT_NAMESPACE = "*";

/* ========================================================================
   INTERNAL STATE
======================================================================== */

const listeners = new Map();

const wildcardListeners = new Map();

const history = [];

const diagnostics = {

    published:0,

    delivered:0,

    failed:0,

    removed:0,

    subscriptions:0,

    namespaces:new Set(),

    started:Date.now()

};

/* ========================================================================
   INTERNAL UTILITIES
======================================================================== */

function now(){

    return performance.now();

}

function timestamp(){

    return new Date().toISOString();

}

function uuid(){

    if(
        window.crypto &&
        typeof crypto.randomUUID==="function"
    ){

        return crypto.randomUUID();

    }

    return (

        "EVT-" +

        Date.now().toString(36) +

        "-" +

        Math.random()
            .toString(36)
            .substring(2,10)

    );

}

function isFunction(fn){

    return typeof fn==="function";

}

function isString(value){

    return typeof value==="string";

}

function isObject(value){

    return (

        value !== null &&

        typeof value==="object" &&

        !Array.isArray(value)

    );

}

function clone(obj){

    if(!isObject(obj)){

        return obj;

    }

    return structuredClone(obj);

}

function freeze(obj){

    if(isObject(obj)){

        Object.freeze(obj);

    }

    return obj;

}

function namespaceParts(eventName){

    return eventName.split(".");

}

function validateEventName(eventName){

    if(!isString(eventName)){

        throw new Error(
            "PAY54_EVENTS: event name must be a string."
        );

    }

    const name = eventName.trim();

    if(!name.length){

        throw new Error(
            "PAY54_EVENTS: empty event name."
        );

    }

    if(

        namespaceParts(name).length >

        MAX_NAMESPACE_DEPTH

    ){

        throw new Error(
            "PAY54_EVENTS: namespace depth exceeded."
        );

    }

    return name;

}

function validateListener(listener){

    if(!isFunction(listener)){

        throw new Error(

            "PAY54_EVENTS: listener must be a function."

        );

    }

}

/* ========================================================================
   LISTENER OBJECT
======================================================================== */

function createSubscription(

    event,

    callback,

    options={}

){

    validateListener(callback);

    return {

        id:uuid(),

        event,

        callback,

        once:!!options.once,

        priority:Number(
            options.priority || 0
        ),

        async:!!options.async,

        created:Date.now(),

        active:true

    };

}

/* ========================================================================
   HISTORY
======================================================================== */

function pushHistory(record){

    history.unshift(

        freeze(record)

    );

    if(

        history.length>

        MAX_HISTORY

    ){

        history.pop();

    }

}
  /* ========================================================================
   LISTENER STORAGE
======================================================================== */

function getBucket(event){

    if(!listeners.has(event)){

        listeners.set(event, []);

    }

    return listeners.get(event);

}

function getWildcardBucket(event){

    if(!wildcardListeners.has(event)){

        wildcardListeners.set(event, []);

    }

    return wildcardListeners.get(event);

}

function sortListeners(bucket){

    bucket.sort(

        (a,b)=>{

            if(a.priority===b.priority){

                return a.created-b.created;

            }

            return b.priority-a.priority;

        }

    );

}

/* ========================================================================
   DUPLICATE PROTECTION
======================================================================== */

function hasDuplicate(

    bucket,

    callback

){

    return bucket.some(

        listener=>

            listener.callback===callback &&

            listener.active

    );

}

/* ========================================================================
   REGISTER
======================================================================== */

function register(

    event,

    callback,

    options={}

){

    event=

        validateEventName(event);

    validateListener(callback);

    const wildcard=

        event.includes("*");

    const subscription=

        createSubscription(

            event,

            callback,

            options

        );

    const bucket=

        wildcard

        ?

        getWildcardBucket(event)

        :

        getBucket(event);

    if(

        hasDuplicate(

            bucket,

            callback

        )

    ){

        return subscription.id;

    }

    bucket.push(subscription);

    sortListeners(bucket);

    diagnostics.subscriptions++;

    diagnostics.namespaces.add(

        namespaceParts(event)[0]

    );

    return subscription.id;

}

/* ========================================================================
   PUBLIC SUBSCRIBE API
======================================================================== */

function subscribe(

    event,

    callback,

    options={}

){

    return register(

        event,

        callback,

        options

    );

}

function once(

    event,

    callback,

    options={}

){

    return register(

        event,

        callback,

        {

            ...options,

            once:true

        }

    );

}

/* ========================================================================
   REMOVE
======================================================================== */

function unsubscribe(id){

    if(!id){

        return false;

    }

    let removed=false;

    for(

        const bucket

        of listeners.values()

    ){

        const index=

            bucket.findIndex(

                item=>

                item.id===id

            );

        if(index!==-1){

            bucket.splice(

                index,

                1

            );

            diagnostics.removed++;

            removed=true;

        }

    }

    for(

        const bucket

        of wildcardListeners.values()

    ){

        const index=

            bucket.findIndex(

                item=>

                item.id===id

            );

        if(index!==-1){

            bucket.splice(

                index,

                1

            );

            diagnostics.removed++;

            removed=true;

        }

    }

    return removed;

}

/* ========================================================================
   CLEAR
======================================================================== */

function clear(event){

    if(!event){

        listeners.clear();

        wildcardListeners.clear();

        diagnostics.removed=0;

        diagnostics.subscriptions=0;

        return;

    }

    listeners.delete(event);

    wildcardListeners.delete(event);

}

/* ========================================================================
   WILDCARD MATCHER
======================================================================== */

function wildcardMatch(

    pattern,

    event

){

    if(pattern===ROOT_NAMESPACE){

        return true;

    }

    if(pattern===event){

        return true;

    }

    const p=

        pattern.split(".");

    const e=

        event.split(".");

    for(

        let i=0;

        i<p.length;

        i++

    ){

        if(

            p[i]==="*"

        ){

            return true;

        }

        if(

            e[i]===undefined

        ){

            return false;

        }

        if(

            p[i]!==e[i]

        ){

            return false;

        }

    }

    return p.length===e.length;

}

/* ========================================================================
   COLLECT MATCHING LISTENERS
======================================================================== */

function collectListeners(

    event

){

    const result=[];

    if(

        listeners.has(event)

    ){

        result.push(

            ...listeners.get(event)

        );

    }

    for(

        const [

            pattern,

            bucket

        ]

        of wildcardListeners

    ){

        if(

            wildcardMatch(

                pattern,

                event

            )

        ){

            result.push(

                ...bucket

            );

        }

    }

    sortListeners(result);

    return result;

}
  /* ========================================================================
   EVENT OBJECT
======================================================================== */

function createEvent(

    name,

    payload={},

    options={}

){

    const created=

        Date.now();

    const started=

        now();

    const event={

        id:uuid(),

        name,

        namespace:

            namespaceParts(name),

        timestamp:

            timestamp(),

        created,

        payload:

            clone(payload),

        metadata:

            clone(options.metadata || {}),

        source:

            options.source || "system",

        correlationId:

            options.correlationId ||

            uuid(),

        cancelled:false,

        propagationStopped:false,

        defaultPrevented:false,

        processingTime:0,

        preventDefault(){

            this.defaultPrevented=true;

        },

        stopPropagation(){

            this.propagationStopped=true;

        },

        cancel(){

            this.cancelled=true;

        },

        started

    };

    return freeze(event);

}

/* ========================================================================
   EXECUTE LISTENER
======================================================================== */

async function executeListener(

    subscription,

    event

){

    if(!subscription.active){

        return;

    }

    try{

        if(subscription.async){

            await Promise.resolve(

                subscription.callback(event)

            );

        }else{

            subscription.callback(event);

        }

        diagnostics.delivered++;

    }catch(error){

        diagnostics.failed++;

        console.error(

            "[PAY54_EVENTS]",

            event.name,

            error

        );

    }

}

/* ========================================================================
   DISPATCH
======================================================================== */

async function dispatch(

    event

){

    const bucket=

        collectListeners(

            event.name

        );

    for(

        const listener

        of bucket

    ){

        if(

            event.cancelled ||

            event.propagationStopped

        ){

            break;

        }

        await executeListener(

            listener,

            event

        );

        if(listener.once){

            unsubscribe(

                listener.id

            );

        }

    }

}

/* ========================================================================
   SYNCHRONOUS PUBLISH
======================================================================== */

function publish(

    eventName,

    payload={},

    options={}

){

    eventName=

        validateEventName(

            eventName

        );

    diagnostics.published++;

    const event=

        createEvent(

            eventName,

            payload,

            options

        );

    pushHistory({

        id:event.id,

        name:event.name,

        timestamp:event.timestamp,

        payload:event.payload,

        source:event.source

    });

    dispatch(event);

    return event;

}

/* ========================================================================
   ASYNC PUBLISH
======================================================================== */

async function publishAsync(

    eventName,

    payload={},

    options={}

){

    eventName=

        validateEventName(

            eventName

        );

    diagnostics.published++;

    const event=

        createEvent(

            eventName,

            payload,

            options

        );

    pushHistory({

        id:event.id,

        name:event.name,

        timestamp:event.timestamp,

        payload:event.payload,

        source:event.source

    });

    await dispatch(event);

    return event;

}

/* ========================================================================
   REPLAY
======================================================================== */

function replay(

    callback

){

    validateListener(callback);

    history

        .slice()

        .reverse()

        .forEach(callback);

}

/* ========================================================================
   HISTORY
======================================================================== */

function getHistory(){

    return history.slice();

}

function clearHistory(){

    history.length=0;

}

/* ========================================================================
   DIAGNOSTICS
======================================================================== */

function getDiagnostics(){

    return {

        version:VERSION,

        uptime:

            Date.now()-

            diagnostics.started,

        published:

            diagnostics.published,

        delivered:

            diagnostics.delivered,

        failed:

            diagnostics.failed,

        removed:

            diagnostics.removed,

        subscriptions:

            diagnostics.subscriptions,

        namespaces:

            Array.from(

                diagnostics.namespaces

            ),

        history:

            history.length

    };

}

/* ========================================================================
   EXISTS
======================================================================== */

function hasListeners(

    event

){

    return collectListeners(

        event

    ).length>0;

}

/* ========================================================================
   COUNT
======================================================================== */

function listenerCount(

    event

){

    if(event){

        return collectListeners(

            event

        ).length;

    }

    let total=0;

    for(

        const bucket

        of listeners.values()

    ){

        total+=bucket.length;

    }

    for(

        const bucket

        of wildcardListeners.values()

    ){

        total+=bucket.length;

    }

    return total;

}
