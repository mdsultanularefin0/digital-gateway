
INSERT INTO public.landing_pages (title, slug, template, published, language_mode, sections_en, sections_bn)
VALUES (
  'License Subscription',
  'license-subscription',
  'digital-sales',
  true,
  'en',
  jsonb_build_object(
    'hero', jsonb_build_object(
      'badge', 'Premium License',
      'heading', 'Unlock the Full Power of Your Favorite Software',
      'subheading', 'Get instant access to genuine, activated license keys. One subscription, unlimited productivity.',
      'buttonText', 'Get My License Now',
      'buttonUrl', '#pricing',
      'imageUrl', ''
    ),
    'product-showcase', jsonb_build_object(
      'heading', 'A License Built for Professionals',
      'subheading', 'Genuine activation, instant delivery, priority support — everything you need in one subscription.',
      'productName', 'Premium License Subscription'
    ),
    'features', jsonb_build_object(
      'heading', 'What You Get',
      'subheading', 'Everything included in your subscription',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'Genuine License Key', 'description', 'Official, activated key delivered instantly after payment.', 'icon', 'KeyRound'),
        jsonb_build_object('title', 'Instant Delivery', 'description', 'Receive your license by email within seconds of checkout.', 'icon', 'Zap'),
        jsonb_build_object('title', 'Multi-Device Access', 'description', 'Activate across your allowed devices with a single subscription.', 'icon', 'Monitor'),
        jsonb_build_object('title', 'Priority Support', 'description', '24/7 support from real humans who know the product.', 'icon', 'Headphones'),
        jsonb_build_object('title', 'Free Renewals Notice', 'description', 'We notify you before renewal — no surprise charges.', 'icon', 'BellRing'),
        jsonb_build_object('title', 'Secure Payment', 'description', 'Pay via bKash, Nagad, or card. All transactions encrypted.', 'icon', 'ShieldCheck')
      )
    ),
    'how-it-works', jsonb_build_object(
      'heading', 'How It Works',
      'subheading', 'Three simple steps to full access',
      'items', jsonb_build_array(
        jsonb_build_object('title', '1. Choose Your Plan', 'description', 'Pick monthly, quarterly, or annual — cancel anytime.'),
        jsonb_build_object('title', '2. Complete Checkout', 'description', 'Secure payment via bKash, Nagad, or card in under a minute.'),
        jsonb_build_object('title', '3. Activate & Enjoy', 'description', 'License key arrives in your inbox instantly. Activate and go.')
      )
    ),
    'testimonial', jsonb_build_object(
      'heading', 'Trusted by 10,000+ Users',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'Rakib H.', 'description', '"Got my license within 30 seconds. Worked on the first try. Best decision this year."'),
        jsonb_build_object('title', 'Sadia A.', 'description', '"Cheaper than the official site and delivery was instant. Support answered me at 2am!"'),
        jsonb_build_object('title', 'Tanvir M.', 'description', '"I subscribe every year now. Zero issues, zero downtime."')
      )
    ),
    'countdown', jsonb_build_object(
      'heading', 'Limited Time Launch Offer',
      'subheading', 'Save 30% on your first subscription cycle',
      'countdownDate', (now() + interval '7 days')::text
    ),
    'pricing', jsonb_build_object(
      'heading', 'Simple, Transparent Pricing',
      'subheading', 'Pick the plan that fits you. Upgrade or cancel anytime.',
      'price', '৳1,499',
      'originalPrice', '৳2,499',
      'badge', 'Most Popular · Annual',
      'buttonText', 'Subscribe Now',
      'buttonUrl', '#checkout',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'Monthly', 'description', '৳199/mo · Cancel anytime'),
        jsonb_build_object('title', 'Quarterly', 'description', '৳499/3mo · Save 17%'),
        jsonb_build_object('title', 'Annual', 'description', '৳1,499/yr · Save 37%')
      )
    ),
    'guarantee', jsonb_build_object(
      'heading', '7-Day Money-Back Guarantee',
      'subheading', 'If your license does not activate or you are not satisfied, we refund you — no questions asked.'
    ),
    'faq', jsonb_build_object(
      'heading', 'Frequently Asked Questions',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'How fast is delivery?', 'description', 'Your license key is emailed within seconds of successful payment.'),
        jsonb_build_object('title', 'Is this a genuine license?', 'description', 'Yes. Every key is sourced from authorized channels and comes with a working activation guarantee.'),
        jsonb_build_object('title', 'Can I cancel anytime?', 'description', 'Yes. You can cancel from your account dashboard and keep access until the current cycle ends.'),
        jsonb_build_object('title', 'Which payment methods are supported?', 'description', 'bKash, Nagad, and international cards via bKash PGW.'),
        jsonb_build_object('title', 'What if my key does not work?', 'description', 'Contact support and we will replace it immediately, or issue a full refund.')
      )
    ),
    'cta', jsonb_build_object(
      'heading', 'Ready to Activate?',
      'subheading', 'Join thousands of professionals who trust us for their licenses.',
      'buttonText', 'Get Started Now',
      'buttonUrl', '#checkout'
    ),
    'checkout', jsonb_build_object(
      'heading', 'Complete Your Subscription',
      'subheading', 'Secure checkout. Instant delivery.'
    )
  ),
  '{}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  template = EXCLUDED.template,
  sections_en = EXCLUDED.sections_en,
  published = true,
  updated_at = now();
