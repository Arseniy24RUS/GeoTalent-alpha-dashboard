import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Globe2,
  Layers3,
  MapPinned,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import EChart from './EChart.jsx';
import {
  calculateGrowth,
  formatNumber,
  GROUP_COLORS,
  GROUP_LABELS,
  groupValue,
  latestRows,
  sourceUnitLabel,
} from '../lib/format.js';

function StackedRanking({ source, period, group = 'ALL', limit = 14, regions = null }) {
  const rows = useMemo(() => {
    const base = regions || source.national[period] || [];
    return base.map((row) => ({ ...row, value: groupValue(row, group) })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value).slice(0, limit);
  }, [source, period, group, limit, regions]);
  const groups = group === 'ALL' ? source.meta.groups : [group];
  const option = useMemo(() => ({
    animationDurationUpdate: 480,
    aria: { enabled: true },
    color: groups.map((item) => GROUP_COLORS[item] || '#6280D9'),
    grid: { left: 132, right: 48, top: 34, bottom: 26 },
    legend: { show: groups.length > 1, top: 0, right: 0, textStyle: { color: '#3D4A60', fontFamily: 'Onest' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest', formatter: (value) => formatNumber(value) }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'category', inverse: true, data: rows.map((row) => row.name), axisLabel: { color: '#0A132D', fontFamily: 'Onest', width: 122, overflow: 'truncate', fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    series: groups.map((item) => ({
      name: item, type: 'bar', stack: 'total', barMaxWidth: 16,
      data: rows.map((row) => Number(row.groups?.[item] || 0)),
      label: { show: groups.length === 1, position: 'right', formatter: (params) => formatNumber(params.value), color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 },
      emphasis: { focus: 'series' },
    })),
  }), [rows, groups]);
  return <EChart option={option} height={430} ariaLabel="Рейтинг территорий по STEM-показателю" />;
}

function TrendMultiples({ source, group }) {
  const periods = source.meta.periods;
  const top = latestRows(source).map((row) => ({ ...row, value: groupValue(row, group) })).sort((a, b) => b.value - a.value).slice(0, 9);
  const option = useMemo(() => ({
    animationDuration: 650,
    aria: { enabled: true },
    color: ['#192F70', '#2947A0', '#3C5DBC', '#4D6BC8', '#6280D9', '#539D96', '#67AEA7', '#A7DBD6', '#0A132D'],
    grid: { left: 58, right: 22, top: 56, bottom: 42 },
    legend: { top: 0, left: 0, right: 0, type: 'scroll', textStyle: { color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 } },
    tooltip: { trigger: 'axis', backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'category', data: periods, axisTick: { show: false }, axisLine: { lineStyle: { color: '#D9DEE8' } }, axisLabel: { color: '#647087', fontFamily: 'Onest' } },
    yAxis: { type: 'value', axisLabel: { color: '#647087', fontFamily: 'Onest', formatter: (value) => formatNumber(value) }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    series: top.map((country) => ({
      name: country.name, type: 'line', smooth: 0.18, symbolSize: 7,
      data: periods.map((period) => {
        const row = (source.national[period] || []).find((item) => item.code === country.code);
        return groupValue(row, group);
      }),
      lineStyle: { width: 2 }, emphasis: { focus: 'series' }, endLabel: { show: true, formatter: country.code, color: '#0A132D', fontFamily: 'Onest', fontWeight: 600, distance: 4 },
    })),
  }), [source, group, periods, top]);
  return <EChart option={option} height={410} ariaLabel="Динамика занятости в крупнейших странах" />;
}

function GrowthRanking({ source, group }) {
  const rows = latestRows(source)
    .map((row) => ({ ...row, growth: calculateGrowth(source, row.code, group) }))
    .filter((row) => Number.isFinite(row.growth))
    .sort((a, b) => b.growth - a.growth);
  const selected = [...rows.slice(0, 8), ...rows.slice(-5)].sort((a, b) => b.growth - a.growth);
  const option = useMemo(() => ({
    animationDurationUpdate: 450,
    aria: { enabled: true },
    grid: { left: 120, right: 50, top: 18, bottom: 28 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => `${params[0].name}: <b>${params[0].value > 0 ? '+' : ''}${params[0].value.toFixed(1)}%</b>`, backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' } },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%', color: '#647087', fontFamily: 'Onest' }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'category', inverse: true, data: selected.map((row) => row.name), axisLabel: { color: '#0A132D', fontFamily: 'Onest', width: 108, overflow: 'truncate', fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'bar', data: selected.map((row) => ({ value: row.growth, itemStyle: { color: row.growth >= 0 ? '#539D96' : '#6280D9' } })), barMaxWidth: 14, label: { show: true, position: (params) => params.value >= 0 ? 'right' : 'left', formatter: (params) => `${params.value > 0 ? '+' : ''}${params.value.toFixed(1)}%`, color: '#3D4A60', fontFamily: 'Onest', fontSize: 10 } }],
  }), [selected]);
  return <EChart option={option} height={410} ariaLabel="Темпы изменения занятости 2023–2025" />;
}

