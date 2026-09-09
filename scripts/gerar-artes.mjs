// Gera as artes de post e de carrossel do Instagram a partir do texto das pecas.
//
// Nada aqui e improviso visual: as cores e a tipografia sao as mesmas da landing
// (app/landing.module.css) e o simbolo e o proprio public/brand/zelo-icon.svg, para
// que uma arte publicada no feed pareca a mesma marca de quem chega no site depois.
//
//   node scripts/gerar-artes.mjs            # todas as pecas
//   node scripts/gerar-artes.mjs post-03    # so as que casarem com o filtro
//
// Saida em output/artes/, que o .gitignore ja descarta. O formato e 1080x1350 (4:5),
// o recorte de feed que o Instagram menos comprime; a captura sai em 2x para o app
// reduzir com nitidez em vez de ampliar.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Importado por caminho absoluto, o playwright chega como modulo CJS e o
// chromium fica em `default`; como especificador simples, vem nomeado.
const playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;

const VERDE = "#247451";        // acento da landing
const VERDE_LOGO = "#2E7D5B";   // verde do simbolo, mantido como esta no arquivo
const VERDE_CLARO = "#7FCBA6";  // acento sobre fundo escuro

// ---------------------------------------------------------------- conteudo
// Cada peca e uma legenda ja escrita em docs/marketing-conteudo.md. A arte carrega
// so o gancho: quem para de rolar le seis palavras, nao um paragrafo.
const POSTS = [
  { nome: "post-01-quem-ficou-de-fazer", tipo: "frase", escuro: false,
    olho: "Toda semana, a mesma cena", titulo: "Quem ficou<br>de fazer?",
    apoio: "E o grupo fica em silêncio.", rodape: "Tarefa com responsável, prazo e setor." },
  { nome: "post-02-dois-minutos", tipo: "numero", escuro: false,
    olho: "No fim do expediente", numero: "2", unidade: "minutos",
    titulo: "resolvem metade da bagunça da sua semana.",
    passos: ["Cada pessoa abre a lista dela", "Marca o que terminou", "Vê o que ficou para amanhã"],
    rodape: "O difícil não é a ferramenta. É o hábito." },
  { nome: "post-03-a-planilha", tipo: "planilha", escuro: false,
    olho: "Ela não morreu de uma vez", titulo: "A planilha parou<br>de ser atualizada.",
    arquivo: "rotina_equipe.xlsx", carimbo: "Última edição: 12 dias atrás",
    linhas: [["Conferir estoque", "Marcos", "12/08", "feito?"],
             ["Ligar fornecedor", "", "", ""],
             ["Escala do sábado", "Ana", "semana passada", ""],
             ["Trocar etiquetas", "", "", ""]],
    rodape: "Boa para calcular. Ruim para combinar." },
  { nome: "post-04-setores", tipo: "captura", escuro: false,
    olho: "Cada setor com a sua fila", titulo: "Sua empresa não é<br>um bloco só.",
    apoio: "O funcionário vê a fila dele. O gerente vê a do setor. Você vê tudo.",
    captura: "public/demo/painel.webp", rodape: "Balcão, estoque, financeiro, entrega." },
  { nome: "post-05-cobranca-tripla", tipo: "baloes", escuro: false,
    olho: "Cobrança é sintoma", titulo: "Três vezes<br>na mesma semana.",
    mensagem: "Oi, conseguiu ver aquilo?", horarios: ["08:12", "14:47", "17:30"],
    rodape: "Combinado sem registro vira cobrança." },
  { nome: "post-06-tarefa-bem-escrita", tipo: "comparacao", escuro: false,
    olho: "O que separa as duas", titulo: "Isso não é<br>uma tarefa.",
    ruim: "ver o estoque",
    bom: "Conferir estoque de bebidas e lançar a reposição — Marcos — sexta, 17h",
    apoio: "Toda tarefa precisa de três coisas: <strong>o quê</strong>, <strong>quem</strong> e <strong>até quando</strong>.",
    rodape: "Faltando uma, vira intenção." },
  { nome: "post-07-o-painel", tipo: "captura", escuro: false,
    olho: "Segunda-feira, 8h", titulo: "Você abre o painel<br>e já sabe.",
    apoio: "O que atrasou, o que vence hoje, qual setor travou. Sem perguntar para ninguém.",
    captura: "public/demo/zelo-painel.webp", rodape: "Junta o que está espalhado." },
  { nome: "post-08-memoria-do-dono", tipo: "frase", escuro: true,
    olho: "Enquanto o controle mora na sua cabeça",
    titulo: "O sistema da<br>sua empresa<br>é a sua memória.",
    rodape: "A empresa não funciona sem você." },
  { nome: "post-09-permissoes", tipo: "papeis", escuro: false,
    olho: "Nem todo mundo precisa ver tudo", titulo: "Cada papel enxerga<br>um recorte.",
    papeis: [["Funcionário", "As tarefas dele, o prazo e o que precisa atualizar."],
             ["Gerente", "O setor inteiro, quem está com o quê, o que atrasou."],
             ["Dono", "A operação toda, os relatórios e a assinatura."]],
    rodape: "Cada pessoa com o seu acesso." },
  { nome: "post-10-preco", tipo: "precos", escuro: false,
    olho: "Sem “fale com um consultor”", titulo: "Preço na cara.",
    planos: [["Básico", "R$ 59,90", "5 pessoas inclusas", false],
             ["Gestão", "R$ 199,90", "20 pessoas inclusas", true],
             ["Completo", "R$ 499,90", "60 pessoas inclusas", false]],
    apoio: "Por mês. Cancelamento pelo próprio painel, sem ligar para ninguém.",
    rodape: "Não vendemos os dados da sua operação." },
  { nome: "post-11-google-agenda", tipo: "frase", escuro: false, corpo: "lg",
    olho: "Novo na Zelo", titulo: "Ninguém abre<br>dois aplicativos.",
    apoio: "Agora o prazo da tarefa<br>aparece no Google Agenda.",
    rodape: "A tarefa chega onde a pessoa já olha." },
];
// Cada post tambem existe como carrossel: a legenda ja traz o argumento em etapas, e
// um slide por etapa faz a pessoa parar em cada uma em vez de varrer o paragrafo.
// Capa e fecho saem escuros — no feed eles marcam onde o carrossel comeca e termina.
//
// Cinco a sete slides. Slide que carrega meia ideia cansa antes de convencer: se duas
// etapas cabem juntas sem perder forca, elas viram uma, e a conclusao mora no fecho em
// vez de ocupar tres telas.
//
// Um slide e {t, h, s}: tipo, titulo (h1) e apoio. `r` e o rotulo do tipo "ponto";
// `comp` liga um componente visual (a mesma planilha, os mesmos baloes dos posts).
const CARROSSEIS = [
  { prefixo: "carrossel-1-cinco-sinais", slides: [
    { t: "capa", h: "5 sinais de que a rotina<br>da sua empresa<br>saiu do controle", s: "Nenhum deles é culpa da equipe." },
    { t: "ponto", r: "1", h: "Você cobra a mesma coisa três vezes.", s: "Se precisa repetir, o combinado não ficou registrado em lugar nenhum." },
    { t: "ponto", r: "2", h: "A planilha está desatualizada.", s: "E todo mundo sabe disso — por isso ninguém confia mais nela." },
    { t: "ponto", r: "3", h: "Você é o único que sabe o que está atrasado.", s: "A empresa roda na sua memória, não em um sistema." },
    { t: "ponto", r: "4", h: "“Achei que era você quem ia fazer”.", s: "Tarefa sem dono não é tarefa. É intenção." },
    { t: "ponto", r: "5", h: "Você não consegue tirar uma semana de férias.", s: "Sem você, alguma coisa para. Sempre." },
    { t: "fecho", h: "Nenhum é problema<br>de esforço.<br>Todos são de registro.", s: "Toda tarefa com o quê, quem e até quando. 30 dias grátis, link na bio." },
  ]},
  { prefixo: "carrossel-2-uma-semana", slides: [
    { t: "capa", h: "Como organizar<br>a rotina da sua equipe<br>em uma semana", s: "Sem parar a operação." },
    { t: "ponto", r: "SEG", h: "Escolha UM setor.", s: "Não a empresa toda. O setor que mais te dá dor de cabeça." },
    { t: "ponto", r: "TER", h: "Liste o que se repete.", s: "As tarefas de toda semana, com nome e dia. Normalmente são menos de dez." },
    { t: "ponto", r: "QUA", h: "Dê dono e data.", s: "Uma pessoa por tarefa. Data específica, não “essa semana”." },
    { t: "ponto", r: "QUI", h: "Cadastre 3 pessoas.", s: "Só três. As que mais recebem tarefa sua." },
    { t: "ponto", r: "SEX", h: "Combine a rotina dos 2 minutos.", s: "Fim do expediente: marca o que fez, vê o que sobrou." },
    { t: "fecho", h: "Na segunda,<br>abra o painel antes<br>de falar com alguém.", s: "Um setor, três pessoas, uma semana. Depois expande. 30 dias grátis." },
  ]},

  { prefixo: "carrossel-post-01-quem-ficou-de-fazer", slides: [
    { t: "capa", h: "Quem ficou<br>de fazer?", s: "A pergunta que ninguém responde." },
    { t: "virada", h: "Toda semana a mesma cena.", s: "Alguém pergunta, e o grupo fica em silêncio." },
    { t: "virada", h: "O combinado existiu.", s: "No corredor, no fim do expediente. Mas não virou nada escrito, com nome e com data." },
    { t: "virada", h: "Aí a tarefa não é de ninguém.", s: "E vira sua." },
    { t: "fecho", h: "Responsável, prazo<br>e setor em<br>cada tarefa.", s: "Ninguém precisa lembrar de cabeça. 30 dias grátis, link na bio." },
  ]},

  { prefixo: "carrossel-post-02-dois-minutos", slides: [
    { t: "capa", h: "Dois minutos<br>no fim do<br>expediente", s: "Resolvem metade da bagunça da sua semana." },
    { t: "ponto", r: "1", h: "Cada pessoa abre a lista dela.", s: "A dela, não a da empresa inteira." },
    { t: "ponto", r: "2", h: "Marca o que terminou.", s: "Um toque por tarefa." },
    { t: "ponto", r: "3", h: "Vê o que ficou para amanhã.", s: "E fecha o dia sabendo." },
    { t: "virada", h: "Na segunda de manhã você não pergunta nada.", s: "Já está tudo na tela." },
    { t: "fecho", h: "O difícil não é<br>a ferramenta.<br>É o hábito.", s: "Comece com uma pessoa, por uma semana. Quando ela pega, puxa as outras." },
  ]},

  { prefixo: "carrossel-post-03-a-planilha", slides: [
    { t: "capa", h: "A planilha<br>não morreu<br>de uma vez", s: "Ela foi morrendo assim." },
    { t: "comp", comp: "planilha", h: "Essa é a sua planilha." },
    { t: "ponto", r: "1", h: "Alguém esqueceu de atualizar.", s: "Depois duas pessoas mexeram na mesma linha, e a versão certa virou opinião." },
    { t: "ponto", r: "2", h: "Virou “vou atualizar depois”.", s: "Depois nunca chega, e ninguém confia mais no que está ali." },
    { t: "virada", h: "Planilha é ótima para calcular.", s: "É péssima para combinar." },
    { t: "fecho", h: "Combinado precisa<br>de responsável,<br>data e aviso.", s: "30 dias grátis. Link na bio." },
  ]},

  { prefixo: "carrossel-post-04-setores", slides: [
    { t: "capa", h: "Sua empresa<br>não é<br>um bloco só", s: "Cada setor tem a sua fila." },
    { t: "virada", h: "Balcão, estoque, financeiro, entrega.", s: "Cada um com um ritmo, uma fila e um responsável diferente." },
    { t: "comp", comp: "captura", captura: "public/demo/painel.webp", h: "Na Zelo você organiza por setor." },
    { t: "virada", h: "Cada um vê o seu recorte.", s: "O funcionário, a fila dele. O gerente, a do setor. Você, a operação inteira." },
    { t: "fecho", h: "Ninguém recebe<br>o que não é<br>da conta dele.", s: "E ninguém deixa de receber o que é. 30 dias grátis." },
  ]},

  { prefixo: "carrossel-post-05-cobranca-tripla", slides: [
    { t: "capa", h: "Você já cobrou<br>a mesma coisa<br>três vezes?", s: "Essa semana." },
    { t: "comp", comp: "baloes", h: "Sempre a mesma mensagem." },
    { t: "virada", h: "Pedido, lembrete, desgaste.", s: "A terceira já custa — pra você e pra ela." },
    { t: "virada", h: "O problema quase nunca é má vontade.", s: "É que a tarefa não estava em lugar nenhum: nem na cabeça dela, nem numa tela que ela abre todo dia." },
    { t: "virada", h: "Cobrança é sintoma.", s: "De combinado sem registro." },
    { t: "fecho", h: "A tarefa<br>cobra sozinha.", s: "30 dias grátis. Link na bio." },
  ]},

  { prefixo: "carrossel-post-06-tarefa-bem-escrita", slides: [
    { t: "capa", h: "Isso não é<br>uma tarefa", s: "“Ver o estoque”." },
    { t: "comp", comp: "comparacao", h: "A diferença não é capricho." },
    { t: "ponto", r: "1", h: "O quê", s: "Específico. Não “ver o estoque”, mas o que exatamente é para fazer." },
    { t: "ponto", r: "2", h: "Quem", s: "Uma pessoa. Não o setor, não “alguém”." },
    { t: "ponto", r: "3", h: "Até quando", s: "Uma data. Não “essa semana”." },
    { t: "fecho", h: "Faltando uma<br>das três,<br>vira intenção.", s: "Com as três, dá para cobrar sem discussão. 30 dias grátis." },
  ]},

  { prefixo: "carrossel-post-07-o-painel", slides: [
    { t: "capa", h: "Segunda-feira,<br>8 da manhã", s: "Você abre o painel e já sabe." },
    { t: "comp", comp: "captura", captura: "public/demo/zelo-painel.webp", h: "Uma tela só." },
    { t: "ponto", r: "01", h: "O que atrasou e o que vence hoje.", s: "Antes de virar problema com cliente." },
    { t: "ponto", r: "02", h: "Qual setor travou e quais metas estão em risco.", s: "Enquanto ainda dá para reagir." },
    { t: "virada", h: "Sem perguntar para ninguém.", s: "Sem abrir cinco conversas." },
    { t: "fecho", h: "Junta o que está<br>espalhado e mostra<br>para quem decide.", s: "30 dias grátis. Link na bio." },
  ]},

  { prefixo: "carrossel-post-08-memoria-do-dono", slides: [
    { t: "capa", h: "O sistema<br>da sua empresa<br>é a sua memória", s: "Enquanto o controle mora na sua cabeça." },
    { t: "virada", h: "A empresa não funciona sem você.", s: "E isso não é elogio." },
    { t: "ponto", r: "1", h: "Você não tira férias tranquilo.", s: "Leva o celular. Responde do hotel." },
    { t: "ponto", r: "2", h: "Você não delega de verdade.", s: "Porque delegar é lembrar de cobrar depois." },
    { t: "virada", h: "Não é falta de confiança na equipe.", s: "É falta de lugar onde a rotina fica escrita." },
    { t: "fecho", h: "Tira da sua cabeça<br>e põe onde<br>a equipe olha.", s: "30 dias grátis. Link na bio." },
  ]},

  { prefixo: "carrossel-post-09-permissoes", slides: [
    { t: "capa", h: "Nem todo mundo<br>precisa<br>ver tudo", s: "Cada papel enxerga um recorte." },
    { t: "comp", comp: "papeis", h: "Três acessos, uma empresa." },
    { t: "virada", h: "O funcionário só vê o que é dele.", s: "É a tela mais simples do sistema, e funciona no celular." },
    { t: "virada", h: "Cada pessoa entra com o acesso dela.", s: "Ninguém compartilha senha." },
    { t: "fecho", h: "Quem vê o quê<br>deixa de ser<br>combinado de boca.", s: "30 dias grátis. Link na bio." },
  ]},

  { prefixo: "carrossel-post-10-preco", slides: [
    { t: "capa", h: "Preço na cara", s: "Sem “fale com um consultor”." },
    { t: "comp", comp: "precos", h: "Os três planos." },
    { t: "virada", h: "30 dias para testar.", s: "Cancelamento pelo próprio painel, sem ligar para ninguém." },
    { t: "virada", h: "Não usamos os dados da sua operação para publicidade.", s: "E não vendemos para ninguém." },
    { t: "fecho", h: "Se não fecha<br>pra você agora,<br>tudo bem.", s: "Mas você não descobre isso depois de três reuniões." },
  ]},
];

