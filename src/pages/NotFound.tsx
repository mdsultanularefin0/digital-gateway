import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, ShoppingBag } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: Non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <Layout>
      <SEOHead
        title="Page Not Found (404)"
        description="The page you're looking for doesn't exist."
        noIndex
        disableHreflang
      />
      <section className="py-20 md:py-32">
        <div className="container max-w-lg text-center">
          <p className="text-7xl md:text-8xl font-display font-bold gradient-text mb-4">404</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The page <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{location.pathname}</span> doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="gradient" asChild>
              <Link to="/"><Home className="h-4 w-4 mr-2" /> Back to Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/products"><ShoppingBag className="h-4 w-4 mr-2" /> Browse Products</Link>
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
