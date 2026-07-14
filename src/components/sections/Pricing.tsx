import { Reveal } from "@/components/ui/Reveal";
import { buildPlanWhatsappLink, contact, pricing as plans } from "@/config/site";
import { pricing } from "@/lib/content";

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function PlanCta({ plan }: { plan: (typeof plans)[number] }) {
  const whatsappHref = buildPlanWhatsappLink(plan);
  const href = whatsappHref ?? `mailto:${contact.email}`;

  return (
    <a
      href={href}
      target={whatsappHref ? "_blank" : undefined}
      rel={whatsappHref ? "noopener noreferrer" : undefined}
      className={`inline-block w-full border px-5 py-3 text-center text-sm transition-colors ${
        plan.featured
          ? "border-paper bg-paper text-ink hover:bg-ink hover:text-paper"
          : "border-ink text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {pricing.ctaPlan}
    </a>
  );
}

export function Pricing() {
  return (
    <section id="valores" className="border-t border-line py-28 md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="mb-6 text-sm tracking-tight text-ink-soft">
              {pricing.kicker}
            </p>
            <h2 className="max-w-lg text-balance font-light text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {pricing.title}
            </h2>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-6 lg:col-start-7">
            <p className="max-w-md text-balance text-lg leading-relaxed text-ink-soft">
              {pricing.body}
            </p>
            <p className="mt-4 text-2xl tracking-tight">
              {pricing.highlight}
            </p>
          </Reveal>
        </div>

        {/* Desktop / tablet: tabela editorial */}
        <Reveal delay={0.1} className="mt-16 hidden md:block">
          <div className="grid grid-cols-12 gap-4 border-b border-line pb-4 text-sm text-ink-soft">
            <div className="col-span-3">Período</div>
            <div className="col-span-2">Valor total</div>
            <div className="col-span-2">Valor por hora</div>
            <div className="col-span-2">Economia</div>
            <div className="col-span-3" />
          </div>

          {plans.map((plan) => (
            <div
              key={plan.hours}
              className={`grid grid-cols-12 items-center gap-4 border-b border-line px-0 py-6 ${
                plan.featured ? "bg-ink text-paper" : ""
              }`}
            >
              <div className="col-span-3">
                <p className="text-2xl tracking-tight">
                  {plan.label}
                </p>
                {plan.featured && (
                  <p
                    className={`mt-1 text-xs tracking-wide uppercase ${
                      plan.featured ? "text-paper/70" : "text-ink-soft"
                    }`}
                  >
                    {pricing.featuredLabel}
                  </p>
                )}
              </div>
              <div className="col-span-2 text-lg">{formatBRL(plan.price)}</div>
              <div
                className={`col-span-2 text-lg ${plan.featured ? "text-paper/80" : "text-ink-soft"}`}
              >
                {formatBRL(plan.hourlyRate)}/h
              </div>
              <div
                className={`col-span-2 text-lg ${plan.featured ? "text-paper/80" : "text-ink-soft"}`}
              >
                {plan.savings > 0 ? formatBRL(plan.savings) : "—"}
              </div>
              <div className="col-span-3">
                <PlanCta plan={plan} />
              </div>
            </div>
          ))}
        </Reveal>

        {/* Mobile: módulos empilhados */}
        <div className="mt-16 md:hidden">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.hours}
              delay={index * 0.05}
              className={`border-b border-line px-0 py-8 first:border-t ${
                plan.featured ? "bg-ink px-6 text-paper" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-3xl tracking-tight">
                  {plan.label}
                </p>
                <p className="text-xl">{formatBRL(plan.price)}</p>
              </div>
              {plan.featured && (
                <p className="mt-1 text-xs tracking-wide text-paper/70 uppercase">
                  {pricing.featuredLabel}
                </p>
              )}
              <dl
                className={`mt-4 space-y-2 text-sm ${plan.featured ? "text-paper/80" : "text-ink-soft"}`}
              >
                <div className="flex justify-between">
                  <dt>Valor por hora</dt>
                  <dd>{formatBRL(plan.hourlyRate)}/h</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Economia</dt>
                  <dd>{plan.savings > 0 ? formatBRL(plan.savings) : "—"}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <PlanCta plan={plan} />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mt-10 max-w-xl text-balance text-sm text-ink-soft">
            {pricing.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
