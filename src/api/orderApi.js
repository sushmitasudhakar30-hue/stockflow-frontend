import { http } from './http';

/* Sales/purchase orders, suppliers, users, auth and notifications — StockFlow REST API. */
export const orderApi = {
  // --- Auth ---
  login: (email, password) => http.post('/auth/login', { email, password }, { auth: false }),
  me: () => http.get('/auth/me'),

  // --- Sales orders ---
  getSalesOrders: () => http.get('/sales-orders'),
  createSalesOrder: ({ customer, date, items }) => http.post('/sales-orders', { customer, date, items }),
  updateSalesOrder: (id, { customer, date, items }) => http.put(`/sales-orders/${id}`, { customer, date, items }),
  // These return { order, movements, stock } because they move stock on the server.
  confirmSalesOrder: (id) => http.post(`/sales-orders/${id}/confirm`),
  cancelSalesOrder: (id) => http.post(`/sales-orders/${id}/cancel`),
  returnSalesOrder: (id) => http.post(`/sales-orders/${id}/return`),
  deleteSalesOrder: (id) => http.delete(`/sales-orders/${id}`), // { message, movements, stock }
  // Only 'Shipped' and 'Delivered' go through here; they do not move stock.
  updateSalesOrderStatus: (id, status) => http.patch(`/sales-orders/${id}/status`, { status }),

  // --- Purchase orders ---
  getPurchaseOrders: () => http.get('/purchase-orders'),
  createPurchaseOrder: ({ supplierId, date, items }) => http.post('/purchase-orders', { supplierId, date, items }),
  receivePurchaseOrder: (id) => http.post(`/purchase-orders/${id}/receive`), // { order, movements, stock }

  // --- Suppliers ---
  getSuppliers: () => http.get('/suppliers'),
  addSupplier: (s) => http.post('/suppliers', pickSupplier(s)),
  updateSupplier: (id, s) => http.put(`/suppliers/${id}`, pickSupplier(s)),
  deleteSupplier: async (id) => {
    await http.delete(`/suppliers/${id}`);
    return true;
  },

  // --- Users (Admin only) ---
  getUsers: () => http.get('/users'),
  addUser: (u) => http.post('/users', { name: u.name, email: u.email, password: u.password, role: u.role, avatar: u.avatar }),
  updateUser: (id, updates) => http.put(`/users/${id}`, updates),
  toggleUserActive: (id) => http.patch(`/users/${id}/toggle-active`),
};

function pickSupplier(s) {
  return { name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address };
}
