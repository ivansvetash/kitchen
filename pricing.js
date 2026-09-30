// Ориентировочные ставки для предварительного расчёта.
export const catalogue={layout:{straight:'Прямая',corner:'Угловая',u:'П-образная',island:'С островом'},facade:{film:'МДФ в плёнке',enamel:'МДФ в эмали',veneer:'Натуральный шпон',wood:'Массив дерева'},top:{laminate:'Ламинированная',quartz:'Кварцевый агломерат'},hardware:{standard:'Стандарт с доводчиками',premium:'Усиленная комплектация'}};
export const rates={cabinet:35000,facade:{film:0,enamel:12000,veneer:22000,wood:32000},top:{laminate:8000,quartz:28000},hardware:{standard:0,premium:12000},layout:{straight:0,corner:18000,u:36000,island:0},island:110000,lighting:3000,drawers:18000};
export function validateKitchen(k){
 if(!k||typeof k!=='object')throw Error('Заполните параметры кухни.');
 for(const key of ['layout','facade','top','hardware'])if(!Object.hasOwn(catalogue[key],k[key]))throw Error('Выберите параметры кухни.');
 if(typeof k.length!=='number'||!Number.isFinite(k.length)||k.length<1.8||k.length>10||Math.abs(k.length*10-Math.round(k.length*10))>.0001)throw Error('Укажите длину от 1,8 до 10 м с шагом 0,1 м.');
 if(typeof k.lighting!=='boolean'||typeof k.drawers!=='boolean')throw Error('Проверьте дополнительные опции.');
 return k;
}
export function calculate(k){
 validateKitchen(k);
 const items=[['Корпуса и стандартные фасады',k.length*rates.cabinet],['Отделка фасадов',k.length*rates.facade[k.facade]],['Столешница',k.length*rates.top[k.top]],['Фурнитура',k.length*rates.hardware[k.hardware]],['Угловые секции',rates.layout[k.layout]]];
 if(k.layout==='island')items.push(['Остров 1,2 м в базовой комплектации',rates.island]);
 if(k.lighting)items.push(['Подсветка рабочей зоны',k.length*rates.lighting]);
 if(k.drawers)items.push(['Блок из трёх выдвижных ящиков',rates.drawers]);
 const base=items.reduce((sum,item)=>sum+item[1],0);
 return {items:items.filter(item=>item[1]>0),base,min:Math.floor(base*.9/1000)*1000,max:Math.ceil(base*1.1/1000)*1000};
}
export const rub=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value)+' ₽';
