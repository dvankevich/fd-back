## Безпека сесій: вплив XSS

### Суть проблеми
XSS (Cross-Site Scripting) дозволяє зловмиснику виконувати JavaScript у браузері жертви.
Навіть якщо refresh-токен зберігається в `httpOnly` cookie (і JS до нього не має доступу), XSS все одно становить серйозну загрозу:

- Може читати access token, якщо він зберігається в `localStorage` / `sessionStorage` / змінній JS
- Може робити запити від імені користувача (включно з `/api/auth/refresh` та захищеними ендпоінтами)
- Може викрасти нову пару токенів після ротації refresh-токена
- Фактично дає змогу повністю захопити сесію, поки XSS активний

### Поточний стан
- Refresh-токен: `httpOnly` + `secure` + `sameSite: strict` ✅
- Access-токен: повертається в тілі відповіді (клієнт сам вирішує, де зберігати)
- Ротація refresh-токена є, але без захисту від replay (family / reuse detection)

### Що варто зробити пізніше
- [ ] Документувати рекомендації для клієнта: access token тримати тільки в пам’яті (не в localStorage)
- [x] Розглянути короткий TTL access token + silent refresh (TTL 15 хв у `AUTH_CONFIG`; silent refresh на боці клієнта через `/api/auth/refresh`)
- [x] Додати Content-Security-Policy (CSP) заголовки (Helmet CSP увімкнено в усіх середовищах; `/api-docs` і `/reference` мають власний послаблений CSP)
- [x] (Опціонально) реалізувати refresh token family / reuse detection
- [x] Перевірити, що `httpOnly` cookie не доступний з JS навіть при XSS

### Пріоритет
Середній / низький на етапі boilerplate.  
Критично — коли з’явиться реальний frontend і продакшен.