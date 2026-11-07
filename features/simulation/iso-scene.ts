/**
 * Planta isometrica do Mercadinho Bom Lugar, desenhada pixel a pixel num
 * canvas: piso, paredes, moveis, e a equipe andando cada um no seu setor.
 *
 * Nao conhece a Zelo: recebe quem esta na loja, os marcadores de cada pessoa
 * (atrasadas, de hoje, fazendo agora) e as falas, e so desenha. Quem decide o
 * que acontece e o motor no servidor.
 */

type Cabelo = [estilo: string, cor?: string, luz?: string];
type Extra = [nome: string, cor?: string];

type Look = {
  pele: string;
  cabelo?: Cabelo;
  chapeu?: [nome: string, cor?: string];
  camisa: string;
  calca: string;
  sapato: string;
  maos?: string;
  oculos?: string;
  extras?: Extra[];
};

type Zona = [x1: number, y1: number, x2: number, y2: number];
type Figura = { look: Look; casa: [number, number]; zona: Zona[] };

export type Marcador = { atrasadas: number; hoje: number; fazendo: boolean; feitas: number };
export type PessoaNaCena = { id: string; chave: string; nome: string };

const PELE = { a: "#f0c6a4", b: "#e2ad86", c: "#d9a27a", d: "#c68a5e", e: "#8d5a3b", f: "#5e3a24" };

/** A chave e o comeco do e-mail na Zelo (katia@bomlugar.test vira "katia"). */
const FIGURAS: Record<string, Figura> = {
  valdir: { casa: [19, 15], zona: [[0, 0, 21, 15]], look: { pele: PELE.b, cabelo: ["entradas", "#c4c4c4"], camisa: "#a7372f", calca: "#3b3f4a", sapato: "#6b4428", extras: [["xadrez", "#5a1c18"], ["bigode", "#bdbdbd"], ["caneta"], ["bloquinho"]] } },
  marcia: { casa: [10, 6], zona: [[0, 5, 21, 15]], look: { pele: PELE.c, cabelo: ["coque", "#5e3a1f"], camisa: "#2e7a4b", calca: "#2f3542", sapato: "#222222", extras: [["cracha"], ["chaves"], ["cordao"]] } },
  thiago: { casa: [5, 2], zona: [[0, 0, 6, 4]], look: { pele: PELE.d, cabelo: ["curto", "#1d1712"], chapeu: ["bone", "#1b1b1f"], camisa: "#8a8f98", calca: "#3d5a80", sapato: "#f2f2f2", extras: [["barbarala", "#2a1d14"], ["notebook"]] } },
  neusa: { casa: [2, 2], zona: [[0, 0, 6, 4]], look: { pele: PELE.a, cabelo: ["acaju", "#8c3b2a"], camisa: "#2e7a4b", calca: "#3b3f4a", sapato: "#5a3b2a", extras: [["cardiga", "#d8c7a3"], ["brinco", "#f4f1e8"]], oculos: "#3a2a20" } },
  jurandir: { casa: [9, 2], zona: [[7, 0, 13, 4]], look: { pele: PELE.e, cabelo: ["careca"], chapeu: ["touca"], camisa: "#f1f1f1", calca: "#e3e6e8", sapato: "#f4f4f4", extras: [["bigode", "#c9c9c9"], ["avental", "#f7f7f7"], ["manchas"]] } },
  wesley: { casa: [11, 3], zona: [[7, 0, 13, 4]], look: { pele: PELE.f, cabelo: ["degrade", "#141414"], chapeu: ["touca"], camisa: "#f1f1f1", calca: "#2f3542", sapato: "#f4f4f4", extras: [["avental", "#f7f7f7"], ["corrente"]] } },
  katia: { casa: [12, 13], zona: [[12, 12, 13, 15]], look: { pele: PELE.e, cabelo: ["cacheado", "#24160f"], camisa: "#2e7a4b", calca: "#2f3542", sapato: "#222222", extras: [["colete", "#1f5a37"], ["batom", "#7a1f35"]] } },
  bianca: { casa: [15, 13], zona: [[15, 12, 16, 15]], look: { pele: PELE.a, cabelo: ["rabo", "#7a5230", "#e2c06b"], camisa: "#2e7a4b", calca: "#3d5a80", sapato: "#f2f2f2", extras: [["piercing"]] } },
  rogerio: { casa: [8, 9], zona: [[0, 5, 21, 11], [14, 0, 21, 4]], look: { pele: PELE.d, cabelo: ["raspado", "#2a1d14"], camisa: "#2e7a4b", calca: "#2f3542", sapato: "#5a5f6a", extras: [["caixa"], ["barba", "#2a1d14"], ["gola"]] } },
  edinaldo: { casa: [17, 2], zona: [[14, 0, 21, 4]], look: { pele: PELE.e, cabelo: ["curto", "#1a1a1a"], chapeu: ["bone", "#2e7a4b"], camisa: "#2e7a4b", calca: "#3d5a80", sapato: "#4a3a2a", extras: [["colete", "#f08a24"], ["refletivo"]], oculos: "#111111" } },
  luana: { casa: [3, 14], zona: [[0, 12, 6, 15]], look: { pele: PELE.f, cabelo: ["trancas", "#141414"], chapeu: ["lenco", "#f2c230"], camisa: "#2e7a4b", calca: "#2f3542", sapato: "#222222", extras: [["avental", "#1f5a3a"]] } },
  matheus: { casa: [20, 3], zona: [[14, 0, 21, 4]], look: { pele: PELE.d, cabelo: ["curto", "#1a1a1a"], chapeu: ["capacete", "#1d1f24"], camisa: "#2f5fa8", calca: "#2f3542", sapato: "#e8e8e8", extras: [["mochila", "#c8412f"]] } },
  cida: { casa: [14, 9], zona: [[0, 5, 21, 15]], look: { pele: PELE.c, cabelo: ["curto", "#3a2a20"], chapeu: ["lenco", "#e2688a"], camisa: "#7fa6d6", calca: "#2f3542", sapato: "#f2f2f2", maos: "#f2c230", extras: [["avental", "#3d74b8"]] } },
};

