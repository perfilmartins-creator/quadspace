import { Reveal } from "@/components/ui/Reveal";
import { manifesto } from "@/lib/content";

export function Manifesto() {
  return (
    <section
      id="manifesto"
      className="bg-ink py-28 text-paper md:py-40"
    >
      <div className="container-edit">
        <Reveal>
          <p className="mb-10 text-sm tracking-tight text-paper/60">
            {manifesto.kicker}
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="max-w-4xl text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
            {manifesto.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-line-on-ink pt-14 lg:grid-cols-2">
          {manifesto.body.map((paragraph, index) => (
            <Reveal key={paragraph} delay={0.1 + index * 0.05}>
              <p className="text-balance text-lg leading-relaxed text-paper/75">
                {paragraph}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
