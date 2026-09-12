/*
 * Shared test helper: turn the calculator's rendered LCD markup into plain text
 * so assertions can be written as readable strings.
 *
 * The LCD html is deeply nested (a fraction contains a numerator and a
 * denominator, either of which may itself contain a fraction), which regex
 * substitution cannot handle reliably, so this builds a tiny element tree and
 * serialises it with a few house conventions:
 *
 *     <span class="cursor">  ->  CURSOR   (a "|" in the output)
 *     <span class="box">     ->  "\u2610"  (empty-slot placeholder)
 *     a fraction             ->  (numerator)/(denominator)
 *     an integral's limits   ->  [lower..upper]
 *
 * Keep CURSOR / BOX in sync with what the tests assert on.
 */
const CURSOR="|";
const BOX="\u2610";
function parse(html){
  const tag=/^<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/;
  const root={cls:"",kids:[]};
  let cur=root, i=0;
  while(i<html.length){
    if(html[i]==="<"){
      const m=tag.exec(html.slice(i));
      if(m){
        const cls=(/class="([^"]*)"/.exec(m[3])||[,""])[1].trim();
        if(m[1]==="/"){ if(cur!==root) cur=cur.parent; }
        else if(!m[4]){
          const n={cls:cls,kids:[],parent:cur};
          cur.kids.push(n); cur=n;
        }
        i+=m[0].length;
        continue;
      }
    }
    let j=html.indexOf("<",i);
    if(j<0) j=html.length;
    let txt=html.slice(i,j)
      .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/\u2212/g,"-");
    if(txt) cur.kids.push(txt);
    i=j;
  }
  return root;
}
function ser(n){
  if(typeof n==="string") return n;
  const c=n.cls, inner=n.kids.map(ser).join("");
  if(/\bcursor\b/.test(c)) return CURSOR;
  if(/\bbox\b/.test(c)) return BOX;
  if(/\bfrac\b/.test(c)){
    const num=(n.kids.find(k=>typeof k!=="string"&&/\bnum\b/.test(k.cls))||{kids:[]});
    const den=(n.kids.find(k=>typeof k!=="string"&&/\bden\b/.test(k.cls))||{kids:[]});
    return "("+num.kids.map(ser).join("")+")/("+den.kids.map(ser).join("")+")";
  }
  if(/\blim\b/.test(c)){
    const parts=n.kids.map(ser);
    return parts.length>1?("["+parts[1]+".."+parts[0]+"]"):inner;  /* lower..upper */
  }
  return inner;
}
/* readable single line for the expression area */
function renderText(html){ return ser(parse(html)).replace(/\s+/g,""); }
module.exports={parse,ser,renderText,CURSOR,BOX};
