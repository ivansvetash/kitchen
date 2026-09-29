import {catalogue,calculate,rub} from './pricing.js';
const panel=document.getElementById('quiz-panel'),next=document.getElementById('quiz-next'),back=document.getElementById('quiz-back'),error=document.getElementById('quiz-validation');
const kitchen={layout:'',length:3,facade:'',top:'',hardware:'',lighting:false,drawers:false};
let step=0,busy=false;
const stageNames=['Планировка','Размеры','Фасады','Комплектация','Ваш расчёт'];
const hints={straight:'Вдоль одной стены',corner:'Вдоль двух стен',u:'Вдоль трёх стен',island:'Линия кухни и отдельный остров',film:'Практичная гладкая поверхность',enamel:'Матовая или глянцевая отделка',veneer:'Выразительная текстура дерева',wood:'Фасады из натурального дерева'};
function options(key){return `<div class="quiz-options" role="radiogroup" aria-label="${{layout:'Планировка',facade:'Материал фасадов',top:'Столешница',hardware:'Фурнитура'}[key]}">${Object.entries(catalogue[key]).map(([value,label])=>`<label class="quiz-option"><input type="radio" name="${key}" value="${value}" ${kitchen[key]===value?'checked':''}><span>${label}${hints[value]?`<small>${hints[value]}</small>`:''}</span></label>`).join('')}</div>`;}
function isValid(){return step===0?!!kitchen.layout:step===1?Number.isFinite(kitchen.length)&&kitchen.length>=1.8&&kitchen.length<=10&&Math.abs(kitchen.length*10-Math.round(kitchen.length*10))<.0001:step===2?!!kitchen.facade:!!kitchen.top&&!!kitchen.hardware;}
function render(focus=false){
 error.textContent='';next.disabled=!isValid();next.hidden=step===4;back.hidden=step===0;back.textContent=step===4?'Изменить ответы':'Назад';next.textContent=step===3?'Рассчитать стоимость':'Далее';
 document.getElementById('quiz-counter').textContent=step<4?`Шаг ${step+1} из 4`:'Расчёт готов';document.getElementById('quiz-stage').textContent=stageNames[step];
 document.getElementById('quiz-progress-fill').style.width=`${Math.min(4,step+1)*25}%`;document.querySelector('.quiz-progress').setAttribute('aria-valuenow',String(Math.min(4,step+1)));
 let markup='';
 if(step===0)markup=`<h3 tabindex="-1">Какой будет ваша кухня?</h3><p class="quiz-description">Выберите планировку. Затем нажмите «Далее».</p>${options('layout')}`;
 if(step===1)markup=`<h3 tabindex="-1">Сколько метров займёт кухня?</h3><p class="quiz-description">${kitchen.layout==='straight'?'Укажите длину линии кухонных шкафов.':kitchen.layout==='island'?'Укажите длину основной линии. Остров 1,2 м учитывается отдельно.':'Укажите суммарную длину всех сторон кухни вдоль стен.'} Верхние шкафы отдельно не прибавляйте.</p><label class="quiz-length"><span class="sr-only">Длина кухни в метрах</span><input type="number" name="length" id="quiz-length-number" min="1.8" max="10" step="0.1" inputmode="decimal" value="${kitchen.length}"><span>м</span></label><input class="quiz-range" type="range" aria-label="Длина кухни" id="quiz-length-range" min="1.8" max="10" step="0.1" value="${kitchen.length}"><div class="quiz-range-labels"><span>1,8 м</span><span>10 м</span></div>`;
 if(step===2)markup=`<h3 tabindex="-1">Какие фасады вам ближе?</h3><p class="quiz-description">Цвет и конкретную фактуру можно выбрать позже.</p>${options('facade')}`;
 if(step===3)markup=`<h3 tabindex="-1">Добавим важные детали</h3><p class="quiz-description">Выберите столешницу и фурнитуру.</p><fieldset class="quiz-group"><legend>Столешница</legend>${options('top')}</fieldset><fieldset class="quiz-group"><legend>Фурнитура</legend>${options('hardware')}</fieldset><div class="quiz-extras"><label><input type="checkbox" name="lighting" ${kitchen.lighting?'checked':''}>Подсветка рабочей зоны</label><label><input type="checkbox" name="drawers" ${kitchen.drawers?'checked':''}>Блок из трёх ящиков</label></div>`;
 if(step===4){const c=calculate(kitchen);markup=`<h3 tabindex="-1">Ориентир для вашей кухни</h3><p class="quiz-total">${rub(c.min)} – ${rub(c.max)}</p><p class="quiz-summary">${catalogue.layout[kitchen.layout]} · ${String(kitchen.length).replace('.',',')} м · ${catalogue.facade[kitchen.facade]}<br>${catalogue.top[kitchen.top]} столешница · ${catalogue.hardware[kitchen.hardware]}</p><p class="quiz-description">Предварительный расчёт по ориентировочным ставкам. Техника, мойка, доставка и монтаж не включены.</p><details class="quiz-breakdown"><summary>Из чего сложилась сумма</summary><dl>${c.items.map(([label,value])=>`<div><dt>${label}</dt><dd>${rub(value)}</dd></div>`).join('')}</dl><p>Базовый расчёт: ${rub(c.base)}. Диапазон: ±10%, округление наружу до 1 000 ₽. Реальную смету можно составить после замера и выбора конкретных материалов.</p></details><button class="button button-gold quiz-result-cta" type="button" data-open-lead="quiz">Обсудить эту комплектацию</button>`;}
 panel.innerHTML=markup;panel.style.animation='none';void panel.offsetWidth;panel.style.animation='';
 if(focus){panel.querySelector('h3').focus({preventScroll:true});const top=document.querySelector('.quiz-topline').getBoundingClientRect().top;if(top<110||top>window.innerHeight-140)document.querySelector('.quiz-main').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
}
panel.addEventListener('input',event=>{
 const t=event.target;
 if(t.id==='quiz-length-range'||t.id==='quiz-length-number'){
 kitchen.length=t.value===''?NaN:Number(t.value);
 if(t.id==='quiz-length-range')document.getElementById('quiz-length-number').value=t.value;
 else if(Number.isFinite(kitchen.length))document.getElementById('quiz-length-range').value=String(kitchen.length);
 }else if(Object.hasOwn(kitchen,t.name)){kitchen[t.name]=t.type==='checkbox'?t.checked:t.value;}
 if(step<4){next.disabled=!isValid();error.textContent=step===1&&!isValid()?'Длина: от 1,8 до 10 м, шаг 0,1 м.':'';}
});
next.addEventListener('click',()=>{if(!isValid()||step>=4)return;step++;render(true);});
back.addEventListener('click',()=>{if(busy)return;step=Math.max(0,step-1);render(true);});
const leadDialog=document.getElementById('lead-dialog');
const leadForm=document.getElementById('request-form');
const success=document.getElementById('lead-success');
let leadTrigger,previousOverflow='';
function closeLead(){if(!busy)leadDialog.close();}
function openLead(source,trigger){
 if(busy||leadDialog.open)return;
 if(source==='quiz'&&step!==4)return;
 leadTrigger=trigger||document.activeElement;
 leadForm.dataset.leadForm=source;
 leadForm.hidden=false;success.hidden=true;
 leadForm.querySelector('.lead-status').textContent='';
 const fromQuiz=source==='quiz',quote=document.getElementById('lead-quote');
 document.getElementById('lead-title').textContent=fromQuiz?'Обсудим вашу комплектацию':'Обсудим вашу кухню';
 document.getElementById('lead-intro').textContent=fromQuiz?'Оставьте контакты — ответы и предварительный расчёт будут приложены к заявке.':'Оставьте контакты и расскажите, что хотите обсудить.';
 quote.hidden=!fromQuiz;
 if(fromQuiz){const c=calculate(kitchen);quote.textContent=`${catalogue.layout[kitchen.layout]} · ${kitchen.length} м · ${rub(c.min)} – ${rub(c.max)}. Предварительный расчёт.`;}
 previousOverflow=document.body.style.overflow;
 leadDialog.showModal();document.body.style.overflow='hidden';leadForm.elements.name.focus();
}
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-open-lead]');if(trigger)openLead(trigger.dataset.openLead,trigger);});
document.addEventListener('request-consultation',()=>openLead('contact'));
leadDialog.querySelector('.dialog-close').addEventListener('click',closeLead);
leadDialog.querySelector('[data-close-lead]').addEventListener('click',closeLead);
leadDialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
leadDialog.addEventListener('click',event=>{if(event.target!==leadDialog)return;const r=leadDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeLead();});
leadDialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;leadTrigger?.focus({preventScroll:true});});
leadForm.addEventListener('submit',async event=>{
 event.preventDefault();const form=leadForm;if(busy||!form.reportValidity())return;
 const name=form.elements.name.value.trim(),phone=form.elements.phone.value.trim(),status=form.querySelector('.lead-status'),button=form.querySelector('button[type="submit"]');
 const digits=phone.replace(/\D/g,'');if(!name||digits.length<10||digits.length>15){status.textContent='Укажите имя и телефон от 10 до 15 цифр.';return;}
 const payload={name,phone,comment:form.elements.comment.value.trim(),consent:form.elements.consent.checked,website:form.elements.website.value,source:form.dataset.leadForm,kitchen:form.dataset.leadForm==='quiz'?{...kitchen}:null};
 busy=true;button.disabled=true;back.disabled=true;leadDialog.querySelector('.dialog-close').disabled=true;const label=button.textContent;button.textContent='Отправка…';status.textContent='';
 try{
  const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(16000)});
  const data=await response.json().catch(()=>({}));if(!response.ok||data.ok!==true)throw Error(data.error||'Не удалось отправить заявку. Ваши ответы сохранены на странице.');
  form.hidden=true;success.hidden=false;form.reset();success.querySelector('button').focus();
 }catch(e){status.textContent=e.name==='TimeoutError'?'Подтверждение не получено. Заявка могла дойти; проверьте перед повторной отправкой.':e.message||'Не удалось отправить заявку. Попробуйте позже.';}
 finally{busy=false;back.disabled=false;leadDialog.querySelector('.dialog-close').disabled=false;button.disabled=false;button.textContent=label;}
});
render();
