import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal } from "@/components/ui/Reveal";
import { spaceSection } from "@/lib/content";

export function Space() {
  return (
    <section id="espaco" className="py-28 md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-4">
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {spaceSection.kicker}
            </p>
            <h2 className="text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {spaceSection.title}
            </h2>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-xl text-balance text-lg leading-relaxed text-ink-soft">
              {spaceSection.intro}
            </p>
          </Reveal>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
          {spaceSection.items.map((item, index) => (
            <Reveal key={item.title} delay={(index % 2) * 0.08}>
              <Placeholder
                label={`O Espaço — ${item.title}`}
                ratio="landscape"
                className="mb-6 w-full"
              />
              <h3 className="mb-2 font-serif text-2xl tracking-tight">
                {item.title}
              </h3>
              <p className="max-w-md text-balance leading-relaxed text-ink-soft">
                {item.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
