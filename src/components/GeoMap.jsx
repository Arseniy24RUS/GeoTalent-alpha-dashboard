import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../lib/format.js';

const MAP_NAME = 'geotalent-world';
let mapRegistered = false;
let mapPromise = null;

function ensureMap() {
  if (mapRegistered) return Promise.resolve();
  if (!mapPromise) {
    mapPromise = fetch('./data/world_countries.geojson')
      .then((response) => {
        if (!response.ok) throw new Error(`GeoJSON: HTTP ${response.status}`);
        return response.json();
      })
      .then((geojson) => {
        geojson.features.forEach((feature) => {
          feature.properties.displayName = feature.properties.name_ru || feature.properties.name || feature.properties.name_en;
          feature.properties.name = feature.properties.iso2 || feature.properties.iso3 || feature.properties.name;
        });
        echarts.registerMap(MAP_NAME, geojson);
        mapRegistered = true;
      });
  }
  return mapPromise;
}

export default function GeoMap({ rows, selectedCountry, onSelect, metricLabel, unitLabel, height = 560 }) {
  const rootRef = useRef(null);
  const chartRef = useRef(null);
  const [ready, setReady] = useState(mapRegistered);
  const names = useMemo(() => Object.fromEntries(rows.map((row) => [row.code, row.name])), [rows]);

  useEffect(() => {
    ensureMap().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return undefined;
    const chart = echarts.init(rootRef.current, null, { renderer: 'canvas' });
    chartRef.current = chart;
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(rootRef.current);
    const click = (params) => {
      if (params.componentType === 'series' && params.name) onSelect?.(params.name);
    };
    chart.on('click', click);
    return () => {
      chart.off('click', click);
      resize.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [ready, onSelect]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const values = rows.map((row) => Number(row.value ?? row.total ?? 0)).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 1;
    const data = rows.map((row) => ({
      name: row.code,
      value: Number(row.value ?? row.total ?? 0),
      itemStyle: row.code === selectedCountry ? { borderColor: '#0A132D', borderWidth: 2.2 } : undefined,
      emphasis: { itemStyle: { borderColor: '#0A132D', borderWidth: 1.8 } },
    }));

    chart.setOption({
      animationDurationUpdate: 420,
      aria: { enabled: true, description: `${metricLabel}. Интерактивная карта стран.` },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#0A132D',
        borderWidth: 0,
        textStyle: { color: '#FFFFFF', fontFamily: 'Onest, Arial, sans-serif' },
        formatter: (params) => {
          const label = names[params.name] || params.data?.displayName || params.name;
          const value = params.value;
          if (value === undefined || value === '-' || Number.isNaN(Number(value))) return `<strong>${label}</strong><br/><span style="opacity:.7">Нет данных</span>`;
          return `<strong>${label}</strong><br/>${metricLabel}: <b>${formatNumber(value)}</b> ${unitLabel}`;
        },
      },
      visualMap: {
        min: 0,
        max,
        orient: 'horizontal',
        left: 24,
        bottom: 14,
        itemWidth: 110,
        itemHeight: 7,
        calculable: false,
        text: [formatNumber(max), '0'],
        textGap: 8,
        textStyle: { color: '#3D4A60', fontFamily: 'Onest, Arial, sans-serif', fontSize: 11 },
        inRange: { color: ['#EEF3F9', '#A7DBD6', '#6280D9', '#2947A0', '#192F70'] },
        outOfRange: { color: '#F4F6FA' },
      },
      series: [{
        type: 'map',
        map: MAP_NAME,
        data,
        roam: true,
        scaleLimit: { min: 1, max: 7 },
        selectedMode: false,
        nameProperty: 'name',
        itemStyle: { areaColor: '#F4F6FA', borderColor: '#FFFFFF', borderWidth: 0.7 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: '#539D96' } },
        select: { label: { show: false } },
      }],
    }, { notMerge: true });
  }, [rows, selectedCountry, metricLabel, unitLabel, ready, names]);

  return (
    <div className="geo-map-wrap" style={{ minHeight: height }}>
      {!ready && <div className="map-loading">Загрузка геометрии карты…</div>}
      <div ref={rootRef} className="geo-map" style={{ height }} aria-label={`${metricLabel}: карта стран`} />
    </div>
  );
}