export default function LabourLab({ data }) {
  const [demandSourceId, setDemandSourceId] = useState('eures');
  const [demandGroup, setDemandGroup] = useState('ALL');
  const [employmentSourceId, setEmploymentSourceId] = useState('eurostat');
  const [employmentGroup, setEmploymentGroup] = useState('ALL');
  const [regionalSourceId, setRegionalSourceId] = useState('bls');

  const demandSource = data.sources[demandSourceId];
  const employmentSource = data.sources[employmentSourceId];
  const regionalSource = data.sources[regionalSourceId];
  const regionalCountry = regionalSourceId === 'bls' ? 'US' : regionalSourceId === 'statcan' ? 'CA' : 'GB';
  const regionalRows = regionalSource.regions?.[regionalCountry]?.[regionalSource.meta.latestPeriod] || [];

  return (
    <div className="labour-lab">
      <section className="lab-block">
        <div className="lab-header">
          <div><span className="eyebrow"><Briefcase size={16} /> Flow / текущий спрос</span><h3>Два платформенных снимка — без ложного общего итога</h3><p>EURES и Adzuna имеют разные охваты и таксономии платформ. Они показаны как самостоятельные линзы рынка.</p></div>
          <div className="lab-kpis"><div><span>строк спроса</span><strong>{formatNumber(data.meta.dataRows.vacancies, { compact: false })}</strong></div><div><span>стран</span><strong>{data.meta.coverage.vacancyCountries}</strong></div><div><span>регионов</span><strong>{data.meta.coverage.vacancyRegions}</strong></div></div>
        </div>
        <div className="lab-controls">
          <div className="segmented" role="group" aria-label="Источник спроса"><button type="button" className={demandSourceId === 'eures' ? 'is-active' : ''} onClick={() => setDemandSourceId('eures')}>EURES · 2026-Q3</button><button type="button" className={demandSourceId === 'adzuna' ? 'is-active' : ''} onClick={() => setDemandSourceId('adzuna')}>Adzuna · 2026-07</button></div>
          <label className="compact-select"><span>STEM-группа</span><select value={demandGroup} onChange={(event) => setDemandGroup(event.target.value)}><option value="ALL">ENG + ICT + SCI</option>{demandSource.meta.groups.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="lab-grid">
          <article className="panel panel--flat"><div className="panel-heading"><div><span className="panel-kicker">Национальный уровень</span><h3>Лидеры по объёму</h3></div><BarChart3 size={22} /></div><StackedRanking source={demandSource} period={demandSource.meta.latestPeriod} group={demandGroup} /></article>
          <article className="panel panel--flat"><div className="panel-heading"><div><span className="panel-kicker">Субрегиональный уровень</span><h3>Топ регионов источника</h3></div><MapPinned size={22} /></div><StackedRanking source={demandSource} period={demandSource.meta.latestPeriod} group={demandGroup} regions={Object.values(demandSource.regions).flatMap((periods) => periods[demandSource.meta.latestPeriod] || [])} /></article>
        </div>
        <div className="method-banner"><Activity size={18} /><div><strong>{demandSource.meta.shortTitle}: {sourceUnitLabel(demandSource.meta)}</strong><span>{demandSource.meta.note}</span></div></div>
      </section>

      <section className="lab-block lab-block--tinted">
        <div className="lab-header">
          <div><span className="eyebrow"><UsersRound size={16} /> Stock / занятость</span><h3>Единственный доступный тренд: Eurostat 2023–2025</h3><p>Для BLS, Statistics Canada и UK NOMIS в файле имеется по одной временной точке; тренд для них не конструируется.</p></div>
          <div className="lab-kpis"><div><span>строк занятости</span><strong>{formatNumber(data.meta.dataRows.employment, { compact: false })}</strong></div><div><span>стран</span><strong>{data.meta.coverage.employmentCountries}</strong></div><div><span>регионов</span><strong>{data.meta.coverage.employmentRegions}</strong></div></div>
        </div>
        <div className="lab-controls">
          <div className="segmented" role="group" aria-label="Источник тренда"><button type="button" className={employmentSourceId === 'eurostat' ? 'is-active' : ''} onClick={() => { setEmploymentSourceId('eurostat'); setEmploymentGroup('ALL'); }}>Eurostat LFS</button><button type="button" className={employmentSourceId === 'eurostat_htec' ? 'is-active' : ''} onClick={() => { setEmploymentSourceId('eurostat_htec'); setEmploymentGroup('ALL'); }}>Eurostat HTEC</button></div>
          <label className="compact-select"><span>Группа</span><select value={employmentGroup} onChange={(event) => setEmploymentGroup(event.target.value)}><option value="ALL">Все доступные</option>{employmentSource.meta.groups.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="lab-grid">
          <article className="panel panel--flat"><div className="panel-heading"><div><span className="panel-kicker">Траектории</span><h3>Крупнейшие национальные контуры</h3></div><TrendingUp size={22} /></div><TrendMultiples source={employmentSource} group={employmentGroup} /></article>
          <article className="panel panel--flat"><div className="panel-heading"><div><span className="panel-kicker">Изменение</span><h3>Лидеры роста и снижения</h3></div><Activity size={22} /></div><GrowthRanking source={employmentSource} group={employmentGroup} /></article>
        </div>
      </section>

      <section className="lab-block">
        <div className="lab-header lab-header--compact">
          <div><span className="eyebrow"><Globe2 size={16} /> Национальные методологии</span><h3>США, Канада и Великобритания — отдельными контурами</h3></div>
          <div className="segmented" role="group" aria-label="Региональный источник"><button type="button" className={regionalSourceId === 'bls' ? 'is-active' : ''} onClick={() => setRegionalSourceId('bls')}>BLS / штаты</button><button type="button" className={regionalSourceId === 'statcan' ? 'is-active' : ''} onClick={() => setRegionalSourceId('statcan')}>StatCan / провинции</button><button type="button" className={regionalSourceId === 'uk_nomis' ? 'is-active' : ''} onClick={() => setRegionalSourceId('uk_nomis')}>UK NOMIS / регионы</button></div>
        </div>
        {regionalSourceId === 'uk_nomis' && <div className="method-banner method-banner--warning"><AlertTriangle size={18} /><div><strong>Исторический срез: декабрь 2021 года</strong><span>UK NOMIS не сопоставляется как актуальная точка 2025–2026 годов.</span></div></div>}
        <article className="panel panel--flat"><div className="panel-heading"><div><span className="panel-kicker">{regionalSource.meta.latestPeriod}</span><h3>{regionalSource.meta.title}: региональная структура</h3></div><Layers3 size={22} /></div><StackedRanking source={regionalSource} period={regionalSource.meta.latestPeriod} group="ALL" regions={regionalRows} limit={regionalSourceId === 'bls' ? 24 : 14} /></article>
      </section>
    </div>
  );
}
