import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CircleAlert,
  Filter,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import EChart from './EChart.jsx';
import { formatDate, formatNumber, GROUP_COLORS, GROUP_LABELS } from '../lib/format.js';

let companyCache = null;
let companyPromise = null;

function loadCompanies() {
  if (companyCache) return Promise.resolve(companyCache);
  if (!companyPromise) {
    companyPromise = fetch('./data/companies.json').then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).then((rows) => {
      companyCache = rows;
      return rows;
    });
  }
  return companyPromise;
}

function isLikelyIntermediary(row) {
  const text = `${row.company || ''} ${row.title || ''}`.toLowerCase();
  return [
    'recruit', 'staffing', 'jobradar', 'offerzen', 'talent solutions', 'headhunt', 'placement',
    'job board', 'employment agency', 'nielsen pulse', 'earn from your mobile phone usage',
  ].some((token) => text.includes(token));
}

function weekStart(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function TreemapChart({ rows, onCompany }) {
  const data = useMemo(() => {
    const byCountry = new Map();
    rows.forEach((row) => {
      const country = row.country || '—';
      if (!byCountry.has(country)) byCountry.set(country, new Map());
      const companies = byCountry.get(country);
      const company = row.company || 'Не указано';
      companies.set(company, (companies.get(company) || 0) + 1);
    });
    return [...byCountry.entries()].map(([country, companies]) => ({
      name: country,
      value: [...companies.values()].reduce((a, b) => a + b, 0),
      children: [...companies.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 35)
        .map(([name, value]) => ({ name, value })),
    })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const option = useMemo(() => ({
    animationDurationUpdate: 520,
    aria: { enabled: true },
    tooltip: {
      formatter: (params) => `<strong>${params.name}</strong><br/>${formatNumber(params.value, { compact: false })} объявлений`,
      backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' },
    },
    series: [{
      type: 'treemap',
      data,
      roam: false,
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, height: 24, itemStyle: { color: '#F4F6FA', borderColor: '#D9DEE8' }, textStyle: { color: '#0A132D', fontFamily: 'Onest' } },
      upperLabel: { show: true, height: 24, color: '#0A132D', fontFamily: 'Onest', fontWeight: 600 },
      label: { show: true, formatter: '{b}\n{c}', color: '#0A132D', fontFamily: 'Onest', fontSize: 11, overflow: 'truncate' },
      itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
      levels: [
        { itemStyle: { borderColor: '#D9DEE8', borderWidth: 0, gapWidth: 3 } },
        { color: ['#EEF3F9', '#DCE7F6', '#D9F0ED', '#C7D5F3', '#A7DBD6'], colorSaturation: [0.3, 0.7], itemStyle: { borderColor: '#FFFFFF', gapWidth: 2 } },
      ],
    }],
  }), [data]);

  const events = useMemo(() => ({
    click: (params) => {
      if (params.treePathInfo?.length >= 3) onCompany?.(params.name);
    },
  }), [onCompany]);

  return <EChart option={option} onEvents={events} height={430} ariaLabel="Древовидная карта компаний по числу объявлений" />;
}

function WeeklyChart({ rows }) {
  const option = useMemo(() => {
    const parsed = rows.map((row) => ({ ...row, date: new Date(row.created) })).filter((row) => !Number.isNaN(row.date.getTime()));
    const maxDate = parsed.reduce((max, row) => row.date > max ? row.date : max, new Date(0));
    const cutoff = new Date(maxDate); cutoff.setUTCDate(cutoff.getUTCDate() - 210);
    const weeks = new Map();
    parsed.filter((row) => row.date >= cutoff).forEach((row) => {
      const week = weekStart(row.created);
      if (!week) return;
      if (!weeks.has(week)) weeks.set(week, { ENG: 0, ICT: 0, SCI: 0 });
      weeks.get(week)[row.stem_group] = (weeks.get(week)[row.stem_group] || 0) + 1;
    });
    const periods = [...weeks.keys()].sort();
    return {
      animationDuration: 650,
      aria: { enabled: true },
      color: [GROUP_COLORS.ENG, GROUP_COLORS.ICT, GROUP_COLORS.SCI],
      grid: { left: 42, right: 18, top: 34, bottom: 42 },
      legend: { top: 0, right: 0, textStyle: { fontFamily: 'Onest', color: '#3D4A60' } },
      tooltip: { trigger: 'axis', backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
      xAxis: { type: 'category', data: periods, axisLabel: { color: '#647087', fontFamily: 'Onest', hideOverlap: true }, axisLine: { lineStyle: { color: '#D9DEE8' } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest' }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
      series: ['ENG', 'ICT', 'SCI'].map((group) => ({
        name: group, type: 'line', smooth: 0.25, symbol: 'circle', symbolSize: 5,
        showSymbol: false, lineStyle: { width: 2 }, areaStyle: { opacity: 0.05 },
        data: periods.map((period) => weeks.get(period)?.[group] || 0),
      })),
    };
  }, [rows]);
  return <EChart option={option} height={310} ariaLabel="Недельная динамика объявлений по STEM-группам" />;
}

function CountryGroupHeatmap({ rows }) {
  const option = useMemo(() => {
    const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))].sort();
    const groups = ['ENG', 'ICT', 'SCI'];
    const counts = new Map();
    rows.forEach((row) => {
      const key = `${row.country}|${row.stem_group}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const data = [];
    countries.forEach((country, x) => groups.forEach((group, y) => data.push([x, y, counts.get(`${country}|${group}`) || 0])));
    const max = Math.max(1, ...data.map((item) => item[2]));
    return {
      animationDuration: 450,
      aria: { enabled: true },
      grid: { left: 50, right: 34, top: 20, bottom: 42 },
      tooltip: { formatter: (params) => `${countries[params.value[0]]} · ${groups[params.value[1]]}: <b>${formatNumber(params.value[2], { compact: false })}</b>`, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
      xAxis: { type: 'category', data: countries, axisTick: { show: false }, axisLine: { lineStyle: { color: '#D9DEE8' } }, axisLabel: { color: '#0A132D', fontFamily: 'Onest' } },
      yAxis: { type: 'category', data: groups, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#0A132D', fontFamily: 'Onest' } },
      visualMap: { min: 0, max, orient: 'horizontal', bottom: 0, left: 'center', itemWidth: 100, itemHeight: 6, text: [formatNumber(max), '0'], textStyle: { color: '#647087', fontFamily: 'Onest', fontSize: 10 }, inRange: { color: ['#F4F6FA', '#A7DBD6', '#6280D9', '#2947A0'] } },
      series: [{ type: 'heatmap', data, label: { show: true, color: '#0A132D', fontFamily: 'Onest', formatter: (params) => formatNumber(params.value[2], { compact: true }) }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 }, emphasis: { itemStyle: { borderColor: '#0A132D', borderWidth: 2 } } }],
    };
  }, [rows]);
  return <EChart option={option} height={300} ariaLabel="Матрица стран и STEM-групп" />;
}

export default function CompanyLab({ summary }) {
  const sentinelRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [country, setCountry] = useState('ALL');
  const [group, setGroup] = useState('ALL');
  const [mode, setMode] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadCompanies().then(setRows).catch((err) => setError(String(err.message || err)));
    }, { rootMargin: '420px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const countries = useMemo(() => rows ? [...new Set(rows.map((row) => row.country).filter(Boolean))].sort() : summary.byCountry.map((row) => row.code).sort(), [rows, summary.byCountry]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (country !== 'ALL' && row.country !== country) return false;
      if (group !== 'ALL' && row.stem_group !== group) return false;
      if (mode === 'EMPLOYERS' && isLikelyIntermediary(row)) return false;
      if (q && !`${row.company || ''} ${row.title || ''} ${row.region || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, country, group, mode, query]);

  const topCompanies = useMemo(() => {
    const counts = new Map();
    filtered.forEach((row) => counts.set(row.company || 'Не указано', (counts.get(row.company || 'Не указано') || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const selectedRows = useMemo(() => selectedCompany ? filtered.filter((row) => row.company === selectedCompany) : [], [filtered, selectedCompany]);

  const rankingOption = useMemo(() => ({
    animationDurationUpdate: 450,
    aria: { enabled: true },
    grid: { left: 160, right: 42, top: 10, bottom: 20 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest' }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'category', inverse: true, data: topCompanies.map((item) => item.name), axisLabel: { width: 145, overflow: 'truncate', color: '#0A132D', fontFamily: 'Onest', fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'bar', data: topCompanies.map((item) => item.value), barMaxWidth: 13, itemStyle: { color: '#2947A0' }, label: { show: true, position: 'right', color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 } }],
  }), [topCompanies]);

  const rankEvents = useMemo(() => ({ click: (params) => setSelectedCompany(params.name) }), []);

  return (
    <div ref={sentinelRef} className="company-lab">
      <div className="company-metric-strip">
        <div><span>строк в снимке</span><strong>{formatNumber(summary.meta.rows, { compact: false })}</strong></div>
        <div><span>уникальных компаний</span><strong>{formatNumber(summary.meta.uniqueCompanies, { compact: false })}</strong></div>
        <div><span>уникальных названий</span><strong>{formatNumber(summary.meta.uniqueTitles, { compact: false })}</strong></div>
        <div><span>точных дублей</span><strong>{formatNumber(summary.meta.duplicatesExact, { compact: false })}</strong></div>
        <div><span>регион не указан</span><strong>{summary.meta.missingRegionPct}%</strong></div>
      </div>

      <div className="company-warning">
        <CircleAlert size={20} />
        <div><strong>Это индикативная выборка, не рейтинг работодателей.</strong><span>{summary.meta.note}</span></div>
      </div>

      <div className="company-toolbar">
        <label className="compact-select"><span>Страна</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="ALL">Все 8 стран</option>{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="compact-select"><span>STEM-группа</span><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="ALL">Все группы</option><option value="ENG">ENG</option><option value="ICT">ICT</option><option value="SCI">SCI</option></select></label>
        <div className="segmented segmented--compact" role="group" aria-label="Фильтр посредников">
          <button type="button" className={mode === 'ALL' ? 'is-active' : ''} onClick={() => setMode('ALL')}>Все строки</button>
          <button type="button" className={mode === 'EMPLOYERS' ? 'is-active' : ''} onClick={() => setMode('EMPLOYERS')}>Без вероятных посредников</button>
        </div>
        <label className="search-control search-control--compact"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Компания, вакансия, регион" /></label>
      </div>

      {!rows && !error && <div className="data-loading company-loader"><LoaderCircle className="spin" size={26} /><span>Загружаем полный массив из {formatNumber(summary.meta.rows, { compact: false })} объявлений…</span></div>}
      {error && <div className="data-error">Не удалось загрузить массив компаний: {error}</div>}

      {rows && (
        <>
          <div className="filter-result"><Filter size={15} /> В текущем срезе: <strong>{formatNumber(filtered.length, { compact: false })}</strong> объявлений</div>
          <div className="company-grid company-grid--hero">
            <article className="panel panel--flat panel--wide">
              <div className="panel-heading"><div><span className="panel-kicker">Структура выборки</span><h3>Страна → компания → объём объявлений</h3></div><Sparkles size={22} /></div>
              <TreemapChart rows={filtered} onCompany={setSelectedCompany} />
              <p className="chart-note">Клик по стране приближает дерево; клик по компании открывает её объявления справа.</p>
            </article>
            <aside className="panel panel--flat company-detail">
              <div className="panel-heading"><div><span className="panel-kicker">Детали по запросу</span><h3>{selectedCompany || 'Выберите компанию'}</h3></div><Building2 size={22} /></div>
              {!selectedCompany && <div className="empty-state"><Building2 size={34} /><p>Кликните компанию в treemap или рейтинге, чтобы увидеть географию, группы и последние объявления.</p></div>}
              {selectedCompany && (
                <>
                  <div className="selected-company-metrics">
                    <div><span>объявлений</span><strong>{formatNumber(selectedRows.length, { compact: false })}</strong></div>
                    <div><span>стран</span><strong>{new Set(selectedRows.map((row) => row.country)).size}</strong></div>
                    <div><span>групп</span><strong>{new Set(selectedRows.map((row) => row.stem_group)).size}</strong></div>
                  </div>
                  <div className="selected-company-list">
                    {selectedRows.slice().sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 8).map((row, index) => (
                      <article key={`${row.title}-${index}`}>
                        <span className={`group-dot group-dot--${row.stem_group.toLowerCase()}`} />
                        <div><strong>{row.title}</strong><small><MapPin size={12} /> {row.country}{row.region ? ` · ${row.region}` : ''} · {formatDate(row.created)}</small></div>
                      </article>
                    ))}
                  </div>
                  <button type="button" className="text-button" onClick={() => setSelectedCompany('')}>Сбросить выбор</button>
                </>
              )}
            </aside>
          </div>

          <div className="company-grid">
            <article className="panel panel--flat">
              <div className="panel-heading"><div><span className="panel-kicker">Рейтинг среза</span><h3>Наиболее представленные компании</h3></div><SlidersHorizontal size={22} /></div>
              <EChart option={rankingOption} onEvents={rankEvents} height={390} ariaLabel="Рейтинг компаний в выбранном срезе" />
            </article>
            <article className="panel panel--flat">
              <div className="panel-heading"><div><span className="panel-kicker">Ритм публикаций</span><h3>Недельный пульс за последние 210 дней</h3></div><Sparkles size={22} /></div>
              <WeeklyChart rows={filtered} />
              <div className="inline-legend">{['ENG', 'ICT', 'SCI'].map((item) => <span key={item}><i style={{ background: GROUP_COLORS[item] }} />{item}: {GROUP_LABELS[item]}</span>)}</div>
            </article>
          </div>

          <article className="panel panel--flat">
            <div className="panel-heading"><div><span className="panel-kicker">Сопоставление</span><h3>Страны × STEM-группы</h3></div><Filter size={22} /></div>
            <CountryGroupHeatmap rows={filtered} />
          </article>
        </>
      )}
    </div>
  );
}
