import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Download,
  Globe2,
  Info,
  Layers3,
  MapPinned,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import EChart from './EChart.jsx';
import GeoMap from './GeoMap.jsx';
import {
  formatNumber,
  GROUP_COLORS,
  GROUP_LABELS,
  groupValue,
  rowsToCsv,
  downloadBlob,
  sourceUnitLabel,
} from '../lib/format.js';

const SOURCE_OPTIONS = [
  { value: 'pressure', label: 'GeoTalent Signal', domain: 'signal' },
  { value: 'eures', label: 'EURES', domain: 'demand' },
  { value: 'adzuna', label: 'Adzuna', domain: 'demand' },
  { value: 'eurostat', label: 'Eurostat LFS', domain: 'employment' },
  { value: 'eurostat_htec', label: 'Eurostat HTEC', domain: 'employment' },
  { value: 'bls', label: 'BLS OEWS', domain: 'employment' },
  { value: 'statcan', label: 'Statistics Canada', domain: 'employment' },
  { value: 'uk_nomis', label: 'UK NOMIS', domain: 'employment' },
];

function RankingChart({ rows, selected, onSelect, label }) {
  const top = rows.slice(0, 16);
  const option = useMemo(() => ({
    animationDurationUpdate: 420,
    aria: { enabled: true },
    grid: { left: 120, right: 52, top: 8, bottom: 20 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest', formatter: (value) => formatNumber(value) }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'category', inverse: true, data: top.map((row) => row.name), axisLabel: { width: 108, overflow: 'truncate', color: '#0A132D', fontFamily: 'Onest', fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'bar', data: top.map((row) => ({ value: row.value, code: row.code, itemStyle: { color: row.code === selected ? '#539D96' : '#2947A0' } })), barMaxWidth: 14, label: { show: true, position: 'right', formatter: (params) => formatNumber(params.value), color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 } }],
  }), [top, selected]);
  const events = useMemo(() => ({ click: (params) => onSelect(top[params.dataIndex]?.code) }), [onSelect, top]);
  return <EChart option={option} onEvents={events} height={420} ariaLabel={`Рейтинг стран: ${label}`} />;
}

function GroupDonut({ row, groups, unitLabel }) {
  const data = groups.map((group) => ({ name: group, value: Number(row?.groups?.[group] || 0), itemStyle: { color: GROUP_COLORS[group] || '#6280D9' } })).filter((item) => item.value > 0);
  const option = useMemo(() => ({
    animationDuration: 480,
    aria: { enabled: true },
    tooltip: { formatter: (params) => `<strong>${params.name}</strong><br/>${formatNumber(params.value)} ${unitLabel}<br/>${params.percent}%`, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    series: [{ type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'], data, avoidLabelOverlap: true, itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 }, label: { show: true, formatter: '{b}\n{d}%', color: '#0A132D', fontFamily: 'Onest', fontSize: 11 }, labelLine: { length: 10, length2: 7 } }],
    graphic: [{ type: 'text', left: 'center', top: '44%', style: { text: formatNumber(row?.total || 0), textAlign: 'center', fill: '#0A132D', font: '600 22px Onest' } }, { type: 'text', left: 'center', top: '54%', style: { text: unitLabel, textAlign: 'center', fill: '#647087', font: '11px Onest' } }],
  }), [data, row?.total, unitLabel]);
  return <EChart option={option} height={280} ariaLabel="Структура показателя по STEM-группам" />;
}

function TrendChart({ source, country, group }) {
  const periods = source.meta.periods || [];
  const rows = periods.map((period) => {
    const row = (source.national[period] || []).find((item) => item.code === country);
    return { period, value: groupValue(row, group) };
  });
  const option = useMemo(() => ({
    animationDuration: 500,
    aria: { enabled: true },
    grid: { left: 54, right: 20, top: 22, bottom: 38 },
    tooltip: { trigger: 'axis', backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'category', data: rows.map((row) => row.period), axisTick: { show: false }, axisLine: { lineStyle: { color: '#D9DEE8' } }, axisLabel: { color: '#647087', fontFamily: 'Onest' } },
    yAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest', formatter: (value) => formatNumber(value) }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    series: [{ type: 'line', data: rows.map((row) => row.value), smooth: 0.25, symbolSize: 9, lineStyle: { width: 3, color: '#2947A0' }, itemStyle: { color: '#539D96', borderColor: '#FFFFFF', borderWidth: 2 }, areaStyle: { color: 'rgba(41,71,160,.08)' }, label: { show: true, position: 'top', formatter: (params) => formatNumber(params.value), color: '#0A132D', fontFamily: 'Onest', fontSize: 10 } }],
  }), [rows]);
  return <EChart option={option} height={260} ariaLabel="Динамика выбранной страны" />;
}

export default function MapExplorer({ data }) {
  const initial = new URLSearchParams(window.location.search);
  const [sourceId, setSourceId] = useState(initial.get('source') && SOURCE_OPTIONS.some((item) => item.value === initial.get('source')) ? initial.get('source') : 'pressure');
  const [period, setPeriod] = useState('');
  const [group, setGroup] = useState(initial.get('group') || 'ALL');
  const [geoLevel, setGeoLevel] = useState('country');
  const [selectedCountry, setSelectedCountry] = useState(initial.get('country') || '');

  const isPressure = sourceId === 'pressure';
  const source = isPressure ? null : data.sources[sourceId];
  const sourceOption = SOURCE_OPTIONS.find((item) => item.value === sourceId);
  const periods = isPressure ? [data.pressure.meta.period] : source.meta.periods;
  const groups = isPressure ? [] : source.meta.groups;
  const activePeriod = period && periods.includes(period) ? period : (isPressure ? data.pressure.meta.period : source.meta.latestPeriod);

  const countryRows = useMemo(() => {
    if (isPressure) return data.pressure.countries.map((row) => ({ ...row, total: row.value }));
    return (source.national[activePeriod] || [])
      .map((row) => ({ ...row, value: groupValue(row, group) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [isPressure, data.pressure.countries, source, activePeriod, group]);

  useEffect(() => {
    if (!countryRows.length) return;
    if (!countryRows.some((row) => row.code === selectedCountry)) setSelectedCountry(countryRows[0].code);
  }, [countryRows, selectedCountry]);

  useEffect(() => {
    if (!isPressure && !periods.includes(period)) setPeriod(source.meta.latestPeriod);
    if (!isPressure && group !== 'ALL' && !groups.includes(group)) setGroup('ALL');
    if (isPressure) { setPeriod(data.pressure.meta.period); setGroup('ALL'); setGeoLevel('country'); }
  }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('source', sourceId);
    if (!isPressure) params.set('period', activePeriod); else params.delete('period');
    if (group !== 'ALL') params.set('group', group); else params.delete('group');
    if (selectedCountry) params.set('country', selectedCountry);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  }, [sourceId, activePeriod, group, selectedCountry, isPressure]);

  const selectedRow = countryRows.find((row) => row.code === selectedCountry);
  const regions = !isPressure ? (source.regions?.[selectedCountry]?.[activePeriod] || [])
    .map((row) => ({ ...row, value: groupValue(row, group) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value) : [];
  const regionalAvailable = regions.length > 0;
  const metricLabel = isPressure ? 'Сигнал напряжённости' : source.meta.metricLabel;
  const unitLabel = isPressure ? 'на 1 000 занятых' : sourceUnitLabel(source.meta);

  const displayRows = geoLevel === 'country' ? countryRows : regions;
  const exportRows = displayRows.map((row) => ({ code: row.code, name: row.name, value: row.value, period: activePeriod, source: sourceId, group }));

  const reset = () => { setSourceId('pressure'); setGroup('ALL'); setPeriod(data.pressure.meta.period); setGeoLevel('country'); setSelectedCountry(data.pressure.countries[0]?.code || ''); };

  return (
    <div className="map-explorer">
      <div className="map-control-rail">
        <div className="source-tabs" role="tablist" aria-label="Источник карты">
          {SOURCE_OPTIONS.map((item) => <button type="button" role="tab" aria-selected={sourceId === item.value} className={sourceId === item.value ? 'is-active' : ''} key={item.value} onClick={() => setSourceId(item.value)}>{item.label}</button>)}
        </div>
        <div className="map-filter-row">
          <label className="compact-select"><span>Период</span><select value={activePeriod} onChange={(event) => setPeriod(event.target.value)} disabled={periods.length <= 1}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="compact-select"><span>STEM-группа</span><select value={group} onChange={(event) => setGroup(event.target.value)} disabled={isPressure || groups.length <= 1}><option value="ALL">Все доступные</option>{groups.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <div className="segmented segmented--compact" role="group" aria-label="Уровень географии">
            <button type="button" className={geoLevel === 'country' ? 'is-active' : ''} onClick={() => setGeoLevel('country')}><Globe2 size={14} /> Страны</button>
            <button type="button" className={geoLevel === 'region' ? 'is-active' : ''} onClick={() => setGeoLevel('region')} disabled={!regionalAvailable}><MapPinned size={14} /> Регионы</button>
          </div>
          <button type="button" className="icon-button" aria-label="Сбросить фильтры" onClick={reset}><RotateCcw size={17} /></button>
          <button type="button" className="button button--outline button--small" onClick={() => downloadBlob(`geotalent_${sourceId}_${activePeriod}_${geoLevel}.csv`, `\uFEFF${rowsToCsv(exportRows)}`)}><Download size={15} /> Скачать срез</button>
        </div>
      </div>

      <div className={`method-banner ${sourceId === 'uk_nomis' ? 'method-banner--warning' : ''}`}>
        {sourceId === 'uk_nomis' ? <AlertTriangle size={18} /> : <Info size={18} />}
        <div><strong>{isPressure ? data.pressure.meta.title : source.meta.title}</strong><span>{isPressure ? data.pressure.meta.note : source.meta.note}</span></div>
      </div>

      <div className="map-layout">
        <article className="panel panel--map">
          <div className="panel-heading panel-heading--map"><div><span className="panel-kicker">{sourceOption.domain === 'demand' ? 'Спрос' : sourceOption.domain === 'employment' ? 'Занятость' : 'Производный сигнал'}</span><h3>{metricLabel} · {activePeriod}</h3></div><Layers3 size={22} /></div>
          {geoLevel === 'country' ? (
            <GeoMap rows={countryRows} selectedCountry={selectedCountry} onSelect={setSelectedCountry} metricLabel={metricLabel} unitLabel={unitLabel} height={570} />
          ) : (
            <div className="region-focus-view">
              <div className="region-focus-copy"><MapPinned size={26} /><div><strong>Региональный уровень: {selectedRow?.name || selectedCountry}</strong><p>Исходные субрегиональные коды показаны как рейтинг: в наборе нет согласованной геометрии NUTS / штатов / провинций для всех источников, поэтому панель не рисует ложные полигоны.</p></div></div>
              <RankingChart rows={regions} selected="" onSelect={() => {}} label={`${selectedRow?.name || selectedCountry}: регионы`} />
            </div>
          )}
        </article>

        <aside className="map-side">
          <article className="panel panel--flat map-ranking">
            <div className="panel-heading"><div><span className="panel-kicker">{geoLevel === 'country' ? 'Сопоставление' : 'Внутристрановой профиль'}</span><h3>{geoLevel === 'country' ? 'Лидеры текущего среза' : `Регионы: ${selectedRow?.name || selectedCountry}`}</h3></div><BarChart3 size={22} /></div>
            <RankingChart rows={displayRows} selected={selectedCountry} onSelect={geoLevel === 'country' ? setSelectedCountry : () => {}} label={metricLabel} />
          </article>
        </aside>
      </div>

      {selectedRow && (
        <div className="country-profile">
          <article className="profile-head">
            <div className="profile-country-code">{selectedRow.code}</div>
            <div><span className="panel-kicker">Выбранная территория</span><h3>{selectedRow.name}</h3><p>{metricLabel} · {activePeriod}</p></div>
            <strong>{formatNumber(selectedRow.value ?? selectedRow.total)} <small>{unitLabel}</small></strong>
          </article>
          {!isPressure && (
            <article className="panel panel--flat">
              <div className="panel-heading"><div><span className="panel-kicker">Композиция</span><h3>STEM-структура</h3></div><Layers3 size={22} /></div>
              <GroupDonut row={selectedRow} groups={groups} unitLabel={unitLabel} />
              <div className="inline-legend">{groups.map((item) => <span key={item}><i style={{ background: GROUP_COLORS[item] || '#6280D9' }} />{item}: {GROUP_LABELS[item] || item}</span>)}</div>
            </article>
          )}
          {!isPressure && source.meta.periods.length > 1 && (
            <article className="panel panel--flat">
              <div className="panel-heading"><div><span className="panel-kicker">Изменение во времени</span><h3>{source.meta.periods[0]} → {source.meta.periods.at(-1)}</h3></div><TrendingUp size={22} /></div>
              <TrendChart source={source} country={selectedCountry} group={group} />
            </article>
          )}
          {isPressure && (
            <article className="panel panel--flat pressure-explainer">
              <div className="panel-heading"><div><span className="panel-kicker">Расчёт</span><h3>Что стоит за сигналом</h3></div><ChevronRight size={22} /></div>
              <dl><div><dt>EURES-вакансии</dt><dd>{formatNumber(selectedRow.vacancies)}</dd></div><div><dt>Eurostat-занятость</dt><dd>{formatNumber(selectedRow.employment)}</dd></div><div><dt>Результат на 1 000</dt><dd>{selectedRow.value}</dd></div></dl>
              <p>Периоды источников различаются; показатель предназначен для навигации по массиву, а не для официального ранжирования дефицита кадров.</p>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
