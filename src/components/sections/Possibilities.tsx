import { Reveal } from "@/components/ui/Reveal";
import { possibilities } from "@/lib/content";

export function Possibilities() {
  return (
    <section id="possibilidades" className="border-t border-line py-28 md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {possibilities.kicker}
            </p>
            <h2 className="text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {possibilities.title}
            </h2>
            <p className="mt-6 max-w-xs text-balance leading-relaxed text-ink-soft">
              {possibilities.intro}
            </p>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            <p className="text-balance font-serif text-3xl leading-[1.2] tracking-tight text-ink sm:text-4xl">
              {possibilities.items.map((item, index) => (
                <span key={item}>
                  {item}
                  {index < possibilities.items.length - 1 && (
                    <span className="text-ink-faint"> · </span>
                  )}
                </span>
              ))}
            </p>
            <p className="mt-12 border-t border-line pt-8 text-balance text-lg leading-relaxed text-clay">
              {possibilities.tagline}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
