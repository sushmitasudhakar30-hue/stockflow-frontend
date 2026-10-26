import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { formatINR, formatNumber, formatDate, getStockStatus } from '../../utils/hooks';
import { downloadCSV } from '../../utils/csv';
import { FilterBar, Field, DateRange, ReportTable, inRange } from './shared';

export default function StockReport() {
  const { products, movements, warehouses } = useInventory();
  const [warehouseId, setWarehouseId] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const stockRows = useMemo(() => products
    .filter((p) => category === 'all' || p.category === category)
    .map((p) => {
      const qty = warehouseId === 'all'
        ? Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0)
        : p.warehouseStock?.[warehouseId] || 0;
      const reorder = p.reorderLevel ?? p.reorder_level ?? 0;
      const st = getStockStatus(qty, reorder);
      return { id: p.id, sku: p.sku, name: p.name, category: p.category, qty, reorder, st, value: qty * (Number(p.price) || 0) };
    })
    .filter((r) => status === 'all' || r.st.label === status)
    .sort((a, b) => a.name.localeCompare(b.name)), [products, warehouseId, category, status]);

  const moves = useMemo(() => movements.filter((m) => {
    if (!inRange(m.date, dateFrom, dateTo)) return false;
    return warehouseId === 'all' || m.warehouseId === warehouseId || m.fromWarehouseId === warehouseId || m.toWarehouseId === warehouseId;
  }), [movements, dateFrom, dateTo, warehouseId]);

  const sum = (type) => moves.filter((m) => m.type === type).reduce((s, m) => s + m.qty, 0);
  const totalUnits = stockRows.reduce((s, r) => s + r.qty, 0);
  const totalValue = stockRows.reduce((s, r) => s + r.value, 0);
  const attention = stockRows.filter((r) => r.st.label !== 'In stock').length;
  const productName = (id) => products.find((p) => p.id === id)?.name || '—';

  const exportCSV = () => downloadCSV('stock-report',
    ['SKU', 'Product', 'Category', 'Quantity', 'Reorder Level', 'Status', 'Stock Value'],
    stockRows.map((r) => [r.sku, r.name, r.category, r.qty, r.reorder, r.st.label, r.value]));

  return (
    <div className="page-fade">
      <FilterBar onExport={exportCSV} canExport={stockRows.length > 0}>
        <Field label="Warehouse">
          <select className="form-select" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option>In stock</option><option>Low stock</option><option>Out of stock</option>
          </select>
        </Field>
        <DateRange from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
      </FilterBar>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Products" value={stockRows.length} variant="primary" icon="📦" />
        <KpiCard label="Units in Stock" value={totalUnits} variant="teal" icon="#" delay={80} />
        <KpiCard label="Stock Value" value={totalValue} type="currency" variant="success" icon="₹" delay={160} />
        <KpiCard label="Low / Out of Stock" value={attention} variant="danger" icon="!" delay={240} />
      </div>

      <ReportTable
        title="Current Stock Levels"
        rows={stockRows}
        columns={[
          { label: 'SKU', render: (r) => r.sku },
          { label: 'Product', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          { label: 'Category', render: (r) => r.category },
          { label: 'Qty', right: true, render: (r) => formatNumber(r.qty) },
          { label: 'Reorder At', right: true, render: (r) => r.reorder },
          { label: 'Status', render: (r) => <Badge variant={r.st.variant}>{r.st.label}</Badge> },
          { label: 'Value', right: true, render: (r) => formatINR(r.value) },
        ]}
      />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Stock In (units)" value={sum('Stock In')} variant="success" icon="↓" />
        <KpiCard label="Stock Out (units)" value={sum('Stock Out')} variant="danger" icon="↑" delay={80} />
        <KpiCard label="Damaged (units)" value={sum('Damaged')} variant="amber" icon="!" delay={160} />
        <KpiCard label="Transfers" value={moves.filter((m) => m.type === 'Transfer').length} variant="primary" icon="⇄" delay={240} />
      </div>

      <ReportTable
        title="Stock Movements"
        rows={moves}
        columns={[
          { label: 'Date', render: (m) => <span className="text-muted">{formatDate(m.date)}</span> },
          { label: 'Type', render: (m) => <Badge variant="muted">{m.type}</Badge> },
          { label: 'Product', render: (m) => productName(m.productId) },
          { label: 'Reference', render: (m) => m.note || m.id },
          { label: 'Qty', right: true, render: (m) => m.qty },
        ]}
      />
    </div>
  );
}
