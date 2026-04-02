import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  tierLabel: string;
  tierId: string | null;
  price: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, tierId: string | null) => void;
  updateQuantity: (productId: string, tierId: string | null, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "digistack-cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">, openDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId && i.tierId === item.tierId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId && i.tierId === item.tierId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    if (openDrawer) setIsOpen(true);
  };

  const removeItem = (productId: string, tierId: string | null) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.tierId === tierId)));
  };

  const updateQuantity = (productId: string, tierId: string | null, quantity: number) => {
    if (quantity <= 0) return removeItem(productId, tierId);
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.tierId === tierId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
