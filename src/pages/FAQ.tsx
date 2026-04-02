import { Layout } from "@/components/Layout";
import { faqs as defaultFaqs } from "@/data/products";
import { usePageContents } from "@/hooks/use-page-contents";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  const { data: pageContent } = usePageContents("faq");
  const heading = pageContent?.heading || "FAQ";
  const subheading = pageContent?.subheading || "Everything you need to know about our products and services.";

  let faqs = defaultFaqs;
  if (pageContent?.items) {
    try {
      const parsed = JSON.parse(pageContent.items);
      if (Array.isArray(parsed) && parsed.length > 0) {
        faqs = parsed.map((item: { question: string; answer: string }) => ({
          question: item.question,
          answer: item.answer,
        }));
      }
    } catch {}
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-bold md:text-5xl">{heading}</h1>
            <p className="mt-4 text-muted-foreground">{subheading}</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-medium text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Layout>
  );
}
