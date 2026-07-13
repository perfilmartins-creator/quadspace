"use client";

import { useId, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { faq } from "@/lib/content";

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-6 py-6 text-left"
        >
          <span className="text-balance font-serif text-xl tracking-tight sm:text-2xl">
            {question}
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-2xl text-ink-soft transition-transform duration-300 ${
              isOpen ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="max-w-2xl text-balance leading-relaxed text-ink-soft">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-line py-28 md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {faq.kicker}
            </p>
            <h2 className="text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {faq.title}
            </h2>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            {faq.items.map((item, index) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex((current) => (current === index ? null : index))
                }
              />
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
