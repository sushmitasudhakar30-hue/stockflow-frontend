import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import KpiCard from '../../components/KpiCard';
import { formatINR, formatNumber, formatDate } from '../../utils/hooks';
import { downloadCSV } from '../../utils/csv';

/* Completed (received) purchases, with supplier-wise totals */
export default function PurchaseHistory() {
  const { suppliers, purchaseOrders, products, loading } = useInventory();
  const [supplierId, setSupplierId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const getSupplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';
  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;
  const unitsOf = (po) => (po.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);

  const received = useMemo(() => purchaseOrders
    .filter((po) => po.status === 'Received')
    .filter((po) => supplierId === 'all' || po.supplierId === supplierId)
    .filter((po) => (!dateFrom || po.date >= dateFrom) && (!dateTo || po.date <= dateTo))
    .sort((a, b) => (a.date < b.date ? 1 : -1)), [purchaseOrders, supplierId, dateFrom, dateTo]);

  const bySupplier = useMemo(() => {
    const map = {};
    received.forEach((po) => {
      const m = (map[po.supplierId] ||= { id: po.supplierId, orders: 0, units: 0, value: 0, last: null });
      m.orders += 1;
      m.units += unitsOf(po);
      m.value += Number(po.total) || 0;
      if (!m.last || po.date > m.last) m.last = po.date;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [received]);

  const totalValue = received.reduce((s, po) => s + (Number(po.total) || 0), 0);
  const totalUnits = received.reduce((s, po) => s + unitsOf(po), 0);

  const exportCSV = () => downloadCSV('purchase-history',
    ['PO Number', 'Supplier', 'Date', 'Items', 'Units', 'Total'],
    received.map((po) => [po.poNumber, getSupplierName(po.supplierId), po.date,
      po.items.map((i) => `${getProductName(i.productId)} x${i.qty}`).join('; '), unitsOf(po), po.total]));

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />;

  return (
    <div className="page-fade">
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="reports-filters" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">Supplier</label>
            <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={exportCSV} disabled={received.length === 0}>Download CSV</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Orders Received" value={received.length} variant="success" icon="✓" />
        <KpiCard label="Units Received" value={totalUnits} variant="primary" icon="📦" delay={80} />
        <KpiCard label="Total Purchased" value={totalValue} type="currency" variant="amber" icon="₹" delay={160} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Supplier-wise Summary</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Supplier</th><th className="text-right">Orders</th><th className="text-right">Units</th><th className="text-right">Total Value</th><th>Last Purchase</th></tr>
            </thead>
            <tbody>
              {bySupplier.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{getSupplierName(r.id)}</td>
                  <td className="text-right">{r.orders}</td>
                  <td className="text-right">{formatNumber(r.units)}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>{formatINR(r.value)}</td>
                  <td className="text-muted">{formatDate(r.last)}</td>
                </tr>
              ))}
              {bySupplier.length === 0 && <tr><td colSpan={5}><div className="empty-state">No received purchases found</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Purchase History</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Items</th><th className="text-right">Units</th><th className="text-right">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {received.map((po) => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                  <td>{getSupplierName(po.supplierId)}</td>
                  <td className="text-muted">{formatDate(po.date)}</td>
                  <td>{po.items.map((i) => `${getProductName(i.productId)} ×${i.qty}`).join(', ')}</td>
                  <td className="text-right">{unitsOf(po)}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>{formatINR(po.total)}</td>
                  <td><Badge variant="success">Received</Badge></td>
                </tr>
              ))}
              {received.length === 0 && <tr><td colSpan={7}><div className="empty-state">No received purchases found</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
