import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/google-analytics.js',import.meta.url),'utf8');
function browser(initial=null,host='typing-animation.com'){
 const nodes=new Map(); const scripts=[]; const values=new Map(initial ? [['typing-animation-analytics-consent-v1',initial]] : []);
 const element=()=>({style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(x){this.children.push(x);if(x.id)nodes.set(x.id,x)},addEventListener(k,fn){this[k]=fn},remove(){nodes.delete(this.id)}});
 const body=element(); const document={readyState:'complete',cookie:'_ga=abc; _ga_TEST=def',referrer:'https://typing-animation.com/account?token=private',body,head:{appendChild(x){scripts.push(x)}},createElement:element,getElementById:id=>nodes.get(id),querySelector:()=>null,addEventListener(){}};
 const context={document,location:{hostname:host,href:`https://${host}/account?token=secret#private`},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},URL};context.window=context;
 vm.runInNewContext(source,context);
 return {context,nodes,scripts,values};
}
test('Analytics is opt-in; refusal persists and does not load Google',()=>{
 const b=browser();assert.equal(b.scripts.length,0);
 const panel=b.nodes.get('privacy-choice-panel');assert.ok(panel);
 panel.children.find(x=>x.textContent==='Essential only').click();
 assert.equal(b.scripts.length,0);assert.equal(b.values.get('typing-animation-analytics-consent-v1'),'denied');assert.equal(b.nodes.size,0);
 assert.equal(browser('denied').scripts.length,0);
});
test('Analytics consent loads once, strips private URLs, and disables advertising signals',()=>{
 const b=browser();b.nodes.get('privacy-choice-panel').children.find(x=>x.textContent==='Allow analytics').click();
 assert.equal(b.scripts.length,1);assert.equal(b.values.get('typing-animation-analytics-consent-v1'),'allowed');
 const config=Array.from(b.context.dataLayer[1])[2];assert.equal(config.page_location,'https://typing-animation.com/account');assert.equal(config.page_referrer,'https://typing-animation.com/account');assert.equal(config.allow_google_signals,false);
 assert.equal(browser('allowed').scripts.length,1);assert.equal(browser('allowed','localhost').scripts.length,0);
});
