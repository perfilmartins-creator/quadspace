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
          className="flex w-full items-center justify-between gap-6 py-7 text-left sm:py-8"
        >
          <span className="text-balance font-serif text-xl leading-snug tracking-tight sm:text-2xl lg:text-[1.85rem]">
            {question}
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-3xl leading-none text-ink-soft transition-transform duration-300 ${
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
          isOpen ? "grid-rows-[1fr] pb-8 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="max-w-2xl text-balance text-base leading-relaxed text-ink-soft sm:text-lg">
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
        <Reveal className="mb-16">
          <p className="mb-6 text-sm tracking-tight text-ink-soft">
            {faq.kicker}
          </p>
          <h2 className="max-w-2xl text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
            {faq.title}
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="lg:pl-[calc(4/12*100%)]">
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
    </section>
  );
}
