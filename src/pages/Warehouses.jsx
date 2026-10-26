import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useReveal, formatNumber } from '../utils/hooks';
import './Warehouses.css';

export default function Warehouses() {
  const { warehouses, products, loading, addWarehouse, addLocation, getProductTotalStock } = useInventory();
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';

  const [whModalOpen, setWhModalOpen] = useState(false);
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [selectedWh, setSelectedWh] = useState(null);
  const [whForm, setWhForm] = useState({ name: '', location: '', capacity: '' });
  const [locForm, setLocForm] = useState({ rack: '', bin: '', productSku: '', quantity: '' });
  const [errors, setErrors] = useState({});
  const [ref, revealed] = useReveal();

  const getWarehouseTotal = (wh) => {
    return products.reduce((sum, p) => sum + (p.warehouseStock?.[wh.id] || 0), 0);
  };

  const handleAddWarehouse = async () => {
    const e = {};
    if (!whForm.name.trim()) e.name = 'Name is required';
    if (!whForm.location.trim()) e.location = 'Location is required';
    if (!whForm.capacity || whForm.capacity <= 0) e.capacity = 'Capacity must be positive';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await addWarehouse({ name: whForm.name, location: whForm.location, capacity: Number(whForm.capacity) });
    setWhModalOpen(false);
    setWhForm({ name: '', location: '', capacity: '' });
  };

  const handleAddLocation = async () => {
    const e = {};
    if (!locForm.rack.trim()) e.rack = 'Rack is required';
    if (!locForm.bin.trim()) e.bin = 'Bin is required';
    if (!locForm.quantity || locForm.quantity < 0) e.quantity = 'Quantity must be >= 0';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await addLocation(selectedWh.id, { rack: locForm.rack, bin: locForm.bin, productSku: locForm.productSku || '—', quantity: Number(locForm.quantity) });
    setLocModalOpen(false);
    setLocForm({ rack: '', bin: '', productSku: '', quantity: '' });
  };

  if (loading) {
    return (
      <div className="page-fade">
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Warehouses</h1>
          <p>Monitor capacity and storage locations across your network</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setErrors({}); setWhModalOpen(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add Warehouse
          </button>
        )}
      </div>

      {/* Warehouse cards */}
      <div ref={ref} className={`warehouse-grid reveal ${revealed ? 'revealed' : ''}`}>
        {warehouses.map((wh, i) => {
          const total = getWarehouseTotal(wh);
          const pct = Math.min((total / wh.capacity) * 100, 100);
          return (
            <div key={wh.id} className="card warehouse-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="warehouse-card-header">
                <div>
                  <h3 className="warehouse-name">{wh.name}</h3>
                  <p className="warehouse-location">{wh.location}</p>
                </div>
                <Badge variant={pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'success'}>
                  {pct.toFixed(0)}% full
                </Badge>
              </div>
              <div className="warehouse-stats">
                <div className="wh-stat">
                  <span className="wh-stat-label">Total Units</span>
                  <span className="wh-stat-value">{formatNumber(total)}</span>
                </div>
                <div className="wh-stat">
                  <span className="wh-stat-label">Capacity</span>
                  <span className="wh-stat-value">{formatNumber(wh.capacity)}</span>
                </div>
                <div className="wh-stat">
                  <span className="wh-stat-label">Locations</span>
                  <span className="wh-stat-value">{wh.locations.length}</span>
                </div>
              </div>
              <div className="capacity-bar-wrap">
                <div className="capacity-bar" style={{ width: `${pct}%` }} />
              </div>
              {canEdit && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%' }}
                  onClick={() => { setSelectedWh(wh); setErrors({}); setLocModalOpen(true); }}>
                  + Add Location
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Location tables */}
      <div style={{ marginTop: 24 }}>
        {warehouses.map((wh) => (
          <div key={wh.id} className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">{wh.name} — Rack & Bin Locations</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rack</th>
                    <th>Bin</th>
                    <th>Product SKU</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {wh.locations.map((loc) => (
                    <tr key={loc.id}>
                      <td><Badge variant="primary">{loc.rack}</Badge></td>
                      <td>{loc.bin}</td>
                      <td>{loc.productSku}</td>
                      <td>{loc.quantity}</td>
                    </tr>
                  ))}
                  {wh.locations.length === 0 && (
                    <tr><td colSpan={4}><div className="empty-state">No locations defined</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Add warehouse modal */}
      <Modal
        open={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title="Add Warehouse"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setWhModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddWarehouse}>Add</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} placeholder="e.g. Mumbai DC" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} placeholder="e.g. Mumbai, Maharashtra" />
          {errors.location && <div className="form-error">{errors.location}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Capacity (units)</label>
          <input type="number" className="form-input" value={whForm.capacity} onChange={(e) => setWhForm({ ...whForm, capacity: e.target.value })} placeholder="e.g. 5000" />
          {errors.capacity && <div className="form-error">{errors.capacity}</div>}
        </div>
      </Modal>

      {/* Add location modal */}
      <Modal
        open={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={`Add Location — ${selectedWh?.name || ''}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setLocModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddLocation}>Add</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Rack</label>
          <input className="form-input" value={locForm.rack} onChange={(e) => setLocForm({ ...locForm, rack: e.target.value })} placeholder="e.g. A3" />
          {errors.rack && <div className="form-error">{errors.rack}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Bin</label>
          <input className="form-input" value={locForm.bin} onChange={(e) => setLocForm({ ...locForm, bin: e.target.value })} placeholder="e.g. 04" />
          {errors.bin && <div className="form-error">{errors.bin}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Product SKU (optional)</label>
          <select className="form-select" value={locForm.productSku} onChange={(e) => setLocForm({ ...locForm, productSku: e.target.value })}>
            <option value="">— Select product —</option>
            {products.map((p) => <option key={p.id} value={p.sku}>{p.sku} — {p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input type="number" className="form-input" value={locForm.quantity} onChange={(e) => setLocForm({ ...locForm, quantity: e.target.value })} placeholder="e.g. 100" />
          {errors.quantity && <div className="form-error">{errors.quantity}</div>}
        </div>
      </Modal>
    </div>
  );
}
