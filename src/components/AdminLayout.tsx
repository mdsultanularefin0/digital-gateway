import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Tag,
  MessageSquare, Settings, LogOut, Menu, X, Zap, ChevronLeft, Plug,
  ImageIcon, Mail, Inbox, Clock, Newspaper, CreditCard, FileText,
  PanelTop, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "items" in entry;

const navStructure: NavEntry[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  {
    label: "Commerce",
    icon: ShoppingCart,
    items: [
      { label: "Products", to: "/admin/products", icon: Package },
      { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
      { label: "Customers", to: "/admin/customers", icon: Users },
      { label: "Sales", to: "/admin/sales", icon: BarChart3 },
      { label: "Coupons", to: "/admin/coupons", icon: Tag },
      { label: "Reviews", to: "/admin/reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Payments",
    icon: CreditCard,
    items: [
      { label: "bKash Transactions", to: "/admin/bkash-transactions", icon: CreditCard },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    items: [
      { label: "Landing Pages", to: "/admin/landing-pages", icon: PanelTop },
      { label: "Blog", to: "/admin/blog", icon: FileText },
      { label: "Post Generator", to: "/admin/post-generator", icon: ImageIcon },
      { label: "Newsletter", to: "/admin/newsletter", icon: Newspaper },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { label: "Integrations", to: "/admin/integrations", icon: Plug },
      { label: "Mail Settings", to: "/admin/mail-settings", icon: Mail },
      { label: "Support Inbox", to: "/admin/support-inbox", icon: Inbox },
      { label: "Activity Log", to: "/admin/activity", icon: Clock },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

// Flatten all links for header title lookup
const allLinks: NavItem[] = navStructure.flatMap((entry) =>
  isGroup(entry) ? entry.items : [entry]
);

function isLinkActive(to: string, pathname: string) {
  return to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
}

function NavGroupSection({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasActive = group.items.some((i) => isLinkActive(i.to, pathname));
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="ml-4 border-l border-border pl-2 mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isLinkActive(item.to, pathname)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r glass-strong transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
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
          <button onClick={closeSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1 pb-20">
          {navStructure.map((entry) =>
            isGroup(entry) ? (
              <NavGroupSection
                key={entry.label}
                group={entry}
                pathname={location.pathname}
                onNavigate={closeSidebar}
              />
            ) : (
              <Link
                key={entry.to}
                to={entry.to}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isLinkActive(entry.to, location.pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <entry.icon className="h-4 w-4 shrink-0" />
                {entry.label}
              </Link>
            )
          )}
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
        <div className="fixed inset-0 z-40 bg-background/50 lg:hidden" onClick={closeSidebar} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display font-semibold text-lg">
            {allLinks.find((l) => isLinkActive(l.to, location.pathname))?.label ?? "Admin"}
          </h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
