const catalogue = {
  layout: { straight: 'Прямая', corner: 'Угловая', u: 'П-образная', island: 'С островом' },
  facade: { film: 'МДФ в плёнке', enamel: 'МДФ в эмали', veneer: 'Натуральный шпон', wood: 'Массив дерева' },
  top: { laminate: 'Ламинированная', quartz: 'Кварцевый агломерат' },
  hardware: { standard: 'Стандарт с доводчиками', premium: 'Усиленная комплектация' }
};

const rates = {
  cabinet: 35000,
  facade: { film: 0, enamel: 12000, veneer: 22000, wood: 32000 },
  top: { laminate: 8000, quartz: 28000 },
  hardware: { standard: 0, premium: 12000 },
  layout: { straight: 0, corner: 18000, u: 36000, island: 0 },
  island: 110000,
  lighting: 3000,
  drawers: 18000
};

function calculate(k) {
  if (!k || typeof k !== 'object') throw Error('Заполните параметры кухни.');
  for (const key of ['layout', 'facade', 'top', 'hardware']) {
    if (!Object.hasOwn(catalogue[key], k[key])) throw Error('Выберите параметры кухни.');
  }
  if (typeof k.length !== 'number' || !Number.isFinite(k.length) || k.length < 1.8 || k.length > 10 || Math.abs(k.length * 10 - Math.round(k.length * 10)) > 0.0001) {
    throw Error('Укажите длину от 1,8 до 10 м с шагом 0,1 м.');
  }
  if (typeof k.lighting !== 'boolean' || typeof k.drawers !== 'boolean') throw Error('Проверьте дополнительные опции.');
  const items = [
    ['Корпуса и стандартные фасады', k.length * rates.cabinet],
    ['Отделка фасадов', k.length * rates.facade[k.facade]],
    ['Столешница', k.length * rates.top[k.top]],
    ['Фурнитура', k.length * rates.hardware[k.hardware]],
    ['Угловые секции', rates.layout[k.layout]]
  ];
  if (k.layout === 'island') items.push(['Остров 1,2 м в базовой комплектации', rates.island]);
  if (k.lighting) items.push(['Подсветка рабочей зоны', k.length * rates.lighting]);
  if (k.drawers) items.push(['Блок из трёх выдвижных ящиков', rates.drawers]);
  const base = items.reduce((sum, item) => sum + item[1], 0);
  return { items: items.filter(item => item[1] > 0), base, min: Math.floor(base * 0.9 / 1000) * 1000, max: Math.ceil(base * 1.1 / 1000) * 1000 };
}

const rub = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽';
const reply = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Метод не поддерживается.' });
  const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!p) return reply(res, 400, { error: 'Неверный формат заявки.' });
  if (p.website) return reply(res, 400, { error: 'Не удалось отправить заявку.' });
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || /[\r\n]/.test(p.name) || typeof p.phone !== 'string' || p.phone.length > 25 || !/^[+\d\s().-]+$/.test(p.phone) || p.phone.replace(/\D/g, '').length < 10 || p.phone.replace(/\D/g, '').length > 15 || p.consent !== true || !['quiz', 'contact'].includes(p.source)) {
    return reply(res, 400, { error: 'Проверьте имя, телефон и согласие на отправку.' });
  }
  if (p.comment !== undefined && (typeof p.comment !== 'string' || p.comment.length > 1000)) return reply(res, 400, { error: 'Комментарий должен содержать не более 1000 символов.' });
  let quote;
  try { if (p.source === 'quiz') quote = calculate(p.kitchen); } catch (error) { return reply(res, 400, { error: error.message }); }
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return reply(res, 503, { error: 'Не удалось отправить заявку. Попробуйте позже.' });
  const lines = ['SIASHOV KITCHENS — новая заявка', `Имя: ${p.name.trim()}`, `Телефон: ${p.phone.trim()}`, `Источник: ${p.source === 'quiz' ? 'После расчёта' : 'Консультация без расчёта'}`];
  if (quote) {
    const k = p.kitchen;
    lines.push('', `Планировка: ${catalogue.layout[k.layout]}`, `Длина: ${k.length} м`, `Фасады: ${catalogue.facade[k.facade]}`, `Столешница: ${catalogue.top[k.top]}`, `Фурнитура: ${catalogue.hardware[k.hardware]}`, `Подсветка: ${k.lighting ? 'да' : 'нет'}`, `Блок из трёх ящиков: ${k.drawers ? 'да' : 'нет'}`, `Предварительный расчёт: ${rub(quote.min)} – ${rub(quote.max)}`, 'Техника, мойка, доставка и монтаж не включены.');
  }
  if (p.comment?.trim()) lines.push('', `Комментарий: ${p.comment.trim()}`);
  lines.push('', 'Согласие на передачу данных: получено.');
  try {
    const telegram = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: lines.join('\n'), link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(12000)
    });
    const body = await telegram.json();
    if (!telegram.ok || body.ok !== true) return reply(res, 502, { error: 'Telegram не принял заявку. Попробуйте позже.' });
    return reply(res, 200, { ok: true });
  } catch {
    return reply(res, 504, { error: 'Подтверждение не получено. Попробуйте ещё раз позже.' });
  }
}
