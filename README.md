# SIASHOV Kitchens

В корне проекта уже лежит `index.html`. Загружайте на Vercel всю папку целиком, не только HTML-файл.

После импорта проекта в Vercel добавьте Environment Variables:

- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота
- `TELEGRAM_CHAT_ID` — ID чата для заявок

После добавления переменных сделайте Redeploy. Форма сайта отправляет заявки через `api/leads.js`.
