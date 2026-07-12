# GitHub Pages deployment

## Confirmed blocker

The repository currently has no GitHub Pages site configured. An authenticated diagnostic run returned:

- `GET /repos/Arseniy24RUS/GeoTalent-alpha-dashboard/pages` → HTTP `404 Not Found`;
- `POST .../pages` with `{"build_type":"workflow"}` → HTTP `403 Resource not accessible by integration`;
- `PUT .../pages` → HTTP `403 Resource not accessible by integration`.

This means the site cannot be enabled from a normal repository workflow using `GITHUB_TOKEN`, even when the job declares `pages: write`. The owner must enable Pages once in repository settings, or supply a separate administrator PAT/App token with the required Pages administration permission.

## Reliable configuration used here

The repository is intentionally prepared for branch-based publishing, which removes custom deployment workflows and their repeated failed checks.

1. Open <https://github.com/Arseniy24RUS/GeoTalent-alpha-dashboard/settings/pages>.
2. Set **Source** to **Deploy from a branch**.
3. Select branch **main** and folder **/docs**.
4. Click **Save**.

The production entry point is `docs/index.html`; `docs/.nojekyll` disables Jekyll processing and `docs/404.html` provides a route fallback.
