#!/usr/bin/env python3
"""Build the complete static data layer for the GeoTalent GitHub Pages dashboard.

The script keeps source taxonomies and geographic levels separate. It produces:
- dashboard.json: aggregated, browser-ready analytical layer;
- vacancies.json / employment.json / companies.json: every source record;
- CSV and Parquet downloads;
- simplified world GeoJSON;
- public-safe project dossier (personal identifiers excluded).
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import pandas as pd
from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
DATA = PUBLIC / "data"
DOWNLOADS = PUBLIC / "downloads"
ASSETS = PUBLIC / "assets"
UPLOADED_ROOT = Path("/mnt/data")


def resolve_source(env_name: str, *candidates: Path) -> Path:
    """Resolve a source file from an explicit environment path or bundled fallbacks."""
    configured = os.environ.get(env_name)
    search = ([Path(configured).expanduser()] if configured else []) + list(candidates)
    for candidate in search:
        if candidate.exists() and candidate.is_file():
            return candidate
    rendered = "\n  - ".join(str(item) for item in search)
    raise FileNotFoundError(f"Missing input for {env_name}. Checked:\n  - {rendered}")


VACANCIES_PATH = resolve_source(
    "GEOTALENT_VACANCIES",
    DOWNLOADS / "STEM_STRICT_vacancies.parquet",
    UPLOADED_ROOT / "STEM_STRICT_vacancies (2).parquet",
)
EMPLOYMENT_PATH = resolve_source(
    "GEOTALENT_EMPLOYMENT",
    DOWNLOADS / "STEM_STRICT_employment.parquet",
    UPLOADED_ROOT / "STEM_STRICT_employment (2).parquet",
)
COMPANIES_PATH = resolve_source(
    "GEOTALENT_COMPANIES",
    DOWNLOADS / "STEM_companies_snapshot.parquet",
    UPLOADED_ROOT / "STEM_companies_snapshot (2).parquet",
)
WORLD_PATH = resolve_source(
    "GEOTALENT_WORLD",
    DOWNLOADS / "world_countries.geojson",
    UPLOADED_ROOT / "world_countries.geojson",
)
GUIDE_PATH = resolve_source(
    "GEOTALENT_GUIDE",
    DOWNLOADS / "DASHBOARD_GUIDE.md",
    UPLOADED_ROOT / "DASHBOARD_GUIDE.md",
)
REFERENCE_PATH = resolve_source(
    "GEOTALENT_REFERENCE",
    ASSETS / "geotalent-reference.png",
    UPLOADED_ROOT / "GIR light(1).png",
)

NORMALIZE_COUNTRY = {"EL": "GR"}
COUNTRY_FALLBACK_RU = {
    "AT": "Австрия", "AU": "Австралия", "BA": "Босния и Герцеговина", "BE": "Бельгия",
    "BG": "Болгария", "BR": "Бразилия", "CA": "Канада", "CH": "Швейцария", "CY": "Кипр",
    "CZ": "Чехия", "DE": "Германия", "DK": "Дания", "EE": "Эстония", "ES": "Испания",
    "FI": "Финляндия", "FR": "Франция", "GB": "Великобритания", "GR": "Греция",
    "HR": "Хорватия", "HU": "Венгрия", "IE": "Ирландия", "IN": "Индия", "IS": "Исландия",
    "IT": "Италия", "LI": "Лихтенштейн", "LT": "Литва", "LU": "Люксембург", "LV": "Латвия",
    "MK": "Северная Македония", "MT": "Мальта", "NL": "Нидерланды", "NO": "Норвегия",
    "NZ": "Новая Зеландия", "PL": "Польша", "PT": "Португалия", "RO": "Румыния",
    "RS": "Сербия", "SE": "Швеция", "SI": "Словения", "SK": "Словакия", "TR": "Турция",
    "US": "США", "ZA": "ЮАР", "NS": "Код NS в источнике EURES",
}

US_STATES = {
    "AL":"Алабама","AK":"Аляска","AZ":"Аризона","AR":"Арканзас","CA":"Калифорния",
    "CO":"Колорадо","CT":"Коннектикут","DE":"Делавэр","DC":"Округ Колумбия","FL":"Флорида",
    "GA":"Джорджия","HI":"Гавайи","ID":"Айдахо","IL":"Иллинойс","IN":"Индиана",
    "IA":"Айова","KS":"Канзас","KY":"Кентукки","LA":"Луизиана","ME":"Мэн",
    "MD":"Мэриленд","MA":"Массачусетс","MI":"Мичиган","MN":"Миннесота","MS":"Миссисипи",
    "MO":"Миссури","MT":"Монтана","NE":"Небраска","NV":"Невада","NH":"Нью-Гэмпшир",
    "NJ":"Нью-Джерси","NM":"Нью-Мексико","NY":"Нью-Йорк","NC":"Северная Каролина",
    "ND":"Северная Дакота","OH":"Огайо","OK":"Оклахома","OR":"Орегон","PA":"Пенсильвания",
    "RI":"Род-Айленд","SC":"Южная Каролина","SD":"Южная Дакота","TN":"Теннесси",
    "TX":"Техас","UT":"Юта","VT":"Вермонт","VA":"Виргиния","WA":"Вашингтон",
    "WV":"Западная Виргиния","WI":"Висконсин","WY":"Вайоминг",
}
CANADA_PROVINCES = {
    "AB":"Альберта","BC":"Британская Колумбия","MB":"Манитоба","NB":"Нью-Брансуик",
    "NL":"Ньюфаундленд и Лабрадор","NS":"Новая Шотландия","NT":"Северо-Западные территории",
    "NU":"Нунавут","ON":"Онтарио","PE":"Остров Принца Эдуарда","QC":"Квебек",
    "SK":"Саскачеван","YT":"Юкон",
}

SOURCE_META = {
    "eures": {
        "title": "EURES", "shortTitle": "EURES", "metric": "vacancies", "metricLabel": "Вакансии",
        "taxonomy": "ISCO-08, minor groups", "unit": "count", "latestPeriod": "2026-Q3",
        "geography": "32 страны EU/ЕЭЗ; 344 субрегиона", "freshness": "snapshot",
        "officialUrl": "https://eures.europa.eu/index_en",
        "note": "Платформенный снимок вакансий; полнота различается между странами.",
    },
    "adzuna": {
        "title": "Adzuna postings", "shortTitle": "Adzuna", "metric": "postings", "metricLabel": "Постинги",
        "taxonomy": "Adzuna: IT / engineering / scientific & QA", "unit": "count", "latestPeriod": "2026-07",
        "geography": "8 стран; регионы второго уровня", "freshness": "snapshot",
        "officialUrl": "https://developer.adzuna.com/",
        "note": "Один снимок платформы; не временной ряд и не перепись рынка.",
    },
    "eurostat": {
        "title": "Eurostat Labour Force Survey", "shortTitle": "Eurostat LFS", "metric": "employment", "metricLabel": "Занятость",
        "taxonomy": "ISCO-08, 2-digit submajor", "unit": "thousands", "latestPeriod": "2025",
        "geography": "34 страны; национальный уровень", "freshness": "timeseries",
        "officialUrl": "https://ec.europa.eu/eurostat/web/lfs/database",
        "note": "Трёхлетний ряд 2023–2025; значения исходно в тысячах человек.",
    },
    "eurostat_htec": {
        "title": "Eurostat high-tech employment", "shortTitle": "Eurostat HTEC", "metric": "employment", "metricLabel": "Занятость HRST",
        "taxonomy": "HTEC: HTC / KIS × professionals", "unit": "thousands", "latestPeriod": "2025",
        "geography": "34 страны; 109 NUTS1-регионов", "freshness": "timeseries",
        "officialUrl": "https://ec.europa.eu/eurostat/web/science-technology-innovation/database",
        "note": "Самостоятельная HRST-классификация; не смешивается с ENG/ICT/SCI.",
    },
    "bls": {
        "title": "BLS Occupational Employment and Wage Statistics", "shortTitle": "BLS OEWS", "metric": "employment", "metricLabel": "Занятость",
        "taxonomy": "US SOC major groups", "unit": "persons", "latestPeriod": "2025-Q2",
        "geography": "США; 50 штатов + DC", "freshness": "snapshot",
        "officialUrl": "https://www.bls.gov/oes/",
        "note": "Национальный агрегат и штаты показаны раздельно.",
    },
    "statcan": {
        "title": "Statistics Canada Labour Force Survey", "shortTitle": "Statistics Canada", "metric": "employment", "metricLabel": "Занятость",
        "taxonomy": "NOC 2021", "unit": "thousands", "latestPeriod": "2025",
        "geography": "Канада; 10 провинций", "freshness": "snapshot",
        "officialUrl": "https://www150.statcan.gc.ca/n1/en/type/data",
        "note": "Канадская NOC-классификация отделена от ISCO/SOC-сопоставлений.",
    },
    "uk_nomis": {
        "title": "UK NOMIS", "shortTitle": "UK NOMIS", "metric": "employment", "metricLabel": "Занятость",
        "taxonomy": "SOC2010 STEM professionals", "unit": "persons", "latestPeriod": "2021-12",
        "geography": "Великобритания; 12 регионов", "freshness": "historical",
        "officialUrl": "https://www.nomisweb.co.uk/",
        "note": "Исторический срез декабря 2021 года; визуально маркируется как устаревший.",
    },
}

PROJECT_PUBLIC = {
    "name": "Система прогнозирования кадровой обеспеченности региона: геоаналитическая платформа",
    "stage": "Разработка",
    "trl": 3,
    "tagline": "От разрозненных статистических слоёв — к пространственному цифровому двойнику кадрового обеспечения.",
    "description": "Продукт объединяет демографию, миграцию, образование, вакансии, зарплаты, транспортную доступность, геоданные и данные заказчика в единой нормализованной модели. Выходом становятся индексы кадрового риска, сценарии мер и аналитическая панель для лиц, принимающих решения.",
    "valueProposition": [
        {"title":"Единица анализа","project":"Территория, площадка, инвестиционный проект, компания, профессия и трудовая зона","alternatives":"Обычно вакансия, отдельная компания или разовый отраслевой отчёт","current":"Разрозненные таблицы и локальная аналитика"},
        {"title":"Контуры данных","project":"Демография, миграция, образование, вакансии, зарплаты, транспорт, геоданные и данные заказчика","alternatives":"Частичный охват одного-двух контуров","current":"Источники не сведены в единую модель"},
        {"title":"Пространственная аналитика","project":"Изохроны 30/60/90 минут, трудовые зоны, агломерации, география ресурсов","alternatives":"Ограничена или отсутствует","current":"Как правило отсутствует"},
        {"title":"Выход для ЛПР","project":"Индекс риска, сценарии мер, записка руководству, API и панели","alternatives":"Описательная аналитика или исследование","current":"Ретроспективная отчётность"},
        {"title":"Развёртывание","project":"Локально, частное облако, защищённый контур, API","alternatives":"Облако, презентации или ручная передача отчёта","current":"Локальные файлы и ручные выгрузки"},
        {"title":"Глобальный контур","project":"Межстрановое сравнение и расширение на БРИКС / Глобальный Юг","alternatives":"Макроуровень без пространственной кадровой логики","current":"Отсутствует"},
    ],
    "architecture": [
        {"id":"sources","title":"50+ источников","copy":"Официальная статистика, вакансии, образование, демография, миграция, геоданные и данные заказчика."},
        {"id":"ontology","title":"Онтология и классификаторы","copy":"Согласование территорий, профессий, отраслей, периодов и единиц измерения."},
        {"id":"spatial","title":"Пространственное ядро","copy":"Трудовые зоны, агломерации, изохроны, доступность и межтерриториальные связи."},
        {"id":"models","title":"Индексы и сценарии","copy":"Оценка риска кадровой обеспеченности, объяснимые факторы и ретроспективная проверка."},
        {"id":"delivery","title":"Контур решения","copy":"Панель, аналитическая записка, API, локальное или облачное защищённое развёртывание."},
    ],
    "history": [
        {"year":2018,"title":"Институциональная база","copy":"Создано ядро исследований по геоурбанистике и пространственной демографии."},
        {"year":2023,"title":"Методологическая рамка","copy":"Сформулирована прикладная рамка пространственной демографии; накоплен портфель из 10 НИОКР.","url":"https://doi.org/10.1007/s11115-023-00727-z"},
        {"year":2024,"title":"Цифровой прототип","copy":"Разработана аналитическая панель демографических данных по населённым пунктам, муниципалитетам и регионам России.","url":"https://дашборд-мгимо.рф/"},
        {"year":2025,"title":"Продуктовая архитектура","copy":"Сформированы карта данных из более чем 50 источников и логика стартового модуля кадровой обеспеченности."},
        {"year":2026,"title":"Международный STEM-контур","copy":"Собраны семь международных источников, 24 219 записей и многоуровневая география спроса и занятости."},
    ],
    "roadmap": [
        {"year":"2025","title":"Исследование и валидация спроса","status":"в работе","items":["Научно-продуктовая архитектура и карта данных","30–40 интервью с заказчиками","5 партнёров по апробации и 3 письма о заинтересованности"]},
        {"year":"2026","title":"Базовая платформа и MVP","status":"следующий этап","items":["Ядро данных и пространственный слой","MVP модуля оценки кадровой обеспеченности","Защищённое развёртывание и API"]},
        {"year":"2027","title":"Апробация и первые контракты","status":"план","items":["2–3 платных пилота","Цифровой двойник кадрового обеспечения","Опорный кейс и первые корпоративные контракты"]},
        {"year":"2028","title":"Масштабирование","status":"план","items":["Отраслевые модули и консорциум бенчмаркинга","5+ платящих клиентов","Модуль БРИКС и Глобального Юга"]},
    ],
    "offers": [
        {"name":"Диагностическая аналитика / кадровый аудит","audience":"Регион, госкорпорация, холдинг","deliverable":"Карта рисков, записка руководству, рамка пилота","price":5,"cycle":2,"role":"Входной продукт"},
        {"name":"Пилот / MVP в защищённом контуре","audience":"Партнёры по апробации","deliverable":"Рабочий модуль, индексы, интеграция, ретроспективная проверка","price":8,"cycle":3,"role":"Переход к годовому контракту"},
        {"name":"Годовая корпоративная лицензия / частное облако","audience":"Федеральные заказчики, регионы, корпорации","deliverable":"Продуктивная система, поддержка, обновления, защищённое развёртывание","price":18,"cycle":6,"role":"Основной источник выручки"},
        {"name":"Отраслевой модуль / API / закрытый бенчмаркинг","audience":"Действующие клиенты и интеграторы","deliverable":"Индексы, API, дополнительные сценарии и сопоставительные материалы","price":4,"cycle":2,"role":"Допродажи"},
    ],
    "market": {
        "tam":3108,"sam":972,"som":136,
        "segments":[
            {"name":"Федеральные органы и национальные операторы","organizations":15,"tam":300,"samOrganizations":6,"sam":120,"somClients":1,"som":20},
            {"name":"Региональные правительства и корпорации развития","organizations":89,"tam":1068,"samOrganizations":18,"sam":216,"somClients":2,"som":24},
            {"name":"Госкорпорации и крупные холдинги","organizations":30,"tam":840,"samOrganizations":15,"sam":420,"somClients":2,"som":56},
            {"name":"Крупные частные индустриальные и технологические группы","organizations":50,"tam":900,"samOrganizations":12,"sam":216,"somClients":2,"som":36},
        ],
    },
    "validation": [
        {"period":"0–90 дней","goal":"Подтвердить problem–solution fit","result":"30–40 интервью, профиль приоритетного клиента, карта ролей","kpi":"≥30 интервью; ≥8 с распорядителями бюджета"},
        {"period":"90–180 дней","goal":"Собрать пул партнёров","result":"5 партнёров, 3 проекта технических заданий, карта партнёрств по данным","kpi":"≥5 партнёров; ≥3 ТЗ"},
        {"period":"180–270 дней","goal":"Получить коммерческие сигналы","result":"3 письма о заинтересованности, 2 платных пилота, 1 соглашение по данным","kpi":"≥3 LOI; ≥2 платных пилота"},
        {"period":"12–24 месяца","goal":"Сделать предложение тиражируемым","result":"Опорный кейс, годовые контракты, API и бенчмаркинг","kpi":"≥5 платящих клиентов; продление >70%"},
    ],
    "risks": [
        {"name":"Готовность рынка платить","type":"Коммерческий / рыночный","probability":35,"impact":"Критический","mitigation":"Входной аудит, 30–40 интервью, партнёры по апробации, письма о заинтересованности и платные пилоты."},
        {"name":"Доступ и стоимость данных","type":"Данные / правовой","probability":45,"impact":"Существенный","mitigation":"Диверсификация источников, собственный исторический слой, резервные показатели и юридическое оформление лицензий."},
        {"name":"Недостающие продуктовые роли","type":"Кадровый / управленческий","probability":40,"impact":"Существенный","mitigation":"Приоритетный найм коммерциализации, product development, customer success и data partnerships."},
        {"name":"Защищённое развёртывание","type":"Технический / ИБ","probability":30,"impact":"Существенный","mitigation":"Модульная архитектура, private cloud, ранний аудит ИБ, интегратор и поэтапный API-контур."},
        {"name":"Доверие к прогнозной модели","type":"Продуктовый / методологический","probability":25,"impact":"Критический","mitigation":"Ретроспективная проверка, интерпретируемые индексы, отраслевые параметры и совместная калибровка."},
        {"name":"Длинный закупочный цикл","type":"Финансовый / сбытовой","probability":50,"impact":"Средний","mitigation":"Параллельный корпоративный контур, платная диагностика, дробление сделки и грантовое финансирование ранней стадии."},
    ],
    "team": [
        {"name":"Вадим А. Безвербный","role":"Научный лидер","focus":"Пространственная демография, научно-продуктовая концепция и партнёрский контур."},
        {"name":"Александр Э. Райсих","role":"Пространственная аналитика","focus":"Агломерации, маятниковая мобильность, ГИС и валидация территориальных гипотез."},
        {"name":"Антон С. Гладкий","role":"Архитектура данных и ИИ","focus":"ETL, хранилище, API, инженерия данных и контроль качества."},
        {"name":"Арсений М. Ситковский","role":"Прототипирование и испытания","focus":"Интерфейсы, аналитическая визуализация, демонстрации и пользовательская обратная связь."},
        {"name":"Александр А. Борискин","role":"Государственный сектор","focus":"Регуляторный контур, закупочные требования и продажи государственным заказчикам."},
        {"name":"Андрей А. Кирилкин","role":"Проект и корпоративное развитие","focus":"Календарь вех, переговоры, пилоты и коммерциализация аналитических решений."},
    ],
    "sources": [
        {"title":"Национальный проект «Кадры»","url":"https://government.ru/rugovclassifier/916/","note":"Институциональный контур спроса."},
        {"title":"Семилетний прогноз кадровой потребности","url":"https://government.ru/news/57867/","note":"Переход к семилетнему горизонту прогнозирования."},
        {"title":"Прогноз потребности отраслей на 2026–2032 годы","url":"https://government.ru/news/58103/","note":"Институционализация отраслевого кадрового прогноза."},
        {"title":"Опрос более 300 тыс. работодателей","url":"https://mintrud.gov.ru/employment/285","note":"Масштаб регулярного сбора данных о спросе."},
        {"title":"Нацпроект «Кадры»: ежегодный опрос работодателей","url":"https://mintrud.gov.ru/ministry/programms/nacproekt_kadry","note":"Регулярность кадрового мониторинга."},
        {"title":"Ростех: потребность до 2028 года","url":"https://rostec.ru/media/news/rostekh-mirea-mai-i-moskovskaya-shkola-zaklyuchili-soglashenie-o-podgotovke-kadrov/","note":"Публичный сигнал спроса на специалистов и инженеров."},
        {"title":"Росатом: кадровый спрос до 2030 года","url":"https://rosatom.ru/journalist/interview/yuliya-uzhakina-dlya-nas-vazhna-ideya-sluzheniya/","note":"Долгосрочное планирование ИТ- и молодых специалистов."},
    ],
    "privacyNote": "В публичной витрине исключены последние четыре цифры СНИЛС и иные персональные идентификаторы из исходной проектной анкеты.",
}


def norm_country(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    value = str(value).upper().strip()
    return NORMALIZE_COUNTRY.get(value, value)


def scalar(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isfinite(value) and value.is_integer():
        return int(value)
    return value


def dump_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"), default=str)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_country_lookup() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    with WORLD_PATH.open(encoding="utf-8") as fh:
        geojson = json.load(fh)
    lookup: dict[str, dict[str, Any]] = {}
    simplified_features = []
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        code = norm_country(props.get("iso2"))
        if code:
            lookup[code] = {
                "iso2": code,
                "iso3": props.get("iso3"),
                "nameRu": props.get("name_ru") or props.get("name") or COUNTRY_FALLBACK_RU.get(code, code),
                "nameEn": props.get("name_en") or props.get("name") or code,
                "regionUn": props.get("region_un"),
                "regionWb": props.get("region_wb"),
            }
        geom = feature.get("geometry")
        if not geom:
            continue
        try:
            obj = shape(geom)
            tolerance = 0.09 if obj.area < 3 else 0.16
            simple = obj.simplify(tolerance, preserve_topology=True)
            simple_geom = mapping(simple)
        except Exception:
            simple_geom = geom
        out_props = {
            "iso2": code or props.get("iso2"),
            "iso3": props.get("iso3"),
            "name": props.get("name_ru") or props.get("name") or props.get("name_en"),
            "name_ru": props.get("name_ru") or props.get("name"),
            "name_en": props.get("name_en") or props.get("name"),
        }
        simplified_features.append({"type": "Feature", "properties": out_props, "geometry": simple_geom})
    for code, name in COUNTRY_FALLBACK_RU.items():
        lookup.setdefault(code, {"iso2": code, "iso3": None, "nameRu": name, "nameEn": code, "regionUn": None, "regionWb": None})
    return lookup, {"type": "FeatureCollection", "features": simplified_features}


def country_name(code: str | None, lookup: dict[str, dict[str, Any]]) -> str:
    if not code:
        return "Не указано"
    return lookup.get(code, {}).get("nameRu") or COUNTRY_FALLBACK_RU.get(code, code)


def region_name(source: str, code: str) -> str:
    if source == "bls":
        return US_STATES.get(code, code)
    if source == "statcan":
        return CANADA_PROVINCES.get(code, code)
    if source == "adzuna":
        return code
    if source == "uk_nomis":
        return code
    return code.upper()


def display_group(row: pd.Series) -> str:
    if row["source"] == "eurostat_htec":
        raw = str(row.get("occ_code_raw") or "")
        return "HTC" if "HTC/" in raw else "KIS" if "KIS/" in raw else "HRST"
    return str(row.get("stem_group") or "OTHER")


def value_multiplier(unit: str) -> int:
    return 1000 if unit == "thousands" else 1


def aggregate_fact_source(df: pd.DataFrame, source: str, lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    d = df[df["source"] == source].copy()
    d["country_norm"] = d["geo_country"].map(norm_country)
    if source == "eurostat_htec":
        mask = d["country_norm"].isna() & d["geo_region"].notna()
        d.loc[mask, "country_norm"] = d.loc[mask, "geo_region"].astype(str).str[:2].map(norm_country)
    d["display_group"] = d.apply(display_group, axis=1)
    d["display_value"] = d.apply(lambda r: float(r["value"]) * value_multiplier(str(r["unit"])), axis=1)

    national = d[d["geo_region"].isna()].copy()
    if source == "uk_nomis":
        # NOMIS is a complete partition of the UK into 12 regions; sum only within this source.
        national = d.copy()
        national["country_norm"] = "GB"
        national["geo_region"] = None

    national_periods: dict[str, list[dict[str, Any]]] = {}
    for (period, code), group in national.groupby(["period", "country_norm"], dropna=False):
        if not code:
            continue
        group_values = group.groupby("display_group")["display_value"].sum().sort_index()
        national_periods.setdefault(str(period), []).append({
            "code": str(code),
            "name": country_name(str(code), lookup),
            "total": round(float(group_values.sum()), 4),
            "groups": {str(k): round(float(v), 4) for k, v in group_values.items()},
        })
    for period, rows in national_periods.items():
        rows.sort(key=lambda x: x["total"], reverse=True)

    regional: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    region_rows = d[d["geo_region"].notna()].copy()
    for (code, period, region), group in region_rows.groupby(["country_norm", "period", "geo_region"], dropna=False):
        if not code or not region:
            continue
        group_values = group.groupby("display_group")["display_value"].sum().sort_index()
        regional[str(code)][str(period)].append({
            "code": str(region),
            "name": region_name(source, str(region)),
            "total": round(float(group_values.sum()), 4),
            "groups": {str(k): round(float(v), 4) for k, v in group_values.items()},
        })
    for periods in regional.values():
        for rows in periods.values():
            rows.sort(key=lambda x: x["total"], reverse=True)

    meta = dict(SOURCE_META[source])
    meta.update({
        "rows": int(len(d)),
        "nationalRows": int(d["geo_region"].isna().sum()),
        "regionalRows": int(d["geo_region"].notna().sum()),
        "countries": int(d["country_norm"].dropna().nunique()),
        "regions": int(d["geo_region"].dropna().nunique()),
        "periods": sorted([str(x) for x in d["period"].dropna().unique()]),
        "groups": sorted([str(x) for x in d["display_group"].dropna().unique()]),
        "originalUnit": str(d["unit"].dropna().iloc[0]) if not d["unit"].dropna().empty else None,
        "displayUnit": "persons" if d["metric"].iloc[0] == "employment" else "count",
        "snapshot": str(d["snapshot"].dropna().max()) if not d["snapshot"].dropna().empty else None,
    })
    return {"meta": meta, "national": national_periods, "regions": {k: dict(v) for k, v in regional.items()}}


def build_pressure(eures: dict[str, Any], eurostat: dict[str, Any]) -> dict[str, Any]:
    demand_period = eures["meta"]["latestPeriod"]
    employment_period = eurostat["meta"]["latestPeriod"]
    demand = {row["code"]: row for row in eures["national"].get(demand_period, [])}
    stock = {row["code"]: row for row in eurostat["national"].get(employment_period, [])}
    rows = []
    for code in sorted(set(demand) & set(stock)):
        vacancies = float(demand[code]["total"])
        employment = float(stock[code]["total"])
        if employment <= 0:
            continue
        value = vacancies / employment * 1000
        rows.append({
            "code": code, "name": demand[code]["name"], "value": round(value, 3),
            "vacancies": round(vacancies, 2), "employment": round(employment, 2),
        })
    rows.sort(key=lambda x: x["value"], reverse=True)
    return {
        "meta": {
            "title": "Индикативный сигнал напряжённости",
            "formula": "EURES STEM-вакансии ÷ Eurostat STEM-занятость × 1 000",
            "period": f"{employment_period} stock / {demand_period} flow",
            "note": "Производный платформенный сигнал, а не официальная вакансионная норма. Сравнивает разные периоды и зависит от полноты EURES.",
            "countries": len(rows),
        },
        "countries": rows,
    }


def records_json(df: pd.DataFrame) -> list[dict[str, Any]]:
    result = []
    for row in df.to_dict(orient="records"):
        result.append({str(k): scalar(v) for k, v in row.items()})
    return result


def missing_stats(df: pd.DataFrame) -> list[dict[str, Any]]:
    rows = []
    n = len(df)
    for col in df.columns:
        non_null = int(df[col].notna().sum())
        rows.append({"column": str(col), "nonNull": non_null, "missing": n - non_null, "missingPct": round((n - non_null) / n * 100, 2) if n else 0})
    return rows


def dataset_profile(dataset_id: str, title: str, df: pd.DataFrame, src_path: Path, json_path: str, csv_path: str, parquet_path: str) -> dict[str, Any]:
    date_cols = [c for c in ["created", "snapshot", "period"] if c in df.columns]
    return {
        "id": dataset_id,
        "title": title,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "columnNames": [str(c) for c in df.columns],
        "duplicatesExact": int(df.duplicated().sum()),
        "missing": missing_stats(df),
        "dateRanges": {c: {"min": scalar(df[c].dropna().min()) if not df[c].dropna().empty else None, "max": scalar(df[c].dropna().max()) if not df[c].dropna().empty else None} for c in date_cols},
        "fileSizeBytes": int(src_path.stat().st_size),
        "sha256": sha256(src_path),
        "downloads": {"json": json_path, "csv": csv_path, "parquet": parquet_path},
    }


def likely_intermediary(company: str | None, title: str | None) -> bool:
    text = f"{company or ''} {title or ''}".lower()
    tokens = [
        "recruit", "staffing", "jobradar", "offerzen", "talent solutions", "headhunt", "placement",
        "job board", "jobs via", "employment agency", "nielsen pulse", "earn from your mobile phone usage",
    ]
    return any(token in text for token in tokens)


def aggregate_companies(df: pd.DataFrame, lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    d = df.copy()
    d["country"] = d["country"].map(norm_country)
    d["created_dt"] = pd.to_datetime(d["created"], utc=True, errors="coerce")
    d["snapshot_dt"] = pd.to_datetime(d["snapshot"], utc=True, errors="coerce")
    d["intermediary_likely"] = [likely_intermediary(c, t) for c, t in zip(d["company"], d["title"])]
    dedup = d.drop_duplicates(subset=["country", "region", "stem_group", "company", "title", "created", "snapshot"]).copy()

    snapshot = d["snapshot_dt"].max()
    if pd.isna(snapshot):
        snapshot = pd.Timestamp.now(tz="UTC")
    d["age_days"] = (snapshot - d["created_dt"]).dt.total_seconds() / 86400
    d.loc[d["age_days"] < 0, "age_days"] = 0

    by_country = []
    for code, g in d.groupby("country"):
        by_country.append({
            "code": code, "name": country_name(code, lookup), "postings": int(len(g)),
            "companies": int(g["company"].nunique(dropna=True)), "titles": int(g["title"].nunique(dropna=True)),
            "regions": int(g["region"].nunique(dropna=True)), "intermediaryLikely": int(g["intermediary_likely"].sum()),
            "groups": {k: int(v) for k, v in g.groupby("stem_group").size().sort_index().items()},
        })
    by_country.sort(key=lambda x: x["postings"], reverse=True)

    group_counts = [{"name": str(k), "value": int(v)} for k, v in d.groupby("stem_group").size().sort_values(ascending=False).items()]
    top_companies = []
    for company, g in d.groupby("company", dropna=False):
        if not company:
            continue
        top_companies.append({
            "name": str(company), "value": int(len(g)), "countries": int(g["country"].nunique()),
            "groups": {k: int(v) for k, v in g.groupby("stem_group").size().sort_index().items()},
            "intermediaryLikely": bool(g["intermediary_likely"].mean() >= 0.5),
        })
    top_companies.sort(key=lambda x: x["value"], reverse=True)

    top_titles = [{"name": str(k), "value": int(v)} for k, v in d.groupby("title").size().sort_values(ascending=False).head(60).items() if k]

    weekly = []
    recent = d[d["created_dt"] >= snapshot - pd.Timedelta(days=210)].copy()
    if not recent.empty:
        recent["week"] = recent["created_dt"].dt.to_period("W-MON").dt.start_time.dt.strftime("%Y-%m-%d")
        for week, g in recent.groupby("week"):
            weekly.append({"period": str(week), "total": int(len(g)), **{str(k): int(v) for k, v in g.groupby("stem_group").size().items()}})
        weekly.sort(key=lambda x: x["period"])

    age_buckets = [("0–7 дней", 0, 7), ("8–30 дней", 8, 30), ("31–90 дней", 31, 90), ("91–180 дней", 91, 180), ("181+ дней", 181, math.inf)]
    age_distribution = []
    for label, lo, hi in age_buckets:
        mask = d["age_days"].ge(lo) & (d["age_days"].le(hi) if math.isfinite(hi) else True)
        g = d[mask]
        age_distribution.append({"name": label, "value": int(len(g)), "groups": {k: int(v) for k, v in g.groupby("stem_group").size().items()}})

    regions_by_country: dict[str, list[dict[str, Any]]] = {}
    for code, g in d[d["region"].notna()].groupby("country"):
        rows = []
        for region, rg in g.groupby("region"):
            rows.append({"name": str(region), "value": int(len(rg)), "groups": {k: int(v) for k, v in rg.groupby("stem_group").size().items()}})
        regions_by_country[code] = sorted(rows, key=lambda x: x["value"], reverse=True)

    country_group_matrix = []
    for code, g in d.groupby("country"):
        for group, gg in g.groupby("stem_group"):
            country_group_matrix.append({"country": code, "countryName": country_name(code, lookup), "group": str(group), "value": int(len(gg))})

    treemap = []
    for code, g in d.groupby("country"):
        company_counts = g.groupby("company").size().sort_values(ascending=False).head(24)
        treemap.append({"name": country_name(code, lookup), "code": code, "value": int(len(g)), "children": [{"name": str(k), "value": int(v)} for k, v in company_counts.items() if k]})
    treemap.sort(key=lambda x: x["value"], reverse=True)

    recent_examples = []
    for _, row in d.sort_values("created_dt", ascending=False).head(80).iterrows():
        recent_examples.append({
            "country": row["country"], "countryName": country_name(row["country"], lookup),
            "region": scalar(row["region"]), "group": scalar(row["stem_group"]), "company": scalar(row["company"]),
            "title": scalar(row["title"]), "created": scalar(row["created"]), "intermediaryLikely": bool(row["intermediary_likely"]),
        })

    return {
        "meta": {
            "rows": int(len(d)), "uniqueRows": int(len(dedup)), "duplicatesExact": int(len(d) - len(dedup)),
            "countries": int(d["country"].nunique()), "regions": int(d["region"].nunique(dropna=True)),
            "uniqueCompanies": int(d["company"].nunique(dropna=True)), "uniqueTitles": int(d["title"].nunique(dropna=True)),
            "missingRegionPct": round(float(d["region"].isna().mean() * 100), 2),
            "intermediaryLikely": int(d["intermediary_likely"].sum()),
            "createdMin": scalar(d["created_dt"].min()), "createdMax": scalar(d["created_dt"].max()),
            "snapshot": scalar(snapshot),
            "note": "Индикативная выборка объявлений. Поле company может содержать агентства, платформы и государственные структуры; эвристическая маркировка посредников не является официальной классификацией.",
        },
        "byCountry": by_country,
        "byGroup": group_counts,
        "topCompanies": top_companies[:120],
        "topTitles": top_titles,
        "weekly": weekly,
        "ageDistribution": age_distribution,
        "regionsByCountry": regions_by_country,
        "countryGroupMatrix": country_group_matrix,
        "treemap": treemap,
        "recentExamples": recent_examples,
    }


def source_flow(sources: dict[str, Any]) -> dict[str, Any]:
    nodes = []
    links = []
    for sid, payload in sources.items():
        nodes.append({"name": payload["meta"]["shortTitle"], "category": "source"})
    mids = ["Спрос", "Занятость", "Страна", "Регион", "ENG / ICT / SCI", "HRST / NOC / SOC2010", "Карта", "Тренды", "Профили", "Data Explorer"]
    nodes.extend({"name": x, "category": "layer"} for x in mids)
    for sid, p in sources.items():
        s = p["meta"]["shortTitle"]
        metric = "Спрос" if p["meta"]["metric"] in {"vacancies", "postings"} else "Занятость"
        links.append({"source": s, "target": metric, "value": p["meta"]["rows"]})
        links.append({"source": metric, "target": "Страна", "value": max(p["meta"]["nationalRows"], 1)})
        if p["meta"]["regionalRows"]:
            links.append({"source": metric, "target": "Регион", "value": p["meta"]["regionalRows"]})
        taxonomy = "ENG / ICT / SCI" if sid in {"eures", "adzuna", "eurostat", "bls"} else "HRST / NOC / SOC2010"
        links.append({"source": metric, "target": taxonomy, "value": p["meta"]["rows"]})
    links.extend([
        {"source":"Страна","target":"Карта","value":120},
        {"source":"Регион","target":"Профили","value":1100},
        {"source":"Занятость","target":"Тренды","value":1042},
        {"source":"ENG / ICT / SCI","target":"Data Explorer","value":1600},
        {"source":"HRST / NOC / SOC2010","target":"Data Explorer","value":1100},
    ])
    return {"nodes": nodes, "links": links}


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)

    vacancies = pd.read_parquet(VACANCIES_PATH)
    employment = pd.read_parquet(EMPLOYMENT_PATH)
    companies = pd.read_parquet(COMPANIES_PATH)

    country_lookup, world_simple = load_country_lookup()
    dump_json(DATA / "world_countries.geojson", world_simple)

    all_sources: dict[str, Any] = {}
    for sid in ["eures", "adzuna"]:
        all_sources[sid] = aggregate_fact_source(vacancies, sid, country_lookup)
    for sid in ["eurostat", "eurostat_htec", "bls", "statcan", "uk_nomis"]:
        all_sources[sid] = aggregate_fact_source(employment, sid, country_lookup)

    pressure = build_pressure(all_sources["eures"], all_sources["eurostat"])
    companies_agg = aggregate_companies(companies, country_lookup)

    # Every record becomes browser-accessible. JSON keeps all source columns, including all-null compatibility columns.
    dump_json(DATA / "vacancies.json", records_json(vacancies))
    dump_json(DATA / "employment.json", records_json(employment))
    dump_json(DATA / "companies.json", records_json(companies))
    vacancies.to_csv(DOWNLOADS / "STEM_STRICT_vacancies.csv", index=False)
    employment.to_csv(DOWNLOADS / "STEM_STRICT_employment.csv", index=False)
    companies.to_csv(DOWNLOADS / "STEM_companies_snapshot.csv", index=False)

    # Ensure original files and guide are present even when this script runs in a clean checkout.
    for src, dst in [
        (VACANCIES_PATH, DOWNLOADS / "STEM_STRICT_vacancies.parquet"),
        (EMPLOYMENT_PATH, DOWNLOADS / "STEM_STRICT_employment.parquet"),
        (COMPANIES_PATH, DOWNLOADS / "STEM_companies_snapshot.parquet"),
        (WORLD_PATH, DOWNLOADS / "world_countries.geojson"),
        (GUIDE_PATH, DOWNLOADS / "DASHBOARD_GUIDE.md"),
        (REFERENCE_PATH, ASSETS / "geotalent-reference.png"),
    ]:
        if src.exists() and (not dst.exists() or src.resolve() != dst.resolve()):
            shutil.copy2(src, dst)

    profiles = [
        dataset_profile("vacancies", "STEM STRICT — вакансии и постинги", vacancies, VACANCIES_PATH, "./data/vacancies.json", "./downloads/STEM_STRICT_vacancies.csv", "./downloads/STEM_STRICT_vacancies.parquet"),
        dataset_profile("employment", "STEM STRICT — занятость", employment, EMPLOYMENT_PATH, "./data/employment.json", "./downloads/STEM_STRICT_employment.csv", "./downloads/STEM_STRICT_employment.parquet"),
        dataset_profile("companies", "Adzuna — снимок компаний и объявлений", companies, COMPANIES_PATH, "./data/companies.json", "./downloads/STEM_companies_snapshot.csv", "./downloads/STEM_companies_snapshot.parquet"),
    ]

    vacancy_country_codes = set(vacancies["geo_country"].dropna().map(norm_country))
    employment_country_codes = set(employment["geo_country"].dropna().map(norm_country))
    employment_country_codes.add("GB")
    latest_snapshot = max([str(x) for x in pd.concat([vacancies["snapshot"], employment["snapshot"], companies["snapshot"]]).dropna()])

    coverage_matrix = []
    for sid, payload in all_sources.items():
        meta = payload["meta"]
        coverage_matrix.append({
            "source": sid, "title": meta["shortTitle"], "rows": meta["rows"], "countries": meta["countries"], "regions": meta["regions"],
            "national": meta["nationalRows"] > 0 or sid == "uk_nomis", "regional": meta["regionalRows"] > 0,
            "timeseries": len(meta["periods"]) > 1, "groups": meta["groups"], "periods": meta["periods"],
            "taxonomy": meta["taxonomy"], "unit": meta["originalUnit"], "freshness": meta["freshness"],
        })

    dashboard = {
        "meta": {
            "title": "GeoTalent — глобальная геоаналитика STEM-кадров",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "latestSnapshot": latest_snapshot,
            "dataRows": {
                "vacancies": int(len(vacancies)), "employment": int(len(employment)), "companies": int(len(companies)),
                "total": int(len(vacancies) + len(employment) + len(companies)),
            },
            "coverage": {
                "sourceCount": 7,
                "vacancyCountries": int(len(vacancy_country_codes)),
                "employmentCountries": int(len(employment_country_codes)),
                "vacancyRegions": int(vacancies["geo_region"].dropna().nunique()),
                "employmentRegions": int(employment["geo_region"].dropna().nunique()),
                "companyCountries": int(companies["country"].nunique()),
            },
            "allRecordsAccessible": True,
            "publicSafety": "Персональные идентификаторы проектной команды исключены; STEM-датасеты опубликованы полностью.",
        },
        "countries": country_lookup,
        "sources": all_sources,
        "pressure": pressure,
        "companies": companies_agg,
        "quality": {"datasets": profiles, "coverageMatrix": coverage_matrix},
        "sourceFlow": source_flow(all_sources),
        "project": PROJECT_PUBLIC,
    }
    dump_json(DATA / "dashboard.json", dashboard)
    dump_json(DATA / "project_public.json", PROJECT_PUBLIC)

    public_md = f"""# GeoTalent — публичный паспорт проекта\n\n{PROJECT_PUBLIC['description']}\n\n## Охват демонстрационного международного контура\n\n- 7 первичных источников.\n- {len(vacancies):,} строк спроса.\n- {len(employment):,} строк занятости.\n- {len(companies):,} строк объявлений с компаниями.\n- Все исходные STEM-записи доступны в Data Explorer и в JSON/CSV/Parquet.\n\n## Ограничение публичной версии\n\n{PROJECT_PUBLIC['privacyNote']}\n""".replace(",", " ")
    dossier_path = DOWNLOADS / "PROJECT_DOSSIER_PUBLIC.md"
    dossier_path.write_text(public_md, encoding="utf-8")

    def file_entry(path: Path, href: str, media_type: str) -> dict[str, Any]:
        return {
            "href": href,
            "bytes": int(path.stat().st_size),
            "sha256": sha256(path),
            "mediaType": media_type,
        }

    inventory_datasets = []
    for profile in profiles:
        dataset_id = profile["id"]
        stem = {
            "vacancies": "STEM_STRICT_vacancies",
            "employment": "STEM_STRICT_employment",
            "companies": "STEM_companies_snapshot",
        }[dataset_id]
        inventory_datasets.append({
            "id": dataset_id,
            "title": profile["title"],
            "rows": profile["rows"],
            "columns": profile["columns"],
            "columnNames": profile["columnNames"],
            "duplicatesExact": profile["duplicatesExact"],
            "sourceParquetSha256": profile["sha256"],
            "files": {
                "json": file_entry(DATA / f"{dataset_id}.json", f"./data/{dataset_id}.json", "application/json"),
                "csv": file_entry(DOWNLOADS / f"{stem}.csv", f"./downloads/{stem}.csv", "text/csv"),
                "parquet": file_entry(DOWNLOADS / f"{stem}.parquet", f"./downloads/{stem}.parquet", "application/vnd.apache.parquet"),
            },
        })

    inventory = {
        "schemaVersion": 1,
        "generatedAt": dashboard["meta"]["generatedAt"],
        "scope": {
            "allStemRecordsPublished": True,
            "rows": dashboard["meta"]["dataRows"],
            "sourceCount": dashboard["meta"]["coverage"]["sourceCount"],
            "worldFeatures": len(world_simple["features"]),
            "statement": "100% строк трёх переданных STEM-таблиц доступны в Data Explorer и файлах JSON/CSV/Parquet.",
        },
        "datasets": inventory_datasets,
        "auxiliary": {
            "dashboard": file_entry(DATA / "dashboard.json", "./data/dashboard.json", "application/json"),
            "project": file_entry(DATA / "project_public.json", "./data/project_public.json", "application/json"),
            "worldSimplified": file_entry(DATA / "world_countries.geojson", "./data/world_countries.geojson", "application/geo+json"),
            "worldOriginal": file_entry(DOWNLOADS / "world_countries.geojson", "./downloads/world_countries.geojson", "application/geo+json"),
            "guide": file_entry(DOWNLOADS / "DASHBOARD_GUIDE.md", "./downloads/DASHBOARD_GUIDE.md", "text/markdown"),
            "projectDossier": file_entry(dossier_path, "./downloads/PROJECT_DOSSIER_PUBLIC.md", "text/markdown"),
            "visualReference": file_entry(ASSETS / "geotalent-reference.png", "./assets/geotalent-reference.png", "image/png"),
        },
        "privacy": {
            "publicSourceWorkbookIncluded": False,
            "reason": "Исходная проектная анкета содержит персональные идентификаторы; опубликован публично допустимый структурированный экстракт.",
        },
    }
    dump_json(DOWNLOADS / "DATA_INVENTORY.json", inventory)
    inventory_md = [
        "# GeoTalent — реестр комплектности",
        "",
        f"Сформировано: {inventory['generatedAt']}",
        "",
        "## Полнота",
        "",
        f"Опубликовано {dashboard['meta']['dataRows']['total']:,} строк из трёх STEM-таблиц: "
        f"{len(vacancies):,} строк спроса, {len(employment):,} строк занятости и {len(companies):,} строк компаний и объявлений.".replace(",", " "),
        "",
        "## Контрольные суммы исходных Parquet",
        "",
    ]
    for item in inventory_datasets:
        inventory_md.append(f"- `{item['id']}` — {item['rows']:,} строк; SHA-256 `{item['sourceParquetSha256']}`".replace(",", " "))
    inventory_md.extend([
        "",
        "## Публичный контур",
        "",
        inventory["privacy"]["reason"],
        "",
        "Полный машинно-читаемый реестр находится в `DATA_INVENTORY.json`.",
    ])
    (DOWNLOADS / "DATA_INVENTORY.md").write_text("\n".join(inventory_md) + "\n", encoding="utf-8")

    print(json.dumps({
        "dashboard": str(DATA / "dashboard.json"),
        "inventory": str(DOWNLOADS / "DATA_INVENTORY.json"),
        "rows": dashboard["meta"]["dataRows"],
        "worldFeatures": len(world_simple["features"]),
        "worldBytes": (DATA / "world_countries.geojson").stat().st_size,
        "rawJsonBytes": {name: (DATA / f"{name}.json").stat().st_size for name in ["vacancies", "employment", "companies"]},
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
