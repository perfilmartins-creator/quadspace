import { Reveal } from "@/components/ui/Reveal";
import { spaceSection } from "@/lib/content";

export function Space() {
  return (
    <section id="espaco" className="bg-ink py-28 text-paper md:py-40">
      <div className="container-edit">
        <Reveal>
          <p className="mb-10 text-sm tracking-tight text-paper/60">
            {spaceSection.kicker}
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="max-w-4xl text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
            {spaceSection.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 border-t border-line-on-ink pt-14">
          <p className="max-w-xl text-balance text-lg leading-relaxed text-paper/75">
            {spaceSection.body}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
