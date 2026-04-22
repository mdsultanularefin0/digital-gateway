import { useState } from "react";
import { Mail, User, Clock, MessageCircle, Package, CheckCircle2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { DownloadLinks } from "@/components/DownloadLinks";

type Lang = "en" | "bn";

const content = {
  en: {
    toggle: "বাংলায় দেখুন",
    title: "What happens next?",
    subtitle: "Please read the instructions below carefully.",
    items: [
      {
        icon: Mail,
        title: "Check your email",
        body: "Order confirmation has been sent to your email. If your payment is verified, your product (code, account, or download link) will arrive in the same email within minutes.",
      },
      {
        icon: User,
        title: "View in your account",
        body: "An account has been created for you automatically. Log in to 'My Account' anytime to view your order, copy codes, or re-download your files.",
      },
      {
        icon: Clock,
        title: "Manual payment verification",
        body: "If you paid via bKash/Nagad Send Money and it wasn't auto-verified, our team will verify it within 1–6 hours and deliver your product. Please be patient.",
      },
      {
        icon: Package,
        title: "Service products",
        body: "For top-up / service products, our team will fulfill your order manually after payment confirmation. You'll get an email update.",
      },
      {
        icon: MessageCircle,
        title: "Need help?",
        body: "If you don't receive your product within the expected time, contact us via WhatsApp or email with your order number.",
      },
    ],
    spamNote: "Tip: If you don't see the email, please check your Spam / Promotions folder.",
  },
  bn: {
    toggle: "View in English",
    title: "এরপর কী হবে?",
    subtitle: "অনুগ্রহ করে নিচের নির্দেশনাগুলো ভালোভাবে পড়ুন।",
    items: [
      {
        icon: Mail,
        title: "আপনার ইমেইল চেক করুন",
        body: "অর্ডার কনফার্মেশন আপনার ইমেইলে পাঠানো হয়েছে। পেমেন্ট ভেরিফাই হলে আপনার প্রোডাক্ট (কোড, অ্যাকাউন্ট বা ডাউনলোড লিংক) কয়েক মিনিটের মধ্যে একই ইমেইলে চলে আসবে।",
      },
      {
        icon: User,
        title: "অ্যাকাউন্টে দেখুন",
        body: "আপনার জন্য অটোমেটিক একটি অ্যাকাউন্ট তৈরি করা হয়েছে। যেকোনো সময় 'My Account'-এ লগইন করে অর্ডার দেখতে, কোড কপি করতে বা ফাইল আবার ডাউনলোড করতে পারবেন।",
      },
      {
        icon: Clock,
        title: "ম্যানুয়াল পেমেন্ট ভেরিফিকেশন",
        body: "যদি bKash/Nagad Send Money দিয়ে পেমেন্ট করেন এবং অটো-ভেরিফাই না হয়, আমাদের টিম ১–৬ ঘণ্টার মধ্যে ভেরিফাই করে প্রোডাক্ট ডেলিভার করবে। একটু ধৈর্য ধরুন।",
      },
      {
        icon: Package,
        title: "সার্ভিস প্রোডাক্ট",
        body: "টপ-আপ / সার্ভিস প্রোডাক্টের ক্ষেত্রে পেমেন্ট কনফার্ম হওয়ার পর আমাদের টিম ম্যানুয়ালি অর্ডার ফুলফিল করবে। ইমেইলে আপডেট পাবেন।",
      },
      {
        icon: MessageCircle,
        title: "সাহায্য দরকার?",
        body: "নির্ধারিত সময়ের মধ্যে প্রোডাক্ট না পেলে অর্ডার নাম্বার সহ WhatsApp বা ইমেইলে যোগাযোগ করুন।",
      },
    ],
    spamNote: "টিপ: ইমেইল না পেলে অনুগ্রহ করে Spam / Promotions ফোল্ডার চেক করুন।",
  },
};

export function OrderSuccessInstructions({ defaultLang = "en", orderId }: { defaultLang?: Lang; orderId?: string }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const { data: settings } = useSiteSettings();
  const t = content[lang];

  const whatsapp = settings?.whatsapp_number;
  const email = settings?.support_email || settings?.contact_email;

  return (
    <>
    {orderId && <DownloadLinks orderId={orderId} />}
    <div className="mt-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 text-left">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t.title}</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
          className="h-7 text-xs"
        >
          <Languages className="h-3 w-3 mr-1" />
          {t.toggle}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t.subtitle}</p>

      <ul className="space-y-3">
        {t.items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">{t.spamNote}</p>
        {(whatsapp || email) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {whatsapp && (
              <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </a>
              </Button>
            )}
            {email && (
              <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                <a href={`mailto:${email}`}>
                  <Mail className="h-3 w-3 mr-1" />
                  {email}
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
