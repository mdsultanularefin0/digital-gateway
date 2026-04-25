import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { trackInitiateCheckout, trackPurchase, setUserIdentifiers } from "@/lib/meta-pixel";

export interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  couponCode: string;
  notes: string;
  paymentMethod: string;
  senderNumber: string;
  trxId: string;
}

export const emptyCheckoutForm: CheckoutForm = {
  name: "", email: "", phone: "", address: "", couponCode: "", notes: "",
  paymentMethod: "", senderNumber: "", trxId: "",
};

/**
 * Encapsulates checkout state, coupon application and order placement.
 * Returned by useCheckout(); the page component renders the markup.
 */
export function useCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const { data: settings } = useSiteSettings();
  const { user } = useAuth();
  const sym = settings?.currency_symbol || "৳";
  const currency = settings?.currency || "USD";
 
  const [form, setForm] = useState<CheckoutForm>(emptyCheckoutForm);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
 
  const shippingCost = 0;
  const total = subtotal - discount + shippingCost;
 
  // Track InitiateCheckout once per mount when cart has items.
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout({
        content_ids: items.map((i) => i.productId),
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value: subtotal,
        currency,
      }, {
        email: user?.email,
        phone: user?.phone || user?.user_metadata?.phone,
        name: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof CheckoutForm, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (key === "email" && value) setUserIdentifiers({ email: value });
    if (key === "phone" && value) setUserIdentifiers({ phone: value });
    if (key === "name" && value) {
      const parts = value.trim().split(/\s+/);
      setUserIdentifiers({ 
        firstName: parts[0], 
        lastName: parts.length > 1 ? parts[parts.length - 1] : undefined 
      });
    }
  };

  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons_public")
        .select("*")
        .eq("code", form.couponCode.trim().toUpperCase())
        .eq("is_valid", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
        return;
      }
      if (subtotal < Number(data.min_order_amount)) {
        toast({ title: "Minimum order not met", description: `Min order: ${sym}${Number(data.min_order_amount).toFixed(2)}`, variant: "destructive" });
        return;
      }
      const discountAmount = data.discount_type === "percentage"
        ? subtotal * (Number(data.discount_value) / 100)
        : Number(data.discount_value);

      setDiscount(Math.min(discountAmount, subtotal));
      setCouponApplied(data.code!);
      toast({ title: `Coupon applied: ${data.discount_type === "percentage" ? `${data.discount_value}% off` : `${sym}${Number(data.discount_value).toFixed(2)} off`}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setCouponApplied(null);
    setForm((p) => ({ ...p, couponCode: "" }));
  };

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Please fill in your name, email, and phone", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (form.paymentMethod === "bkash_send" || form.paymentMethod === "nagad_send") {
      if (!form.senderNumber.trim() || !form.trxId.trim()) {
        toast({ title: "Please enter your sender number and Transaction ID", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const customerEmail = form.email.trim().toLowerCase();

      // Validate product IDs before creating the order so guest checkout does not
      // need to delete an order it cannot manage under RLS.
      const productIds = Array.from(new Set(items.map((i) => i.productId)));
      const { data: validProducts, error: prodErr } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds);
      if (prodErr) throw prodErr;
      const validIds = new Set((validProducts || []).map((p) => p.id));
      const missing = items.filter((i) => !validIds.has(i.productId));
      if (missing.length > 0) {
        clearCart();
        throw new Error(
          `Some items in your cart are no longer available (${missing.map((m) => m.productName).join(", ")}). Your cart has been cleared — please add products again.`
        );
      }

      const { data: customerId, error: custErr } = await supabase.rpc("upsert_checkout_customer", {
        _email: customerEmail, _name: form.name, _phone: form.phone, _address: form.address,
      });
      if (custErr) throw custErr;

      const orderId = crypto.randomUUID();
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${orderId.slice(0, 8)}`;

      const { error: orderErr } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: form.name,
          customer_email: customerEmail,
          customer_phone: form.phone,
          shipping_address: form.address,
          subtotal, discount, shipping_cost: shippingCost, total,
          payment_method: form.paymentMethod,
          coupon_code: couponApplied,
          notes: form.notes,
          status: "pending",
          payment_status: "unpaid",
        });
      if (orderErr) throw orderErr;
      const order = { id: orderId, order_number: orderNumber };

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        tier_label: item.tierLabel,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Referral attribution if cookie set
      const refCode = (typeof document !== "undefined" && document.cookie.match(/ref_code=([^;]+)/)?.[1]) || "";
      if (refCode) {
        await supabase.from("referral_attributions").insert({
          referral_code: refCode,
          order_id: order.id,
          customer_email: customerEmail,
          amount: total,
          event_type: "order",
        }).then(() => {});
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const fnHeaders = {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      };
      fetch(`https://${projectId}.supabase.co/functions/v1/order-webhook`, {
        method: "POST", headers: fnHeaders,
        body: JSON.stringify({ order_id: order.id, event: "order.created" }),
      }).catch(() => {});

      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-confirmation`, {
        method: "POST", headers: fnHeaders,
        body: JSON.stringify({ order_id: order.id, type: "order_confirmation", origin: window.location.origin }),
      }).catch(() => {});

      // bKash PGW
      if (form.paymentMethod === "bkash") {
        const callbackURL = `${window.location.origin}/bkash/callback`;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bkash-payment?action=create`, {
          method: "POST", headers: fnHeaders,
          body: JSON.stringify({ orderId: order.id, callbackURL, payerReference: form.phone }),
        });
        const bkashData = await res.json();
        if (bkashData.bkashURL) {
          localStorage.setItem("bkash_order_id", order.id);
          localStorage.setItem("bkash_order_number", order.order_number);
          window.location.href = bkashData.bkashURL;
          return;
        }
        throw new Error(bkashData.error || "Failed to initiate bKash payment");
      }

      // Send Money
      if (form.paymentMethod === "bkash_send" || form.paymentMethod === "nagad_send") {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/verify-send-money`, {
          method: "POST", headers: fnHeaders,
          body: JSON.stringify({
            orderId: order.id,
            senderNumber: form.senderNumber.trim(),
            trxId: form.trxId.trim(),
            provider: form.paymentMethod,
          }),
        });
        const sendResult = await res.json();
        if (!res.ok || sendResult.error) {
          // Surface duplicate / replay / mismatch errors so the customer can re-enter the correct TrxID.
          // Order + cart are kept intact so they can retry without re-doing checkout.
          const rawMsg = String(sendResult.error || "").trim();
          const isDuplicate = /already|used|submitted|claimed/i.test(rawMsg);
          const description = rawMsg
            ? isDuplicate
              ? `${rawMsg} Please enter the TrxID from a new Send Money to this order — do not reuse one from another payment.`
              : rawMsg
            : "We couldn't verify your payment. Please double-check your Transaction ID and try again.";
          toast({
            title: isDuplicate ? "Transaction ID already used" : "Payment verification failed",
            description,
            variant: "destructive",
          });
          return;
        }
        if (sendResult.verified) {
          trackPurchase({
            content_ids: items.map((i) => i.productId),
            content_type: "product",
            num_items: items.reduce((s, i) => s + i.quantity, 0),
            value: total, currency,
          }, {
            email: form.email,
            phone: form.phone,
            name: form.name,
            externalId: order.order_number,
          });
        }
        clearCart();
        setPlacedOrderId(order.id);
        setOrderPlaced(order.order_number);
        if (!sendResult.verified) {
          toast({ title: "Payment submitted", description: "Your payment is pending verification. You'll receive confirmation once verified." });
        }
        return;
      }

      trackPurchase({
        content_ids: items.map((i) => i.productId),
        content_type: "product",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value: total, currency,
      }, {
        email: form.email,
        phone: form.phone,
        name: form.name,
        externalId: order.order_number,
      });
      clearCart();
      setPlacedOrderId(order.id);
      setOrderPlaced(order.order_number);
    } catch (err: any) {
      toast({ title: "Failed to place order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    items, subtotal, settings, sym, currency,
    form, update,
    discount, couponApplied, couponLoading, applyCoupon, removeCoupon,
    submitting, placeOrder,
    orderPlaced, placedOrderId,
    shippingCost, total,
  };
}
