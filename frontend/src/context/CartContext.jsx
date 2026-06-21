import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cardost_cart") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cardost_cart", JSON.stringify(items));
  }, [items]);

  const add = (product, qty = 1, vehicle = null) => {
    // vehicle = { id, label } | null
    const variantId = vehicle?.id || null;
    setItems((prev) => {
      // Two cart lines for the same product but different selected vehicle should NOT merge
      const ex = prev.find((i) => i.id === product.id && (i.vehicle_variant_id || null) === (variantId || null));
      if (ex) return prev.map((i) => (i === ex ? { ...i, qty: i.qty + qty } : i));
      return [...prev, {
        id: product.id, name: product.name, price: product.price, image: product.image, qty,
        vehicle_variant_id: variantId, vehicle_label: vehicle?.label || ""
      }];
    });
  };

  const cartKey = (i) => `${i.id}::${i.vehicle_variant_id || ""}`;

  const updateQty = (key, qty) => {
    if (qty <= 0) return remove(key);
    setItems((prev) => prev.map((i) => (cartKey(i) === key ? { ...i, qty } : i)));
  };

  const remove = (key) => setItems((prev) => prev.filter((i) => cartKey(i) !== key));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal, count, cartKey }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
