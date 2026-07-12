import { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  Database,
  ExternalLink,
  Globe2,
  Layers3,
  MapPinned,
  Network,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import EChart from './EChart.jsx';
import { calculateGrowth, formatNumber, latestRows, SOURCE_ORDER } from '../lib/format.js';

function SourceSankey({ flow }) {
  const option = useMemo(() => ({
    animationDuration: 700,
    aria: { enabled: true },
    tooltip: {
      trigger: 'item',
      formatter: (params) => params.dataType === 'edge'
        ? `<strong>${params.data.source} → ${params.data.target}</strong><br/>${formatNumber(params.data.value, { compact: false })} строк / связей`
        : `<strong>${params.name}</strong>`,
      backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' },
    },
    series: [{
      type: 'sankey',
      data: flow.nodes,
      links: flow.links,
      left: 12, right: 12, top: 18, bottom: 18,
      nodeWidth: 14, nodeGap: 11, draggable: false,
      layoutIterations: 32,
      emphasis: { focus: 'adjacency' },
      label: { color: '#0A132D', fontFamily: 'Onest', fontSize: 11 },
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.22 },
      itemStyle: { color: '#2947A0', borderColor: '#FFFFFF', borderWidth: 1 },
      levels: [
        { depth: 0, itemStyle: { color: '#192F70' } },
        { depth: 1, itemStyle: { color: '#2947A0' } },
        { depth: 2, itemStyle: { color: '#539D96' } },
        { depth: 3, itemStyle: { color: '#6280D9' } },
      ],
    }],
  }), [flow]);
  return <EChart option={option} height={460} ariaLabel="Поток от источников к аналитическим слоям GeoTalent" />;
}

