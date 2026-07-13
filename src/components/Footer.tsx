import { nav, site } from "@/lib/content";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line py-16">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-2xl tracking-tight">QUAD SPACE</p>
            <p className="mt-4 max-w-xs text-balance text-ink-soft">
              Suas ideias encontraram um lugar.
            </p>
          </div>

          <nav
            aria-label="Navegação do rodapé"
            className="flex flex-col gap-3 md:col-span-3"
          >
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 md:col-span-4">
            <a
              href={`mailto:${site.email}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {site.email}
            </a>
            <a
              href={`tel:${site.phone}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {site.phone}
            </a>
            <a
              href={site.instagramUrl}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {site.instagram}
            </a>
            <p className="text-ink-soft">{site.address}</p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} QUAD SPACE. Todos os direitos reservados.</p>
          <p>Estúdio e espaço para criação.</p>
        </div>
      </div>
    </footer>
  );
}
