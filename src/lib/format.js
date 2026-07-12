export const GROUP_COLORS = {
  ENG: '#2947A0',
  ICT: '#539D96',
  SCI: '#6280D9',
  HTC: '#192F70',
  KIS: '#67AEA7',
  HRST: '#539D96',
  UK_STEM_PROF: '#4D6BC8',
};

export const GROUP_LABELS = {
  ENG: 'Инженерные профессии',
  ICT: 'Информационные технологии',
  SCI: 'Наука и естественные науки',
  HTC: 'Высокотехнологичное производство',
  KIS: 'Знаниеёмкие услуги',
  HRST: 'Научно-технологические кадры',
  UK_STEM_PROF: 'STEM professionals (SOC2010)',
};

export const SOURCE_ORDER = ['eures', 'adzuna', 'eurostat', 'eurostat_htec', 'bls', 'statcan', 'uk_nomis'];

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const abs = Math.abs(n);
  if (options.compact !== false && abs >= 1_000_000_000) return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n / 1_000_000_000)} млрд`;
  if (options.compact !== false && abs >= 1_000_000) return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n / 1_000_000)} млн`;
  if (options.compact !== false && abs >= 10_000) return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n / 1_000)} тыс.`;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: options.maximumFractionDigits ?? 1 }).format(n);
}

export function formatExact(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value));
}

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function percent(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(Number(value))}%`;
}

export function sourceUnitLabel(meta) {
  if (meta.metric === 'employment') return 'человек';
  return meta.metric === 'postings' ? 'постингов' : 'вакансий';
}

export function latestRows(source) {
  const period = source.meta.latestPeriod;
  return source.national[period] || [];
}

export function groupValue(row, group) {
  if (!row) return 0;
  return group === 'ALL' ? Number(row.total || 0) : Number(row.groups?.[group] || 0);
}

export function calculateGrowth(source, code, group = 'ALL') {
  const periods = source.meta.periods || [];
  if (periods.length < 2) return null;
  const first = (source.national[periods[0]] || []).find((row) => row.code === code);
  const last = (source.national[periods[periods.length - 1]] || []).find((row) => row.code === code);
  const a = groupValue(first, group);
  const b = groupValue(last, group);
  if (!a) return null;
  return ((b - a) / a) * 100;
}

export function topGrowth(source, group = 'ALL') {
  const lastPeriod = source.meta.periods.at(-1);
  const rows = source.national[lastPeriod] || [];
  return rows
    .map((row) => ({ ...row, growth: calculateGrowth(source, row.code, group) }))
    .filter((row) => Number.isFinite(row.growth))
    .sort((a, b) => b.growth - a.growth);
}

export function downloadBlob(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function rowsToCsv(rows) {
  if (!rows?.length) return '';
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\n');
}
