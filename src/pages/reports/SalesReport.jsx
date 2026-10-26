import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { formatINR, formatNumber, formatDate } from '../../utils/hooks';
import { downloadCSV } from '../../utils/csv';
import { FilterBar, Field, DateRange, ReportTable, inRange } from './shared';

const NON_REVENUE = ['Cancelled', 'Returned'];
const statusVariant = (s) => (s === 'Delivered' ? 'success' : NON_REVENUE.includes(s) ? 'danger' : s === 'Pending' ? 'warning' : 'primary');

export default function SalesReport() {
  const { salesOrders, products } = useInventory();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('all');

  const statuses = useMemo(() => [...new Set(salesOrders.map((o) => o.status))], [salesOrders]);
  const orders = useMemo(() => salesOrders
    .filter((o) => inRange(o.date, dateFrom, dateTo) && (status === 'all' || o.status === status)),
  [salesOrders, dateFrom, dateTo, status]);

  const units = (o) => (o.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const counted = orders.filter((o) => !NON_REVENUE.includes(o.status));
  const revenue = counted.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const unitsSold = counted.reduce((s, o) => s + units(o), 0);

  const topProducts = useMemo(() => {
    const map = {};
    counted.forEach((o) => (o.items || []).forEach((i) => {
      const price = Number(i.price) || products.find((p) => p.id === i.productId)?.price || 0;
      const m = (map[i.productId] ||= { id: i.productId, units: 0, revenue: 0 });
      m.units += Number(i.qty) || 0;
      m.revenue += (Number(i.qty) || 0) * price;
    }));
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 10);
  }, [counted, products]);

  const productName = (id) => products.find((p) => p.id === id)?.name || id;

  const exportCSV = () => downloadCSV('sales-report',
    ['Order', 'Date', 'Customer', 'Units', 'Total', 'Status'],
    orders.map((o) => [o.orderNumber, o.date, o.customer, units(o), o.total, o.status]));

  return (
    <div className="page-fade">
      <FilterBar onExport={exportCSV} canExport={orders.length > 0}>
        <DateRange from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
        <Field label="Status">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </FilterBar>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Revenue" value={revenue} type="currency" variant="primary" icon="₹" />
        <KpiCard label="Orders" value={orders.length} variant="teal" icon="#" delay={80} />
        <KpiCard label="Units Sold" value={unitsSold} variant="amber" icon="📦" delay={160} />
        <KpiCard label="Delivered" value={orders.filter((o) => o.status === 'Delivered').length} variant="success" icon="✓" delay={240} />
      </div>
      <p className="text-muted" style={{ fontSize: '0.75rem', margin: '-8px 0 16px' }}>Revenue and units exclude cancelled and returned orders.</p>

      <ReportTable
        title="Top Selling Products"
        rows={topProducts}
        columns={[
          { label: 'Product', render: (r) => <span style={{ fontWeight: 600 }}>{productName(r.id)}</span> },
          { label: 'Units Sold', right: true, render: (r) => formatNumber(r.units) },
          { label: 'Revenue', right: true, render: (r) => formatINR(r.revenue) },
        ]}
      />

      <ReportTable
        title="Sales Orders"
        rows={orders}
        columns={[
          { label: 'Order', render: (o) => <span style={{ fontWeight: 600 }}>{o.orderNumber}</span> },
          { label: 'Date', render: (o) => <span className="text-muted">{formatDate(o.date)}</span> },
          { label: 'Customer', render: (o) => o.customer },
          { label: 'Units', right: true, render: (o) => units(o) },
          { label: 'Total', right: true, render: (o) => formatINR(o.total) },
          { label: 'Status', render: (o) => <Badge variant={statusVariant(o.status)}>{o.status}</Badge> },
        ]}
      />
    </div>
  );
}