/** Quem nao e da equipe original (alguem cadastrado depois) ganha uniforme e anda pelo salao. */
const VISITANTE: Look[] = [
  { pele: PELE.c, cabelo: ["curto", "#3a2a20"], camisa: "#2e7a4b", calca: "#2f3542", sapato: "#222222", extras: [["cracha"]] },
  { pele: PELE.e, cabelo: ["rabo", "#1a1a1a", "#3a2a20"], camisa: "#2e7a4b", calca: "#3d5a80", sapato: "#f2f2f2", extras: [["cracha"]] },
];

export const W = 22;
export const H = 16;
const OX = 304;
const OY = 84;
export const CW = 704;
export const CH = 432;
const WH = 54;
const HP = 16;
const iso = (x: number, y: number): [number, number] => [Math.round((x - y) * 16 + OX), Math.round((x + y) * 8 + OY)];

function tom(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  } else {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  }
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

type Ctx = CanvasRenderingContext2D;

function losango(c: Ctx, cx: number, top: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 16; i++) {
    const h = i < 8 ? (i + 1) * 2 : (16 - i) * 2;
    c.fillRect(cx - h, top + i, h * 2, 1);
  }
}

function contorno(c: Ctx, cx: number, top: number, cor: string) {
  c.fillStyle = cor;
  for (let i = 0; i < 16; i++) {
    const h = i < 8 ? (i + 1) * 2 : (16 - i) * 2;
    c.fillRect(cx - h, top + i, 2, 1);
    c.fillRect(cx + h - 2, top + i, 2, 1);
  }
}

type Sala = { id: string; nome: string; x1: number; y1: number; x2: number; y2: number; piso: [string, string]; parede: string | null; rot: [number, number] };

export const SALAS: Sala[] = [
  { id: "esc", nome: "Escritório · mezanino", x1: 0, y1: 0, x2: 6, y2: 4, piso: ["#8a6a4a", "#80603f"], parede: "#c9b48a", rot: [3.5, 3.2] },
  { id: "aco", nome: "Açougue", x1: 7, y1: 0, x2: 13, y2: 4, piso: ["#e3e9eb", "#d3dbde"], parede: "#e8eef0", rot: [10.5, 2.6] },
  { id: "est", nome: "Estoque", x1: 14, y1: 0, x2: 21, y2: 4, piso: ["#8d9096", "#83868c"], parede: "#a3a9b1", rot: [18.5, 1.9] },
  { id: "sal", nome: "Salão de vendas", x1: 0, y1: 5, x2: 21, y2: 11, piso: ["#e6dec4", "#d6cbad"], parede: "#9cc7a5", rot: [8.5, 5.6] },
  { id: "hor", nome: "Hortifrúti", x1: 0, y1: 12, x2: 6, y2: 15, piso: ["#b98c55", "#ad8149"], parede: "#7fae6a", rot: [3.5, 12.3] },
  { id: "ent", nome: "Entrada", x1: 7, y1: 12, x2: 9, y2: 15, piso: ["#6e6253", "#64594b"], parede: null, rot: [8.5, 16.3] },
  { id: "cai", nome: "Frente de caixa", x1: 10, y1: 12, x2: 21, y2: 15, piso: ["#ece0b9", "#ddd0a6"], parede: null, rot: [15.5, 11.9] },
];
const salaEm = (x: number, y: number) => SALAS.find((s) => x >= s.x1 && x <= s.x2 && y >= s.y1 && y <= s.y2);

export function posicaoDoRotulo(sala: Sala) {
  const [x, y] = iso(sala.rot[0], sala.rot[1]);
  return { left: (x / CW) * 100, top: (y / CH) * 100 };
}

const PAL: Record<string, string[]> = {
  mercearia: ["#d8402c", "#f2c230", "#a5682a", "#f4f4f4", "#3d74b8"],
  bebidas: ["#2e8b57", "#c4402e", "#1f4fa0", "#f2a33a", "#6b2a1a"],
  limpeza: ["#3d74b8", "#f4f4f4", "#e2688a", "#5fbfbf", "#f2d23a"],
  higiene: ["#f4b6c8", "#ffffff", "#5fbfbf", "#9b6ad0", "#3d74b8"],
  biscoitos: ["#f08c24", "#c4402e", "#f2d23a", "#7a4a2a", "#e2688a"],
  caixas: ["#c99a5b", "#b5844a", "#d8b07a", "#e9e4d8", "#a8763e"],
  laticinios: ["#ffffff", "#f2e27a", "#f4b6c8", "#9cc0e4", "#ffffff"],
  cigarro: ["#c4402e", "#f4f4f4", "#1f4fa0", "#f2c230", "#2e8b57"],
};

type Movel = { x1: number; y1: number; x2: number; y2: number; h: number; c: string; t?: string; d?: string; pal?: string; prod?: string[] };

