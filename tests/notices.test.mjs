import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ToastQueue,ModalQueue,MODAL_ORDER,toastSpec,toastDuration} from '../src/notices.js';
const t=(text,kind='info',action=null)=>({text,kind,action});
const texts=q=>[q.now?.text,...q.waiting.map(v=>v.text)];

test('older toast calls keep their meaning and unknown kinds fall back to a plain note',()=>{
 assert.deepEqual(toastSpec('Не хватает монет.',true),t('Не хватает монет.','error'));
 assert.deepEqual(toastSpec('Готово'),t('Готово'));
 const offer={action:'reload-app',label:'Обновить',icon:'download'};assert.deepEqual(toastSpec('Доступна новая версия',false,offer),t('Доступна новая версия','info',offer));
 assert.deepEqual(toastSpec('Клеймо',{kind:'mark'}),t('Клеймо','mark'));assert.equal(toastSpec('x',{kind:'shout'}).kind,'info');assert.equal(toastSpec(7).text,'7');
});
test('a toast stays long enough to read, between 3.3 and 8 seconds, and an offer with a button waits 9',()=>{
 assert.equal(toastDuration(t('Да')),3300);assert.equal(toastDuration(t('x'.repeat(40))),2500+45*40);assert.equal(toastDuration(t('x'.repeat(400))),8000);
 assert.equal(toastDuration(t('Изделие разобрано','info',{action:'unrecycle'})),9000);
});
test('a plain note replaces a plain note at once, rewards and hints wait their turn',()=>{
 const q=new ToastQueue();assert.equal(q.add(t('Материалы в запасе.')),true);assert.equal(q.add(t('Модель сохранена.')),true);assert.deepEqual(texts(q),['Модель сохранена.']);
 assert.equal(q.add(t('Клеймо «Серебро 84»','mark')),false,'a reward does not cut a note short');assert.equal(q.add(t('Подсказка','hint')),false);assert.deepEqual(texts(q),['Модель сохранена.','Клеймо «Серебро 84»','Подсказка']);
 q.next();assert.equal(q.now.text,'Клеймо «Серебро 84»');assert.equal(q.add(t('Найдено: гранат')),false,'a note waits behind a reward on screen');
 assert.equal(q.add(t('Модель сохранена.')),false,'only the latest plain note waits');assert.deepEqual(q.waiting.map(v=>v.text),['Подсказка','Модель сохранена.']);
});
test('an error is shown at once and a preempted reward comes back right after it',()=>{
 const q=new ToastQueue();q.add(t('Звание «Мастер цеха»','mark'));q.add(t('Подсказка','hint'));
 assert.equal(q.add(t('Не хватает монет.','error')),true);assert.deepEqual(texts(q),['Не хватает монет.','Звание «Мастер цеха»','Подсказка']);
 assert.equal(q.add(t('Витрина заполнена.','error')),true);assert.deepEqual(texts(q),['Витрина заполнена.','Звание «Мастер цеха»','Подсказка'],'an error replaces an error');
 assert.equal(q.add(t('Витрина заполнена.','error')),true,'a repeated error is shown again');assert.equal(q.waiting.length,2);
 q.next();q.next();q.next();assert.equal(q.next(),null);assert.equal(q.now,null);
});
test('at most four wait: plain notes go first and errors stay longest',()=>{
 const q=new ToastQueue();q.add(t('Клеймо 1','mark'));q.add(t('Найдено'));q.add(t('Подсказка','hint'));q.add(t('Клеймо 2','mark'));q.add(t('Обновить','info',{action:'reload-app'}));
 assert.deepEqual(q.waiting.map(v=>v.text),['Найдено','Подсказка','Клеймо 2','Обновить']);
 q.add(t('Клеймо 3','mark'));assert.deepEqual(q.waiting.map(v=>v.text),['Подсказка','Клеймо 2','Обновить','Клеймо 3'],'the plain note was dropped');
 q.add(t('Клеймо 4','mark'));assert.deepEqual(q.waiting.map(v=>v.text),['Клеймо 2','Обновить','Клеймо 3','Клеймо 4'],'then the hint');
 q.add(t('Ошибка','error'));assert.equal(q.now.text,'Ошибка');assert.deepEqual(q.waiting.map(v=>v.text),['Клеймо 1','Клеймо 2','Обновить','Клеймо 3'],'the preempted reward stays at the head, the latest mark made room');
 for(let i=0;i<6;i++)q.add(t('Ошибка '+i,'error'));assert.equal(q.waiting.length,4);assert.ok(q.waiting.every(v=>v.kind==='mark'||v.action),'an error on screen is replaced, not queued');
});
test('a stale undo offer is withdrawn, from the screen or from the line',()=>{
 const q=new ToastQueue(),undo=t('Изделие разобрано','info',{action:'unrecycle'}),isUndo=v=>v.action?.action==='unrecycle';
 q.add(undo);assert.equal(q.drop(isUndo),true);assert.equal(q.now,null);
 q.add(t('Клеймо','mark'));q.add(undo);assert.equal(q.drop(isUndo),false);assert.deepEqual(texts(q),['Клеймо']);
});
test('dialogs that wait open in the fixed order: welcome, update, ceremony, rank, letters, morning',()=>{
 assert.deepEqual(MODAL_ORDER,['welcome','update','ceremony','rank','letter','morning']);
 const q=new ModalQueue(),seen=[],add=kind=>q.add(()=>seen.push(kind),kind);
 for(const kind of['morning','letter','rank','ceremony','update','welcome','letter','surprise'])add(kind);
 assert.equal(q.size,8);let fn;while((fn=q.next()))fn();
 assert.deepEqual(seen,['welcome','update','ceremony','rank','letter','letter','morning','surprise']);assert.equal(q.next(),null);
});
test('the interface closes dialogs at once and keeps the history in step on their close event',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/function close\(\)\{dialog\.close\(\);\}/,'close() is synchronous');
 assert.match(app,/dialog\.addEventListener\('close',\(\)=>\{if\(dialog\.open\)return;[^\n]*history\.back\(\)/,'history follows the close event');
 assert.doesNotMatch(app,/getElementById\('toast'\)\.style\.zIndex|z-index:9999/,'the toast is not raised by z-index');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/id="toast"[^>]*popover="manual"/,'the toast is a manual popover in the top layer');
});
test('over an open dialog the toast docks at the bottom, clear of the title and the close button, and errors are urgent',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(css,/dialog>\.toast\{top:auto;bottom:/,'at the top a tap meant for «×» landed on «Вернуть» at 320 and 360 px');
 assert.match(app,/setAttribute\('aria-live',t\.kind==='error'\?'assertive':'polite'\)/,'the polite live region of index.html would outrank role=alert');
});
test('every fixed grid shares its width with minmax(0,…), so a long label cannot push a column off a narrow screen',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8'),bad=[...css.matchAll(/grid-template-columns:([^;}]*)/g)].map(m=>m[1]).filter(v=>/(^|[\s(,])[\d.]+fr/.test(v.replace(/minmax\([^)]*\)/g,'')));
 assert.deepEqual(bad,[]);
});
