import Link from "next/link";
import { address, buildWhatsappLink, contact, nav, site } from "@/config/site";
import { footer } from "@/lib/content";

export function Footer() {
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsappLink(contact.whatsappMessageQuestion);

  return (
    <footer className="border-t border-line py-16">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-2xl tracking-tight">{site.name}</p>
            <p className="mt-4 max-w-xs text-balance text-ink-soft">
              {footer.tagline}
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
              href={contact.instagramUrl}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {contact.instagramHandle}
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${contact.email}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {contact.email}
            </a>
            <p className="text-ink-soft">{address.full}</p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. {footer.rights}
          </p>
          <Link href="/privacidade" className="hover:text-ink-soft">
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
