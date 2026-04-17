// Simple UI-strings dictionary. Extend anytime.
// Keys are stable identifiers; values are [en, bn].

export type Lang = "en" | "bn";

export const STRINGS = {
  // Header / Nav
  "nav.products": ["Products", "প্রোডাক্ট"],
  "nav.blog": ["Blog", "ব্লগ"],
  "nav.about": ["About", "সম্পর্কে"],
  "nav.contact": ["Contact", "যোগাযোগ"],
  "nav.search": ["Search", "খুঁজুন"],
  "nav.cart": ["Cart", "কার্ট"],
  "nav.account": ["My Account", "আমার অ্যাকাউন্ট"],
  "nav.profile": ["Profile", "প্রোফাইল"],
  "nav.login": ["Login", "লগইন"],
  "nav.logout": ["Logout", "লগআউট"],
  "nav.signup": ["Sign Up", "সাইন আপ"],
  "nav.admin": ["Admin", "অ্যাডমিন"],

  // Common actions
  "action.buy_now": ["Buy Now", "এখনই কিনুন"],
  "action.add_to_cart": ["Add to Cart", "কার্টে যোগ করুন"],
  "action.view_details": ["View Details", "বিস্তারিত দেখুন"],
  "action.checkout": ["Checkout", "চেকআউট"],
  "action.continue_shopping": ["Continue Shopping", "কেনাকাটা চালিয়ে যান"],
  "action.place_order": ["Place Order", "অর্ডার দিন"],
  "action.submit": ["Submit", "জমা দিন"],
  "action.save": ["Save", "সংরক্ষণ করুন"],
  "action.cancel": ["Cancel", "বাতিল"],
  "action.send": ["Send", "পাঠান"],
  "action.download": ["Download", "ডাউনলোড"],
  "action.read_more": ["Read More", "আরও পড়ুন"],
  "action.apply": ["Apply", "প্রয়োগ করুন"],
  "action.learn_more": ["Learn More", "আরও জানুন"],
  "action.subscribe": ["Subscribe", "সাবস্ক্রাইব"],
  "action.share": ["Share", "শেয়ার"],

  // Product / catalog
  "product.featured": ["Featured", "ফিচারড"],
  "product.new": ["New", "নতুন"],
  "product.popular": ["Popular", "জনপ্রিয়"],
  "product.in_stock": ["In Stock", "স্টকে আছে"],
  "product.out_of_stock": ["Out of Stock", "স্টকে নেই"],
  "product.starting_at": ["Starting at", "শুরু মাত্র"],
  "product.description": ["Description", "বিবরণ"],
  "product.features": ["Features", "বৈশিষ্ট্য"],
  "product.reviews": ["Reviews", "রিভিউ"],
  "product.related": ["Related Products", "সম্পর্কিত পণ্য"],
  "product.all_products": ["All Products", "সকল পণ্য"],
  "product.search_placeholder": ["Search products…", "পণ্য খুঁজুন…"],
  "product.no_results": ["No products found", "কোনো পণ্য পাওয়া যায়নি"],
  "product.categories": ["Categories", "ক্যাটাগরি"],

  // Cart
  "cart.title": ["Your Cart", "আপনার কার্ট"],
  "cart.empty": ["Your cart is empty", "আপনার কার্ট খালি"],
  "cart.empty_sub": ["Add some products to get started", "শুরু করতে কিছু পণ্য যোগ করুন"],
  "cart.subtotal": ["Subtotal", "উপমোট"],
  "cart.total": ["Total", "মোট"],
  "cart.discount": ["Discount", "ছাড়"],
  "cart.shipping": ["Shipping", "শিপিং"],
  "cart.quantity": ["Quantity", "পরিমাণ"],
  "cart.remove": ["Remove", "সরান"],

  // Checkout
  "checkout.title": ["Checkout", "চেকআউট"],
  "checkout.customer_info": ["Customer Information", "কাস্টমার তথ্য"],
  "checkout.full_name": ["Full Name", "পূর্ণ নাম"],
  "checkout.email": ["Email", "ইমেইল"],
  "checkout.phone": ["Phone", "ফোন"],
  "checkout.address": ["Address", "ঠিকানা"],
  "checkout.city": ["City", "শহর"],
  "checkout.country": ["Country", "দেশ"],
  "checkout.payment_method": ["Payment Method", "পেমেন্ট পদ্ধতি"],
  "checkout.coupon_code": ["Coupon Code", "কুপন কোড"],
  "checkout.order_summary": ["Order Summary", "অর্ডার সারসংক্ষেপ"],
  "checkout.order_notes": ["Order Notes", "অর্ডার নোট"],
  "checkout.required": ["Required", "আবশ্যক"],

  // Account
  "account.title": ["My Account", "আমার অ্যাকাউন্ট"],
  "account.orders": ["My Orders", "আমার অর্ডার"],
  "account.downloads": ["My Downloads", "আমার ডাউনলোড"],
  "account.profile": ["Profile", "প্রোফাইল"],
  "account.password": ["Password", "পাসওয়ার্ড"],
  "account.no_orders": ["No orders yet", "এখনও কোনো অর্ডার নেই"],

  // Footer
  "footer.quick_links": ["Quick Links", "দ্রুত লিঙ্ক"],
  "footer.company": ["Company", "কোম্পানি"],
  "footer.legal": ["Legal", "আইনি"],
  "footer.newsletter": ["Newsletter", "নিউজলেটার"],
  "footer.newsletter_sub": ["Get updates and special offers", "আপডেট এবং বিশেষ অফার পান"],
  "footer.rights": ["All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।"],
  "footer.privacy": ["Privacy Policy", "গোপনীয়তা নীতি"],
  "footer.terms": ["Terms of Service", "সেবার শর্তাবলী"],
  "footer.faq": ["FAQ", "প্রশ্নোত্তর"],

  // Language toggle
  "lang.english": ["English", "English"],
  "lang.bangla": ["বাংলা", "বাংলা"],
  "lang.switch": ["Switch language", "ভাষা পরিবর্তন"],

  // Generic
  "common.loading": ["Loading…", "লোড হচ্ছে…"],
  "common.error": ["Something went wrong", "কিছু ভুল হয়েছে"],
  "common.success": ["Success", "সফল"],
  "common.required_field": ["This field is required", "এই ঘরটি আবশ্যক"],
} as const;

export type StringKey = keyof typeof STRINGS;

export function translate(key: StringKey, lang: Lang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang === "bn" ? 1 : 0] || entry[0];
}
