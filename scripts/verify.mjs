import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const docsDir = path.join(root, 'docs');

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);
const sha256 = async (file) => {
  const data = await fs.readFile(file);
  return createHash('sha256').update(data).digest('hex');
};
const fail = (message) => { throw new Error(message); };

const dashboard = await readJson(path.join(publicDir, 'data', 'dashboard.json'));
const datasets = [
  ['vacancies', 'STEM_STRICT_vacancies.parquet'],
  ['employment', 'STEM_STRICT_employment.parquet'],
  ['companies', 'STEM_companies_snapshot.parquet'],
];

let total = 0;
for (const [id, parquetName] of datasets) {
  const rows = await readJson(path.join(publicDir, 'data', `${id}.json`));
  const expected = dashboard.meta.dataRows[id];
  if (rows.length !== expected) fail(`${id}: JSON contains ${rows.length} rows; expected ${expected}`);
  total += rows.length;

  const profile = dashboard.quality.datasets.find((item) => item.id === id);
  if (!profile) fail(`${id}: profile missing from dashboard.json`);
  const parquetPath = path.join(publicDir, 'downloads', parquetName);
  const digest = await sha256(parquetPath);
  if (digest !== profile.sha256) fail(`${id}: Parquet SHA-256 mismatch`);
}

if (total !== dashboard.meta.dataRows.total) {
  fail(`Total row count ${total} does not match metadata ${dashboard.meta.dataRows.total}`);
}
if (dashboard.meta.coverage.sourceCount !== Object.keys(dashboard.sources).length) {
  fail('Source count does not match source registry');
}
if (!dashboard.meta.allRecordsAccessible) fail('allRecordsAccessible flag is false');

const required = [
  'index.html', '.nojekyll', 'favicon.svg',
  'data/dashboard.json', 'data/vacancies.json', 'data/employment.json', 'data/companies.json',
  'data/project_public.json', 'data/world_countries.geojson',
  'downloads/STEM_STRICT_vacancies.parquet', 'downloads/STEM_STRICT_employment.parquet',
  'downloads/STEM_companies_snapshot.parquet', 'downloads/DATA_INVENTORY.json',
  'downloads/DASHBOARD_GUIDE.md', 'downloads/PROJECT_DOSSIER_PUBLIC.md',
];
for (const relative of required) {
  if (!(await exists(path.join(docsDir, relative)))) fail(`Built file missing: docs/${relative}`);
}

const publicFiles = await fs.readdir(publicDir, { recursive: true });
if (publicFiles.some((name) => String(name).toLowerCase().endsWith('.xlsx'))) {
  fail('Public bundle contains an XLSX source workbook; personal-data safeguard failed');
}

const assets = (await fs.readdir(path.join(docsDir, 'assets'))).filter((name) => /\.(js|css)$/.test(name));
if (!assets.some((name) => name.endsWith('.js')) || !assets.some((name) => name.endsWith('.css'))) {
  fail('Compiled JS/CSS assets are missing');
}

console.log(JSON.stringify({
  status: 'ok',
  rows: dashboard.meta.dataRows,
  sources: Object.keys(dashboard.sources),
  docsRequiredFiles: required.length,
  privacyCheck: 'no xlsx files in public/docs',
}, null, 2));