const MOVEIS: Movel[] = [
  { x1: 1, y1: 1, x2: 2, y2: 1, h: 10, c: "#9a6a3c", d: "pc" },
  { x1: 4, y1: 1, x2: 5, y2: 1, h: 10, c: "#9a6a3c", d: "note" },
  { x1: 0, y1: 3, x2: 0, y2: 3, h: 16, c: "#5b6068", d: "cofre" },
  { x1: 6, y1: 0, x2: 6, y2: 0, h: 26, c: "#7d7a52", d: "arquivo" },
  { x1: 11, y1: 0, x2: 13, y2: 1, h: 36, c: "#b9c3c9", d: "camara" },
  { x1: 7, y1: 1, x2: 7, y2: 1, h: 22, c: "#d9dde0", d: "serra" },
  { x1: 8, y1: 0, x2: 9, y2: 0, h: 10, c: "#aeb8bf" },
  { x1: 8, y1: 4, x2: 12, y2: 4, h: 12, c: "#e9eef0", t: "#f3c9c4", d: "vitrine" },
  { x1: 15, y1: 0, x2: 17, y2: 0, h: 40, c: "#7f8790", d: "prat", pal: "caixas" },
  { x1: 14, y1: 0, x2: 14, y2: 1, h: 14, c: "#eef1f3", t: "#d7e9f2" },
  { x1: 15, y1: 3, x2: 16, y2: 3, h: 12, c: "#c99a5b", d: "palete" },
  { x1: 21, y1: 2, x2: 21, y2: 4, h: 10, c: "#9a6a3c", d: "sacolas" },
  { x1: 22, y1: 2, x2: 22, y2: 2, h: 8, c: "#c8412f", d: "moto" },
  { x1: 9, y1: 7, x2: 9, y2: 9, h: 10, c: "#e9eef0", t: "#bfe3f2", d: "congelados" },
  { x1: 0, y1: 6, x2: 0, y2: 10, h: 28, c: "#e9eef0", d: "laticinios" },
  { x1: 19, y1: 10, x2: 20, y2: 10, h: 12, c: "#f1f3f4", t: "#a9d6ee", d: "sorvete" },
  { x1: 1, y1: 13, x2: 2, y2: 13, h: 8, c: "#a8743f", d: "banca", prod: ["#d8402c", "#b8321f", "#e85a3c"] },
  { x1: 4, y1: 13, x2: 5, y2: 13, h: 8, c: "#a8743f", d: "banca", prod: ["#f2d23a", "#e6c22a", "#f7e27a"] },
  { x1: 1, y1: 15, x2: 2, y2: 15, h: 8, c: "#a8743f", d: "banca", prod: ["#5fae3c", "#4a9a2c", "#7cc456"] },
  { x1: 4, y1: 15, x2: 5, y2: 15, h: 8, c: "#a8743f", d: "banca", prod: ["#f08c24", "#e07a14", "#7a3b7a"] },
  { x1: 6, y1: 13, x2: 6, y2: 13, h: 10, c: "#f1f3f4", d: "balanca" },
  { x1: 11, y1: 13, x2: 11, y2: 14, h: 11, c: "#4a4f57", t: "#2f3238", d: "checkout" },
  { x1: 14, y1: 13, x2: 14, y2: 14, h: 11, c: "#4a4f57", t: "#2f3238", d: "checkout" },
  { x1: 17, y1: 13, x2: 17, y2: 14, h: 11, c: "#4a4f57", t: "#2f3238", d: "checkout" },
  { x1: 20, y1: 12, x2: 21, y2: 12, h: 22, c: "#6b4a2e", d: "prat", pal: "cigarro" },
];
for (const [y, a, b] of [
  [6, "mercearia", "bebidas"],
  [8, "limpeza", "higiene"],
  [10, "biscoitos", "mercearia"],
] as const) {
  MOVEIS.push({ x1: 2, y1: y, x2: 7, y2: y, h: 22, c: "#c7ced6", t: "#e3e7eb", d: "prat", pal: a });
  MOVEIS.push({ x1: 11, y1: y, x2: 17, y2: y, h: 22, c: "#c7ced6", t: "#e3e7eb", d: "prat", pal: b });
}

const ocupado = new Set<string>();
for (const m of MOVEIS) {
  for (let x = m.x1; x <= m.x2; x++) for (let y = m.y1; y <= m.y2; y++) ocupado.add(`${x},${y}`);
}

/* divisorias (paredes baixas) e portas */
const PORTAS_Y5 = new Set([3, 13, 17]);
const arestas = new Set<string>();
const bloq = (a: number, b: number, c: number, d: number) => {
  arestas.add(`${a},${b},${c},${d}`);
  arestas.add(`${c},${d},${a},${b}`);
};
const divisorias: Array<{ tipo: "x" | "y"; x: number; y: number }> = [];
for (let x = 0; x < W; x++) {
  if (!PORTAS_Y5.has(x)) {
    bloq(x, 4, x, 5);
    if (x < 8 || x > 12) divisorias.push({ tipo: "y", x, y: 4 });
  }
}
for (let y = 0; y < 5; y++) {
  if (y !== 2) {
    bloq(6, y, 7, y);
    bloq(13, y, 14, y);
    divisorias.push({ tipo: "x", x: 6, y });
    divisorias.push({ tipo: "x", x: 13, y });
  }
}

function faceL(c: Ctx, tx: number, ty: number, j0: number, j1: number, h1: number, h2: number, cor: string) {
  c.fillStyle = cor;
  for (let j = j0; j <= j1; j++) {
    const b = ty + 8 + (j >> 1);
    c.fillRect(tx - 16 + j, b - h2 + 1, 1, h2 - h1);
  }
}
function faceR(c: Ctx, tx: number, ty: number, j0: number, j1: number, h1: number, h2: number, cor: string) {
  c.fillStyle = cor;
  for (let j = j0; j <= j1; j++) {
    const b = ty + 15 - (j >> 1);
    c.fillRect(tx + j, b - h2 + 1, 1, h2 - h1);
  }
}
function topoPadrao(c: Ctx, tx: number, top: number, cores: string[]) {
  for (let i = 2; i < 14; i++) {
    const h = (i < 8 ? (i + 1) * 2 : (16 - i) * 2) - 3;
    for (let k = -h; k < h; k += 2) {
      c.fillStyle = cores[Math.abs(k * 7 + i * 13) % cores.length];
      c.fillRect(tx + k, top + i, 2, 1);
    }
  }
}

function prateleiras(c: Ctx, m: Movel, x: number, y: number, tx: number, ty: number, L: boolean, R: boolean) {
  const pal = PAL[m.pal ?? "mercearia"];
  const nivel = m.h > 30 ? [2, 11, 20, 29] : [1, 8, 15];
  const linha = tom(m.c, -0.38);
  nivel.forEach((s, si) => {
    if (L) {
      faceL(c, tx, ty, 0, 15, s, s + 1, linha);
      for (let j = 1; j < 15; j += 3) faceL(c, tx, ty, j, j + 1, s + 1, s + 6, pal[(x * 5 + j + si * 2) % pal.length]);
    }
    if (R) {
      faceR(c, tx, ty, 0, 15, s, s + 1, linha);
      for (let j = 1; j < 15; j += 3) faceR(c, tx, ty, j, j + 1, s + 1, s + 6, pal[(y * 3 + j + si) % pal.length]);
    }
  });
}

