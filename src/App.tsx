import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import { AdminGuard } from "@/components/AdminGuard";
import { CartDrawer } from "@/components/CartDrawer";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { lazyRetry, ChunkErrorBoundary } from "@/components/LazyRetry";
import Index from "./pages/Index";

// Lazy-loaded routes with retry logic
const Products = lazyRetry(() => import("./pages/Products"));
const ProductDetail = lazyRetry(() => import("./pages/ProductDetail"));
const Checkout = lazyRetry(() => import("./pages/Checkout"));
const BkashCallback = lazyRetry(() => import("./pages/BkashCallback"));
const About = lazyRetry(() => import("./pages/About"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const FAQ = lazyRetry(() => import("./pages/FAQ"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Login = lazyRetry(() => import("./pages/Login"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));

const Account = lazyRetry(() => import("./pages/Account"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPostPage = lazyRetry(() => import("./pages/BlogPost"));
const AdminDashboard = lazyRetry(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazyRetry(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazyRetry(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazyRetry(() => import("./pages/admin/AdminCustomers"));
const AdminSales = lazyRetry(() => import("./pages/admin/AdminSales"));
const AdminCoupons = lazyRetry(() => import("./pages/admin/AdminCoupons"));
const AdminReviews = lazyRetry(() => import("./pages/admin/AdminReviews"));
const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));
const AdminIntegrations = lazyRetry(() => import("./pages/admin/AdminIntegrations"));
const AdminPostGenerator = lazyRetry(() => import("./pages/admin/AdminPostGenerator"));
const AdminMailSettings = lazyRetry(() => import("./pages/admin/AdminMailSettings"));

const AdminActivityLog = lazyRetry(() => import("./pages/admin/AdminActivityLog"));
const AdminNewsletter = lazyRetry(() => import("./pages/admin/AdminNewsletter"));
const AdminBlog = lazyRetry(() => import("./pages/admin/AdminBlog"));
const AdminLandingPages = lazyRetry(() => import("./pages/admin/AdminLandingPages"));
const LandingPage = lazyRetry(() => import("./pages/LandingPage"));
const AdminBkashTransactions = lazyRetry(() => import("./pages/admin/AdminBkashTransactions"));
const AdminTransactions = lazyRetry(() => import("./pages/admin/AdminTransactions"));
const AdminPaymentSettings = lazyRetry(() => import("./pages/admin/AdminPaymentSettings"));
const AdminMfsVerifications = lazyRetry(() => import("./pages/admin/AdminMfsVerifications"));
const AdminPageEditor = lazyRetry(() => import("./pages/admin/AdminPageEditor"));
const AdminEmailTemplates = lazyRetry(() => import("./pages/admin/AdminEmailTemplates"));
const AdminStorage = lazyRetry(() => import("./pages/admin/AdminStorage"));
const AdminSocialPoster = lazyRetry(() => import("./pages/admin/AdminSocialPoster"));
const AdminEmailLogs = lazyRetry(() => import("./pages/admin/AdminEmailLogs"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

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
            
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <CartDrawer />
                <MetaPixelProvider />
                <ChunkErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:slug" element={<ProductDetail />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/bkash/callback" element={<BkashCallback />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
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
                      
                      <Route path="/admin/activity" element={<AdminGuard><AdminActivityLog /></AdminGuard>} />
                      <Route path="/admin/newsletter" element={<AdminGuard><AdminNewsletter /></AdminGuard>} />
                      <Route path="/admin/blog" element={<AdminGuard><AdminBlog /></AdminGuard>} />
                      <Route path="/admin/landing-pages" element={<AdminGuard><AdminLandingPages /></AdminGuard>} />
                      <Route path="/admin/transactions" element={<AdminGuard><AdminTransactions /></AdminGuard>} />
                      <Route path="/admin/bkash-transactions" element={<AdminGuard><AdminBkashTransactions /></AdminGuard>} />
                      <Route path="/admin/payment-settings" element={<AdminGuard><AdminPaymentSettings /></AdminGuard>} />
                      <Route path="/admin/mfs-verifications" element={<AdminGuard><AdminMfsVerifications /></AdminGuard>} />
                      <Route path="/admin/page-editor" element={<AdminGuard><AdminPageEditor /></AdminGuard>} />
                      <Route path="/admin/email-templates" element={<AdminGuard><AdminEmailTemplates /></AdminGuard>} />
                      <Route path="/admin/storage" element={<AdminGuard><AdminStorage /></AdminGuard>} />
                      <Route path="/admin/social-poster" element={<AdminGuard><AdminSocialPoster /></AdminGuard>} />
                      <Route path="/admin/email-logs" element={<AdminGuard><AdminEmailLogs /></AdminGuard>} />
                      <Route path="/p/:slug" element={<LandingPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ChunkErrorBoundary>
              </BrowserRouter>
            
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
