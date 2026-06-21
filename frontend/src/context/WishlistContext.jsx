import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext();
const STORAGE_KEY = "cardost_wishlist";

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const has = (id) => items.some((i) => i.id === id);

  const toggle = (product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) return prev.filter((i) => i.id !== product.id);
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image }];
    });
    return !has(product.id); // returns the NEW state (true = added)
  };

  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  return (
    <WishlistContext.Provider value={{ items, has, toggle, remove, clear, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
