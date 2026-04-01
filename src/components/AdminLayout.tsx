import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Tag, MessageSquare, Settings, LogOut, Menu, X, Zap, ChevronLeft, Plug, ImageIcon, Mail, Inbox, Clock, Newspaper, CreditCard, FileText, PanelTop } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Sales", to: "/admin/sales", icon: BarChart3 },
  { label: "Coupons", to: "/admin/coupons", icon: Tag },
  { label: "Reviews", to: "/admin/reviews", icon: MessageSquare },
  { label: "Activity Log", to: "/admin/activity", icon: Clock },
  { label: "Integrations", to: "/admin/integrations", icon: Plug },
  { label: "bKash Transactions", to: "/admin/bkash-transactions", icon: CreditCard },
  { label: "Landing Pages", to: "/admin/landing-pages", icon: PanelTop },
  { label: "Blog", to: "/admin/blog", icon: FileText },
  { label: "Post Generator", to: "/admin/post-generator", icon: ImageIcon },
  { label: "Newsletter", to: "/admin/newsletter", icon: Newspaper },
  { label: "Mail Settings", to: "/admin/mail-settings", icon: Mail },
  { label: "Support Inbox", to: "/admin/support-inbox", icon: Inbox },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-bg">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            Admin
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1 pb-20">
          {adminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                (link.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(link.to))
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild className="flex-1">
              <Link to="/"><ChevronLeft className="h-3.5 w-3.5 mr-1" /> Site</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 text-destructive hover:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display font-semibold text-lg">
            {adminLinks.find((l) => (l.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(l.to)))?.label ?? "Admin"}
          </h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
