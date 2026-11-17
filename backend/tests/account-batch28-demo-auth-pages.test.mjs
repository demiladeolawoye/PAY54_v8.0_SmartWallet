"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const pages=[
 ["login.html","login(event)",["login-email","login-pin"]],
 ["signup.html","signup(event)",["signup-name","signup-email",
  "signup-country","signup-phone","signup-pin","signup-confirm-pin"]],
 ["forgot-pin.html","sendReset(event)",["forgot-email"]],
 ["create-new-pin.html","savePin(event)",["reset-email","reset-pin",
  "reset-confirm-pin"]],
 ["verify-otp.html","verifyOtp(event)",["otp"]]
];

test("1222: all five development-auth forms preserve callbacks and accessible field names",()=>{
 for(const [path,callback,ids] of pages){
  const html=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  assert.match(html,/<html lang="en">/);
  assert.match(html,/pay54-preview-notice/);
  assert.match(html,/No real identity check, bank account/);
  assert.ok(html.includes(callback),path+" callback changed");
  assert.ok(html.includes("assets/js/auth.js"),path+" auth dependency changed");
  for(const id of ids){
   assert.match(html,new RegExp('id="'+id+'"\\s+aria-label="[^"]+"'),
    path+" lacks accessible input "+id);
  }
 }
});
test("1222: form pages do not make bank-grade or real OTP claims",()=>{
 for(const [path] of pages){
  const html=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  assert.doesNotMatch(html,/Bank-grade|Code expires shortly|One-time use code|Recovery instructions sent securely/i);
  assert.match(html,/Development preview only/);
 }
});
test("1222: demo auth source never persists a new raw PIN",()=>{
 const js=readFileSync(new URL("../../assets/js/auth.js",import.meta.url),"utf8");
 assert.doesNotMatch(js,/localStorage\.setItem\s*\(\s*["']pay54_pin["']/);
 assert.match(js,/localStorage\.removeItem\(PAY54_LEGACY_PIN_KEY\)/);
 assert.match(js,/PAY54_DEMO_PIN_ITERATIONS\s*=\s*310000/);
 assert.match(js,/This is intentionally NOT an OTP verification/);
});
