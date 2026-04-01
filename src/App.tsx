import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AdminGuard } from "@/components/AdminGuard";
import { CartDrawer } from "@/components/CartDrawer";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const BkashCallback = lazy(() => import("./pages/BkashCallback"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Account = lazy(() => import("./pages/Account"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminSales = lazy(() => import("./pages/admin/AdminSales"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminIntegrations = lazy(() => import("./pages/admin/AdminIntegrations"));
const AdminPostGenerator = lazy(() => import("./pages/admin/AdminPostGenerator"));
const AdminMailSettings = lazy(() => import("./pages/admin/AdminMailSettings"));
const AdminSupportInbox = lazy(() => import("./pages/admin/AdminSupportInbox"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminBkashTransactions = lazy(() => import("./pages/admin/AdminBkashTransactions"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <CartDrawer />
                <MetaPixelProvider />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/bkash/callback" element={<BkashCallback />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                    <Route path="/admin/products" element={<AdminGuard><AdminProducts /></AdminGuard>} />
                    <Route path="/admin/orders" element={<AdminGuard><AdminOrders /></AdminGuard>} />
                    <Route path="/admin/customers" element={<AdminGuard><AdminCustomers /></AdminGuard>} />
                    <Route path="/admin/sales" element={<AdminGuard><AdminSales /></AdminGuard>} />
                    <Route path="/admin/coupons" element={<AdminGuard><AdminCoupons /></AdminGuard>} />
                    <Route path="/admin/reviews" element={<AdminGuard><AdminReviews /></AdminGuard>} />
                    <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
                    <Route path="/admin/integrations" element={<AdminGuard><AdminIntegrations /></AdminGuard>} />
                    <Route path="/admin/post-generator" element={<AdminGuard><AdminPostGenerator /></AdminGuard>} />
                    <Route path="/admin/mail-settings" element={<AdminGuard><AdminMailSettings /></AdminGuard>} />
                    <Route path="/admin/support-inbox" element={<AdminGuard><AdminSupportInbox /></AdminGuard>} />
                    <Route path="/admin/activity" element={<AdminGuard><AdminActivityLog /></AdminGuard>} />
                    <Route path="/admin/newsletter" element={<AdminGuard><AdminNewsletter /></AdminGuard>} />
                    <Route path="/admin/blog" element={<AdminGuard><AdminBlog /></AdminGuard>} />
                    <Route path="/admin/bkash-transactions" element={<AdminGuard><AdminBkashTransactions /></AdminGuard>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
