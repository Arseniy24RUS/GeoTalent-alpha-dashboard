import { useMemo } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  BriefcaseBusiness,
  CircleDollarSign,
  ExternalLink,
  Network,
  Radar,
  ShieldAlert,
  Target,
  UsersRound,
} from 'lucide-react';
import EChart from './EChart.jsx';
import { formatNumber } from '../lib/format.js';

function MarketChart({ market }) {
  const option = useMemo(() => ({
    animationDuration: 700,
    aria: { enabled: true },
    grid: { left: 112, right: 52, top: 28, bottom: 38 },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params) => `<strong>${params[0].name}</strong><br/>${formatNumber(params[0].value, { compact: false })} млн руб.`,
      backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' },
    },
    xAxis: { type: 'value', axisLabel: { formatter: (value) => `${formatNumber(value)} млн`, color: '#647087', fontFamily: 'Onest' }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'category', inverse: true, data: ['TAM', 'SAM', 'SOM'], axisLabel: { color: '#0A132D', fontFamily: 'Onest', fontWeight: 600, fontSize: 13 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: 28,
      data: [
        { value: market.tam, itemStyle: { color: '#192F70' } },
        { value: market.sam, itemStyle: { color: '#2947A0' } },
        { value: market.som, itemStyle: { color: '#539D96' } },
      ],
      label: { show: true, position: 'right', formatter: (params) => `${formatNumber(params.value, { compact: false })} млн`, color: '#0A132D', fontFamily: 'Onest', fontWeight: 600 },
    }],
  }), [market]);
  return <EChart option={option} height={270} ariaLabel="Оценка общего, достижимого и реально достижимого рынка" />;
}

