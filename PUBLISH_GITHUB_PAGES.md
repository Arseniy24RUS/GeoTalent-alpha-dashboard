# Публикация GeoTalent на GitHub Pages

## Быстрый путь через веб-интерфейс GitHub

1. Распакуйте `geotalent-dashboard-github-pages.zip`.
2. Создайте новый репозиторий GitHub. Для бесплатной публикации Pages удобнее использовать публичный репозиторий.
3. Загрузите **содержимое** распакованной папки в корень репозитория. Проверьте, что видны `docs/`, `src/`, `public/`, `package.json` и скрытая папка `.github/`.
4. Выполните commit в ветку `main`.
5. Перейдите в `Settings → Pages`.
6. В разделе `Build and deployment` выберите `GitHub Actions`.
7. Откройте вкладку `Actions`, выберите workflow **Deploy GeoTalent to GitHub Pages** и дождитесь зелёного статуса. При необходимости нажмите `Run workflow`.
8. Адрес опубликованного сайта появится в блоке `deploy` и в `Settings → Pages`.

## Публикация готовой сборки без Actions

Папка `docs/` уже содержит production-версию.

1. В `Settings → Pages` выберите `Deploy from a branch`.
2. Укажите ветку `main` и каталог `/docs`.
3. Нажмите `Save`.

## Обновление дашборда

После изменения компонентов или стилей выполните:

```bash
npm ci
npm run check
```

Команда пересобирает `docs/` и проверяет количество строк, SHA-256 исходных Parquet, наличие всех файлов публикации и отсутствие XLSX в публичном контуре.

После изменения входных таблиц сначала выполните:

```bash
python -m pip install pandas pyarrow shapely
python scripts/build_data.py
npm run check
```

## Частые причины ошибки Pages

Проверьте, что папка `.github/workflows/` не потерялась при распаковке; в `Settings → Pages` выбран именно `GitHub Actions`; ветка называется `main`; workflow имеет разрешения `pages: write` и `id-token: write`; каталог `docs/` содержит `index.html` и `.nojekyll`.

Проект использует относительный `base: './'`, поэтому не требует ручной замены имени репозитория в путях к ресурсам.
