import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, Check, ChevronDown, CircleHelp, Layers3, ListChecks, ShieldCheck, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ProductCarousel } from "@/components/product-carousel";
import { SiteFooter } from "@/components/site-footer";
import { StickyCta } from "@/components/sticky-cta";
import { landingPlanCopy, landingComparison, landingFaqs } from "@/lib/landing-content";
import { formatPriceCents, planDetails, planOrder } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/subscription";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Zelo | Gestão de tarefas e equipes para microempresas",
  description: "Organize tarefas, prazos, setores e metas da sua equipe com a Zelo. Conheça os planos e experimente por 30 dias.",
};

const highlightedPlan = planOrder.find((code) => planDetails[code].highlight) ?? planOrder[0];
const trialHref = `/signup?plano=${highlightedPlan}&teste=1`;
const features = [
  { icon: ListChecks, title: "Cada tarefa, uma responsabilidade", description: "Defina quem faz, qual é o prazo e o que vem primeiro. Sua equipe encontra a rotina em um só lugar." },
  { icon: Layers3, title: "Sua empresa, do seu jeito", description: "Organize os setores e acompanhe tarefas e metas com a estrutura que faz sentido para a sua operação." },
  { icon: BellRing, title: "As atualizações ficam por perto", description: "Atribuições, comentários e mudanças de status chegam pelas notificações internas da plataforma." },
];
const steps = [
  { title: "Escolha o plano e crie sua conta", description: `Selecione o plano para iniciar os ${TRIAL_DAYS} dias de teste e cadastre sua empresa.` },
  { title: "Organize a rotina da equipe", description: "Ajuste os setores, cadastre as pessoas e distribua tarefas com responsável e prazo." },
  { title: "Acompanhe o que importa", description: "Veja pendências no painel e acompanhe os indicadores disponíveis no seu plano." },
];

