import Image from "next/image";
import { hero } from "@/lib/content";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-32 pb-16 md:pb-20"
    >
      <div className="container-edit grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <p className="mb-6 text-sm tracking-tight text-ink-soft">
            {hero.eyebrow}
          </p>
          <h1 className="text-balance font-serif text-[13vw] leading-[0.95] tracking-tightest text-ink sm:text-[9vw] lg:text-[5.4vw]">
            {hero.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
        </div>

        <div className="flex flex-col justify-end gap-8 lg:col-span-5">
          <p className="max-w-md text-balance text-lg text-ink-soft">
            {hero.body}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={hero.ctaSecondary.href}
              className="rounded-full bg-ink px-7 py-3.5 text-sm text-paper transition-colors hover:bg-clay"
            >
              {hero.ctaSecondary.label}
            </a>
            <a
              href={hero.ctaPrimary.href}
              className="rounded-full border border-line px-7 py-3.5 text-sm text-ink transition-colors hover:border-ink"
            >
              {hero.ctaPrimary.label}
            </a>
          </div>
        </div>
      </div>

      <div className="container-edit mt-16">
        <div className="relative aspect-[4/3] w-full overflow-hidden border border-line sm:aspect-[16/9]">
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            fill
            priority
            sizes="(min-width: 1280px) 90rem, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
