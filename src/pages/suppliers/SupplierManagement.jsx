import { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import KpiCard from '../../components/KpiCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useReveal, formatINR, formatDate } from '../../utils/hooks';
import '../Suppliers.css';

const EMPTY_FORM = { name: '', contactPerson: '', email: '', phone: '', address: '' };

export default function SupplierManagement() {
  const { suppliers, purchaseOrders, products, loading, addSupplier, updateSupplier, deleteSupplier } = useInventory();
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [ref, revealed] = useReveal();

  // Per-supplier PO stats
  const stats = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => { map[s.id] = { count: 0, pending: 0, spend: 0, last: null }; });
    purchaseOrders.forEach((po) => {
      const m = map[po.supplierId];
      if (!m) return;
      m.count += 1;
      if (po.status === 'Pending') m.pending += 1;
      m.spend += Number(po.total) || 0;
      if (!m.last || po.date > m.last) m.last = po.date;
    });
    return map;
  }, [suppliers, purchaseOrders]);

  const filtered = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.contactPerson, s.email, s.phone, s.address].some((v) => (v || '').toLowerCase().includes(q));
  });

  const totalSpend = purchaseOrders.reduce((sum, po) => sum + (Number(po.total) || 0), 0);
  const openPOs = purchaseOrders.filter((po) => po.status === 'Pending').length;

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setErrors({}); setFormOpen(true); };
  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name || '', contactPerson: s.contactPerson || '', email: s.email || '', phone: s.phone || '', address: s.address || '' });
    setErrors({});
    setDetail(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (suppliers.some((s) => s.id !== editingId && s.name.trim().toLowerCase() === form.name.trim().toLowerCase())) e.name = 'A supplier with this name already exists';
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.phone.trim() && !/^[+\d][\d\s()-]{6,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      name: form.name.trim(), contactPerson: form.contactPerson.trim(),
      email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
    };
    setSaving(true);
    try {
      if (editingId) await updateSupplier(editingId, payload);
      else await addSupplier(payload);
      setFormOpen(false);
    } catch (err) {
      setErrors({ form: err.message || 'Could not save supplier' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteSupplier(toDelete.id);
    setDeleting(false);
    if (res.success) { setToDelete(null); setDetail(null); }
    else setToDelete(null);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  const detailPOs = detail ? purchaseOrders.filter((po) => po.supplierId === detail.id) : [];

  return (
    <div className="page-fade">
      {canEdit && (
        <div className="supplier-toolbar" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add Supplier
          </button>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Total Suppliers" value={suppliers.length} variant="primary" icon="🏭" delay={0} />
        <KpiCard label="Open Purchase Orders" value={openPOs} variant="warning" icon="📦" delay={80} />
        <KpiCard label="Total PO Value" value={totalSpend} type="currency" variant="success" icon="₹" delay={160} />
      </div>

      <div className="supplier-toolbar">
        <input
          className="form-input"
          placeholder="Search by name, contact, email, phone or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search suppliers"
        />
        <span className="text-muted supplier-count">{filtered.length} of {suppliers.length}</span>
      </div>

      <div ref={ref} className={`supplier-grid reveal ${revealed ? 'revealed' : ''}`}>
        {filtered.map((s, i) => {
          const st = stats[s.id] || { count: 0, pending: 0, spend: 0 };
          return (
            <div key={s.id} className="card supplier-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="supplier-avatar">{s.name.charAt(0).toUpperCase()}</div>
              <div className="supplier-info">
                <div className="supplier-head">
                  <h3 className="supplier-name">{s.name}</h3>
                  {st.pending > 0 && <Badge variant="warning">{st.pending} pending</Badge>}
                </div>
                <p className="supplier-contact">{s.contactPerson}{s.phone ? ` · ${s.phone}` : ''}</p>
                <p className="supplier-email">{s.email}</p>
                <p className="supplier-addr text-muted">{s.address}</p>
                <div className="supplier-metrics">
                  <span><strong>{st.count}</strong> POs</span>
                  <span><strong>{formatINR(st.spend)}</strong> total</span>
                </div>
                <div className="supplier-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetail(s)}>View</button>
                  {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>}
                  {canEdit && <button className="btn btn-danger btn-sm" onClick={() => setToDelete(s)}>Delete</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="card"><div className="empty-state">{suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers match your search'}</div></div>
      )}

      {/* Add / edit */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingId ? 'Edit Supplier' : 'Add Supplier'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add'}</button>
        </>}
      >
        {errors.form && <div className="form-error" style={{ marginBottom: 12 }}>{errors.form}</div>}
        <div className="form-group">
          <label className="form-label">Supplier Name</label>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Acme Traders" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Contact Person</label>
          <input className="form-input" value={form.contactPerson} onChange={set('contactPerson')} placeholder="e.g. Ravi Kumar" />
          {errors.contactPerson && <div className="form-error">{errors.contactPerson}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={form.email} onChange={set('email')} placeholder="name@company.com" />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          {errors.phone && <div className="form-error">{errors.phone}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="form-input" value={form.address} onChange={set('address')} placeholder="Street, city, state" />
        </div>
      </Modal>

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name || ''}
        size="lg"
        footer={<>
          {canEdit && detail && <button className="btn btn-ghost" onClick={() => openEdit(detail)}>Edit</button>}
          <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
        </>}
      >
        {detail && (
          <>
            <div className="supplier-detail-grid">
              <div><span className="wh-stat-label">Contact</span><div>{detail.contactPerson || '—'}</div></div>
              <div><span className="wh-stat-label">Phone</span><div>{detail.phone || '—'}</div></div>
              <div><span className="wh-stat-label">Email</span><div>{detail.email || '—'}</div></div>
              <div><span className="wh-stat-label">Address</span><div>{detail.address || '—'}</div></div>
            </div>
            <h4 style={{ margin: '16px 0 8px' }}>Purchase history</h4>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>PO Number</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {detailPOs.map((po) => (
                    <tr key={po.id}>
                      <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                      <td className="text-muted">{formatDate(po.date)}</td>
                      <td>{po.items.map((it) => `${getProductName(it.productId)} ×${it.qty}`).join(', ')}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(po.total)}</td>
                      <td><Badge variant={po.status === 'Received' ? 'success' : 'warning'}>{po.status}</Badge></td>
                    </tr>
                  ))}
                  {detailPOs.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state">No purchase orders for this supplier</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete supplier?"
        message={`"${toDelete?.name}" will be removed permanently. Suppliers with purchase orders cannot be deleted.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