// ---------------------------------------------------------------- fonte e marca
// A Manrope entra embutida em base64: a captura roda em file://, sem rede garantida,
// e uma fonte que nao carrega troca a arte inteira por Arial sem avisar.
async function manropeEmbutida() {
  const agente = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  const css = await (await fetch("https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap",
    { headers: { "User-Agent": agente } })).text();
  let saida = css;
  for (const url of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])) {
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    const tipo = url.endsWith(".woff2") ? "font/woff2" : "font/ttf";
    saida = saida.replaceAll(`url(${url})`, `url(data:${tipo};base64,${bytes.toString("base64")})`);
  }
  return saida;
}

async function capturaEmbutida(caminho) {
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(resolve(caminho));
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}

const marca = (escuro) => {
  const cor = escuro ? VERDE_CLARO : VERDE_LOGO;
  return `<svg viewBox="0 0 120 120" width="54" height="54" aria-hidden="true">`
    + `<path d="M 68 8 A 54 54 0 1 1 18 30" fill="none" stroke="${cor}" stroke-width="13" stroke-linecap="round"/>`
    + `<circle cx="60" cy="60" r="16" fill="${cor}"/></svg>`;
};
const topo = (escuro) => `<div class="top">${marca(escuro)}<span class="wordmark">Zelo</span></div>`;
const rodape = (texto, direita = "30 dias grátis") =>
  `<div class="foot"><span>${texto}</span><b>${direita}</b></div>`;
