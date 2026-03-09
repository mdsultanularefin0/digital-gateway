import { Layout } from "@/components/Layout";
import { faqs } from "@/data/products";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-display font-bold md:text-5xl">FAQ</h1>
            <p className="mt-4 text-muted-foreground">Everything you need to know about our products and services.</p>
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
