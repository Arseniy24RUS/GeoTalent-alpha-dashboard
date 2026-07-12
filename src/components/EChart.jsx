import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function EChart({ option, className = '', height = 360, onEvents = {}, ariaLabel }) {
  const rootRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    const chart = echarts.init(rootRef.current, null, { renderer: 'canvas' });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !option) return;
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const entries = Object.entries(onEvents || {});
    entries.forEach(([eventName, handler]) => chart.on(eventName, handler));
    return () => entries.forEach(([eventName, handler]) => chart.off(eventName, handler));
  }, [onEvents]);

  return (
    <div
      ref={rootRef}
      className={`echart ${className}`}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