function enfeite(c: Ctx, m: Movel, x: number, y: number, tx: number, ty: number, L: boolean, R: boolean) {
  const top = ty - m.h;
  switch (m.d) {
    case "prat":
      prateleiras(c, m, x, y, tx, ty, L, R);
      break;
    case "pc":
      if (x === m.x1) {
        c.fillStyle = "#2b2f36"; c.fillRect(tx - 4, top - 3, 8, 7);
        c.fillStyle = "#7fc8f0"; c.fillRect(tx - 3, top - 2, 6, 4);
        c.fillStyle = "#2b2f36"; c.fillRect(tx - 1, top + 4, 2, 2);
      } else {
        c.fillStyle = "#f7f3d4"; c.fillRect(tx - 5, top + 5, 6, 3); c.fillRect(tx + 1, top + 6, 5, 3);
      }
      break;
    case "note":
      if (x === m.x2) {
        c.fillStyle = "#8a929c"; c.fillRect(tx - 4, top + 6, 8, 2);
        c.fillStyle = "#3a4250"; c.fillRect(tx - 3, top + 1, 6, 5);
        c.fillStyle = "#f2c230"; c.fillRect(tx - 1, top + 3, 2, 1);
      }
      break;
    case "cofre":
      if (R) { faceR(c, tx, ty, 5, 10, 5, 11, "#2b2f36"); faceR(c, tx, ty, 7, 8, 7, 9, "#c9c9c9"); }
      if (L) faceL(c, tx, ty, 6, 9, 7, 9, "#c9c9c9");
      break;
    case "arquivo":
      if (L) {
        faceL(c, tx, ty, 2, 13, 8, 9, tom(m.c, -0.45)); faceL(c, tx, ty, 2, 13, 17, 18, tom(m.c, -0.45));
        faceL(c, tx, ty, 7, 8, 12, 13, "#d9d9d9"); faceL(c, tx, ty, 7, 8, 21, 22, "#d9d9d9");
      }
      break;
    case "camara":
      if (L && x === 11) { faceL(c, tx, ty, 2, 15, 2, 32, "#a3aeb6"); faceL(c, tx, ty, 12, 13, 14, 20, "#3d4248"); }
      if (R) faceR(c, tx, ty, 4, 11, 24, 30, "#5aa0d8");
      break;
    case "serra":
      if (L) faceL(c, tx, ty, 0, 15, 14, 17, "#c4402e");
      c.fillStyle = "#8d969d"; c.fillRect(tx - 1, top - 6, 2, 7);
      break;
    case "vitrine":
      if (L) {
        faceL(c, tx, ty, 0, 15, 4, 11, "#f8e2dc");
        for (let j = 1; j < 15; j += 3) faceL(c, tx, ty, j, j + 1, 5, 8, (x + j) % 2 ? "#b8423a" : "#d9776b");
      }
      c.fillStyle = "#b8423a"; c.fillRect(tx - 6, top + 6, 4, 2);
      c.fillStyle = "#e08f86"; c.fillRect(tx + 2, top + 7, 4, 2);
      break;
    case "palete":
      if (L) { faceL(c, tx, ty, 0, 15, 0, 2, "#7a5a32"); faceL(c, tx, ty, 0, 15, 7, 8, "#e6c690"); }
      if (R) { faceR(c, tx, ty, 0, 15, 0, 2, "#6a4c2a"); faceR(c, tx, ty, 0, 15, 7, 8, "#e6c690"); }
      break;
    case "sacolas":
      c.fillStyle = "#f2e27a"; c.fillRect(tx - 5, top - 1, 4, 6);
      c.fillStyle = "#f6f6f6"; c.fillRect(tx + 1, top, 4, 5);
      c.fillStyle = "#c8412f"; c.fillRect(tx - 4, top - 2, 2, 1);
      break;
    case "moto":
      if (L) { faceL(c, tx, ty, 1, 4, 0, 5, "#151515"); faceL(c, tx, ty, 11, 14, 0, 5, "#151515"); }
      c.fillStyle = "#1d1f24"; c.fillRect(tx - 4, top + 5, 8, 3);
      c.fillStyle = "#d8d8d8"; c.fillRect(tx + 6, top + 3, 2, 2);
      break;
    case "congelados":
      topoPadrao(c, tx, top, ["#bfe3f2", "#bfe3f2", "#f4f4f4", "#c4402e", "#3d74b8"]);
      break;
    case "laticinios":
      if (R) {
        faceR(c, tx, ty, 1, 14, 3, 25, "#cfe9f7");
        [9, 17].forEach((s) => faceR(c, tx, ty, 1, 14, s, s + 1, "#8fb0c2"));
        [3, 10, 18].forEach((s, si) => {
          for (let j = 2; j < 14; j += 3) faceR(c, tx, ty, j, j + 1, s + 1, s + 6, PAL.laticinios[(y + j + si) % 5]);
        });
      }
      break;
    case "sorvete":
      topoPadrao(c, tx, top, ["#a9d6ee", "#a9d6ee", "#f4b6c8", "#f2e27a", "#7a4a2a"]);
      break;
    case "banca":
      topoPadrao(c, tx, top, m.prod ?? ["#d8402c"]);
      if (L) faceL(c, tx, ty, 0, 15, 3, 4, tom(m.c, -0.4));
      break;
    case "balanca":
      c.fillStyle = "#2b2f36"; c.fillRect(tx - 4, top + 3, 8, 4);
      c.fillStyle = "#7fd69a"; c.fillRect(tx - 3, top + 4, 5, 2);
      break;
    case "checkout":
      if (y === m.y1) {
        c.fillStyle = "#25282d"; c.fillRect(tx - 4, top - 5, 8, 7);
        c.fillStyle = "#7fd69a"; c.fillRect(tx - 3, top - 4, 6, 2);
      } else {
        c.fillStyle = "#141619";
        for (let i = 4; i < 12; i++) {
          const h = (i < 8 ? (i + 1) * 2 : (16 - i) * 2) - 6;
          if (h > 0) c.fillRect(tx - h, top + i, h * 2, 1);
        }
      }
      break;
  }
}

type Estatico = { prof: number; desenha: (c: Ctx) => void };

function montarEstaticos(): Estatico[] {
  const estaticos: Estatico[] = [];
  for (const m of MOVEIS) {
    const l = tom(m.c, -0.2);
    const r = tom(m.c, -0.08);
    const t = m.t ?? tom(m.c, 0.12);
    for (let x = m.x1; x <= m.x2; x++) {
      for (let y = m.y1; y <= m.y2; y++) {
        const mostraL = y === m.y2;
        const mostraR = x === m.x2;
        estaticos.push({
          prof: x + y + 0.5,
          desenha: (c) => {
            const [tx, ty] = iso(x, y);
            if (mostraL) faceL(c, tx, ty, 0, 15, 0, m.h, l);
            if (mostraR) faceR(c, tx, ty, 0, 15, 0, m.h, r);
            losango(c, tx, ty - m.h, t);
            enfeite(c, m, x, y, tx, ty, mostraL, mostraR);
          },
        });
      }
    }
  }
  for (const d of divisorias) {
    const cor = "#d9ccb0";
    const cap = "#8d7f5c";
    estaticos.push({
      prof: d.x + d.y + 0.95,
      desenha: (c) => {
        const [tx, ty] = iso(d.x, d.y);
        if (d.tipo === "y") {
          faceL(c, tx, ty, 0, 15, 0, HP, cor);
          faceL(c, tx, ty, 0, 15, HP, HP + 2, cap);
        } else {
          faceR(c, tx, ty, 0, 15, 0, HP, tom(cor, -0.08));
          faceR(c, tx, ty, 0, 15, HP, HP + 2, cap);
        }
      },
    });
  }
  return estaticos;
}

