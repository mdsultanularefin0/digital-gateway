import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, itemCount, subtotal, isOpen, setIsOpen } = useCart();
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "$";

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    // Use setTimeout to let the sheet close animation start before navigating
    setTimeout(() => {
      window.location.href = path;
    }, 100);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">Cart ({itemCount})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Your cart is empty</p>
            <Button variant="outline" size="sm" onClick={() => handleNavigate("/products")}>
              Browse Products
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-3 py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.tierId}`} className="flex gap-3 rounded-[4px] border border-border p-3">
                  <div className="h-14 w-14 rounded-[4px] bg-muted flex items-center justify-center shrink-0">
                    <span className="text-lg font-display font-bold text-muted-foreground/30">{item.productName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {item.tierLabel && <p className="text-xs text-muted-foreground">{item.tierLabel}</p>}
                    <p className="text-sm font-bold mt-0.5">{sym}{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => removeItem(item.productId, item.tierId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1 mt-auto">
                      <button
                        onClick={() => updateQuantity(item.productId, item.tierId, item.quantity - 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.tierId, item.quantity + 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">{sym}{subtotal.toFixed(2)}</span>
              </div>
              <Button variant="gradient" size="lg" className="w-full" onClick={() => handleNavigate("/checkout")}>
                Proceed to Checkout
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
