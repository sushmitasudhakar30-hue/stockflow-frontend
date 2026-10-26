import { http } from './http';

/* Products, warehouses and stock movements — talks to the StockFlow REST API (Express + MongoDB). */
export const inventoryApi = {
  // --- Products ---
  getProducts: () => http.get('/products'),
  getProduct: (id) => http.get(`/products/${id}`),
  getCategories: () => http.get('/products/categories'),
  addProduct: (product) =>
    http.post('/products', {
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      reorderLevel: Number(product.reorderLevel ?? 0),
    }),
  updateProduct: (id, updates) => {
    const payload = {};
    if (updates.sku !== undefined) payload.sku = updates.sku;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.price !== undefined) payload.price = Number(updates.price);
    if (updates.reorderLevel !== undefined) payload.reorderLevel = Number(updates.reorderLevel);
    return http.put(`/products/${id}`, payload);
  },
  deleteProduct: async (id) => {
    await http.delete(`/products/${id}`);
    return true;
  },

  // --- Warehouses ---
  getWarehouses: () => http.get('/warehouses'),
  getWarehouse: (id) => http.get(`/warehouses/${id}`),
  addWarehouse: (warehouse) =>
    http.post('/warehouses', { name: warehouse.name, location: warehouse.location, capacity: Number(warehouse.capacity || 0) }),
  // Returns the full updated warehouse (with its locations)
  addLocation: (warehouseId, location) =>
    http.post(`/warehouses/${warehouseId}/locations`, {
      rack: location.rack,
      bin: location.bin,
      productSku: location.productSku,
      quantity: Number(location.quantity || 0),
    }),

  // --- Stock movements ---
  // Each stock call returns { movement, stock: [{ productId, warehouseId, quantity }] } with the NEW quantities.
  getMovements: () => http.get('/movements'),
  stockIn: ({ productId, warehouseId, qty, note }) => http.post('/movements/stock-in', { productId, warehouseId, qty, note }),
  stockOut: ({ productId, warehouseId, qty, note }) => http.post('/movements/stock-out', { productId, warehouseId, qty, note }),
  transfer: ({ productId, fromWarehouseId, toWarehouseId, qty, note }) =>
    http.post('/movements/transfer', { productId, fromWarehouseId, toWarehouseId, qty, note }),
  reportDamaged: ({ productId, warehouseId, qty, reason }) => http.post('/movements/damaged', { productId, warehouseId, qty, reason }),
};
