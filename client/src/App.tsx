import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { StorefrontLayout } from "./components/StorefrontShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import { products, type CartLine, type Product } from "./data/store";
import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminProducts from "./pages/AdminProducts";
import AdminCategories from "./pages/AdminCategories";
import CustomerOrders from "./pages/CustomerOrders";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";
import Checkout, { OrderConfirmation } from "./pages/Checkout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function Router({ cart, onAdd, onUpdate, onRemove, onPrint }: { cart: CartLine[]; onAdd: (product: Product) => void; onUpdate: (id: string, delta: number) => void; onRemove: (id: string) => void; onPrint: () => void }) {
  const [location] = useLocation();
  if (location === "/admin") return <Admin />;
  if (location === "/admin/orders") return <AdminOrders />;
  if (location === "/admin/products") return <AdminProducts />;
  if (location === "/admin/categories") return <AdminCategories />;
  if (location === "/orders") return <StorefrontLayout cart={cart} onAdd={(item) => onAdd(item)} onUpdate={onUpdate} onRemove={onRemove} onPrint={onPrint}><CustomerOrders /></StorefrontLayout>;
  if (location === "/checkout") return <Checkout cart={cart} />;
  if (location.startsWith("/orders/")) return <OrderConfirmation orderId={Number(location.split("/").pop())} />;
  if (location === "/shop") return <StorefrontLayout cart={cart} onAdd={(item) => onAdd(item)} onUpdate={onUpdate} onRemove={onRemove} onPrint={onPrint}><Shop onAdd={onAdd} /></StorefrontLayout>;
  if (location === "/") return <StorefrontLayout cart={cart} onAdd={(item) => onAdd(item)} onUpdate={onUpdate} onRemove={onRemove} onPrint={onPrint}><Home onAdd={onAdd} onPrint={onPrint} /></StorefrontLayout>;
  return <NotFound />;
}

function App() {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartLine[]>(() => { try { return JSON.parse(localStorage.getItem("paperlane-guest-cart") || "[]") as CartLine[]; } catch { return []; } });
  const [location] = useLocation();
  const cartQuery = trpc.cart.get.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const addMutation = trpc.cart.addItem.useMutation({ onSuccess: (next) => setCart(next.items.map((item) => ({ ...item, id: item.id, category: item.category, price: item.price, rating: 0, swatch: item.swatch, description: item.description, image: item.image })) as CartLine[]) });
  const updateMutation = trpc.cart.updateItem.useMutation({ onSuccess: (next) => setCart(next.items.map((item) => ({ ...item, rating: 0 })) as CartLine[]) });
  const removeMutation = trpc.cart.removeItem.useMutation({ onSuccess: (next) => setCart(next.items.map((item) => ({ ...item, rating: 0 })) as CartLine[]) });
  const mergeMutation = trpc.cart.mergeGuestCart.useMutation({
    onSuccess: (next) => {
      localStorage.removeItem("paperlane-guest-cart");
      setCart(next.items.map((item) => ({ ...item, rating: 0 })) as CartLine[]);
      void cartQuery.refetch();
    },
  });

  useEffect(() => {
    if (user) {
      try {
        const stored = JSON.parse(localStorage.getItem("paperlane-guest-cart") || "[]") as CartLine[];
        if (stored.length > 0) {
          mergeMutation.mutate({ items: stored.map((i) => ({ productSlug: i.id, quantity: i.quantity })) });
          return;
        }
      } catch {
        localStorage.removeItem("paperlane-guest-cart");
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && cartQuery.data && !mergeMutation.isPending) {
      setCart(cartQuery.data.items.map((item) => ({ ...item, rating: 0 })) as CartLine[]);
    }
  }, [user, cartQuery.data, mergeMutation.isPending]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("paperlane-guest-cart", JSON.stringify(cart));
    }
  }, [cart, user]);

  const addToCart = (product: Product) => {
    if (user) {
      addMutation.mutate({ productSlug: product.id, quantity: 1 });
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const updateCart = (id: string, delta: number) => {
    const line = cart.find((item) => item.id === id);
    if (user && line) {
      const nextQ = line.quantity + delta;
      if (nextQ <= 0) {
        removeMutation.mutate({ productSlug: id });
      } else {
        updateMutation.mutate({ productSlug: id, quantity: nextQ });
      }
      return;
    }
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeFromCart = (id: string) => {
    if (user) {
      removeMutation.mutate({ productSlug: id });
      return;
    }
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const handleOpenPrint = () => {
    window.dispatchEvent(new CustomEvent("krishna:open-print-modal"));
  };

  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="bottom-right" /><Router key={location} cart={cart} onAdd={addToCart} onUpdate={updateCart} onRemove={removeFromCart} onPrint={handleOpenPrint} /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
