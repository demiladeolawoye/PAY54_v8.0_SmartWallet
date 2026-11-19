"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const read=relative=>readFileSync(new URL("../../"+relative,import.meta.url),"utf8");
const boot=()=>read("assets/js/dashboard-blueprint-boot.js");
function classList(initial=[]){
 const state=new Set(initial);
 return {
  add:(...names)=>names.forEach(x=>state.add(x)),
  remove:(...names)=>names.forEach(x=>state.delete(x)),
  contains:name=>state.has(name)
 };
}
function harness({mounted=false}={}){
 const document={
  documentElement:{classList:classList(["p54b-boot-pending"]),dataset:{}},
  body:{classList:classList(mounted?["p54-blueprint"]:[])},
  querySelector:()=>mounted?{}:null
 };
 if(mounted)document.documentElement.dataset.pay54Blueprint="1.2.4";
 const listeners=new Map(),timers=new Map();let timerCounter=0;
 const window={
  addEventListener:(type,fn)=>listeners.set(type,fn)
 };
 const context=vm.createContext({
  document,window,
  console:{info(){},warn(){}},
  setTimeout:(fn)=>{const id=++timerCounter;timers.set(id,fn);return id;},
  clearTimeout:id=>timers.delete(id)
 });
 vm.runInContext(boot(),context,{timeout:1000});
 return {document,window,listeners,timers,
  tick:()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};
}
test("730: before all other modules load the existing legacy view is marked pending",()=>{
 const h=harness();
 assert.equal(h.document.documentElement.classList.contains("p54b-boot-pending"),true);
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"PENDING");
});
test("730: verified mounted blueprint is the sole successful release path",()=>{
 const h=harness({mounted:true});
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.release("ready"),true);
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"READY");
 assert.equal(h.document.documentElement.classList.contains("p54b-boot-pending"),false);
 assert.equal(h.timers.size,0);
});
test("730: false ready signal does not reveal the old dashboard",()=>{
 const h=harness();
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.release("ready"),true);
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"FAILED");
 assert.equal(h.document.documentElement.classList.contains("p54b-boot-pending"),true);
 assert.equal(h.document.documentElement.classList.contains("p54b-boot-failed"),true);
});
test("730: timeout never reverts to old layout",()=>{
 const h=harness();
 h.tick();
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"FAILED");
 assert.equal(h.document.documentElement.classList.contains("p54b-boot-pending"),true);
});
test("730: pageshow preserves approved mounted blueprint and never impersonates success",()=>{
 const h=harness();
 h.listeners.get("pageshow")();
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"PENDING");
 h.document.documentElement.dataset.pay54Blueprint="1.2.4";
 h.document.body.classList.add("p54-blueprint");
 h.document.querySelector=()=>({});
 h.listeners.get("pageshow")();
 assert.equal(h.window.PAY54_DASHBOARD_BLUEPRINT_BOOT.health().state,"READY");
});
test("730: first paint CSS hides legacy header, grid and FAB with usable recovery",()=>{
 const html=read("dashboard.html");
 const css=read("assets/css/dashboard-blueprint-first-paint.css");
 assert.match(html,/<html lang="en" class="p54b-boot-pending">/);
 assert.match(html,/dashboard-blueprint-first-paint\.css\?v=2\.0\.0/);
 assert.match(html,/dashboard-blueprint-boot\.js\?v=2\.0\.0/);
 assert.match(html,/id="p54bBootStatus"/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(css,/body > main\.dash-grid/);
 assert.match(css,/body > #scanPayFab/);
 assert.match(css,/p54b-boot-failed/);
 assert.match(css,/\.p54b-boot-retry/);
 assert.doesNotMatch(css,/pointer-events: auto !important/);
});
