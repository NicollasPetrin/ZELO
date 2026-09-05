"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { BarChart3, LayoutDashboard, ListChecks, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./product-carousel.module.css";

const shots = [
  { id: "painel", tab: "Painel", icon: LayoutDashboard, src: "/demo/zelo-painel.webp", detail: "/demo/zelo-painel-mobile.webp", title: "A operação, em uma visão.", description: "Pendências, próximos prazos e pontos de atenção da equipe.", alt: "Painel real da Zelo com tarefas, prazos e metas de uma empresa fictícia." },
  { id: "tarefas", tab: "Tarefas", icon: ListChecks, src: "/demo/zelo-tarefas.webp", detail: "/demo/zelo-tarefas-mobile.webp", title: "Todo mundo sabe o próximo passo.", description: "Tarefas organizadas por responsável, setor, prazo e prioridade.", alt: "Lista real de tarefas da Zelo com responsáveis e prazos fictícios." },
  { id: "relatorios", tab: "Relatórios", icon: BarChart3, src: "/demo/zelo-relatorios.webp", detail: "/demo/zelo-relatorios-mobile.webp", title: "Os números ajudam a decidir.", description: "Saúde operacional, gargalos e metas em risco no plano Completo.", alt: "Relatórios reais da Zelo com indicadores de uma empresa fictícia." },
];

export function ProductCarousel() {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const shot = shots[active];

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? shots.length - 1 : event.key === "ArrowRight" ? (active + 1) % shots.length : event.key === "ArrowLeft" ? (active + shots.length - 1) % shots.length : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  function openImage() {
    setZoomed(false);
    dialog.current?.showModal();
  }

  return (
    <div className={styles.showcase}>
      <div role="tablist" aria-label="Telas da Zelo" className={styles.tabs}>
        {shots.map(({ id, tab, icon: Icon }, index) => (
          <button key={id} type="button" ref={(node) => { tabs.current[index] = node; }} role="tab" id={`demo-tab-${id}`} aria-selected={active === index} aria-controls={`demo-panel-${id}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={navigate}>
            <Icon size={17} aria-hidden="true" />{tab}
          </button>
        ))}
      </div>
      {shots.map((item, index) => (
        <div key={item.id} role="tabpanel" id={`demo-panel-${item.id}`} aria-labelledby={`demo-tab-${item.id}`} hidden={index !== active} tabIndex={0}>
          <div className={styles.description}><h2 className="sr-only">{item.title}</h2><p>{item.description}</p></div>
          <figure className={styles.figure}>
            <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span><span>Zelo / {item.tab}</span><button type="button" onClick={openImage} title="Ampliar tela" aria-label={`Ampliar tela de ${item.tab}`}><Maximize2 size={16} /></button></div>
            <button type="button" className={styles.imageButton} onClick={openImage} aria-label={`Abrir captura completa: ${item.tab}`}>
              <picture>
                <source media="(max-width: 767px)" srcSet={item.detail} />
                <Image src={item.src} alt={item.alt} width={1600} height={1000} sizes="(max-width: 767px) 100vw, (max-width: 1224px) 95vw, 1160px" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} className={styles.screenshot} />
              </picture>
            </button>
            <figcaption>Empresa fictícia · Recursos exibidos no plano Completo</figcaption>
          </figure>
        </div>
      ))}
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="capture-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogHeader}><h2 id="capture-title">{shot.tab} · Zelo</h2><div>
          <button type="button" aria-label={zoomed ? "Ajustar à tela" : "Ampliar imagem"} title={zoomed ? "Ajustar à tela" : "Ampliar imagem"} onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut size={19} /> : <ZoomIn size={19} />}</button>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar captura" title="Fechar captura" autoFocus><X size={21} /></button>
        </div></div>
        <div className={`${styles.dialogImage} ${zoomed ? styles.zoomed : ""}`}><Image src={shot.src} alt={shot.alt} width={1600} height={1000} sizes="1600px" /></div>
      </dialog>
    </div>
  );
}
