# GeoTalent — STEM Labour Observatory

Статическая аналитическая витрина международного STEM-рынка труда.

Публичный адрес: <https://arseniy24rus.github.io/GeoTalent-alpha-dashboard/>

Основной production-артефакт находится в `docs/index.html`. Он самодостаточен, не требует внешнего API, CDN или сборки на GitHub runner. Публикация выполняется workflow `.github/workflows/deploy-pages.yml`; отдельный workflow `.github/workflows/verify-pages.yml` проверяет фактический HTTP-ответ публичного адреса и сохраняет результат в `verification/latest.json`.

Текущий контур отражает 7 первичных источников, 24 219 записей, 40 стран спроса, 37 стран занятости и 663 региональных кода. Разные географические уровни, единицы измерения и классификации в интерфейсе методически разделены.
