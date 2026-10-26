import { useState, useEffect } from 'react';
import { orderApi } from '../api/orderApi';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useReveal, formatDate } from '../utils/hooks';
import { useToast } from '../components/Toast';
import './Users.css';

const emptyForm = { name: '', email: '', password: '', role: 'Inventory Staff' };

const roleVariant = {
  Admin: 'danger',
  'Warehouse Manager': 'primary',
  'Inventory Staff': 'teal',
  'Sales Staff': 'warning',
};

export default function Users() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [ref, revealed] = useReveal();

  useEffect(() => {
    orderApi.getUsers()
      .then(setUsers)
      .catch((err) => showToast('error', err.message || 'Could not load users'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!form.email.includes('@')) e.email = 'Invalid email';
    if (!editId && (!form.password || form.password.length < 6)) e.password = 'Password must be 6+ chars';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditId(u.id);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editId) {
        const updates = { name: form.name, email: form.email, role: form.role };
        if (form.password) updates.password = form.password;
        const updated = await orderApi.updateUser(editId, updates);
        setUsers((prev) => prev.map((u) => (u.id === editId ? updated : u)));
        showToast('success', 'User updated');
      } else {
        const created = await orderApi.addUser({ ...form, avatar: form.name.split(' ').map((s) => s[0]).join('').toUpperCase() });
        setUsers((prev) => [...prev, created]);
        showToast('success', 'User added');
      }
      setModalOpen(false);
    } catch (err) {
      showToast('error', err.message || 'Could not save user'); // e.g. "email already exists"
    }
  };

  const toggleActive = async (id) => {
    try {
      const updated = await orderApi.toggleUserActive(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      showToast('success', `User ${updated.active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast('error', err.message || 'Could not update user');
    }
  };

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>User Management</h1>
          <p>Manage team members, roles, and access</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Add User
        </button>
      </div>

      <div ref={ref} className={`card reveal ${revealed ? 'revealed' : ''}`}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{u.avatar}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td><Badge variant={roleVariant[u.role] || 'muted'}>{u.role}</Badge></td>
                  <td>
                    <span className={`user-status ${u.active ? 'active' : 'inactive'}`}>
                      <span className="status-dot" />
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => openEdit(u)} aria-label="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn-icon" onClick={() => toggleActive(u.id)} aria-label="Toggle active">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {u.active
                            ? <path d="M18.36 5.64a9 9 0 11-12.73 0M12 2v10" />
                            : <path d="M12 2v10M18.36 5.64a9 9 0 11-12.73 0" />}
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit User' : 'Add User'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@stockflow.in" />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">{editId ? 'New Password (leave blank to keep)' : 'Password'}</label>
          <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option>Admin</option>
            <option>Warehouse Manager</option>
            <option>Inventory Staff</option>
            <option>Sales Staff</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