/* camada fixa: chao, paredes, calcada */
function desenharFixo(c: Ctx) {
  c.fillStyle = "#0f1520";
  c.fillRect(0, 0, CW, CH);
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 24; x++) {
      const s = salaEm(x, y);
      const [tx, ty] = iso(x, y);
      if (s) losango(c, tx, ty, s.piso[(x + y) % 2]);
      else if (y === 16 || x === 22) losango(c, tx, ty, (x + y) % 2 ? "#a9a69c" : "#9f9c92");
      else if (y === 17 || x === 23) {
        losango(c, tx, ty, "#34373e");
        if ((y === 17 && x % 3 === 1) || (x === 23 && y % 3 === 1)) {
          c.fillStyle = "#d8b440";
          c.fillRect(tx - 3, ty + 7, 6, 2);
        }
      }
    }
  }
  for (const [x, y] of [[8, 14], [8, 15]]) {
    const [tx, ty] = iso(x, y);
    losango(c, tx, ty, "#3a342c");
  }
  for (let x = 0; x < W; x++) {
    const parede = salaEm(x, 0)?.parede ?? "#999999";
    const [tx, ty] = iso(x, 0);
    for (let j = 0; j < 16; j++) {
      const b = ty + (j >> 1);
      c.fillStyle = tom(parede, -0.1); c.fillRect(tx + j, b - WH, 1, WH);
      c.fillStyle = tom(parede, -0.45); c.fillRect(tx + j, b - WH - 2, 1, 2);
    }
  }
  for (let y = 0; y < H; y++) {
    const parede = salaEm(0, y)?.parede ?? "#999999";
    const [tx, ty] = iso(0, y);
    for (let j = 0; j < 16; j++) {
      const b = ty + (j >> 1);
      c.fillStyle = tom(parede, 0.04); c.fillRect(tx - 1 - j, b - WH, 1, WH);
      c.fillStyle = tom(parede, -0.4); c.fillRect(tx - 1 - j, b - WH - 2, 1, 2);
    }
  }
  const fundo = (xa: number, xb: number, h1: number, h2: number, cor: string) => {
    c.fillStyle = cor;
    for (let t = Math.round(xa * 16); t < Math.round(xb * 16); t++) c.fillRect(OX + t, OY + (t >> 1) - h2, 1, h2 - h1);
  };
  const esq = (ya: number, yb: number, h1: number, h2: number, cor: string) => {
    c.fillStyle = cor;
    for (let t = Math.round(ya * 16); t < Math.round(yb * 16); t++) c.fillRect(OX - 1 - t, OY + (t >> 1) - h2, 1, h2 - h1);
  };
  esq(1, 3.2, 22, 44, "#6b5a3a"); esq(1.1, 3.1, 24, 42, "#9cc9e6"); esq(2.05, 2.15, 24, 42, "#6b5a3a");
  fundo(1, 3.4, 16, 42, "#6b4a2a"); fundo(1.1, 3.3, 18, 40, "#a0703f");
  fundo(1.3, 1.7, 30, 37, "#f2e27a"); fundo(1.9, 2.3, 23, 30, "#f7b0b0"); fundo(2.5, 2.9, 31, 38, "#f2e27a"); fundo(2.2, 2.45, 33, 39, "#a6d8f0"); fundo(2.8, 3.1, 21, 27, "#ffffff");
  for (let h = 6; h < 52; h += 6) fundo(7, 14, h, h + 1, "#cbd5d9");
  for (let x = 7; x < 14; x += 0.5) fundo(x, x + 0.07, 0, 52, "#cbd5d9");
  fundo(7, 14, 40, 46, "#b8423a");
  fundo(18.8, 21, 0, 44, "#5e656e"); fundo(19, 20.8, 0, 41, "#8b939c");
  for (let h = 2; h < 41; h += 3) fundo(19, 20.8, h, h + 1, "#6f7780");
  for (let k = 0; k < 8; k++) fundo(19 + k * 0.225, 19.1 + k * 0.225, 41, 44, k % 2 ? "#1b1b1b" : "#f2c230");
  esq(5.5, 7.3, 30, 48, "#f2c230"); esq(5.8, 7, 34, 40, "#c4402e"); esq(5.8, 6.6, 42, 45, "#1e1c17");
  esq(8.2, 9.9, 30, 48, "#f6f0dc"); esq(8.5, 9.6, 36, 42, "#2e7a4b"); esq(8.5, 9.2, 44, 46, "#c4402e");
  esq(12.3, 14.7, 16, 42, "#7a5a32"); esq(12.4, 14.6, 18, 40, "#2d4a3a");
  esq(12.8, 14.2, 33, 35, "#e8efe6"); esq(12.8, 13.9, 28, 29, "#e8efe6"); esq(12.8, 14, 23, 24, "#9fe29a");
}

