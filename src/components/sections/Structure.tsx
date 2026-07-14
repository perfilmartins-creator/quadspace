import { Reveal } from "@/components/ui/Reveal";
import { equipment } from "@/config/site";
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
          <p className="mt-6 max-w-md text-balance leading-relaxed text-ink-soft">
            {structure.subtitle}
          </p>
        </Reveal>

        <div className="mt-16">
          {equipment.map((category, index) => (
            <Reveal
              key={category.number}
              delay={index * 0.05}
              className="grid grid-cols-1 gap-x-8 gap-y-6 border-t border-line py-10 first:border-t-2 first:border-t-ink md:grid-cols-12"
            >
              <div className="md:col-span-3">
                <span className="block font-serif text-3xl tracking-tight text-ink-faint">
                  {category.number}
                </span>
                <h3 className="mt-1 font-serif text-xl tracking-tight">
                  {category.title}
                </h3>
              </div>

              <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 md:col-span-9">
                {category.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline justify-between gap-4 border-b border-line pb-3 text-ink-soft"
                  >
                    <span>{item.name}</span>
                    {item.qty ? (
                      <span className="shrink-0 font-serif text-ink">
                        {item.qty}×
                      </span>
                    ) : null}
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