const contador = (n, total) =>
  `<div class="foot"><span>${n === total ? "Zelo · gestão de tarefas para microempresa" : "arrasta →"}</span><b>${n} / ${total}</b></div>`;

// ---------------------------------------------------------------- miolos
// Um componente e um bloco visual reaproveitavel: o post o usa abaixo do titulo, e o
// slide de carrossel o usa sozinho. Escrito uma vez, os dois nunca divergem.
const COMPONENTE = {
  planilha: (p) => `<div class="sheet">
      <div class="sheet-bar"><span>${p.arquivo}</span><b>${p.carimbo}</b></div>
      <table><tr class="th"><td>Tarefa</td><td>Quem</td><td>Prazo</td><td>Status</td></tr>
      ${p.linhas.map(([t, q, pr, s]) => `<tr><td>${t}</td>`
        + [q, pr, s].map((v, i) => v === ""
            ? `<td class="empty">—</td>`
            : `<td${(i === 1 && v.includes("semana")) || i === 2 ? ' class="old"' : ""}>${v}</td>`).join("")
        + `</tr>`).join("")}
      </table>
    </div>`,

  captura: (p) => `<div class="shot"><img src="${p.capturaUri}" alt=""></div>`,

  baloes: (p) => `<div class="chat">${p.horarios.map((h) =>
      `<div class="bubble"><p>${p.mensagem}</p><time>${h}</time></div>`).join("")}</div>`,

  comparacao: (p) => `<div class="compare">
      <div class="col bad"><b>Mal escrita</b><p>${p.ruim}</p></div>
      <div class="col good"><b>Bem escrita</b><p>${p.bom}</p></div>
    </div>`,

  papeis: (p) => `<div class="roles">${p.papeis.map(([n, d]) =>
      `<div class="role"><b>${n}</b><p>${d}</p></div>`).join("")}</div>`,

  precos: (p) => `<div class="prices">${p.planos.map(([n, v, inc, hl]) =>
      `<div class="price${hl ? " hl" : ""}"><b>${n}</b><span class="val">${v}</span><em>${inc}</em></div>`).join("")}</div>`,
};

