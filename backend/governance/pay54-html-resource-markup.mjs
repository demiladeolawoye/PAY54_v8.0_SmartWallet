"use strict";

/**
 * PAY54 canonical HTML resource projection.
 *
 * Retains the complete script/style opening tag and its attributes, including
 * quoted '>' characters, while removing executable inline bodies. Comments
 * are ignored. This is intentionally source-only, not an HTML5 security
 * parser or a dynamic JavaScript/network execution validator.
 */
const OPEN=/<(script|style)\b/gi;
function openingTagEnd(source,begin){
 let quote=null;
 for(let i=begin;i<source.length;i++){
  const char=source[i];
  if(quote){
   if(char===quote)quote=null;
  }else if(char==="'"||char==='"'){
   quote=char;
  }else if(char===">"){
   return i;
  }
  if(i-begin>65_536)throw new Error("PAY54_HTML_RESOURCE_TAG_OVERSIZED");
 }
 throw new Error("PAY54_HTML_RESOURCE_OPEN_TAG_UNTERMINATED");
}
export function projectPay54HtmlResourceMarkup(html){
 if(typeof html!=="string"||Buffer.byteLength(html)>3_000_000){
  throw new TypeError("PAY54_HTML_RESOURCE_MARKUP_REQUIRED");
 }
 const clean=html.replace(/<!--[\s\S]*?-->/g,"");
 let output="",cursor=0,count=0;
 OPEN.lastIndex=0;
 let m;
 while((m=OPEN.exec(clean))!==null){
  if(++count>1000)throw new Error("PAY54_HTML_RESOURCE_SCRIPT_LIMIT");
  const end=openingTagEnd(clean,m.index);
  const close=new RegExp("<\\/"+m[1]+"\\s*>","gi");
  close.lastIndex=end+1;
  const closing=close.exec(clean);
  if(!closing)throw new Error("PAY54_HTML_RESOURCE_END_TAG_MISSING");
  output+=clean.slice(cursor,end+1)+closing[0];
  cursor=close.lastIndex;
  OPEN.lastIndex=cursor;
 }
 return output+clean.slice(cursor);
}