export function desenharAvatar(c: Ctx, look: Look, fx: number, fy: number, face: number, alpha: number) {
  c.globalAlpha = alpha;
  const p = (dx: number, dy: number, w: number, h: number, cor: string) => {
    c.fillStyle = cor;
    c.fillRect(face > 0 ? fx + dx : fx - dx - w, fy + dy, w, h);
  };
  const pele = look.pele;
  const ex = look.extras ?? [];
  p(-5, -1, 10, 2, "rgba(0,0,0,.3)");
  for (const [n, cor = "#000000"] of ex) {
    if (n === "mochila") { p(-8, -18, 4, 8, cor); p(-8, -18, 4, 1, tom(cor, -0.3)); }
    if (n === "caixa") { p(-8, -25, 6, 5, "#c99a5b"); p(-8, -23, 6, 1, "#e6c690"); }
  }
  p(-4, -2, 3, 2, look.sapato); p(1, -2, 3, 2, look.sapato);
  p(-4, -9, 3, 7, look.calca); p(1, -9, 3, 7, look.calca); p(-1, -9, 2, 2, look.calca);
  p(-4, -17, 8, 8, look.camisa); p(-4, -10, 8, 1, tom(look.calca, -0.35));
  p(-6, -17, 2, 5, look.camisa); p(4, -17, 2, 5, look.camisa);
  p(-6, -12, 2, 2, look.maos ?? pele); p(4, -12, 2, 2, look.maos ?? pele);
  p(-1, -18, 2, 1, pele);
  p(-4, -26, 8, 8, pele);
  const [est, hc = "#222222", hl = hc] = look.cabelo ?? [];
  switch (est) {
    case "curto": p(-4, -27, 8, 3, hc); p(-4, -24, 2, 3, hc); p(3, -24, 1, 1, hc); break;
    case "entradas": p(-4, -25, 2, 4, hc); p(3, -24, 1, 2, hc); p(-3, -27, 5, 1, hc); break;
    case "careca": p(-1, -26, 3, 1, tom(pele, 0.18)); break;
    case "coque": p(-4, -27, 8, 3, hc); p(-4, -24, 2, 4, hc); p(-3, -30, 5, 3, hc); p(1, -32, 1, 3, "#2d5fd0"); break;
    case "cacheado": p(-6, -29, 12, 5, hc); p(-6, -24, 3, 8, hc); p(4, -24, 2, 4, hc); p(-4, -28, 1, 1, tom(hc, 0.25)); p(1, -29, 1, 1, tom(hc, 0.25)); p(-1, -31, 4, 2, "#a0662e"); break;
    case "rabo": p(-4, -27, 8, 3, hc); p(-4, -24, 1, 3, hc); p(-7, -29, 3, 10, hc); p(-7, -27, 1, 6, hl); p(-1, -27, 1, 2, hl); p(-5, -28, 2, 2, "#c4402e"); break;
    case "acaju": p(-4, -27, 8, 3, hc); p(-4, -24, 2, 4, hc); p(3, -24, 1, 2, hc); p(1, -27, 2, 1, tom(hc, 0.2)); break;
    case "raspado": p(-4, -27, 8, 2, tom(hc, 0.15)); p(-4, -25, 1, 2, tom(hc, 0.15)); break;
    case "degrade": p(-4, -27, 8, 2, hc); p(-4, -25, 1, 2, hc); break;
    case "trancas": p(-4, -27, 8, 2, hc); p(-5, -25, 2, 11, hc); p(-6, -23, 1, 8, hc); p(3, -25, 1, 4, hc); break;
  }
  for (const [n, cor = "#000000"] of ex) {
    switch (n) {
      case "xadrez": p(-4, -15, 8, 1, cor); p(-4, -12, 8, 1, cor); p(-2, -17, 1, 7, cor); p(1, -17, 1, 7, cor); p(-6, -15, 2, 1, cor); p(4, -15, 2, 1, cor); break;
      case "bigode": p(0, -20, 4, 1, cor); break;
      case "barba": p(-3, -21, 7, 3, cor); p(1, -20, 2, 1, tom(pele, -0.35)); break;
      case "barbarala": p(-3, -19, 1, 1, cor); p(0, -19, 1, 1, cor); p(2, -19, 1, 1, cor); p(-2, -20, 1, 1, cor); p(3, -20, 1, 1, cor); break;
      case "avental": p(-4, -16, 8, 13, cor); p(-3, -18, 1, 2, cor); p(2, -18, 1, 2, cor); p(-4, -11, 8, 1, tom(cor, -0.15)); break;
      case "manchas": p(-2, -12, 1, 1, "#b8423a"); p(1, -8, 1, 1, "#b8423a"); p(2, -14, 1, 1, "#c9776b"); break;
      case "colete": p(-4, -17, 2, 8, cor); p(2, -17, 2, 8, cor); break;
      case "refletivo": p(-4, -13, 2, 1, "#f4f4f4"); p(2, -13, 2, 1, "#f4f4f4"); break;
      case "cracha": p(1, -15, 2, 3, "#ffffff"); p(1, -15, 2, 1, "#2e7a4b"); break;
      case "chaves": p(-6, -10, 2, 2, "#e2b93b"); break;
      case "cordao": p(-3, -17, 1, 2, "#c4402e"); p(2, -17, 1, 2, "#c4402e"); p(-1, -15, 3, 1, "#333333"); break;
      case "corrente": p(-2, -17, 4, 1, "#cfd6dd"); break;
      case "notebook": p(4, -15, 4, 6, "#5d6670"); p(4, -15, 4, 1, "#9aa3ad"); break;
      case "cardiga": p(-4, -17, 2, 8, cor); p(2, -17, 2, 8, cor); p(-6, -17, 2, 5, cor); p(4, -17, 2, 5, cor); break;
      case "brinco": p(-5, -21, 1, 1, cor); break;
      case "batom": p(1, -20, 2, 1, cor); break;
      case "piercing": p(3, -21, 1, 1, "#e0e0e0"); break;
      case "caneta": p(-5, -25, 1, 3, "#2d5fd0"); break;
      case "bloquinho": p(1, -16, 2, 2, "#f7f3d4"); break;
      case "gola": p(-2, -17, 4, 1, "#111111"); break;
    }
  }
  if (look.chapeu) {
    const [n, cor = "#222222"] = look.chapeu;
    if (n === "bone") { p(-4, -28, 8, 3, cor); p(2, -26, 5, 1, tom(cor, -0.25)); p(-1, -27, 2, 1, "#f2c230"); }
    if (n === "touca") { p(-5, -29, 10, 4, "#f4f6f7"); p(-4, -30, 8, 1, "#f4f6f7"); p(-5, -26, 10, 1, "#d5dbde"); }
    if (n === "capacete") { p(-5, -30, 10, 7, cor); p(-5, -23, 3, 3, cor); p(1, -25, 4, 2, "#3a4d63"); p(-3, -28, 2, 2, "#f2c230"); }
    if (n === "lenco") { p(-4, -28, 8, 3, cor); p(-7, -27, 3, 2, cor); p(-3, -27, 1, 1, "#ffffff"); p(0, -28, 1, 1, "#ffffff"); p(2, -27, 1, 1, "#ffffff"); }
  }
  p(-1, -22, 1, 1, "#1a1410"); p(2, -22, 1, 1, "#1a1410");
  if (look.oculos) {
    const o = look.oculos;
    p(-2, -23, 6, 1, o); p(-2, -22, 1, 1, o); p(0, -22, 1, 1, o); p(3, -22, 1, 1, o);
  }
  c.globalAlpha = 1;
}

