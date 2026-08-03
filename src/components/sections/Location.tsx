import { Reveal } from "@/components/ui/Reveal";
import { address, contact } from "@/config/site";
import { location } from "@/lib/content";

const mapQuery = encodeURIComponent(
  `${address.street} - ${address.neighborhood}, ${address.city} - ${address.state}`
);
const mapEmbedSrc = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

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

            <div className="relative mt-10 aspect-[4/3] w-full max-w-md overflow-hidden border border-line sm:aspect-[16/10]">
              <iframe
                src={mapEmbedSrc}
                title="Localização da QUAD SPACE no Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full"
                style={{ border: 0 }}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
