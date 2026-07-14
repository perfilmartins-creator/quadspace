import { Reveal } from "@/components/ui/Reveal";
import { contact } from "@/config/site";
import { location } from "@/lib/content";

export function Location() {
  return (
    <section id="localizacao" className="border-t border-line py-28 md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-4">
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {location.kicker}
            </p>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            <h2 className="text-balance font-light text-4xl leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
              {location.title}
            </h2>
            <p className="mt-3 text-lg text-ink-soft">{location.subtitle}</p>
            <p className="mt-6 max-w-md text-balance leading-relaxed text-ink-soft">
              {location.body}
            </p>

            {contact.mapsUrl ? (
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block border border-ink bg-ink px-7 py-3.5 text-sm text-paper transition-colors hover:bg-paper hover:text-ink"
              >
                Ver no Google Maps
              </a>
            ) : (
              <p className="mt-8 inline-block border border-line px-7 py-3.5 text-sm text-ink-soft">
                Link do Google Maps a confirmar
              </p>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
