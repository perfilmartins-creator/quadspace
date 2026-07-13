import { Reveal } from "@/components/ui/Reveal";
import { structure } from "@/lib/content";

export function Structure() {
  return (
    <section id="estrutura" className="border-t border-line py-28 md:py-40">
      <div className="container-edit">
        <Reveal>
          <p className="mb-6 text-sm tracking-tight text-ink-soft">
            {structure.kicker}
          </p>
          <h2 className="max-w-2xl text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
            {structure.title}
          </h2>
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-3">
          {structure.categories.map((category, index) => (
            <Reveal key={category.title} delay={index * 0.08}>
              <h3 className="mb-6 border-b border-line pb-4 font-serif text-xl tracking-tight">
                {category.title}
              </h3>
              <ul className="space-y-4">
                {category.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-3 text-ink-soft"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-clay"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
