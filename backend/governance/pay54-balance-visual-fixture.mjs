"use strict";

/**
 * PAY54 — isolated visual-only dashboard fixture.
 * Keeps reviewed dashboard HTML/CSS and blueprint presentation source,
 * removes all finance/auth/session/API scripts and intentionally seeds only
 * illustrative demo data. Never publish or enable financial operations.
 */
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {resolve,dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SUPPORTED_NAME=".pay54-balance-visual-fixture.html";

export function createPay54BalanceVisualFixture({sourceRoot=ROOT}={}){
 const root=resolve(sourceRoot);
 const path=join(root,SUPPORTED_NAME);
 if(existsSync(path))throw new Error("PAY54_VISUAL_FIXTURE_ALREADY_EXISTS");
 let html=readFileSync(join(root,"dashboard.html"),"utf8");
 if(!html.includes('id="balanceCard"')||
  !html.includes('id="balanceAmount"')||
  !html.includes('class="balance-meta"')||
  !html.includes('class="balance-delta pos"')||
  !html.includes('class="identity"')||
  !html.includes('class="trust-chip"')||
  !html.includes("</body>")){
  throw new Error("PAY54_VISUAL_FIXTURE_SOURCE_INVALID");
 }
 // The live dashboard starts with a deliberately hidden legacy first paint.
 // Synthetic visuals omit the real boot controller, so clear ONLY the local
 // fixture's initial loading class. Production HTML stays fail-closed.
 html=html.replace(
  '<html lang="en" class="p54b-boot-pending">',
  '<html lang="en">'
 );
 // This test fixture must NOT execute any original authentication, payment,
 // wallet, partner, scanner, account, storage or deployment bootstrap scripts.
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"");
 if(/<script\b/i.test(html))throw new Error("PAY54_VISUAL_FIXTURE_SCRIPT_REFUSED");
 html=html.replace("₦0.00\n</div>","₦1,250,000.50\n</div>");
 html=html.replace(
  /(<div id="walletBalances"\s+class="wallet-balances">)\s*(<\/div>)/,
  '$1'+
   '<div class="wallet-balance-row"><span class="wallet-balance-cur">NGN</span>'+
   '<span class="wallet-balance-amt">₦ 1,250,000.50</span></div>'+
   '<div class="wallet-balance-row"><span class="wallet-balance-cur">GBP</span>'+
   '<span class="wallet-balance-amt">£ 8,420.75</span></div>'+
   '<div class="wallet-balance-row"><span class="wallet-balance-cur">USD</span>'+
   '<span class="wallet-balance-amt">$ 15,320.40</span></div>'+
   '$2'
 );
 const banner='<aside role="note" data-pay54-visual-qa="synthetic">'+
  'PAY54 SYNTHETIC VISUAL QA — sample values only, all financial and login engines disabled'+
  '</aside>';
 html=html.replace(/<body\b[^>]*>/i,match=>match+banner);
 html=html.replace("</body>",
  '<script>window.PAY54_SECURITY = {session: {isAuthenticated: () => true}}; window.PAY54_ACCOUNT_CONTEXT_TEST_ONLY = true;</script>\n'+
  '<script src="assets/js/ui/account-context-selector.js"></script>\n'+
  '<script src="assets/js/dashboard-blueprint-shell.js"></script>\n</body>');
 writeFileSync(path,html,{flag:"wx",mode:0o644});
 return Object.freeze({
  fixtureFile:path,
  sourceOnly:true,
  authenticSessionUsed:false,
  paymentEnginesLoaded:false,
  publicSiteDeployed:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=createPay54BalanceVisualFixture();
 process.stdout.write(JSON.stringify(report)+"\n");
}