const MIOLO = {
  frase: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="${p.corpo ?? "xl"}">${p.titulo}</h1>`
    + (p.apoio ? `<p class="lead green">${p.apoio}</p>` : ""),

  numero: (p) => `<p class="eyebrow">${p.olho}</p>
    <div class="lockup"><span class="num">${p.numero}</span><span class="unit">${p.unidade}</span></div>
    <p class="lead">${p.titulo}</p>
    <ol class="steps">${p.passos.map((t, i) => `<li><span>${i + 1}</span><em>${t}</em></li>`).join("")}</ol>`,

  planilha: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>${COMPONENTE.planilha(p)}`,

  captura: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>
    <p class="sub">${p.apoio}</p>${COMPONENTE.captura(p)}`,

  baloes: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>${COMPONENTE.baloes(p)}`,

  comparacao: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>
    ${COMPONENTE.comparacao(p)}<p class="sub">${p.apoio}</p>`,

  papeis: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>${COMPONENTE.papeis(p)}`,

  precos: (p) => `<p class="eyebrow">${p.olho}</p><h1 class="lg">${p.titulo}</h1>
    ${COMPONENTE.precos(p)}<p class="sub">${p.apoio}</p>`,
};

// No slide o titulo vem antes do componente e nada mais compete com ele: um slide que
// tenta dizer duas coisas nao diz nenhuma.
const MIOLO_SLIDE = {
  capa: (s) => `<p class="eyebrow">Carrossel</p><h1 class="cv">${s.h}</h1><p class="lead soft">${s.s}</p>`,
  fecho: (s) => `<p class="eyebrow">Zelo</p><h1 class="cv">${s.h}</h1><p class="lead soft">${s.s}</p>`,
  ponto: (s) => `<span class="chipnum">${s.r}</span><h1 class="md">${s.h}</h1><p class="sub big">${s.s}</p>`,
  virada: (s) => `<h1 class="md">${s.h}</h1><p class="sub big">${s.s}</p>`,
  comp: (s, dados) => `<h1 class="sm">${s.h}</h1>${COMPONENTE[s.comp](dados)}`,
};

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#333;font-family:"Manrope",sans-serif;display:flex;flex-wrap:wrap;gap:20px;padding:20px}
.board{width:1080px;height:1350px;background:#f7f9f8;color:#182620;
  display:flex;flex-direction:column;justify-content:space-between;padding:92px 88px 84px;overflow:hidden}
