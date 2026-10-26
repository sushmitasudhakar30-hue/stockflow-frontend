import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { formatINR, formatNumber, formatDate } from '../../utils/hooks';
import { downloadCSV } from '../../utils/csv';
import { FilterBar, Field, DateRange, ReportTable, inRange } from './shared';

export default function PurchaseReport() {
  const { purchaseOrders, suppliers, products } = useInventory();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierId, setSupplierId] = useState('all');
  const [status, setStatus] = useState('all');

  const orders = useMemo(() => purchaseOrders.filter((po) =>
    inRange(po.date, dateFrom, dateTo)
    && (supplierId === 'all' || po.supplierId === supplierId)
    && (status === 'all' || po.status === status)), [purchaseOrders, dateFrom, dateTo, supplierId, status]);

  const units = (po) => (po.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const val = (po) => Number(po.total) || 0;
  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';
  const productName = (id) => products.find((p) => p.id === id)?.name || id;

  const bySupplier = useMemo(() => {
    const map = {};
    orders.forEach((po) => {
      const m = (map[po.supplierId] ||= { id: po.supplierId, orders: 0, pending: 0, units: 0, value: 0 });
      m.orders += 1;
      if (po.status === 'Pending') m.pending += 1;
      m.units += units(po);
      m.value += val(po);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [orders]);

  const pending = orders.filter((po) => po.status === 'Pending');

  const exportCSV = () => downloadCSV('purchase-report',
    ['PO Number', 'Supplier', 'Date', 'Items', 'Units', 'Total', 'Status'],
    orders.map((po) => [po.poNumber, supplierName(po.supplierId), po.date,
      po.items.map((i) => `${productName(i.productId)} x${i.qty}`).join('; '), units(po), po.total, po.status]));

  return (
    <div className="page-fade">
      <FilterBar onExport={exportCSV} canExport={orders.length > 0}>
        <DateRange from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
        <Field label="Supplier">
          <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option><option>Pending</option><option>Received</option>
          </select>
        </Field>
      </FilterBar>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Total PO Value" value={orders.reduce((s, po) => s + val(po), 0)} type="currency" variant="primary" icon="₹" />
        <KpiCard label="Purchase Orders" value={orders.length} variant="teal" icon="#" delay={80} />
        <KpiCard label="Pending Value" value={pending.reduce((s, po) => s + val(po), 0)} type="currency" variant="amber" icon="⏳" delay={160} />
        <KpiCard label="Units Ordered" value={orders.reduce((s, po) => s + units(po), 0)} variant="success" icon="📦" delay={240} />
      </div>

      <ReportTable
        title="Purchases by Supplier"
        rows={bySupplier}
        columns={[
          { label: 'Supplier', render: (r) => <span style={{ fontWeight: 600 }}>{supplierName(r.id)}</span> },
          { label: 'Orders', right: true, render: (r) => r.orders },
          { label: 'Pending', right: true, render: (r) => r.pending },
          { label: 'Units', right: true, render: (r) => formatNumber(r.units) },
          { label: 'Total Value', right: true, render: (r) => formatINR(r.value) },
        ]}
      />

      <ReportTable
        title="Purchase Orders"
        rows={orders}
        columns={[
          { label: 'PO Number', render: (po) => <span style={{ fontWeight: 600 }}>{po.poNumber}</span> },
          { label: 'Supplier', render: (po) => supplierName(po.supplierId) },
          { label: 'Date', render: (po) => <span className="text-muted">{formatDate(po.date)}</span> },
          { label: 'Units', right: true, render: (po) => units(po) },
          { label: 'Total', right: true, render: (po) => formatINR(po.total) },
          { label: 'Status', render: (po) => <Badge variant={po.status === 'Received' ? 'success' : 'warning'}>{po.status}</Badge> },
        ]}
      />
    </div>
  );
}
