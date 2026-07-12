import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  ExternalLink,
  FileArchive,
  FileJson2,
  FileText,
  Image,
  ListChecks,
  Globe2,
  Info,
  Layers3,
  MapPinned,
  Menu,
  Network,
  ShieldCheck,
  Sparkles,
  Table2,
  UsersRound,
  X,
} from 'lucide-react';
import CompanyLab from './components/CompanyLab.jsx';
import DataExplorer from './components/DataExplorer.jsx';
import LabourLab from './components/LabourLab.jsx';
import MapExplorer from './components/MapExplorer.jsx';
import OverviewLab from './components/OverviewLab.jsx';
import ProjectStory from './components/ProjectStory.jsx';
import { formatDate, formatNumber } from './lib/format.js';

const NAV_ITEMS = [
  ['overview', 'Обзор'],
  ['geography', 'Карта'],
  ['labour', 'Рынок труда'],
  ['companies', 'Компании'],
  ['explorer', 'Данные'],
  ['project', 'Проект'],
];

function BrandMark({ compact = false }) {
  return (
    <span className={`brand-cubes${compact ? ' brand-cubes--compact' : ''}`} aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i />
    </span>
  );
}

function SectionHeading({ eyebrow, title, text, icon: Icon, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{Icon && <Icon size={16} />}{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </div>
  );
}

function MethodologyModal({ open, onClose, data }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <section className="method-modal" role="dialog" aria-modal="true" aria-labelledby="method-title">
        <header>
          <div><span className="eyebrow"><BookOpenCheck size={16} /> Методологический контракт</span><h2 id="method-title">Как читать данные без статистических ошибок</h2><p>Витрина намеренно разделяет источники, уровни географии, единицы и классификации.</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>
        <div className="method-rule-grid">
          <article><span>01</span><h3>Страна ≠ сумма страны и регионов</h3><p><code>geo_region = NULL</code> — национальный агрегат. Заполненный регион — часть страны. Эти уровни никогда не складываются вместе.</p></article>
          <article><span>02</span><h3>Единицы разделены</h3><p><code>count</code>, <code>thousands</code> и <code>persons</code> сохраняются в исходных таблицах. Пересчёт тысяч в человек применяется только внутри конкретного источника.</p></article>
          <article><span>03</span><h3>Таксономии не склеиваются</h3><p>ENG / ICT / SCI, HRST, канадская NOC и UK SOC2010 показаны самостоятельными аналитическими контурами.</p></article>
          <article><span>04</span><h3>Снимок ≠ временной ряд</h3><p>Вакансии — одна точка. Тренд существует только для Eurostat LFS и HTEC за 2023–2025 годы.</p></article>
          <article><span>05</span><h3>UK NOMIS — исторический слой</h3><p>Данные Великобритании относятся к декабрю 2021 года и везде маркируются как устаревшие.</p></article>
          <article><span>06</span><h3>Компании — индикативная выборка</h3><p>Поле компании может содержать кадровые агентства, платформы и государственные структуры. Эвристика посредников не является официальным рейтингом.</p></article>
        </div>
        <div className="formula-card">
          <div className="formula-mark"><Network size={24} /></div>
          <div><small>Производный GeoTalent Signal</small><strong>EURES STEM-вакансии ÷ Eurostat STEM-занятость × 1 000</strong><p>Навигационный платформенный сигнал, а не официальная вакансионная норма: периоды различаются, полнота EURES неодинакова.</p></div>
        </div>
        <footer><span>Сборка витрины: {formatDate(data.meta.generatedAt, true)}</span><button type="button" className="button button--primary" onClick={onClose}>Понятно</button></footer>
      </section>
    </div>
  );
}

function Header({ menuOpen, setMenuOpen, onMethodology }) {
  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button type="button" className="brand" onClick={() => go('top')} aria-label="GeoTalent — наверх">
          <BrandMark compact />
          <span><strong>GeoTalent</strong><small>STEM LABOUR OBSERVATORY</small></span>
        </button>
        <nav className={menuOpen ? 'is-open' : ''} aria-label="Основная навигация">
          {NAV_ITEMS.map(([id, label]) => <button type="button" key={id} onClick={() => go(id)}>{label}</button>)}
          <button type="button" className="nav-method" onClick={onMethodology}><Info size={15} /> Методология</button>
        </nav>
        <div className="header-actions">
          <a className="button button--primary button--header" href="./downloads/STEM_STRICT_vacancies.parquet" download>Скачать данные <Download size={15} /></a>
          <button type="button" className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Меню" aria-expanded={menuOpen}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
    </header>
  );
}

