
Remove the Payment tab from the Integrations page since payment settings are managed separately at `/admin/payment-settings`.

**Changes to `src/pages/admin/AdminIntegrations.tsx`:**
1. Remove `PaymentTab` import and `CreditCard` icon import
2. Change `defaultValue="payment"` to `defaultValue="mail"`
3. Change tabs grid from `grid-cols-7` to `grid-cols-6`
4. Remove the Payment `TabsTrigger` and `TabsContent` blocks

**Optional cleanup:** Delete `src/components/admin/integrations/PaymentTab.tsx` since it's no longer referenced anywhere.
