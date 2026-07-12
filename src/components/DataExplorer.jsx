import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileJson2,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Search,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import EChart from './EChart.jsx';
import { downloadBlob, formatExact, formatNumber, rowsToCsv } from '../lib/format.js';

const CACHE = new Map();
const PAGE_SIZE = 50;

const DATASET_COPY = {
  vacancies: {
    title: 'Спрос: вакансии и постинги',
    description: 'Все строки EURES и Adzuna. Национальный агрегат и субрегиональные строки не суммируются между собой.',
  },
  employment: {
    title: 'Занятость STEM',
    description: 'Все строки BLS, Eurostat LFS, Eurostat HTEC, Statistics Canada и UK NOMIS с исходными единицами и периодами.',
  },
  companies: {
    title: 'Компании и объявления',
    description: 'Каждая строка исходного снимка Adzuna, включая точные дубликаты, пропуски регионов и исходные даты публикации.',
  },
};

const FIELD_NOTES = {
  source: 'Первичный источник данных.',
  metric: 'vacancies / postings / employment.',
  occ_level: 'Уровень классификации; в фактовых таблицах occupation.',
  stem_group: 'Группа STEM внутри таксономии конкретного источника.',
  stem_class: 'STRICT/core там, где применима общая таксономия.',
  occ_code_raw: 'Исходный код занятия или HRST-контура.',
  geo_country: 'ISO alpha-2; может быть пустым у субрегиональных строк HTEC.',
  geo_region: 'Пусто = национальный агрегат; заполнено = часть страны.',
  period: 'Период в исходном формате источника.',
  value: 'Исходное числовое значение.',
  unit: 'count / thousands / persons; смешивать без пересчёта нельзя.',
  snapshot: 'Момент получения данных из API.',
  country: 'Страна объявления в компанийном снимке.',
  region: 'Регион объявления из location.area.',
  company: 'Строка работодателя/площадки из Adzuna.',
  title: 'Название объявления.',
  created: 'Дата публикации объявления.',
};

function MissingnessChart({ profile }) {
  const rows = profile.missing.filter((row) => row.missingPct > 0).sort((a, b) => b.missingPct - a.missingPct);
  const option = useMemo(() => ({
    animationDuration: 550,
    aria: { enabled: true },
    grid: { left: 132, right: 28, top: 12, bottom: 20 },
    xAxis: {
      type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#647087', fontFamily: 'Onest' },
      splitLine: { lineStyle: { color: '#E9EDF3' } },
    },
    yAxis: {
      type: 'category', inverse: true, data: rows.map((row) => row.column),
      axisLabel: { color: '#0A132D', fontFamily: 'Onest', fontSize: 11 },
      axisTick: { show: false }, axisLine: { show: false },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => `${params[0].name}: ${formatExact(params[0].value)}% пропусков` },
    series: [{
      type: 'bar', data: rows.map((row) => row.missingPct), barMaxWidth: 14,
      itemStyle: { color: '#539D96' }, label: { show: true, position: 'right', formatter: '{c}%', color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 },
    }],
  }), [rows]);
  if (!rows.length) return <div className="empty-chart">Пропусков нет.</div>;
  return <EChart option={option} height={Math.max(220, rows.length * 28)} ariaLabel="Доля пропусков по полям" />;
}

