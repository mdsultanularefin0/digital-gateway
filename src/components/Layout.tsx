import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-16">{children}</main>
      {/* Spacer to prevent floating mobile language toggle from overlapping footer/content */}
      <div className="md:hidden h-4" aria-hidden>
      <Footer />
    </div>
  );
}
