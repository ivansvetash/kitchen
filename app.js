'use strict';
document.documentElement.classList.add('js-ready');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionPreference.matches;
const revealElements = [...document.querySelectorAll('.reveal')];
let revealObserver;
function configureMotion() {
  reducedMotion = motionPreference.matches;
  revealObserver?.disconnect();
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('visible'));
    return;
  }
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, {threshold: 0.16, rootMargin: '0px 0px -45px 0px'});
  revealElements.filter(element => !element.classList.contains('visible')).forEach(element => revealObserver.observe(element));
}
configureMotion();
motionPreference.addEventListener('change', configureMotion);
// The first screen is driven by hero-scroll.js; the title is visible immediately.
document.documentElement.classList.add('motion-ready');
const progressLine = document.createElement('div');
progressLine.className = 'reading-progress';
progressLine.setAttribute('aria-hidden', 'true');
document.body.append(progressLine);
let scrollFrame = 0;
function paintScroll() {
  scrollFrame = 0;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressLine.style.transform = `scaleX(${scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0})`;
}
function queueScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll); }
window.addEventListener('scroll', queueScroll, {passive:true});
window.addEventListener('resize', queueScroll, {passive:true});
motionPreference.addEventListener('change', queueScroll);
paintScroll();
const header=document.getElementById('header');
const updateHeader=()=>header.classList.toggle('scrolled',window.scrollY>180);
window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
const menu=document.querySelector('.menu-toggle'), navigation=document.getElementById('navigation');
function closeMenu(){navigation.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');navigation.classList.toggle('open',open);});
navigation.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
const dialog=document.getElementById('details-dialog'),content=document.getElementById('dialog-content');
let previousFocus;
function openDialog(markup){previousFocus=document.activeElement;content.innerHTML=markup;dialog.showModal();document.body.style.overflow='hidden';}
function closeDialog(){dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('close',()=>{document.body.style.overflow='';previousFocus?.focus();});
content.addEventListener('click',event=>{if(event.target.closest('[data-contact]')){closeDialog();document.getElementById('contact').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});document.getElementById('name').focus({preventScroll:true});}});
const projects=[
  {title:'Современная классика',meta:'12 м² · Москва',image:'project-dark',text:'Глубокие тёмные оттенки, тёплый свет и выразительный остров. Открытое пространство объединяет кухню и зону общения.'},
  {title:'Свет и натуральные текстуры',meta:'9 м² · Москва',image:'project-light',text:'Светлые фасады, спокойная палитра и мягкие линии обеденной зоны. Натуральные текстуры делают пространство тёплым и уютным.'},
  {title:'Минимализм в деталях',meta:'14 м² · Москва',image:'project-detail',text:'Чистые линии фасадов и каменная поверхность. Скрытая подсветка подчёркивает фактуру и задаёт настроение всему пространству.'}
];
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{const p=projects[Number(button.dataset.project)];openDialog(`<img class="dialog-photo" src="assets/${p.image}.webp" alt="${p.title}"><div class="dialog-body"><p class="eyebrow">${p.meta}</p><h2>${p.title}</h2><p>${p.text}</p><button class="button button-gold" data-contact>Хочу похожую кухню <span aria-hidden="true">↗</span></button></div>`);}));
const materials=[
  {title:'Фасады',text:'МДФ, шпон, эмаль или натуральное дерево. Цвет, фактуру и сочетания подбираем под ваш интерьер — от спокойной матовой поверхности до выразительного рисунка дерева.'},
  {title:'Столешницы',text:'Кварц, керамогранит и натуральный камень. На консультации сравним материалы и подберём поверхность с учётом ваших привычек, пожеланий и бюджета.'},
  {title:'Фурнитура',text:'Blum, Hettich и встроенные системы хранения. Продумываем, как открываются фасады, где хранится посуда и насколько удобно пользоваться каждым ящиком.'},
  {title:'Дополнительно',text:'Подсветка, стекло, металл и встроенная техника. Собираем детали в единое решение и заранее учитываем их расположение в дизайн-проекте.'}
];
document.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>{const m=materials[Number(button.dataset.material)];openDialog(`<div class="dialog-body"><p class="eyebrow">Внимание к каждой детали</p><h2>${m.title}</h2><p>${m.text}</p><button class="button button-gold" data-contact>Обсудить материалы <span aria-hidden="true">↗</span></button></div>`);}));
const form=document.getElementById('request-form'),phone=document.getElementById('phone');
phone.addEventListener('input',()=>phone.setCustomValidity(''));
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(phone.value.replace(/\D/g,'').length<10){phone.setCustomValidity('Укажите номер телефона: не менее 10 цифр.');phone.reportValidity();return;}
  const name=document.getElementById('name').value.trim();
  if(!name){document.getElementById('name').setCustomValidity('Введите ваше имя.');document.getElementById('name').reportValidity();return;}
  openDialog('<div class="dialog-body"><p class="eyebrow">Ваш проект</p><h2>Заявка подготовлена</h2><p>Отправка в студию пока не подключена. Вы можете сохранить заявку на своём устройстве. Ваши данные никуда не переданы.</p><dl class="request-summary"><dt>Имя</dt><dd id="summary-name"></dd><dt>Телефон</dt><dd id="summary-phone"></dd></dl><button class="button button-gold" id="download-request">Скачать заявку <span aria-hidden="true">↓</span></button></div>');
  document.getElementById('summary-name').textContent=name;document.getElementById('summary-phone').textContent=phone.value;
  document.getElementById('download-request').addEventListener('click',()=>{const blob=new Blob([`SIASHOV KITCHENS — заявка на расчёт кухни\n\nИмя: ${name}\nТелефон: ${phone.value}\n\nСтатус: не отправлена.\n`],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='siashov-zayavka.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
});
document.getElementById('name').addEventListener('input',event=>event.target.setCustomValidity(''));