export function lookDe(chave: string, indice = 0): Look {
  return FIGURAS[chave]?.look ?? VISITANTE[indice % VISITANTE.length];
}

/* fonte 3x5 para os baloes */
const GLIFO: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
  "+": "000010111010000", v: "000001101010000", "!": "010010010000010", ".": "000000000000010",
};
function bolha(c: Ctx, fx: number, fy: number, txt: string, cor: string) {
  const w = txt.length * 4 + 3;
  const x0 = Math.round(fx - w / 2);
  const y0 = fy - 42;
  c.fillStyle = "#070b12"; c.fillRect(x0 - 1, y0 - 1, w + 2, 11); c.fillRect(fx - 1, y0 + 10, 3, 2);
  c.fillStyle = cor; c.fillRect(x0, y0, w, 9); c.fillRect(fx, y0 + 9, 1, 2);
  c.fillStyle = "#ffffff";
  [...txt].forEach((ch, i) => {
    const g = GLIFO[ch];
    if (!g) return;
    for (let b = 0; b < 15; b++) if (g[b] === "1") c.fillRect(x0 + 2 + i * 4 + (b % 3), y0 + 2 + Math.floor(b / 3), 1, 1);
  });
}

type Ator = {
  id: string;
  nome: string;
  look: Look;
  zona: Zona[];
  tx: number;
  ty: number;
  x: number;
  y: number;
  caminho: Array<[number, number]>;
  espera: number;
  face: number;
};

type Fala = { el: HTMLDivElement; ate: number; ator: Ator };

export type Cena = {
  marcar: (marcadores: Record<string, Marcador>) => void;
  selecionar: (id: string | null) => void;
  falar: (id: string, texto: string, cor?: "feito" | "fazendo" | "fala") => void;
  parar: () => void;
};

/**
 * Liga a cena num canvas. `camada` e um elemento posicionado por cima do
 * canvas, do mesmo tamanho, onde ficam o nome de quem esta sob o mouse e os
 * baloes de fala.
 */
