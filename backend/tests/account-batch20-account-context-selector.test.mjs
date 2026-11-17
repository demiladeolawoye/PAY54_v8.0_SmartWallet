"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const file = fileURLToPath(new URL("../../assets/js/ui/account-context-selector.js", import.meta.url));
const source = readFileSync(file, "utf8");

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.parentNode = null;
    this.hidden = false;
  }
  append(...nodes) {
    for(const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
  }
  prepend(...nodes) {
    for(const node of nodes) node.parentNode = this;
    this.children.unshift(...nodes);
  }
  insertBefore(node, target) {
    const i = this.children.indexOf(target);
    if(i < 0) return this.append(node);
    node.parentNode = this;
    this.children.splice(i, 0, node);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  fire(type, event={}) { this.listeners.get(type)?.(event); }
  contains(node) {
    return this === node || this.children.some(child => child.contains(node));
  }
  querySelector(selector) {
    if(selector === ".profile-wrap") {
      return this.children.find(child=>child.className==="profile-wrap") ?? null;
    }
    return null;
  }
  focus() { this.focused = true; }
}

function fixture(authenticated) {
  const listeners = new Map();
  const document = {
    createElement: tag => new FakeElement(tag),
    addEventListener: (type,fn) => listeners.set(type,fn)
  };
  const window = {
    PAY54_SECURITY: {session: {isAuthenticated: () => authenticated}}
  };
  const header = new FakeElement("div");
  const profile = new FakeElement("div");
  profile.className = "profile-wrap";
  header.append(profile);
  const sidebar = new FakeElement("div");
  vm.runInNewContext(source, { window, document, Element: FakeElement }, {timeout: 1000});
  const api = window.PAY54_ACCOUNT_CONTEXT_SELECTOR;
  const mounted = api.mount({headerActions: header, sidebarFooter: sidebar});
  const selector = header.children[0];
  return {document,window,header,sidebar,selector,api,profile,listeners,mounted};
}

function descendants(node) {
  return [node,...node.children.flatMap(descendants)];
}

test("737: authenticated Personal account appears beside profile, not hidden in sidebar",()=>{
  const view=fixture(true);
  assert.equal(view.mounted,true);
  assert.equal(view.header.children[0].className,"p54b-account-context");
  assert.equal(view.header.children[1],view.profile);
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Personal account"));
  assert.ok(descendants(view.sidebar).some(n=>n.textContent.includes("Personal account")));
  assert.equal(view.api.health().serverSwitchVerified,false);
  assert.equal(view.api.health().accountSwitchExecuted,false);
});
test("737: Business never appears as authorised or actionable without server evidence",()=>{
  const view=fixture(true);
  const business=descendants(view.selector).find(n=>n.textContent==="Business");
  assert.ok(business);
  assert.equal(business.parentNode.getAttribute("aria-disabled"),"true");
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Unavailable"));
  assert.equal(view.api.health().businessContextAvailable,false);
});
test("737: selector opens and closes on click, outside pointer and Escape without switching accounts",()=>{
  const view=fixture(true);
  const [button,menu]=view.selector.children;
  assert.equal(menu.hidden,true);
  assert.equal(button.getAttribute("aria-controls"),"p54bAccountContextPanel");
  button.fire("click");
  assert.equal(menu.hidden,false);
  assert.equal(button.getAttribute("aria-expanded"),"true");
  view.listeners.get("pointerdown")({target:view.profile});
  assert.equal(menu.hidden,true);
  button.fire("click");
  view.listeners.get("keydown")({key:"Escape"});
  assert.equal(button.getAttribute("aria-expanded"),"false");
  assert.equal(button.focused,true);
  assert.equal(view.api.health().accountSwitchExecuted,false);
});
test("737: unauthenticated previews do not claim an active Personal or Business context",()=>{
  const view=fixture(false);
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Account unavailable"));
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Sign in required"));
  assert.equal(view.api.health().serverSwitchVerified,false);
});
test("737: cannot mount without a real DOM host and cannot mount twice",()=>{
  const view=fixture(true);
  assert.equal(view.api.mount({headerActions:view.header,sidebarFooter:view.sidebar}),false);
  assert.equal(view.api.mount({headerActions:null}),false);
});
test("737: UI never changes tenant identifiers, financial data, storage or backend auth",()=>{
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest)\b/);
  assert.doesNotMatch(source,/\.switchAccount\s*\(/);
  assert.doesNotMatch(source,/\.setActiveAccount\s*\(/);
  assert.match(source,/serverSwitchVerified: false/);
  assert.match(source,/accountSwitchExecuted: false/);
});

test("744: session invalidation immediately clears stale Personal account status",()=>{
  const view=fixture(true);
  const [button,menu]=view.selector.children;
  button.fire("click");
  assert.equal(menu.hidden,false);
  view.window.PAY54_SECURITY.session.isAuthenticated=()=>false;
  view.listeners.get("visibilitychange")();
  assert.equal(menu.hidden,true);
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Account unavailable"));
  assert.ok(descendants(view.sidebar).some(n=>n.textContent==="Account status unavailable"));
  assert.equal(view.api.health().accountSwitchExecuted,false);
  view.window.PAY54_SECURITY.session.isAuthenticated=()=>true;
  assert.equal(view.api.refresh(),true);
  assert.ok(descendants(view.selector).some(n=>n.textContent==="Personal account"));
});
