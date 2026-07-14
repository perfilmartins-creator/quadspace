import { Reveal } from "@/components/ui/Reveal";
import { address, buildWhatsappLink, contact } from "@/config/site";
import { booking } from "@/lib/content";

export function Booking() {
  const whatsappBookingHref = buildWhatsappLink(contact.whatsappMessageBooking);
  const whatsappQuestionHref = buildWhatsappLink(contact.whatsappMessageQuestion);

  const bookingHref = whatsappBookingHref ?? `mailto:${contact.email}`;
  const questionHref = whatsappQuestionHref ?? `mailto:${contact.email}`;

  return (
    <section id="reserva" className="bg-ink py-28 text-paper md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="mb-6 text-sm tracking-tight text-paper/60">
              {booking.kicker}
            </p>
            <h2 className="mb-6 text-balance font-light text-4xl leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
              {booking.title}
            </h2>
            <p className="max-w-md text-balance text-lg leading-relaxed text-paper/70">
              {booking.body}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a
                href={bookingHref}
                target={whatsappBookingHref ? "_blank" : undefined}
                rel={whatsappBookingHref ? "noopener noreferrer" : undefined}
                className="border border-paper bg-paper px-7 py-3.5 text-sm text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                {booking.ctaBooking}
              </a>
              <p className="text-lg tracking-tight">
                {booking.highlight}
              </p>
            </div>

            <a
              href={questionHref}
              target={whatsappQuestionHref ? "_blank" : undefined}
              rel={whatsappQuestionHref ? "noopener noreferrer" : undefined}
              className="mt-6 inline-block text-sm text-paper/60 underline decoration-line-on-ink underline-offset-4 transition-colors hover:text-paper"
            >
              {booking.ctaQuestion}
            </a>

            {!whatsappBookingHref && (
              <p className="mt-6 text-sm text-paper/50">
                WhatsApp ainda não configurado — os botões abrem um e-mail.
                Preencha o número em src/config/site.ts.
              </p>
            )}
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-4 lg:col-start-9">
            <dl className="space-y-4 border-t border-line-on-ink pt-8 text-sm text-paper/70">
              <div className="flex justify-between gap-4">
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${contact.email}`} className="hover:text-paper">
                    {contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Instagram</dt>
                <dd>
                  <a href={contact.instagramUrl} className="hover:text-paper">
                    {contact.instagramHandle}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Endereço</dt>
                <dd className="text-right">{address.full}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
