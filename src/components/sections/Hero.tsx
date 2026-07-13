import { Placeholder } from "@/components/ui/Placeholder";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-32 pb-16 md:pb-20"
    >
      <div className="container-edit grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <p className="mb-6 text-sm tracking-tight text-ink-soft">
            Estúdio &amp; espaço para criação — São Paulo
          </p>
          <h1 className="text-balance font-serif text-[13vw] leading-[0.95] tracking-tightest text-ink sm:text-[9vw] lg:text-[5.4vw]">
            Suas ideias
            <br />
            encontraram
            <br />
            um lugar.
          </h1>
        </div>

        <div className="flex flex-col justify-end gap-8 lg:col-span-5">
          <p className="max-w-md text-balance text-lg text-ink-soft">
            Fotografia, audiovisual, campanhas e produção de conteúdo dividem
            o mesmo endereço — pensado para quem leva a criação a sério.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#reserva"
              className="rounded-full bg-ink px-7 py-3.5 text-sm text-paper transition-colors hover:bg-clay"
            >
              Reservar o espaço
            </a>
            <a
              href="#espaco"
              className="rounded-full border border-line px-7 py-3.5 text-sm text-ink transition-colors hover:border-ink"
            >
              Conhecer o espaço
            </a>
          </div>
        </div>
      </div>

      <div className="container-edit mt-16">
        <Placeholder
          label="QUAD SPACE — Vista geral do estúdio"
          ratio="landscape"
          className="w-full"
        />
      </div>
    </section>
  );
}
