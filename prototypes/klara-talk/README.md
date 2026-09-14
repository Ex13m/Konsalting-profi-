# Клара — разговорный прототип

Отдельная приватная страница: GPT-Live (`gpt-live-1`), WebRTC, аватар из предоставленного архива, расшифровка и небольшой текстовый контекст для пробного разговора.

## Подключение
Нужен серверный секрет `OPENAI_API_KEY` с доступом к GPT-Live и настроенным биллингом. Секрет задаётся через Sites environment variables, не через исходники или браузер. Использовать навык OpenAI Developers `openai-platform-api-key`, когда он доступен.

GET `/api/session` возвращает только состояние наличия ключа. POST требует same-origin и заголовок `oai-authenticated-user-id`, который устанавливает Sites. Приватность сайта нужно сохранить. Ключ не возвращается клиенту.

POST отправляет JSON на `https://api.openai.com/v1/live/sessions`, `transport.type=webrtc`. Голос `marin`, серверный помощник `gpt-5.6-terra`, `delegation.type=responses`. Текст до 12 000 символов передаётся как справочные данные помощнику. Это не подключение к внешней БД. Запись сессии отключена (`store=false`).

Клиент ждёт `session.started`, не посылает `session.start`. Обрабатывает `session.input_transcript.delta`, `session.output_transcript.delta`, `session.usage.updated`, `response.event`, `session.closed`. Закрытие через `session.close` с ожиданием финального события до 15 секунд. Микрофон отключается немедленно при завершении. Проба ограничена 10 минутами на клиенте. Расшифровка в памяти страницы, экспорт JSON по кнопке; сырые фрагменты и интервалы сохраняются в экспорте. Группировка строк — только отображение.

## Аватар
Сохранён исходный Canvas-модуль KPZive. Добавлено мягкое мерцание яркости без полного исчезновения и плавное отдаление до 2,5%; эффекты уменьшены при prefers-reduced-motion. Декоративный овал удалён. Полоса проекции ограничена силуэтом. Рот реагирует на RMS выходящего голоса, это НЕ фонемный липсинк и НЕ качество HeyGen. Видеоприветствие — отдельная запись и явно помечено. Фон PNG и Canvas прозрачен.

## Проверка
TypeScript проверен, production build собран. Мок-проверки: создание запроса по GPT-Live контракту, auth/origin, отсутствие ключа, события расшифровки, кумулятивный расход, дубли ответа, mute и graceful close. Реальный голосовой диалог требует настроенного секрета и проверки на устройстве с микрофоном. До этого его работоспособность не подтверждена.

Документация: https://developers.openai.com/api/docs/guides/voice-webrtc?api=live
https://developers.openai.com/api/docs/guides/live-conversations
https://developers.openai.com/api/docs/guides/live-delegation

## Upstream avatar implementation
Adapted hologram flicker, silhouette scanlines, SVG luma transparency and reusable audio RMS buffer from https://github.com/Ex13m/Konsalting-profi- at 6113c58145c54db150bf0ee8c362144295199716 (index.html and assets/live-client.js). Gentle 2.5% pullback is shared by canvas and greeting; no oval overlay. The upstream experimental Realtime transport was not copied: this prototype retains the GPT-Live session contract. Live dialog remains unverified; prior upstream session requests returned HTTP 429.