.board.dark{background:#132520;color:#f2f7f4}
.top{display:flex;align-items:center;gap:16px}
.wordmark{font-size:38px;font-weight:800;letter-spacing:-.02em}
.mid{display:flex;flex-direction:column;gap:48px;margin-block:auto;padding-bottom:40px}
.mid.tight{gap:34px}
.eyebrow{font-size:26px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${VERDE}}
.dark .eyebrow{color:${VERDE_CLARO}}
h1{font-weight:800;letter-spacing:-.045em;line-height:.99}
h1.xl{font-size:126px}
h1.cv{font-size:88px;letter-spacing:-.038em;line-height:1.08}
h1.lg{font-size:96px;letter-spacing:-.04em;line-height:1.02}
h1.md{font-size:78px;letter-spacing:-.035em;line-height:1.08}
h1.sm{font-size:58px;letter-spacing:-.03em;line-height:1.12}
.lead{font-size:44px;font-weight:700;line-height:1.3;letter-spacing:-.015em}
.lead.green{color:${VERDE}}
.lead.soft{color:#a8c4b7;font-weight:600}
.sub{font-size:36px;font-weight:500;line-height:1.45;color:#58625d;max-width:830px}
.sub.big{font-size:42px;line-height:1.4}
.dark .sub{color:#a8c4b7}
.sub strong{color:#182620;font-weight:800}
.foot{border-top:2px solid #cfdad3;padding-top:26px;display:flex;justify-content:space-between;align-items:baseline;gap:20px}
.dark .foot{border-top-color:#2f4a3e}
.foot span{font-size:24px;font-weight:600;color:#58625d}
.dark .foot span{color:#8fb3a2}
.foot b{font-size:24px;font-weight:800;color:${VERDE}}
.dark .foot b{color:${VERDE_CLARO}}
.lockup{display:flex;align-items:baseline;gap:36px}
.num{font-size:210px;font-weight:800;line-height:.82;letter-spacing:-.055em}
.unit{font-size:92px;font-weight:800;letter-spacing:-.03em;color:#58625d}
.steps{list-style:none;display:flex;flex-direction:column;gap:26px}
.steps li{display:flex;align-items:baseline;gap:26px}
.steps span{font-size:34px;font-weight:800;color:${VERDE};min-width:34px}
.steps em{font-style:normal;font-size:38px;font-weight:600;line-height:1.35}
.sheet{border:2px solid #cfdad3;border-radius:10px;overflow:hidden;background:#fff}
.sheet-bar{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:20px 26px;background:#eef2f0;border-bottom:2px solid #cfdad3}
.sheet-bar span{font-size:26px;font-weight:700;color:#58625d}
.sheet-bar b{font-size:24px;font-weight:800;color:#b4472f}
.sheet table{width:100%;border-collapse:collapse}
.sheet td{padding:20px 26px;border-bottom:1px solid #e4eae6;border-right:1px solid #e4eae6;font-size:27px;font-weight:500;color:#182620}
.sheet tr:last-child td{border-bottom:0}
.sheet td:last-child{border-right:0}
.sheet .th td{font-size:23px;font-weight:800;color:#7d8781;text-transform:uppercase;letter-spacing:.06em;background:#f6f8f7}
.sheet .empty{color:#c3ccc7}
.sheet .old{color:#b4472f;font-weight:700}
.shot{border:2px solid #cfdad3;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 12px 34px rgba(24,38,32,.08);max-height:576px}
.shot img{width:100%;display:block;object-fit:cover;object-position:top center}
.chat{display:flex;flex-direction:column;gap:22px;align-items:flex-end}
.bubble{background:#dff0e5;border-radius:22px 22px 6px 22px;padding:26px 30px;max-width:660px;display:flex;align-items:baseline;gap:22px}
.bubble p{font-size:36px;font-weight:600;color:#182620}
.bubble time{font-size:23px;font-weight:600;color:#6d8579;white-space:nowrap}
.compare{display:grid;grid-template-columns:1fr 1.35fr;gap:22px}
.col{border-radius:12px;padding:30px 32px;display:flex;flex-direction:column;gap:16px}
.col b{font-size:23px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
.col p{font-size:34px;font-weight:600;line-height:1.35}
.col.bad{background:#f0eeed;border:2px solid #ddd7d4}
.col.bad b{color:#a08d85}
.col.bad p{color:#8b817c;text-decoration:line-through;text-decoration-thickness:2px}
.col.good{background:#e9f3ed;border:2px solid #b9d6c6}
.col.good b{color:${VERDE}}
.roles{display:flex;flex-direction:column;gap:20px}
.role{border-left:8px solid ${VERDE};background:#fff;border-radius:0 12px 12px 0;padding:26px 32px;display:flex;flex-direction:column;gap:8px}
.role b{font-size:34px;font-weight:800}
.role p{font-size:29px;font-weight:500;color:#58625d;line-height:1.4}
.prices{display:flex;flex-direction:column;border-top:2px solid #cfdad3}
.price{display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:30px 4px;border-bottom:2px solid #cfdad3}
.price b{font-size:40px;font-weight:800;min-width:250px}
.price .val{font-size:52px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.price em{font-style:normal;font-size:27px;font-weight:600;color:#58625d;text-align:right;min-width:270px}
.price.hl b,.price.hl .val{color:${VERDE}}
.chipnum{font-size:60px;font-weight:800;color:${VERDE};letter-spacing:-.02em;line-height:1}
.dark .chipnum{color:${VERDE_CLARO}}
`;

// ---------------------------------------------------------------- montagem
const filtro = process.argv[2];
const pecas = [];

for (const post of POSTS) {
  if (post.captura) post.capturaUri = await capturaEmbutida(post.captura);
  const apertado = post.tipo === "captura" ? " tight" : "";
  pecas.push({
    nome: post.nome,
    html: `<div class="board${post.escuro ? " dark" : ""}" data-name="${post.nome}">`
      + topo(post.escuro)
      + `<div class="mid${apertado}">${MIOLO[post.tipo](post)}</div>`
      + rodape(post.rodape) + `</div>`,
  });
}

for (const { prefixo, slides } of CARROSSEIS) {
  // O carrossel de um post reusa os dados do proprio post — a planilha, os baloes e a
  // tabela de precos existem uma vez so, e mudar o post muda o carrossel junto.
  const irmao = POSTS.find((p) => p.nome === prefixo.replace("carrossel-", ""));
  for (const [i, slide] of slides.entries()) {
    if (slide.captura) slide.capturaUri = await capturaEmbutida(slide.captura);
    const escuro = slide.t === "capa" || slide.t === "fecho";
    const nome = `${prefixo}-slide-${String(i + 1).padStart(2, "0")}`;
    const dados = slide.capturaUri ? slide : irmao;
    if (slide.t === "comp" && !dados) throw new Error(`${nome}: componente sem dados de origem.`);
    pecas.push({
      nome,
      html: `<div class="board${escuro ? " dark" : ""}" data-name="${nome}">`
        + topo(escuro)
        + `<div class="mid${slide.t === "comp" ? " tight" : ""}">${MIOLO_SLIDE[slide.t](slide, dados)}</div>`
        + contador(i + 1, slides.length) + `</div>`,
    });
  }
}

const selecionadas = filtro ? pecas.filter((p) => p.nome.includes(filtro)) : pecas;
if (selecionadas.length === 0) {
  console.error(`Nenhuma peca casa com "${filtro}".`);
  process.exit(1);
}

const saida = resolve("output/artes");
await mkdir(saida, { recursive: true });
const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>`
  + (await manropeEmbutida()) + CSS + `</style></head><body>`
  + selecionadas.map((p) => p.html).join("") + `</body></html>`;
const pagina = resolve(saida, "_pecas.html");
await writeFile(pagina, doc, "utf8");

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1500 }, deviceScaleFactor: 2 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto(pathToFileURL(pagina).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.evaluate(() => document.fonts.check("800 100px Manrope")))) {
    throw new Error("Manrope nao carregou; a arte sairia com a fonte errada.");
  }
  // Texto que passa da altura da peca sai cortado na imagem, e a captura nao acusa:
  // e preciso perguntar ao layout antes de fotografar.
  const estouro = await page.evaluate(() => Array.from(document.querySelectorAll(".board"))
    .filter((e) => e.scrollHeight > e.clientHeight + 1)
    .map((e) => `${e.dataset.name} (${e.scrollHeight}px em ${e.clientHeight}px)`));
  if (estouro.length > 0) throw new Error(`Texto estourando a peca:\n  ${estouro.join("\n  ")}`);

  for (const { nome } of selecionadas) {
    await page.locator(`[data-name="${nome}"]`).screenshot({ path: resolve(saida, `${nome}.png`) });
  }
  if (erros.length > 0) throw new Error(`Erro de pagina: ${erros.join(" | ")}`);
  console.log(`${selecionadas.length} artes em ${saida} (1080x1350, capturadas em 2x).`);
} finally {
  await browser.close();
}
