"use strict";

/**
 * PAY54 Batch20 item 718 — bounded HTML start-tag attribute extraction.
 *
 * Real HTML tags only: ignores prose such as "src=x" outside tags, preserves
 * quoted '>' characters, reports duplicate sensitive attributes and refuses
 * malformed/unterminated tags. Caller must apply the existing shared markup
 * projector before extracting; no HTML is executed.
 */
const MAX_BYTES=3_000_000,MAX_TAGS=15_000,MAX_ATTRIBUTES=100_000,MAX_VALUE=4_096;
const NAME=/^[A-Za-z][A-Za-z0-9:_-]*$/;
function whitespace(c){return c===" "||c==="\n"||c==="\r"||c==="\t"||c==="\f";}
export function extractPay54HtmlStartTagAttributes(markup){
 if(typeof markup!=="string"||Buffer.byteLength(markup)>MAX_BYTES){
  throw new TypeError("PAY54_HTML_TAG_SOURCE_INVALID");
 }
 const attrs=[],issues=[];
 let tags=0,index=0;
 while(index<markup.length){
  const begin=markup.indexOf("<",index);
  if(begin<0)break;
  const following=markup[begin+1]??"";
  if(!/[A-Za-z]/.test(following)){index=begin+1;continue;}
  let cursor=begin+1,quote=null,finish=-1;
  while(cursor<markup.length){
   const c=markup[cursor];
   if(quote){
    if(c===quote)quote=null;
   }else if(c==="'"||c==='"'){quote=c;}
   else if(c===">"){finish=cursor;break;}
   cursor++;
   if(cursor-begin>65536)throw new Error("PAY54_HTML_TAG_OVERSIZED");
  }
  if(finish<0)throw new Error("PAY54_HTML_TAG_UNTERMINATED");
  const body=markup.slice(begin+1,finish);
  const match=/^([A-Za-z][A-Za-z0-9:-]*)/.exec(body);
  index=finish+1;
  if(!match)continue;
  if(++tags>MAX_TAGS)throw new Error("PAY54_HTML_TAG_COUNT_EXCEEDED");
  const tag=match[1].toLowerCase();
  let p=match[0].length;
  const seen=new Set();
  while(p<body.length){
   while(p<body.length&&(whitespace(body[p])||body[p]==="/"))p++;
   if(p>=body.length)break;
   const start=p;
   while(p<body.length&&!whitespace(body[p])&&body[p]!=="="&&body[p]!=="/")p++;
   const name=body.slice(start,p).toLowerCase();
   if(!name||!NAME.test(name)){
    issues.push(Object.freeze({tag,kind:"MALFORMED_ATTRIBUTE_NAME"}));break;
   }
   while(p<body.length&&whitespace(body[p]))p++;
   let value=null;
   if(body[p]==="="){
    p++;
    while(p<body.length&&whitespace(body[p]))p++;
    if(body[p]==="'"||body[p]==='"'){
     const q=body[p++],startValue=p;
     const end=body.indexOf(q,p);
     if(end<0)throw new Error("PAY54_HTML_ATTRIBUTE_QUOTE_UNTERMINATED");
     value=body.slice(startValue,end);
     p=end+1;
    }else{
     const startValue=p;
     while(p<body.length&&!whitespace(body[p]))p++;
     value=body.slice(startValue,p);
    }
    if(!value||value.length>MAX_VALUE){
     issues.push(Object.freeze({tag,name,kind:"EMPTY_OR_OVERSIZED_ATTRIBUTE"}));
    }
   }
   if(seen.has(name))issues.push(Object.freeze({tag,name,kind:"DUPLICATE_ATTRIBUTE"}));
   seen.add(name);
   attrs.push(Object.freeze({tag,name,value}));
   if(attrs.length>MAX_ATTRIBUTES)throw new Error("PAY54_HTML_ATTRIBUTE_COUNT_EXCEEDED");
  }
 }
 return Object.freeze({
  schema:"pay54.html-starttag-attributes.v1",
  scannedTags:tags,
  attributes:Object.freeze(attrs),
  issues:Object.freeze(issues),
  syntaxSafe:issues.length===0,
  dynamicRuntimeVerified:false,
  productionRelease:"BLOCKED"
 });
}
