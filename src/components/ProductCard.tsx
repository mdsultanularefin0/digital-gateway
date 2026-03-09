import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { type Product } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function ProductCard({ product }: { product: Product }) {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[4px] glass-card transition-all duration-300 hover:shadow-glow hover:border-primary/30"
    >
      <div className="aspect-video w-full overflow-hidden bg-secondary">
        <div className="flex h-full items-center justify-center gradient-bg opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <span className="text-4xl font-display font-bold text-foreground/20">{product.name[0]}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-[4px] bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-wider uppercase text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-display font-semibold text-silver-bright group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.tagline}</p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border mt-4">
          <span className="text-lg font-bold text-silver-bright">
            {currencySymbol}{product.price}
          </span>
          <span className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
            View Details <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
