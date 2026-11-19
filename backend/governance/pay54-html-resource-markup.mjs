"use strict";

/**
 * PAY54 item 698 — canonical bounded HTML markup projection.
 *
 * Removes HTML comments and contents of script/style elements before the
 * URL attribute scanners run. The original tags remain so their src/href
 * attributes and inline executable handlers can be reviewed. This is not
 * a full WHATWG HTML parser and must not certify dynamic runtime requests.
 */
export function projectPay54HtmlResourceMarkup(html){
 if(typeof html!=="string"||html.length>3_000_000){
  throw new TypeError("PAY54_HTML_RESOURCE_MARKUP_REQUIRED");
 }
 return html
  .replace(/<!--[\s\S]*?-->/g,"")
  .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi,"$1$2")
  .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style\s*>)/gi,"$1$2");
}
