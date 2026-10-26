import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/google-analytics.js',import.meta.url),'utf8');
function browser(initial=null,host='typing-animation.com',href=`https://${host}/account?token=secret#private`){
 const listeners = new Map();
 const nodes=new Map(); const scripts=[]; const values=new Map(initial ? [['typing-animation-analytics-consent-v1',initial]] : []);
 const element=()=>({style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(x){this.children.push(x);if(x.id)nodes.set(x.id,x)},addEventListener(k,fn){this[k]=fn},remove(){nodes.delete(this.id)}});
 const body=element(); const document={readyState:'complete',cookie:'_ga=abc; _ga_TEST=def',referrer:'https://typing-animation.com/account?token=private',body,head:{appendChild(x){scripts.push(x)}},createElement:element,getElementById:id=>nodes.get(id),querySelector:()=>null,addEventListener(name,fn){listeners.set(name,fn)}};
 const context={document,location:{hostname:host,href},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},URL};context.window=context;
 vm.runInNewContext(source,context);
 return {context,nodes,scripts,values,listeners};
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

function events(b) {
 return Array.from(b.context.dataLayer,entry=>Array.from(entry)).filter(entry=>entry[0]==='event');
}
function clickExport(b,disabled=false) {
 b.listeners.get('click')({target:{closest:selector=>selector==='[data-analytics-event="export_animation_click"]'?{disabled}:null}});
}
function settings(b) {
 b.listeners.get('click')({target:{closest:selector=>selector==='[data-privacy-settings]'?{}:null}});
 return b.nodes.get('privacy-choice-panel');
}
test('editor views and toolbar clicks require consent; reallowing does not duplicate the page event',()=>{
 const b=browser(null,'typing-animation.com','https://typing-animation.com/editor?payment=private');
 clickExport(b);assert.equal(events(b).length,0);
 b.nodes.get('privacy-choice-panel').children.find(x=>x.textContent==='Allow analytics').click();
 assert.deepEqual(events(b).map(e=>e[1]),['editor_view']);
 clickExport(b,true);assert.equal(events(b).length,1);
 clickExport(b);clickExport(b);
 assert.deepEqual(events(b).map(e=>e[1]),['editor_view','export_animation_click','export_animation_click']);
 assert.equal(events(b)[1][2].button_location,'editor_toolbar');
 assert.equal(events(b)[1][2].page_path,'/editor');
 assert.ok(!JSON.stringify(b.context.dataLayer).includes('private'));
 settings(b).children.find(x=>x.textContent==='Essential only').click();
 clickExport(b);assert.equal(events(b).length,3);
 settings(b).children.find(x=>x.textContent==='Allow analytics').click();
 clickExport(b);assert.equal(b.scripts.length,1);
 assert.equal(events(b).filter(e=>e[1]==='editor_view').length,1);
 assert.equal(events(b).filter(e=>e[1]==='export_animation_click').length,3);
});
test('campaign attribution keeps only safe UTM labels and never account, order or click tokens',()=>{
 const b=browser('allowed','typing-animation.com','https://typing-animation.com/editor?utm_source=x&utm_medium=social&utm_campaign=launch&utm_content=post-1&utm_term=private%40example.com&token=secret&payment=private&email=private%40example.com&gclid=private#private');
 const config=Array.from(b.context.dataLayer[1])[2];
 const url=new URL(config.page_location);
 assert.equal(url.searchParams.get('utm_source'),'x');
 assert.equal(url.searchParams.get('utm_campaign'),'launch');
 assert.equal(url.searchParams.get('utm_medium'),'social');
 assert.equal(url.searchParams.get('utm_content'),'post-1');
 assert.equal(url.searchParams.size,4);
 assert.equal(url.hash,'');
 assert.ok(!JSON.stringify(b.context.dataLayer).includes('private'));
 assert.ok(!JSON.stringify(b.context.dataLayer).includes('secret'));
});
test('editor event only fires on editor entry paths, not account/home or localhost',()=>{
 for(const path of ['/editor','/editor/','/editor.html']) {
  assert.equal(events(browser('allowed','typing-animation.com',`https://typing-animation.com${path}`))[0][1],'editor_view');
 }
 for(const path of ['/','/account','/pricing.html']) {
  const b=browser('allowed','typing-animation.com',`https://typing-animation.com${path}`);
  clickExport(b);assert.equal(events(b).length,0);
 }
 assert.equal(browser('allowed','localhost','http://localhost/editor').context.dataLayer,undefined);
});
