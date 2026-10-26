import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { useReveal, formatDate, formatDateTime } from '../utils/hooks';
import './StockMovement.css';

const tabs = ['Stock In', 'Stock Out', 'Transfer', 'Damaged', 'History'];

export default function StockMovement() {
  const { products, warehouses, movements, loading, stockIn, stockOut, transferStock, reportDamaged, getProductStockAt } = useInventory();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Stock In');
  const [form, setForm] = useState({ productId: '', warehouseId: '', toWarehouseId: '', qty: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [ref, revealed] = useReveal();

  const validate = () => {
    const e = {};
    if (!form.productId) e.productId = 'Select a product';
    if (!form.warehouseId) e.warehouseId = 'Select a warehouse';
    if (activeTab === 'Transfer' && !form.toWarehouseId) e.toWarehouseId = 'Select destination';
    if (activeTab === 'Transfer' && form.warehouseId === form.toWarehouseId) e.toWarehouseId = 'Must be different from source';
    if (!form.qty || form.qty <= 0) e.qty = 'Quantity must be positive';
    if (activeTab === 'Damaged' && !form.reason.trim()) e.reason = 'Reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const userName = user?.name || 'System';
    const payload = {
      productId: form.productId,
      warehouseId: form.warehouseId,
      qty: Number(form.qty),
      user: userName,
    };
    if (activeTab === 'Stock In') {
      await stockIn(payload);
    } else if (activeTab === 'Stock Out') {
      await stockOut(payload);
    } else if (activeTab === 'Transfer') {
      await transferStock({ ...payload, fromWarehouseId: form.warehouseId, toWarehouseId: form.toWarehouseId });
    } else if (activeTab === 'Damaged') {
      await reportDamaged({ ...payload, reason: form.reason });
    }
    setForm({ productId: '', warehouseId: '', toWarehouseId: '', qty: '', reason: '' });
  };

  const filteredMovements = movements.filter((m) => {
    if (activeTab === 'History') return true;
    return m.type === activeTab;
  });

  const movementColumns = [
    {
      key: 'type', label: 'Type',
      render: (row) => {
        const variant = { 'Stock In': 'success', 'Stock Out': 'danger', 'Transfer': 'teal', 'Damaged': 'warning' }[row.type] || 'muted';
        return <Badge variant={variant}>{row.type}</Badge>;
      },
    },
    { key: 'product', label: 'Product', render: (row) => products.find((p) => p.id === row.productId)?.name || '—' },
    { key: 'warehouse', label: 'Warehouse', render: (row) => {
      if (row.type === 'Transfer') {
        const from = warehouses.find((w) => w.id === row.fromWarehouseId)?.name || '—';
        const to = warehouses.find((w) => w.id === row.toWarehouseId)?.name || '—';
        return `${from} → ${to}`;
      }
      return warehouses.find((w) => w.id === row.warehouseId)?.name || '—';
    }},
    { key: 'qty', label: 'Qty', render: (row) => <span style={{ fontWeight: 600 }}>{row.qty}</span> },
    { key: 'user', label: 'User' },
    { key: 'note', label: 'Note', render: (row) => <span className="text-muted">{row.note || '—'}</span> },
    { key: 'date', label: 'Date', render: (row) => formatDateTime(row.date) },
  ];

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Stock Movement</h1>
        <p>Record stock in, out, transfers, and damaged goods</p>
      </div>

      {/* Tabs */}
      <div className="sm-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`sm-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setErrors({}); }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab !== 'History' ? (
        <div ref={ref} className={`card reveal ${revealed ? 'revealed' : ''}`} style={{ maxWidth: 600 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">— Select product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
              </select>
              {errors.productId && <div className="form-error">{errors.productId}</div>}
            </div>

            {activeTab === 'Transfer' ? (
              <>
                <div className="form-group">
                  <label className="form-label">From Warehouse</label>
                  <select className="form-select" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                    <option value="">— Select source —</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {errors.warehouseId && <div className="form-error">{errors.warehouseId}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">To Warehouse</label>
                  <select className="form-select" value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
                    <option value="">— Select destination —</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {errors.toWarehouseId && <div className="form-error">{errors.toWarehouseId}</div>}
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Warehouse</label>
                <select className="form-select" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                  <option value="">— Select warehouse —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {errors.warehouseId && <div className="form-error">{errors.warehouseId}</div>}
              </div>
            )}

            {form.productId && form.warehouseId && activeTab !== 'Stock In' && (
              <div className="sm-current-stock">
                Current stock: <strong>{getProductStockAt(form.productId, form.warehouseId)}</strong> units
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" className="form-input" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="e.g. 50" />
              {errors.qty && <div className="form-error">{errors.qty}</div>}
            </div>

            {activeTab === 'Damaged' && (
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Water damage" />
                {errors.reason && <div className="form-error">{errors.reason}</div>}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              Record {activeTab}
            </button>
          </form>
        </div>
      ) : (
        <div ref={ref} className={`reveal ${revealed ? 'revealed' : ''}`}>
          <DataTable
            columns={movementColumns}
            data={filteredMovements}
            searchable
            searchKeys={['note', 'user']}
            sortable
            filterable
            filterKey="type"
            filterOptions={['Stock In', 'Stock Out', 'Transfer', 'Damaged']}
            emptyMessage="No movements found"
          />
        </div>
      )}
    </div>
  );
}
