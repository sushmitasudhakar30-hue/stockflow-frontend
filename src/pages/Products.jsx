import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useReveal, formatINR, getStockStatus } from '../utils/hooks';
import './Products.css';

const emptyForm = { sku: '', name: '', category: 'Electronics', price: '', reorderLevel: '' };

export default function Products() {
  const { products, warehouses, loading, addProduct, updateProduct, deleteProduct, getProductTotalStock } = useInventory();
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [ref, revealed] = useReveal();

  const validate = () => {
    const e = {};
    if (!form.sku.trim()) e.sku = 'SKU is required';
    else if (products.some((p) => p.id !== editId && p.sku.toLowerCase() === form.sku.trim().toLowerCase()))
      e.sku = 'SKU already exists';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.price || form.price <= 0) e.price = 'Price must be positive';
    if (!form.reorderLevel || form.reorderLevel < 0) e.reorderLevel = 'Reorder level must be >= 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setForm({ sku: product.sku, name: product.name, category: product.category, price: product.price, reorderLevel: product.reorderLevel });
    setEditId(product.id);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = { ...form, price: Number(form.price), reorderLevel: Number(form.reorderLevel) };
    if (editId) {
      await updateProduct(editId, data);
    } else {
      await addProduct(data);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) await deleteProduct(id);
  };

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true, render: (row) => <Badge variant="muted">{row.category}</Badge> },
    { key: 'price', label: 'Price', sortable: true, render: (row) => formatINR(row.price) },
    {
      key: 'totalStock', label: 'Total Stock', sortable: true,
      render: (row) => {
        const total = getProductTotalStock(row);
        return <span style={{ fontWeight: 600 }}>{total}</span>;
      },
    },
    { key: 'reorderLevel', label: 'Reorder Level', sortable: true },
    {
      key: 'status', label: 'Status',
      render: (row) => {
        const status = getStockStatus(getProductTotalStock(row), row.reorderLevel);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
  ];

  const renderExpanded = (product) => (
    <div className="expanded-stock-grid">
      <h4 style={{ marginBottom: 12, fontSize: '0.85rem' }}>Stock per Warehouse</h4>
      <div className="warehouse-stock-list">
        {warehouses.map((w) => (
          <div key={w.id} className="warehouse-stock-item">
            <span className="ws-name">{w.name}</span>
            <span className="ws-qty">{product.warehouseStock?.[w.id] || 0} units</span>
          </div>
        ))}
      </div>
    </div>
  );

  const actions = canEdit ? (row) => (
    <div className="flex gap-8">
      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openEdit(row); }} aria-label="Edit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
      </button>
      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} aria-label="Delete" style={{ color: 'var(--danger)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
      </button>
    </div>
  ) : null;

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
          <h1>Inventory</h1>
          <p>Manage your product catalog and stock levels</p>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Product
        </button>}
      </div>

      <div ref={ref} className={`reveal ${revealed ? 'revealed' : ''}`}>
        <DataTable
          columns={columns}
          data={products}
          searchable
          searchKeys={['sku', 'name', 'category']}
          sortable
          filterable
          filterKey="category"
          filterOptions={['Electronics', 'Apparel', 'Food & Beverage', 'Office Supplies']}
          emptyMessage="No products found"
          renderExpandedRow={renderExpanded}
          actions={actions}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Product' : 'Add Product'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="sku">SKU</label>
            <input id="sku" className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. ELEC-004" />
            {errors.sku && <div className="form-error">{errors.sku}</div>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Product Name</label>
            <input id="name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Keyboard" />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <select id="category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Electronics</option>
              <option>Apparel</option>
              <option>Food & Beverage</option>
              <option>Office Supplies</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="price">Price (₹)</label>
            <input id="price" type="number" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 599" />
            {errors.price && <div className="form-error">{errors.price}</div>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reorderLevel">Reorder Level</label>
            <input id="reorderLevel" type="number" className="form-input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} placeholder="e.g. 50" />
            {errors.reorderLevel && <div className="form-error">{errors.reorderLevel}</div>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
