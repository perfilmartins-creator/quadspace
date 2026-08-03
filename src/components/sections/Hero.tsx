import Image from "next/image";
import { hero } from "@/lib/content";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden pt-32 pb-16 md:pb-20"
    >
      <div className="absolute inset-0 -z-10 bg-paper">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-15 grayscale"
        />
      </div>

      <div className="container-edit grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <p className="mb-6 text-sm tracking-tight text-ink-soft">
            {hero.eyebrow}
          </p>
          <h1 className="text-balance font-light text-[12.5vw] leading-[1.02] tracking-tightest text-ink sm:text-[10vw] lg:text-[6.2vw]">
            {hero.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
        </div>

        <div className="flex flex-col justify-end gap-8 lg:col-span-5">
          <div>
            <p className="max-w-md text-balance text-lg text-ink-soft">
              {hero.body}
            </p>
            <p className="mt-4 text-sm tracking-tight text-ink">
              {hero.priceHint}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={hero.ctaPrimary.href}
              className="border border-ink bg-ink px-7 py-3.5 text-sm text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              {hero.ctaPrimary.label}
            </a>
            <a
              href={hero.ctaSecondary.href}
              className="border border-ink px-7 py-3.5 text-sm text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              {hero.ctaSecondary.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