function RiskMatrix({ risks }) {
  const impactMap = { 'Средний': 1, 'Существенный': 2, 'Критический': 3 };
  const data = risks.map((risk) => ({
    name: risk.name,
    value: [risk.probability, impactMap[risk.impact] || 1, 18 + risk.probability / 2],
    risk,
  }));
  const option = useMemo(() => ({
    animationDuration: 650,
    aria: { enabled: true },
    grid: { left: 54, right: 30, top: 30, bottom: 46 },
    tooltip: {
      formatter: (params) => `<strong>${params.data.risk.name}</strong><br/>Вероятность: ${params.data.risk.probability}%<br/>Влияние: ${params.data.risk.impact}<br/><span style="opacity:.75">${params.data.risk.type}</span>`,
      backgroundColor: '#0A132D', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Onest' }, confine: true,
    },
    xAxis: { type: 'value', min: 0, max: 60, name: 'Вероятность, %', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: '#3D4A60', fontFamily: 'Onest' }, axisLabel: { color: '#647087', fontFamily: 'Onest' }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    yAxis: { type: 'value', min: 0.5, max: 3.5, interval: 1, axisLabel: { formatter: (value) => ({ 1: 'Среднее', 2: 'Существенное', 3: 'Критическое' }[value] || ''), color: '#647087', fontFamily: 'Onest' }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#E9EDF3' } } },
    series: [{
      type: 'scatter', data,
      symbolSize: (value) => value[2],
      itemStyle: { color: '#2947A0', opacity: 0.86, borderColor: '#FFFFFF', borderWidth: 2 },
      emphasis: { scale: 1.15, itemStyle: { color: '#539D96' } },
      label: { show: true, position: 'top', formatter: (params) => params.data.risk.type.split(' / ')[0], color: '#0A132D', fontFamily: 'Onest', fontSize: 10 },
      markArea: {
        silent: true,
        data: [
          [{ xAxis: 0, yAxis: 2.5, itemStyle: { color: 'rgba(83,157,150,.05)' } }, { xAxis: 35, yAxis: 3.5 }],
          [{ xAxis: 35, yAxis: 2.5, itemStyle: { color: 'rgba(41,71,160,.08)' } }, { xAxis: 60, yAxis: 3.5 }],
        ],
      },
    }],
  }), [data]);
  return <EChart option={option} height={360} ariaLabel="Матрица вероятности и влияния проектных рисков" />;
}

export default function ProjectStory({ project }) {
  return (
    <div className="project-story">
      <div className="project-hero-band">
        <div>
          <span className="eyebrow"><BadgeCheck size={16} /> УГТ {project.trl} · стадия «{project.stage}»</span>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
        </div>
        <div className="project-hero-signal" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span /><span /><span />
        </div>
      </div>

      <div className="architecture-flow">
        {project.architecture.map((item, index) => (
          <div className="architecture-step" key={item.id}>
            <span className="architecture-num">0{index + 1}</span>
            <div><strong>{item.title}</strong><p>{item.copy}</p></div>
            {index < project.architecture.length - 1 && <ArrowRight className="architecture-arrow" size={22} />}
          </div>
        ))}
      </div>

      <div className="project-two-col">
        <article className="panel panel--flat">
          <div className="panel-heading"><div><span className="panel-kicker">Бизнес-модель</span><h3>Рынок снизу вверх</h3></div><Target size={22} /></div>
          <MarketChart market={project.market} />
          <div className="market-legend">
            <div><strong>TAM</strong><span>общий адресуемый рынок</span></div>
            <div><strong>SAM</strong><span>достижимый сегмент</span></div>
            <div><strong>SOM</strong><span>реально достижимый объём к третьему году</span></div>
          </div>
        </article>
        <article className="panel panel--flat">
          <div className="panel-heading"><div><span className="panel-kicker">Управление неопределённостью</span><h3>Карта ключевых рисков</h3></div><ShieldAlert size={22} /></div>
          <RiskMatrix risks={project.risks} />
          <p className="chart-note">Размер круга усиливает вероятность; меры снижения раскрываются в карточках ниже.</p>
        </article>
      </div>

      <section className="project-subsection">
        <div className="subsection-heading"><div><span className="panel-kicker">Монетизация</span><h3>Архитектура сделки</h3></div><CircleDollarSign size={24} /></div>
        <div className="offer-grid">
          {project.offers.map((offer, index) => (
            <article key={offer.name}>
              <span className="offer-index">0{index + 1}</span>
              <h4>{offer.name}</h4>
              <p>{offer.deliverable}</p>
              <dl>
                <div><dt>Средний чек</dt><dd>{offer.price} млн ₽</dd></div>
                <div><dt>Цикл сделки</dt><dd>{offer.cycle} мес.</dd></div>
                <div><dt>Для кого</dt><dd>{offer.audience}</dd></div>
              </dl>
              <footer>{offer.role}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="project-subsection">
        <div className="subsection-heading"><div><span className="panel-kicker">Путь развития</span><h3>От научного задела к масштабированию</h3></div><Radar size={24} /></div>
        <div className="history-line">
          {project.history.map((item) => (
            <article key={`${item.year}-${item.title}`}>
              <span>{item.year}</span>
              <div><strong>{item.title}</strong><p>{item.copy}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Открыть результат <ExternalLink size={13} /></a>}</div>
            </article>
          ))}
        </div>
        <div className="roadmap-grid">
          {project.roadmap.map((stage, index) => (
            <article key={stage.year} className={index === 0 ? 'is-current' : ''}>
              <header><span>{stage.year}</span><small>{stage.status}</small></header>
              <h4>{stage.title}</h4>
              <ul>{stage.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="project-subsection">
        <div className="subsection-heading"><div><span className="panel-kicker">Отличие продукта</span><h3>Сравнение с альтернативами</h3></div><Network size={24} /></div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th>Характеристика</th><th>GeoTalent</th><th>Рыночные альтернативы</th><th>Текущее решение клиента</th></tr></thead>
            <tbody>{project.valueProposition.map((row) => <tr key={row.title}><th>{row.title}</th><td className="is-project">{row.project}</td><td>{row.alternatives}</td><td>{row.current}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="project-two-col project-two-col--team">
        <section className="project-subsection project-subsection--embedded">
          <div className="subsection-heading"><div><span className="panel-kicker">Коллектив</span><h3>Шесть взаимодополняющих контуров</h3></div><UsersRound size={24} /></div>
          <div className="team-list">
            {project.team.map((person) => (
              <article key={person.name}><span>{person.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><strong>{person.name}</strong><small>{person.role}</small><p>{person.focus}</p></div></article>
            ))}
          </div>
          <p className="privacy-note">{project.privacyNote}</p>
        </section>
        <section className="project-subsection project-subsection--embedded">
          <div className="subsection-heading"><div><span className="panel-kicker">Коммерческая проверка</span><h3>Воронка валидации</h3></div><BriefcaseBusiness size={24} /></div>
          <div className="validation-list">
            {project.validation.map((item, index) => (
              <article key={item.period}><span>0{index + 1}</span><div><small>{item.period}</small><strong>{item.goal}</strong><p>{item.result}</p><em>{item.kpi}</em></div></article>
            ))}
          </div>
        </section>
      </div>

      <section className="project-subsection">
        <div className="subsection-heading"><div><span className="panel-kicker">Доказательная база</span><h3>Публичные сигналы институционального спроса</h3></div><Boxes size={24} /></div>
        <div className="source-link-grid source-link-grid--project">
          {project.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><div><strong>{source.title}</strong><span>{source.note}</span></div><ExternalLink size={16} /></a>
          ))}
        </div>
      </section>
    </div>
  );
}