export default function DataExplorer({ profiles }) {
  const [datasetId, setDatasetId] = useState('vacancies');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('ALL');
  const [country, setCountry] = useState('ALL');
  const [group, setGroup] = useState('ALL');
  const [page, setPage] = useState(1);

  const profile = profiles.find((item) => item.id === datasetId);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setRows(null);
    setQuery(''); setSource('ALL'); setCountry('ALL'); setGroup('ALL'); setPage(1);
    const cached = CACHE.get(datasetId);
    if (cached) {
      setRows(cached);
      return undefined;
    }
    fetch(profile.downloads.json)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        CACHE.set(datasetId, payload);
        if (!cancelled) setRows(payload);
      })
      .catch((err) => !cancelled && setError(String(err.message || err)));
    return () => { cancelled = true; };
  }, [datasetId, profile.downloads.json]);

  const dimensions = useMemo(() => {
    if (!rows) return { sources: [], countries: [], groups: [] };
    const sources = new Set(); const countries = new Set(); const groups = new Set();
    rows.forEach((row) => {
      if (row.source) sources.add(row.source);
      if (row.geo_country || row.country) countries.add(row.geo_country || row.country);
      if (row.stem_group) groups.add(row.stem_group);
    });
    return { sources: [...sources].sort(), countries: [...countries].sort(), groups: [...groups].sort() };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (source !== 'ALL' && row.source !== source) return false;
      if (country !== 'ALL' && (row.geo_country || row.country) !== country) return false;
      if (group !== 'ALL' && row.stem_group !== group) return false;
      if (q && !Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, source, country, group]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const columns = profile.columnNames;

  useEffect(() => setPage(1), [query, source, country, group]);

  const exportFiltered = () => {
    downloadBlob(`geotalent_${datasetId}_filtered.csv`, `\uFEFF${rowsToCsv(filtered)}`);
  };

  return (
    <div className="explorer-shell">
      <div className="explorer-tabs" role="tablist" aria-label="Датасеты">
        {profiles.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={datasetId === item.id}
            className={datasetId === item.id ? 'is-active' : ''}
            key={item.id}
            onClick={() => setDatasetId(item.id)}
          >
            <span>{DATASET_COPY[item.id].title}</span>
            <strong>{formatNumber(item.rows, { compact: false })}</strong>
          </button>
        ))}
      </div>

      <div className="explorer-summary">
        <div>
          <div className="eyebrow"><ShieldCheck size={15} /> 100% записей доступны</div>
          <h3>{DATASET_COPY[datasetId].title}</h3>
          <p>{DATASET_COPY[datasetId].description}</p>
        </div>
        <div className="dataset-metrics">
          <div><span>строк</span><strong>{formatNumber(profile.rows, { compact: false })}</strong></div>
          <div><span>полей</span><strong>{profile.columns}</strong></div>
          <div><span>точных дублей</span><strong>{formatNumber(profile.duplicatesExact, { compact: false })}</strong></div>
          <div><span>SHA-256</span><code>{profile.sha256.slice(0, 12)}…</code></div>
        </div>
      </div>

      <div className="explorer-toolbar">
        <label className="search-control">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по всем полям" aria-label="Поиск по всем полям" />
        </label>
        {dimensions.sources.length > 0 && (
          <label className="compact-select"><span>Источник</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="ALL">Все</option>{dimensions.sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        )}
        <label className="compact-select"><span>Страна</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="ALL">Все</option>{dimensions.countries.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="compact-select"><span>STEM-группа</span><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="ALL">Все</option>{dimensions.groups.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" className="button button--outline button--small" onClick={exportFiltered} disabled={!filtered.length}><Download size={15} /> CSV фильтра</button>
      </div>

      {error && <div className="data-error">Не удалось загрузить записи: {error}</div>}
      {!rows && !error && <div className="data-loading"><LoaderCircle className="spin" size={26} /><span>Загрузка {formatNumber(profile.rows, { compact: false })} строк…</span></div>}
      {rows && (
        <>
          <div className="table-status">
            <span><Filter size={15} /> Найдено: <strong>{formatNumber(filtered.length, { compact: false })}</strong> из {formatNumber(rows.length, { compact: false })}</span>
            <span><CheckCircle2 size={15} /> Загружено полностью</span>
          </div>
          <div className="raw-table-wrap" tabIndex="0" aria-label="Таблица исходных записей">
            <table className="raw-table">
              <thead><tr><th>#</th>{columns.map((column) => <th key={column} title={FIELD_NOTES[column] || ''}>{column}</th>)}</tr></thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={`${currentPage}-${rowIndex}`}>
                    <td>{(currentPage - 1) * PAGE_SIZE + rowIndex + 1}</td>
                    {columns.map((column) => (
                      <td key={column} className={row[column] === null || row[column] === undefined ? 'is-null' : ''} title={typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column] ?? '')}>
                        {row[column] === null || row[column] === undefined ? 'NULL' : typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button type="button" aria-label="Предыдущая страница" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}><ChevronLeft size={17} /></button>
            <span>Страница <strong>{currentPage}</strong> из {pageCount}</span>
            <button type="button" aria-label="Следующая страница" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount}><ChevronRight size={17} /></button>
          </div>
        </>
      )}

      <div className="explorer-bottom-grid">
        <article className="panel panel--flat">
          <div className="panel-heading"><div><span className="panel-kicker">Качество данных</span><h3>Пропуски по полям</h3></div><Table2 size={22} /></div>
          <MissingnessChart profile={profile} />
        </article>
        <article className="panel panel--flat">
          <div className="panel-heading"><div><span className="panel-kicker">Открытые материалы</span><h3>Скачать исходники</h3></div><Download size={22} /></div>
          <div className="download-stack">
            <a href={profile.downloads.parquet} download><span className="download-icon"><Table2 size={20} /></span><div><strong>Parquet</strong><small>Исходный столбцовый формат без потери типов</small></div><Download size={17} /></a>
            <a href={profile.downloads.csv} download><span className="download-icon"><FileSpreadsheet size={20} /></span><div><strong>CSV</strong><small>Полная таблица для Excel, R, Python и BI</small></div><Download size={17} /></a>
            <a href={profile.downloads.json} download><span className="download-icon"><FileJson2 size={20} /></span><div><strong>JSON</strong><small>Та же полная таблица, которую читает Data Explorer</small></div><Download size={17} /></a>
          </div>
          <div className="schema-notes">
            <h4>Ключевые поля</h4>
            {columns.slice(0, 12).map((column) => <div key={column}><code>{column}</code><span>{FIELD_NOTES[column] || 'Поле исходной таблицы.'}</span></div>)}
          </div>
        </article>
      </div>
    </div>
  );
}
