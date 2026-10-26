import { useCountUp, formatINR, formatNumber } from '../utils/hooks';
import './KpiCard.css';

export default function KpiCard({ label, value, type = 'number', icon, variant = 'primary', delay = 0 }) {
  const [displayValue, ref] = useCountUp(type === 'currency' ? Math.round(value) : value);

  const formatted = type === 'currency'
    ? formatINR(displayValue)
    : formatNumber(displayValue);

  return (
    <div
      ref={ref}
      className={`kpi-card kpi-${variant}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{formatted}</span>
      </div>
    </div>
  );
}
