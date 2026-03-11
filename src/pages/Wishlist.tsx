import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/contexts/WishlistContext";
import { useProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const { data: products = [] } = useProducts();

  const wishlistProducts = products.filter((p) => items.includes(p.id));

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-display font-bold">My Wishlist</h1>
              <p className="mt-1 text-muted-foreground">{wishlistProducts.length} saved item{wishlistProducts.length !== 1 ? "s" : ""}</p>
            </div>
            {wishlistProducts.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearWishlist}>Clear All</Button>
            )}
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="text-xl font-display font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">Browse products and tap the heart icon to save them.</p>
              <Button variant="gradient" asChild>
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
