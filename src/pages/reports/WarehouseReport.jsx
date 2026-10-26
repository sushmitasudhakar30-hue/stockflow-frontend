import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { formatINR, formatNumber } from '../../utils/hooks';
import { downloadCSV } from '../../utils/csv';
import { FilterBar, DateRange, ReportTable, inRange } from './shared';

export default function WarehouseReport() {
  const { warehouses, products, movements } = useInventory();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const rows = useMemo(() => warehouses.map((w) => {
    let units = 0, skus = 0, value = 0;
    products.forEach((p) => {
      const q = p.warehouseStock?.[w.id] || 0;
      if (q > 0) { skus += 1; units += q; value += q * (Number(p.price) || 0); }
    });
    const mv = movements.filter((m) => inRange(m.date, dateFrom, dateTo)
      && (m.warehouseId === w.id || m.fromWarehouseId === w.id || m.toWarehouseId === w.id));
    const util = w.capacity ? (units / w.capacity) * 100 : 0;
    return {
      id: w.id, name: w.name, location: w.location, capacity: w.capacity, units, skus, value, util,
      locations: (w.locations || []).length,
      inQty: mv.filter((m) => m.type === 'Stock In' || (m.type === 'Transfer' && m.toWarehouseId === w.id)).reduce((s, m) => s + m.qty, 0),
      outQty: mv.filter((m) => m.type === 'Stock Out' || (m.type === 'Transfer' && m.fromWarehouseId === w.id)).reduce((s, m) => s + m.qty, 0),
      damaged: mv.filter((m) => m.type === 'Damaged').reduce((s, m) => s + m.qty, 0),
    };
  }), [warehouses, products, movements, dateFrom, dateTo]);

  const totalUnits = rows.reduce((s, r) => s + r.units, 0);
  const totalCap = rows.reduce((s, r) => s + (Number(r.capacity) || 0), 0);
  const overall = totalCap ? (totalUnits / totalCap) * 100 : 0;
  const variant = (u) => (u > 80 ? 'danger' : u > 50 ? 'warning' : 'success');

  const exportCSV = () => downloadCSV('warehouse-report',
    ['Warehouse', 'Location', 'Capacity', 'Units', 'Utilization %', 'SKUs', 'Stock Value', 'Locations', 'Units In', 'Units Out', 'Damaged'],
    rows.map((r) => [r.name, r.location, r.capacity, r.units, r.util.toFixed(1), r.skus, r.value, r.locations, r.inQty, r.outQty, r.damaged]));

  return (
    <div className="page-fade">
      <FilterBar onExport={exportCSV} canExport={rows.length > 0}>
        <DateRange from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
      </FilterBar>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Warehouses" value={rows.length} variant="primary" icon="🏭" />
        <KpiCard label="Units Stored" value={totalUnits} variant="teal" icon="#" delay={80} />
        <KpiCard label="Stock Value" value={rows.reduce((s, r) => s + r.value, 0)} type="currency" variant="success" icon="₹" delay={160} />
        <KpiCard label="Capacity Used %" value={Math.round(overall)} variant="amber" icon="%" delay={240} />
      </div>

      <ReportTable
        title="Warehouse Summary"
        rows={rows}
        columns={[
          { label: 'Warehouse', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          { label: 'Location', render: (r) => r.location },
          { label: 'Capacity', right: true, render: (r) => formatNumber(r.capacity) },
          { label: 'Units', right: true, render: (r) => formatNumber(r.units) },
          { label: 'Used', render: (r) => <Badge variant={variant(r.util)}>{r.util.toFixed(0)}%</Badge> },
          { label: 'SKUs', right: true, render: (r) => r.skus },
          { label: 'Value', right: true, render: (r) => formatINR(r.value) },
        ]}
      />

      <ReportTable
        title="Warehouse Activity"
        rows={rows}
        columns={[
          { label: 'Warehouse', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          { label: 'Rack/Bin Locations', right: true, render: (r) => r.locations },
          { label: 'Units In', right: true, render: (r) => formatNumber(r.inQty) },
          { label: 'Units Out', right: true, render: (r) => formatNumber(r.outQty) },
          { label: 'Damaged', right: true, render: (r) => formatNumber(r.damaged) },
        ]}
      />
    </div>
  );
}