function Hero({ data, onMethodology }) {
  const topPressure = data.pressure.countries[0];
  const topSource = Object.values(data.sources).sort((a, b) => b.meta.rows - a.meta.rows)[0];
  return (
    <section className="hero" id="top">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="hero__inner">
        <div className="hero__copy">
          <span className="eyebrow"><Sparkles size={16} /> География · спрос · занятость · компании</span>
          <h1>Глобальный контур наблюдения за STEM-кадрами</h1>
          <p>Интерактивный прототип GeoTalent объединяет семь международных источников, многоуровневую географию и полный доступ к исходным записям — от мирового обзора до конкретного объявления.</p>
          <div className="hero__actions">
            <button type="button" className="button button--primary button--large" onClick={() => document.getElementById('geography')?.scrollIntoView({ behavior: 'smooth' })}>Открыть карту <ArrowRight size={18} /></button>
            <button type="button" className="button button--outline button--large" onClick={() => document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' })}>Все 24 219 записей <Table2 size={18} /></button>
            <button type="button" className="text-button hero-method" onClick={onMethodology}><Info size={16} /> Как читать данные</button>
          </div>
          <div className="hero__status"><span className="live-dot" /> Последний снимок: {formatDate(data.meta.latestSnapshot, true)}<span>·</span> статическая сборка для GitHub Pages</div>
        </div>

        <div className="hero__visual" aria-label="Визуальная схема GeoTalent">
          <div className="hero-image" style={{ backgroundImage: "url('./assets/geotalent-reference.png')" }} />
          <div className="signal-stack signal-stack--top">
            <span>PRESSURE SIGNAL</span>
            <strong>{topPressure?.name}</strong>
            <small>{topPressure?.value} на 1 000 занятых</small>
          </div>
          <div className="signal-stack signal-stack--bottom">
            <span>LARGEST DATA LAYER</span>
            <strong>{topSource?.meta.shortTitle}</strong>
            <small>{formatNumber(topSource?.meta.rows, { compact: false })} строк</small>
          </div>
          <div className="hero-cube-pattern" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
      </div>

      <div className="hero-kpi-strip">
        <article><span className="kpi-icon"><Database size={20} /></span><div><strong>{data.meta.coverage.sourceCount}</strong><small>первичных источников</small></div></article>
        <article><span className="kpi-icon"><Table2 size={20} /></span><div><strong>{formatNumber(data.meta.dataRows.total, { compact: false })}</strong><small>исходных записей</small></div></article>
        <article><span className="kpi-icon"><Globe2 size={20} /></span><div><strong>{data.meta.coverage.vacancyCountries} / {data.meta.coverage.employmentCountries}</strong><small>стран спроса / занятости</small></div></article>
        <article><span className="kpi-icon"><MapPinned size={20} /></span><div><strong>{data.meta.coverage.vacancyRegions + data.meta.coverage.employmentRegions}</strong><small>региональных кодов</small></div></article>
        <article><span className="kpi-icon"><Building2 size={20} /></span><div><strong>{formatNumber(data.companies.meta.uniqueCompanies, { compact: false })}</strong><small>уникальных компаний</small></div></article>
        <article><span className="kpi-icon"><ShieldCheck size={20} /></span><div><strong>100%</strong><small>строк открыты в Explorer</small></div></article>
      </div>

      <div className="source-marquee" aria-label="Источники данных">
        {Object.values(data.sources).map((source) => <span key={source.meta.shortTitle}>{source.meta.shortTitle}<i />{source.meta.latestPeriod}</span>)}
      </div>
    </section>
  );
}

function DownloadCenter({ data }) {
  const files = [
    { href: './downloads/STEM_STRICT_vacancies.parquet', title: 'Вакансии и постинги', note: `${formatNumber(data.meta.dataRows.vacancies, { compact: false })} строк`, Icon: Table2 },
    { href: './downloads/STEM_STRICT_employment.parquet', title: 'Занятость STEM', note: `${formatNumber(data.meta.dataRows.employment, { compact: false })} строк`, Icon: UsersRound },
    { href: './downloads/STEM_companies_snapshot.parquet', title: 'Компании и объявления', note: `${formatNumber(data.meta.dataRows.companies, { compact: false })} строк`, Icon: Building2 },
    { href: './downloads/world_countries.geojson', title: 'Мировая геометрия', note: '242 геометрии', Icon: Globe2 },
    { href: './downloads/DASHBOARD_GUIDE.md', title: 'Методическая справка', note: 'схема и ограничения', Icon: FileText },
    { href: './downloads/PROJECT_DOSSIER_PUBLIC.md', title: 'Публичный паспорт проекта', note: 'без персональных идентификаторов', Icon: FileArchive },
    { href: './downloads/DATA_INVENTORY.json', title: 'Реестр комплектности', note: 'строки, размеры и SHA-256', Icon: ListChecks },
    { href: './data/dashboard.json', title: 'Аналитический слой JSON', note: 'агрегаты, качество и источники', Icon: FileJson2 },
    { href: './assets/geotalent-reference.png', title: 'Визуальный референс', note: 'исходная стилистика дашборда', Icon: Image },
  ];
  return (
    <div className="download-center">
      {files.map(({ href, title, note, Icon }) => (
        <a key={href} href={href} download><span><Icon size={21} /></span><div><strong>{title}</strong><small>{note}</small></div><Download size={17} /></a>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(() => {
    fetch('./data/dashboard.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setData)
      .catch((err) => setError(String(err.message || err)));
  }, []);

  const profileAction = useMemo(() => data ? (
    <button type="button" className="button button--outline button--small" onClick={() => setMethodOpen(true)}><Info size={15} /> Методология</button>
  ) : null, [data]);

  if (error) return <main className="loading-screen loading-screen--error"><BrandMark /><h1>Не удалось загрузить витрину</h1><p>{error}</p></main>;
  if (!data) return <main className="loading-screen"><BrandMark /><div className="loading-bar"><span /></div><p>Собираем глобальный STEM-контур…</p></main>;

  return (
    <>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} onMethodology={() => setMethodOpen(true)} />
      <main>
        <Hero data={data} onMethodology={() => setMethodOpen(true)} />

        <section className="page-section" id="overview">
          <SectionHeading eyebrow="Система, а не набор карточек" title="Масштаб и архитектура доказательств" text="Первый экран отвечает на вопрос «что собрано», следующий — «как устроены связи между источниками, географией, таксономиями и аналитическими выходами»." icon={Network} action={profileAction} />
          <OverviewLab data={data} />
        </section>

        <section className="page-section page-section--tinted" id="geography">
          <SectionHeading eyebrow="Координированное исследование" title="Мировая карта и территориальные профили" text="Источник, период, STEM-группа и уровень географии выбираются до агрегации. Клик по стране синхронно обновляет рейтинг, структуру, тренд и региональный профиль." icon={Globe2} />
          <MapExplorer data={data} />
        </section>

        <section className="page-section" id="labour">
          <SectionHeading eyebrow="Flow + stock" title="Спрос и занятость: отдельные методологические линзы" text="Платформенные снимки спроса не превращаются в псевдотренд, а национальные классификации не склеиваются в искусственный глобальный итог." icon={BarChart3} />
          <LabourLab data={data} />
        </section>

        <section className="page-section page-section--ink" id="companies">
          <SectionHeading eyebrow="21 424 строки объявлений" title="Лаборатория компаний и вакансий" text="Treemap, недельный пульс, матрица стран и групп, фильтр вероятных посредников и раскрытие до конкретных объявлений." icon={Building2} />
          <CompanyLab summary={data.companies} />
        </section>

        <section className="page-section" id="explorer">
          <SectionHeading eyebrow="Полная воспроизводимость" title="Data Explorer: открыть каждую строку" text="Все три таблицы загружаются в браузер полностью. Доступны поиск, фильтры, пагинация, контроль пропусков, SHA-256 и выгрузка исходников в JSON, CSV и Parquet." icon={Database} />
          <DataExplorer profiles={data.quality.datasets} />
        </section>

        <section className="page-section page-section--tinted" id="project">
          <SectionHeading eyebrow="От прототипа к внедрению" title="Продукт, рынок, команда и дорожная карта" text="Публичная часть проектного досье: архитектура решения, рынок снизу вверх, монетизация, риски, команда, история и этапы 2025–2028 годов." icon={Boxes} />
          <ProjectStory project={data.project} />
        </section>

        <section className="page-section page-section--downloads">
          <SectionHeading eyebrow="Материалы демонстрации" title="Скачать данные и методику" text="Файлы лежат в статической сборке рядом с интерфейсом и доступны без серверной части." icon={Download} />
          <DownloadCenter data={data} />
          <div className="final-cta">
            <div><span className="eyebrow"><CheckCircle2 size={16} /> Демонстрационный контур собран</span><h2>От глобальной карты — до исходной строки и бизнес-модели</h2><p>GeoTalent показывает не только результат визуализации, но и масштаб инженерной, методологической и продуктовой работы.</p></div>
            <button type="button" className="button button--primary button--large" onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>Вернуться к началу <ChevronRight size={18} /></button>
            <div className="cta-pattern" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div><BrandMark compact /><div><strong>GeoTalent</strong><span>Глобальная геоаналитика STEM-кадров</span></div></div>
        <p>Демонстрационный аналитический прототип. Период, источник, единица и классификация указываются рядом с каждым показателем.</p>
        <div><a href="./downloads/DASHBOARD_GUIDE.md">Методика <ExternalLink size={14} /></a><a href="./data/project_public.json">Паспорт проекта <ExternalLink size={14} /></a></div>
      </footer>

      <MethodologyModal open={methodOpen} onClose={() => setMethodOpen(false)} data={data} />
    </>
  );
}