export default function Home() {
  return (
    <div className={styles.landing}>
      <a href="#conteudo" className={styles.skipLink}>Ir para o conteúdo</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" aria-label="Zelo, página inicial" className={styles.brand}>
            <BrandLogo variant="icon" decorative className="h-9 w-9" preload /><span>Zelo</span>
          </Link>
          <nav className={styles.navigation} aria-label="Navegação principal">
            <a href="#demonstracao">Plataforma</a><a href="#produto">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.login}>Entrar</Link>
            <Link href={trialHref} className={`${styles.primaryButton} ${styles.headerTrial}`}>Testar grátis <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>
      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="titulo-principal">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Menos improviso. Mais clareza.</p>
            <h1 id="titulo-principal">Gestão de equipes para microempresas.</h1>
            <p className={styles.heroDescription}>Com a Zelo, cada pessoa sabe o que fazer.<br className={styles.desktopBreak} /> Tarefas, prazos e metas em um só lugar.</p>
            <div id="cta-hero" className={styles.heroActions}>
              <Link href={trialHref} className={styles.primaryButton}>Testar {TRIAL_DAYS} dias grátis <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#demonstracao" className={styles.secondaryButton}>Ver a plataforma <ChevronDown size={18} aria-hidden="true" /></a>
            </div>
            <p className={styles.trialNote}><Check size={15} aria-hidden="true" /> Primeira cobrança após o teste. Cancele antes para não ser cobrado.</p>
          </div>
        </section>
        <section id="demonstracao" className={styles.demonstration} aria-label="Conheça a plataforma Zelo">
          <div className={styles.container}><ProductCarousel /></div>
        </section>
        <section id="produto" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>A rotina no lugar certo</p>
              <h2>Clareza para quem gerencia.<br />Direção para quem executa.</h2>
              <p>Do primeiro compromisso à entrega, mantenha as informações junto de quem precisa delas.</p>
            </div>
            <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, description }) => (
              <article key={title} className={styles.feature}><Icon size={26} strokeWidth={1.7} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></article>
            ))}</div>
            <div className={styles.accessNote}><ShieldCheck size={21} aria-hidden="true" /><p><strong>Cada pessoa com seu acesso.</strong> Dono, gerente e funcionário têm permissões diferentes dentro da empresa.</p></div>
          </div>
        </section>
        <section id="como-funciona" className={`${styles.section} ${styles.softSection}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}><p className={styles.eyebrow}>Primeiros passos guiados</p><h2>Comece com a rotina que você já tem.</h2><p>Organize uma etapa de cada vez, com orientações dentro da plataforma.</p></div>
            <ol className={styles.steps}>{steps.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
          </div>
        </section>
        <section id="planos" className={styles.section}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeading} ${styles.centerHeading}`}><p className={styles.eyebrow}>Planos e preços</p><h2>Escolha o próximo passo da sua equipe.</h2><p>Mensalidade base + usuários adicionais, quando precisar.<br />Experimente o plano escolhido por {TRIAL_DAYS} dias.</p></div>
            <div className={styles.pricingGrid}>{planOrder.map((code) => {
              const plan = planDetails[code];
              const copy = landingPlanCopy[code];
              return (
                <article key={code} className={`${styles.plan} ${plan.highlight ? styles.recommendedPlan : ""}`} data-plan={code}>
                  <div className={styles.planHeading}><h3>{copy.name}</h3>{plan.highlight && <span className={styles.recommended}>Recomendado</span>}</div>
                  <p className={styles.planDescription}>{copy.description}</p>
                  <p className={styles.price}><strong>{formatPriceCents(plan.priceCents)}</strong><span>/mês</span></p>
                  <dl className={styles.planCapacity}>
                    <div><dt><UsersRound size={16} aria-hidden="true" /> Usuários incluídos</dt><dd>{plan.includedUsers}</dd></div>
                    <div><dt>Por usuário adicional</dt><dd>{formatPriceCents(plan.pricePerExtraUserCents)}/mês</dd></div>
                    <div><dt>Limite de usuários ativos</dt><dd>{plan.maxUsers ?? "Sem teto"}</dd></div>
                  </dl>
                  <ul className={styles.planFeatures}>{copy.features.map((feature) => <li key={feature}><Check size={17} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
                  <div className={styles.planActions}>
                    <Link href={`/signup?plano=${code}&teste=1`} className={plan.highlight ? styles.primaryButton : styles.secondaryButton}>Testar {TRIAL_DAYS} dias grátis <ArrowRight size={16} aria-hidden="true" /></Link>
                    <Link href={`/signup?plano=${code}`} className={styles.directSignup}>Assinar direto, sem teste</Link>
                  </div>
                </article>
              );
            })}</div>
            <details className={styles.comparison}>
              <summary>Comparar todos os recursos <ChevronDown size={20} aria-hidden="true" /></summary>
              <div className={styles.desktopComparison}>
                <table><caption className="sr-only">Comparação de funcionalidades dos planos Zelo</caption><thead><tr><th scope="col">Recurso</th>{planOrder.map((code) => <th key={code} scope="col">{landingPlanCopy[code].name}</th>)}</tr></thead>
                  <tbody>{landingComparison.map((row) => <tr key={row.feature}><th scope="row">{row.feature}</th>{planOrder.map((code) => <td key={code}>{row[code]}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <div className={styles.mobileComparison}>{landingComparison.map((row) => <div className={styles.comparisonItem} key={row.feature}><h3>{row.feature}</h3><dl>{planOrder.map((code) => <div key={code}><dt>{landingPlanCopy[code].name}</dt><dd>{row[code]}</dd></div>)}</dl></div>)}</div>
            </details>
          </div>
        </section>
        <section id="duvidas" className={`${styles.section} ${styles.softSection}`}>
          <div className={`${styles.container} ${styles.faqLayout}`}>
            <div className={styles.sectionHeading}><CircleHelp size={28} className={styles.faqIcon} aria-hidden="true" /><p className={styles.eyebrow}>Antes de começar</p><h2>É bom ter clareza<br />desde o início.</h2><p>As principais dúvidas sobre planos, teste e assinatura.</p></div>
            <div className={styles.faqList}>{landingFaqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
          </div>
        </section>
        <section className={styles.finalCta}>
          <div className={`${styles.container} ${styles.finalCtaInner}`}>
            <div><p className={styles.eyebrow}>Zelo. Nada passa batido.</p><h2>O próximo passo é organizar o dia a dia.</h2><p>Traga sua equipe e conheça a plataforma na prática.</p></div>
            <Link href={trialHref} className={styles.primaryButton}>Testar {TRIAL_DAYS} dias grátis <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <StickyCta href={trialHref} label={`Testar ${TRIAL_DAYS} dias grátis`} watchId="cta-hero" />
    </div>
  );
}
