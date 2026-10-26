import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { orderApi } from '../api/orderApi';
import { useAuth } from './AuthContext';

const InventoryContext = createContext(null);

// Some roles are not allowed to read every list (e.g. suppliers). A 403 just means "nothing to show".
const orEmptyIfForbidden = (promise) => promise.catch((err) => (err?.status === 403 ? [] : Promise.reject(err)));

// Applies the new quantities returned by the server: [{ productId, warehouseId, quantity }]
function withStock(product, rows) {
  const mine = rows.filter((r) => r.productId === product.id);
  if (mine.length === 0) return product;
  const warehouseStock = { ...product.warehouseStock };
  for (const r of mine) warehouseStock[r.warehouseId] = r.quantity;
  return { ...product, warehouseStock };
}

export function InventoryProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast callback — set by a wrapper, so the context can trigger toasts
  const toastRef = useRef(null);
  const notifyRef = useRef(null);

  const setToastFn = useCallback((fn) => { toastRef.current = fn; }, []);
  const setNotifyFn = useCallback((fn) => { notifyRef.current = fn; }, []);

  const showToast = useCallback((type, message) => {
    if (toastRef.current) toastRef.current(type, message);
  }, []);

  const pushNotification = useCallback((notif) => {
    if (notifyRef.current) notifyRef.current(notif);
  }, []);

  // Load everything once someone is signed in; clear it all on sign-out so the next user never sees old data.
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w, m, po, so, sup] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getWarehouses(),
        inventoryApi.getMovements(),
        orEmptyIfForbidden(orderApi.getPurchaseOrders()),
        orEmptyIfForbidden(orderApi.getSalesOrders()),
        orEmptyIfForbidden(orderApi.getSuppliers()),
      ]);
      setProducts(p);
      setWarehouses(w);
      setMovements(m);
      setPurchaseOrders(po);
      setSalesOrders(so);
      setSuppliers(sup);
    } catch (err) {
      console.error('Failed to load data', err);
      if (err?.status !== 401) showToast('error', err?.message || 'Could not load data — please refresh');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!userId) {
      setProducts([]); setWarehouses([]); setMovements([]);
      setSuppliers([]); setPurchaseOrders([]); setSalesOrders([]);
      setLoading(false);
      return;
    }
    loadAll();
  }, [userId, loadAll]);

  // --- Helpers ---
  const getProductTotalStock = useCallback((product) => {
    return Object.values(product.warehouseStock || {}).reduce((a, b) => a + b, 0);
  }, []);

  const getProductStockAt = useCallback((productId, warehouseId) => {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return 0;
    return p.warehouseStock?.[warehouseId] || 0;
  }, [products]);

  const checkLowStock = useCallback((product) => {
    const total = getProductTotalStock(product);
    if (total <= product.reorderLevel) {
      pushNotification({
        type: 'low_stock',
        title: total === 0 ? `Out of Stock: ${product.name}` : `Low Stock: ${product.name}`,
        message: `Total stock is ${total} (reorder at ${product.reorderLevel})`,
        date: new Date().toISOString().split('T')[0],
        read: false,
      });
      showToast('warning', `Low stock alert: ${product.name} (${total} units left)`);
    }
  }, [getProductTotalStock, pushNotification, showToast]);

  // Applies a server response that changed stock: updates quantities, prepends new movements (newest first),
  // and raises low-stock alerts for the products that dropped (only when `alert` is true).
  const applyStockResult = useCallback(({ stock = [], movements: newMovements = [] }, { alert = false } = {}) => {
    if (newMovements.length) setMovements((prev) => [...[...newMovements].reverse(), ...prev]);
    if (stock.length === 0) return;
    setProducts((prev) => prev.map((p) => withStock(p, stock)));
    if (alert) {
      const touched = new Set(stock.map((r) => r.productId));
      for (const productId of touched) {
        const current = products.find((p) => p.id === productId);
        if (current) checkLowStock(withStock(current, stock));
      }
    }
  }, [products, checkLowStock]);

  // Runs an API call and turns a thrown error into a toast + { success: false }.
  const attempt = useCallback(async (fn, fallbackMessage) => {
    try {
      return await fn();
    } catch (err) {
      showToast('error', err?.message || fallbackMessage);
      return { success: false, error: err?.message || fallbackMessage };
    }
  }, [showToast]);

  // --- Stock In ---
  const stockIn = useCallback(async ({ productId, warehouseId, qty, note }) => attempt(async () => {
    const result = await inventoryApi.stockIn({ productId, warehouseId, qty, note: note || '' });
    applyStockResult({ stock: result.stock, movements: [result.movement] });
    showToast('success', `Stock In: ${qty} units added`);
    return { success: true };
  }, 'Could not record stock in'), [attempt, applyStockResult, showToast]);

  // --- Stock Out ---
  const stockOut = useCallback(async ({ productId, warehouseId, qty, note }) => {
    const current = getProductStockAt(productId, warehouseId);
    if (qty > current) {
      showToast('error', `Insufficient stock: only ${current} units available`);
      return { success: false, error: 'Insufficient stock' };
    }
    return attempt(async () => {
      const result = await inventoryApi.stockOut({ productId, warehouseId, qty, note: note || '' });
      applyStockResult({ stock: result.stock, movements: [result.movement] }, { alert: true });
      showToast('success', `Stock Out: ${qty} units removed`);
      return { success: true };
    }, 'Could not record stock out');
  }, [attempt, getProductStockAt, applyStockResult, showToast]);

  // --- Transfer ---
  const transferStock = useCallback(async ({ productId, fromWarehouseId, toWarehouseId, qty, note }) => {
    if (fromWarehouseId === toWarehouseId) {
      showToast('error', 'Source and destination must be different');
      return { success: false, error: 'Same warehouse' };
    }
    const currentFrom = getProductStockAt(productId, fromWarehouseId);
    if (qty > currentFrom) {
      showToast('error', `Insufficient stock at source: only ${currentFrom} units`);
      return { success: false, error: 'Insufficient stock' };
    }
    return attempt(async () => {
      const result = await inventoryApi.transfer({ productId, fromWarehouseId, toWarehouseId, qty, note: note || '' });
      applyStockResult({ stock: result.stock, movements: [result.movement] });
      showToast('success', `Transfer: ${qty} units moved`);
      return { success: true };
    }, 'Could not transfer stock');
  }, [attempt, getProductStockAt, applyStockResult, showToast]);

  // --- Damaged ---
  const reportDamaged = useCallback(async ({ productId, warehouseId, qty, reason }) => {
    const current = getProductStockAt(productId, warehouseId);
    if (qty > current) {
      showToast('error', `Cannot report more damaged than available (${current})`);
      return { success: false, error: 'Insufficient stock' };
    }
    return attempt(async () => {
      const result = await inventoryApi.reportDamaged({ productId, warehouseId, qty, reason: reason || '' });
      applyStockResult({ stock: result.stock, movements: [result.movement] }, { alert: true });
      showToast('warning', `Damaged: ${qty} units removed`);
      return { success: true };
    }, 'Could not report damaged stock');
  }, [attempt, getProductStockAt, applyStockResult, showToast]);

  // --- Product CRUD ---
  const addProduct = useCallback(async (product) => {
    // Unique SKU check
    if (products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase())) {
      showToast('error', `SKU "${product.sku}" already exists`);
      return { success: false, error: 'Duplicate SKU' };
    }
    return attempt(async () => {
      const created = await inventoryApi.addProduct(product);
      setProducts((prev) => [...prev, created]);
      showToast('success', `Product "${product.name}" added`);
      return { success: true };
    }, 'Could not add product');
  }, [products, attempt, showToast]);

  const updateProduct = useCallback(async (id, updates) => {
    if (updates.sku && products.some((p) => p.id !== id && p.sku.toLowerCase() === updates.sku.toLowerCase())) {
      showToast('error', `SKU "${updates.sku}" already exists`);
      return { success: false, error: 'Duplicate SKU' };
    }
    return attempt(async () => {
      const updated = await inventoryApi.updateProduct(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast('success', 'Product updated');
      return { success: true };
    }, 'Could not update product');
  }, [products, attempt, showToast]);

  const deleteProduct = useCallback(async (id) => attempt(async () => {
    await inventoryApi.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('success', 'Product deleted');
    return { success: true };
  }, 'Could not delete product'), [attempt, showToast]);

  // --- Warehouse ---
  const addWarehouse = useCallback(async (warehouse) => attempt(async () => {
    const created = await inventoryApi.addWarehouse(warehouse);
    setWarehouses((prev) => [...prev, created]);
    showToast('success', `Warehouse "${warehouse.name}" added`);
    return { success: true };
  }, 'Could not add warehouse'), [attempt, showToast]);

  const addLocation = useCallback(async (warehouseId, location) => attempt(async () => {
    const updated = await inventoryApi.addLocation(warehouseId, location);
    setWarehouses((prev) => prev.map((w) => (w.id === warehouseId ? updated : w)));
    showToast('success', 'Location added');
    return { success: true };
  }, 'Could not add location'), [attempt, showToast]);

  // --- Suppliers ---
  const addSupplier = useCallback(async (supplier) => attempt(async () => {
    const created = await orderApi.addSupplier(supplier);
    setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    showToast('success', `Supplier "${created.name}" added`);
    return { success: true };
  }, 'Could not add supplier'), [attempt, showToast]);

  const updateSupplier = useCallback(async (id, supplier) => attempt(async () => {
    const updated = await orderApi.updateSupplier(id, supplier);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
    // keep PO supplier names in sync
    setPurchaseOrders((prev) => prev.map((po) => (po.supplierId === id ? { ...po, supplierName: updated.name } : po)));
    showToast('success', `Supplier "${updated.name}" updated`);
    return { success: true };
  }, 'Could not update supplier'), [attempt, showToast]);

  const deleteSupplier = useCallback(async (id) => {
    if (purchaseOrders.some((po) => po.supplierId === id)) {
      showToast('error', 'Cannot delete a supplier that has purchase orders');
      return { success: false };
    }
    try {
      await orderApi.deleteSupplier(id);
    } catch (err) {
      showToast('error', err.message || 'Could not delete supplier');
      return { success: false };
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    showToast('success', 'Supplier deleted');
    return { success: true };
  }, [purchaseOrders, showToast]);

  // --- Purchase Order: mark as Received → the server adds the stock (once) ---
  const markPOReceived = useCallback(async (poId) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === 'Received') return { success: false };
    return attempt(async () => {
      const result = await orderApi.receivePurchaseOrder(poId);
      setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? result.order : p)));
      applyStockResult(result);
      showToast('success', `PO ${po.poNumber} marked as Received — stock updated`);
      return { success: true };
    }, 'Could not receive purchase order');
  }, [purchaseOrders, attempt, applyStockResult, showToast]);

  // --- Sales Order: confirm → the server deducts stock (all lines or none) ---
  const confirmSalesOrder = useCallback(async (orderId) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return { success: false };
    const defaultWh = warehouses[0]?.id;
    if (!defaultWh) {
      showToast('error', 'No warehouse available');
      return { success: false, error: 'No warehouse available' };
    }
    for (const item of order.items) {
      const available = getProductStockAt(item.productId, defaultWh);
      if (item.qty > available) {
        const prod = products.find((p) => p.id === item.productId);
        showToast('error', `Insufficient stock for ${prod?.name || 'product'}: need ${item.qty}, have ${available}`);
        return { success: false, error: 'Insufficient stock' };
      }
    }
    return attempt(async () => {
      const result = await orderApi.confirmSalesOrder(orderId);
      setSalesOrders((prev) => prev.map((o) => (o.id === orderId ? result.order : o)));
      applyStockResult(result, { alert: true });
      showToast('success', `Order ${order.orderNumber} confirmed — stock updated`);
      return { success: true };
    }, 'Could not confirm order');
  }, [salesOrders, warehouses, products, getProductStockAt, attempt, applyStockResult, showToast]);

  // Shipped / Delivered (no stock change)
  const updateSalesOrderStatus = useCallback(async (orderId, status) => {
    try {
      const updated = await orderApi.updateSalesOrderStatus(orderId, status);
      setSalesOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast('success', `Order status updated to ${status}`);
      return { success: true };
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Could not update order status');
      return { success: false };
    }
  }, [showToast]);

  // --- Sales Order: create (saved on the server, survives refresh) ---
  const addSalesOrder = useCallback(async ({ customer, date, items }) => {
    try {
      const created = await orderApi.createSalesOrder({ customer, date, items });
      setSalesOrders((prev) => [created, ...prev]);
      showToast('success', `Order ${created.orderNumber} created`);
      return { success: true, order: created };
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Could not create order');
      return { success: false };
    }
  }, [showToast]);

  // --- Sales Order: edit (only Pending orders — stock is not yet deducted) ---
  const updateSalesOrder = useCallback(async (orderId, { customer, date, items }) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return { success: false };
    if (order.status !== 'Pending') {
      showToast('error', 'Only pending orders can be edited');
      return { success: false };
    }
    try {
      const updated = await orderApi.updateSalesOrder(orderId, { customer, date, items });
      setSalesOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast('success', `Order ${updated.orderNumber} updated`);
      return { success: true, order: updated };
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Could not update order');
      return { success: false };
    }
  }, [salesOrders, showToast]);

  // --- Sales Order: delete → the server puts stock back if the order had deducted it ---
  const deleteSalesOrder = useCallback(async (orderId) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return { success: false };
    const wasDeducted = ['Confirmed', 'Shipped', 'Delivered'].includes(order.status);
    try {
      const result = await orderApi.deleteSalesOrder(orderId);
      setSalesOrders((prev) => prev.filter((o) => o.id !== orderId));
      applyStockResult(result);
      showToast('success', `Order ${order.orderNumber} deleted${wasDeducted ? ' — stock restored' : ''}`);
      return { success: true };
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Could not delete order');
      return { success: false };
    }
  }, [salesOrders, applyStockResult, showToast]);

  // --- Sales Order: cancel / return → the server restores stock if it had been deducted ---
  const reverseSalesOrder = useCallback(async (orderId, finalStatus) => {
    const order = salesOrders.find((o) => o.id === orderId);
    if (!order) return { success: false };
    const wasDeducted = order.status !== 'Pending';
    try {
      const call = finalStatus === 'Returned' ? orderApi.returnSalesOrder : orderApi.cancelSalesOrder;
      const result = await call(orderId);
      setSalesOrders((prev) => prev.map((o) => (o.id === orderId ? result.order : o)));
      applyStockResult(result);
      showToast('success', `Order ${order.orderNumber} ${finalStatus.toLowerCase()}${wasDeducted ? ' — stock restored' : ''}`);
      return { success: true };
    } catch (err) {
      console.error(err);
      showToast('error', err.message || `Could not mark order as ${finalStatus.toLowerCase()}`);
      return { success: false };
    }
  }, [salesOrders, applyStockResult, showToast]);

  const cancelSalesOrder = useCallback((orderId) => reverseSalesOrder(orderId, 'Cancelled'), [reverseSalesOrder]);
  const returnSalesOrder = useCallback((orderId) => reverseSalesOrder(orderId, 'Returned'), [reverseSalesOrder]);

  // --- Computed values ---
  const stockValue = products.reduce((sum, p) => sum + getProductTotalStock(p) * p.price, 0);
  const lowStockItems = products.filter((p) => {
    const total = getProductTotalStock(p);
    return total > 0 && total <= p.reorderLevel;
  });
  const outOfStockItems = products.filter((p) => getProductTotalStock(p) === 0);
  const pendingOrders = salesOrders.filter((o) => o.status === 'Pending');

  const value = {
    products, warehouses, movements, suppliers, purchaseOrders, salesOrders, loading,
    loadAll, setToastFn, setNotifyFn,
    getProductTotalStock, getProductStockAt,
    stockIn, stockOut, transferStock, reportDamaged,
    addProduct, updateProduct, deleteProduct,
    addWarehouse, addLocation,
    addSupplier, updateSupplier, deleteSupplier,
    markPOReceived, confirmSalesOrder, updateSalesOrderStatus, addSalesOrder, updateSalesOrder, deleteSalesOrder,
    cancelSalesOrder, returnSalesOrder,
    stockValue, lowStockItems, outOfStockItems, pendingOrders,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
