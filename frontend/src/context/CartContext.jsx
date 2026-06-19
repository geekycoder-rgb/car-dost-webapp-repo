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

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, qty }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) return remove(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
