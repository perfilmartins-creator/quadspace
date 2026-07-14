import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { contact } from "@/config/site";
import { gallery } from "@/lib/content";

const spanClasses = {
  portrait: "md:row-span-2",
  landscape: "md:col-span-2",
  square: "",
} as const;

const aspectClasses = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
} as const;

export function Gallery() {
  return (
    <section id="galeria" className="py-28 md:py-40">
      <div className="container-edit">
        <Reveal className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {gallery.kicker}
            </p>
            <h2 className="max-w-xl text-balance font-light text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {gallery.title}
            </h2>
          </div>
          <a
            href={contact.instagramUrl}
            className="shrink-0 text-sm text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            Ver mais no Instagram
          </a>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:auto-rows-[16rem] md:grid-cols-4">
          {gallery.items.map((item, index) => (
            <Reveal
              key={item.label}
              delay={(index % 4) * 0.06}
              className={`h-full ${spanClasses[item.ratio]}`}
            >
              <div
                className={`relative w-full overflow-hidden border border-line md:h-full ${aspectClasses[item.ratio]} md:aspect-auto`}
              >
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  loading="lazy"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