function CoverageHeatmap({ matrix }) {
  const dimensions = [
    { key: 'national', label: 'Страны' },
    { key: 'regional', label: 'Регионы' },
    { key: 'timeseries', label: 'Временной ряд' },
    { key: 'fresh', label: 'Актуальный срез' },
    { key: 'taxonomy', label: 'STEM-таксономия' },
  ];
  const rows = matrix.map((item) => ({ ...item, fresh: item.freshness !== 'historical', taxonomy: Boolean(item.taxonomy) }));
  const data = [];
  rows.forEach((row, y) => dimensions.forEach((dimension, x) => data.push([x, y, row[dimension.key] ? 1 : 0, row])));
  const option = useMemo(() => ({
    animationDuration: 450,
    aria: { enabled: true },
    grid: { left: 116, right: 18, top: 22, bottom: 50 },
    tooltip: {
      formatter: (params) => {
        const dimension = dimensions[params.value[0]].label;
        const row = params.value[3];
        return `<strong>${row.title}</strong><br/>${dimension}: ${params.value[2] ? 'есть' : 'нет'}<br/><span style="opacity:.72">${row.rows} строк · ${row.periods.join(', ')}</span>`;
      },
      backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' },
    },
    xAxis: { type: 'category', data: dimensions.map((item) => item.label), axisLabel: { color: '#3D4A60', fontFamily: 'Onest', rotate: 22 }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#D9DEE8' } } },
    yAxis: { type: 'category', inverse: true, data: rows.map((row) => row.title), axisLabel: { color: '#0A132D', fontFamily: 'Onest', fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    visualMap: { show: false, min: 0, max: 1, inRange: { color: ['#F4F6FA', '#2947A0'] } },
    series: [{ type: 'heatmap', data, label: { show: true, formatter: (params) => params.value[2] ? '●' : '—', color: (params) => params.value[2] ? '#FFFFFF' : '#A0A8B6', fontFamily: 'Onest' }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 4 } }],
  }), [data, rows]);
  return <EChart option={option} height={360} ariaLabel="Матрица охвата семи источников" />;
}

export default function OverviewLab({ data }) {
  const eurostat = data.sources.eurostat;
  const growth = latestRows(eurostat)
    .map((row) => ({ ...row, growth: calculateGrowth(eurostat, row.code) }))
    .filter((row) => Number.isFinite(row.growth))
    .sort((a, b) => b.growth - a.growth)[0];
  const topEmployer = data.companies.topCompanies.find((item) => !item.intermediaryLikely) || data.companies.topCompanies[0];
  const pressureTop = data.pressure.countries[0];

  return (
    <div className="overview-lab">
      <div className="overview-insights">
        <article>
          <span className="insight-icon insight-icon--blue"><Activity size={22} /></span>
          <div><small>Индикативный pressure signal</small><strong>{pressureTop?.name}</strong><p>{pressureTop ? `${pressureTop.value} вакансии на 1 000 занятых` : 'Нет пересечения источников'}</p></div>
          <ArrowUpRight size={18} />
        </article>
        <article>
          <span className="insight-icon insight-icon--teal"><ScanLine size={22} /></span>
          <div><small>Eurostat, 2023–2025</small><strong>{growth?.name}</strong><p>{growth ? `${growth.growth > 0 ? '+' : ''}${growth.growth.toFixed(1)}% по доступному STEM-контуру` : 'Недостаточно данных'}</p></div>
          <ArrowUpRight size={18} />
        </article>
        <article>
          <span className="insight-icon insight-icon--blue"><Globe2 size={22} /></span>
          <div><small>Выборка компаний</small><strong>{topEmployer?.name}</strong><p>{topEmployer ? `${formatNumber(topEmployer.value, { compact: false })} объявлений в снимке` : '—'}</p></div>
          <ArrowUpRight size={18} />
        </article>
        <article>
          <span className="insight-icon insight-icon--teal"><ShieldCheck size={22} /></span>
          <div><small>Прозрачность витрины</small><strong>100% строк</strong><p>Доступны в Data Explorer и для скачивания</p></div>
          <ArrowUpRight size={18} />
        </article>
      </div>

      <div className="overview-grid">
        <article className="panel panel--flat panel--wide">
          <div className="panel-heading"><div><span className="panel-kicker">Архитектура доказательств</span><h3>7 источников → 4 аналитических выхода</h3></div><Network size={23} /></div>
          <SourceSankey flow={data.sourceFlow} />
          <p className="chart-note">Толщина потоков основана на числе строк и доступности географических уровней. Схема показывает структуру данных, а не причинные связи.</p>
        </article>
        <article className="panel panel--flat">
          <div className="panel-heading"><div><span className="panel-kicker">Покрытие</span><h3>Что умеет каждый источник</h3></div><Layers3 size={23} /></div>
          <CoverageHeatmap matrix={data.quality.coverageMatrix} />
          <div className="coverage-callout"><MapPinned size={18} /><span><strong>{data.meta.coverage.vacancyRegions + data.meta.coverage.employmentRegions}</strong> региональных кодов в двух фактовых таблицах; геометрия субрегионов не подменяется условными полигонами.</span></div>
        </article>
      </div>

      <div className="source-passports">
        {SOURCE_ORDER.map((sourceId, index) => {
          const source = data.sources[sourceId];
          return (
            <article key={sourceId} className={source.meta.freshness === 'historical' ? 'is-historical' : ''}>
              <header><span>0{index + 1}</span><a href={source.meta.officialUrl} target="_blank" rel="noreferrer" aria-label={`Открыть ${source.meta.title}`}><ExternalLink size={15} /></a></header>
              <h3>{source.meta.shortTitle}</h3>
              <p>{source.meta.note}</p>
              <dl>
                <div><dt>Строк</dt><dd>{formatNumber(source.meta.rows, { compact: false })}</dd></div>
                <div><dt>Стран</dt><dd>{source.meta.countries}</dd></div>
                <div><dt>Регионов</dt><dd>{source.meta.regions}</dd></div>
                <div><dt>Период</dt><dd>{source.meta.latestPeriod}</dd></div>
              </dl>
              <footer><Database size={14} /> {source.meta.taxonomy}</footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