export function criarCena(canvas: HTMLCanvasElement, camada: HTMLElement, pessoas: PessoaNaCena[], aoClicar: (id: string) => void): Cena {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { marcar: () => {}, selecionar: () => {}, falar: () => {}, parar: () => {} };
  }

  const calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fixo = document.createElement("canvas");
  fixo.width = CW;
  fixo.height = CH;
  const fctx = fixo.getContext("2d");
  if (fctx) desenharFixo(fctx);
  const estaticos = montarEstaticos();

  // Quem nao tem lugar marcado ganha uma casa livre no salao.
  const livresNoSalao: Array<[number, number]> = [];
  for (let y = 5; y <= 11; y++) for (let x = 0; x < W; x++) if (!ocupado.has(`${x},${y}`)) livresNoSalao.push([x, y]);

  let extras = 0;
  const atores: Ator[] = pessoas.map((p) => {
    const fig = FIGURAS[p.chave];
    const casa = fig?.casa ?? livresNoSalao[(extras * 7) % livresNoSalao.length];
    const look = fig?.look ?? VISITANTE[extras % VISITANTE.length];
    if (!fig) extras++;
    return {
      id: p.id,
      nome: p.nome.split(" ")[0] ?? p.nome,
      look,
      zona: fig?.zona ?? [[0, 5, 21, 11]],
      tx: casa[0],
      ty: casa[1],
      x: casa[0],
      y: casa[1],
      caminho: [],
      espera: Math.random() * 4,
      face: Math.random() < 0.5 ? 1 : -1,
    };
  });

  const naZona = (a: Ator, x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && !ocupado.has(`${x},${y}`) && a.zona.some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);

  function novoDestino(a: Ator) {
    const ini = `${a.tx},${a.ty}`;
    const pai = new Map<string, string | null>([[ini, null]]);
    const fila: Array<[number, number, number]> = [[a.tx, a.ty, 0]];
    const alcance: Array<[number, number]> = [];
    while (fila.length) {
      const [x, y, d] = fila.shift() as [number, number, number];
      if (d > 0 && d <= 7) alcance.push([x, y]);
      if (d >= 9) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (pai.has(k) || !naZona(a, nx, ny) || arestas.has(`${x},${y},${nx},${ny}`)) continue;
        pai.set(k, `${x},${y}`);
        fila.push([nx, ny, d + 1]);
      }
    }
    if (!alcance.length) return;
    const [dx, dy] = alcance[Math.floor(Math.random() * alcance.length)];
    const rota: Array<[number, number]> = [];
    let k: string | null | undefined = `${dx},${dy}`;
    while (k && k !== ini) {
      const [rx, ry] = k.split(",").map(Number);
      rota.unshift([rx, ry]);
      k = pai.get(k);
    }
    a.caminho = rota;
  }

  function mover(a: Ator, dt: number) {
    if (!a.caminho.length) {
      a.espera -= dt;
      if (a.espera <= 0) {
        novoDestino(a);
        a.espera = 2.5 + Math.random() * 5;
      }
      return;
    }
    const [nx, ny] = a.caminho[0];
    const vx = nx - a.x;
    const vy = ny - a.y;
    const dist = Math.hypot(vx, vy);
    const passo = 1.7 * dt;
    const sx = vx - vy;
    if (sx) a.face = sx > 0 ? 1 : -1;
    if (dist <= passo) {
      a.x = nx; a.y = ny; a.tx = nx; a.ty = ny;
      a.caminho.shift();
    } else {
      a.x += (vx / dist) * passo;
      a.y += (vy / dist) * passo;
    }
  }

  const pe = (a: Ator): [number, number] => [Math.round((a.x - a.y) * 16 + OX), Math.round((a.x + a.y + 1) * 8 + OY)];

  const etiqueta = document.createElement("div");
  etiqueta.className = "pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs font-semibold text-amber-300";
  etiqueta.hidden = true;
  camada.appendChild(etiqueta);

  let marcadores: Record<string, Marcador> = {};
  let hover: Ator | null = null;
  let selId: string | null = null;
  const falas: Fala[] = [];

  function desenhar(ms: number) {
    if (!ctx) return;
    ctx.drawImage(fixo, 0, 0);
    {
      const [cx, cy] = iso(19.5, 11.5);
      ctx.fillStyle = "#7fb4df";
      ctx.fillRect(cx - 7, cy - 1, 13, 3); ctx.fillRect(cx - 4, cy - 2, 8, 1); ctx.fillRect(cx - 3, cy + 2, 7, 1);
      const k = calmo ? 2 : Math.floor(ms / 400) % 6;
      ctx.fillStyle = "#d8ecfa"; ctx.fillRect(cx - 5 + k * 2, cy, 2, 1);
    }
    const sel = atores.find((a) => a.id === selId);
    if (sel) {
      const [fx, fy] = pe(sel);
      contorno(ctx, fx, fy - 8, "#f2c230");
    }
    const lista: Array<{ prof: number; ator?: Ator; desenha?: (c: Ctx) => void }> = [
      ...estaticos,
      ...atores.map((a) => ({ prof: a.x + a.y + 0.6, ator: a })),
    ];
    lista.sort((a, b) => a.prof - b.prof);
    for (const o of lista) {
      if (o.ator) {
        const [fx, fy] = pe(o.ator);
        desenharAvatar(ctx, o.ator.look, fx, fy, o.ator.face, 1);
      } else {
        o.desenha?.(ctx);
      }
    }
    for (const a of atores) {
      const m = marcadores[a.id];
      if (!m) continue;
      const [fx, fy] = pe(a);
      if (m.fazendo) bolha(ctx, fx, fy, "...", "#2c6fb7");
      else if (m.atrasadas) bolha(ctx, fx, fy, m.atrasadas > 9 ? "9+" : String(m.atrasadas), "#c23e2c");
      else if (m.hoje) bolha(ctx, fx, fy, m.hoje > 9 ? "9+" : String(m.hoje), "#e0a019");
      else if (m.feitas) bolha(ctx, fx, fy, "v", "#3a9a58");
    }
    if (sel) {
      const [fx, fy] = pe(sel);
      const b = calmo ? 0 : Math.round(Math.sin(ms / 220) * 2);
      const y = fy - 52 + b;
      ctx.fillStyle = "#070b12"; ctx.fillRect(fx - 4, y - 1, 9, 1);
      ctx.fillStyle = "#f2c230"; ctx.fillRect(fx - 3, y, 7, 1); ctx.fillRect(fx - 2, y + 1, 5, 1); ctx.fillRect(fx - 1, y + 2, 3, 1); ctx.fillRect(fx, y + 3, 1, 1);
    }
    const alvo = hover ?? sel;
    if (alvo) {
      const [fx, fy] = pe(alvo);
      etiqueta.hidden = false;
      etiqueta.textContent = alvo.nome;
      etiqueta.style.left = `${(fx / CW) * 100}%`;
      etiqueta.style.top = `${((fy - (alvo === sel ? 56 : 46)) / CH) * 100}%`;
    } else {
      etiqueta.hidden = true;
    }
    const agora = performance.now();
    for (let i = falas.length - 1; i >= 0; i--) {
      const f = falas[i];
      if (agora > f.ate) {
        f.el.remove();
        falas.splice(i, 1);
        continue;
      }
      const [fx, fy] = pe(f.ator);
      f.el.style.left = `${(fx / CW) * 100}%`;
      f.el.style.top = `${((fy - 50) / CH) * 100}%`;
    }
  }

  let ult = 0;
  let quadroId = 0;
  function quadro(ms: number) {
    quadroId = requestAnimationFrame(quadro);
    if (ms - ult < 33) return;
    const dt = Math.min(0.1, (ms - ult) / 1000);
    ult = ms;
    if (!calmo) atores.forEach((a) => mover(a, dt));
    desenhar(ms);
  }
  quadroId = requestAnimationFrame(quadro);

  const pontoCanvas = (e: MouseEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * CW) / r.width, ((e.clientY - r.top) * CH) / r.height];
  };
  const atorEm = (px: number, py: number) => {
    const ord = [...atores].sort((a, b) => b.x + b.y - (a.x + a.y));
    return (
      ord.find((a) => {
        const [fx, fy] = pe(a);
        return px >= fx - 8 && px <= fx + 8 && py >= fy - 34 && py <= fy + 2;
      }) ?? null
    );
  };
  const aoMover = (e: MouseEvent) => {
    const [x, y] = pontoCanvas(e);
    hover = atorEm(x, y);
    canvas.style.cursor = hover ? "pointer" : "default";
  };
  const aoSair = () => {
    hover = null;
  };
  const aoClique = (e: MouseEvent) => {
    const [x, y] = pontoCanvas(e);
    const a = atorEm(x, y);
    if (a) aoClicar(a.id);
  };
  canvas.addEventListener("mousemove", aoMover);
  canvas.addEventListener("mouseleave", aoSair);
  canvas.addEventListener("click", aoClique);

  const CORES_FALA = {
    feito: "border-emerald-700 bg-emerald-50 text-emerald-900",
    fazendo: "border-sky-700 bg-sky-50 text-sky-900",
    fala: "border-slate-800 bg-white text-slate-900",
  } as const;

  return {
    marcar(novos) {
      marcadores = novos;
    },
    selecionar(id) {
      selId = id;
    },
    falar(id, texto, cor = "fala") {
      const ator = atores.find((a) => a.id === id);
      if (!ator) return;
      // Uma fala por pessoa: a nova substitui a anterior.
      for (let i = falas.length - 1; i >= 0; i--) {
        if (falas[i].ator === ator) {
          falas[i].el.remove();
          falas.splice(i, 1);
        }
      }
      const el = document.createElement("div");
      el.className = `pointer-events-none absolute z-10 w-max max-w-[11rem] -translate-x-1/2 -translate-y-full border-2 px-2 py-1 text-[11px] leading-tight shadow-[2px_2px_0_rgba(0,0,0,.45)] ${CORES_FALA[cor]}`;
      el.textContent = texto;
      camada.appendChild(el);
      falas.push({ el, ate: performance.now() + 8000, ator });
    },
    parar() {
      cancelAnimationFrame(quadroId);
      canvas.removeEventListener("mousemove", aoMover);
      canvas.removeEventListener("mouseleave", aoSair);
      canvas.removeEventListener("click", aoClique);
      etiqueta.remove();
      falas.forEach((f) => f.el.remove());
    },
  };
}
