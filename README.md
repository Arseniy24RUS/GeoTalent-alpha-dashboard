# GeoTalent — STEM Labour Observatory

Самодостаточная статическая аналитическая витрина международного STEM-рынка труда.

Production-файл находится в `docs/index.html`; он не зависит от внешнего API, CDN, npm-сборки или серверной части. Каталог `docs` подготовлен для штатной публикации GitHub Pages из ветки `main`.

## Однократное включение GitHub Pages

Откройте **Settings → Pages**: <https://github.com/Arseniy24RUS/GeoTalent-alpha-dashboard/settings/pages>

Выберите:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`
- нажмите **Save**

После сохранения публичный адрес: <https://arseniy24rus.github.io/GeoTalent-alpha-dashboard/>

Подробная диагностика и объяснение, почему это действие нельзя выполнить через стандартный `GITHUB_TOKEN`, приведены в `DEPLOYMENT.md`.
