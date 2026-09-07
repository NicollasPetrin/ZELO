# Artes de marketing — formato

**Fonte da verdade:** `scripts/gerar-artes.mjs`. Este documento explica as decisoes;
o script e quem as executa. Mudou o formato, muda o script — nao so este texto.

```
node scripts/gerar-artes.mjs            # as 30 pecas
node scripts/gerar-artes.mjs post-03    # so o que casar com o filtro
```

Saida em `output/artes/`, que o `.gitignore` descarta. Precisa do Playwright disponivel
(`PLAYWRIGHT_MODULE=/caminho/playwright/index.js` quando ele nao estiver no projeto) e de
rede na primeira execucao, para baixar a Manrope.

## O que sai

80 imagens: 10 posts (`post-01` a `post-10`) e 12 carrosseis.

- Dois carrosseis proprios: `carrossel-1-cinco-sinais`, `carrossel-2-uma-semana`.
- Um carrossel por post: `carrossel-post-01-...` a `carrossel-post-10-...`.

Todos com **cinco a sete slides**. Slide que carrega meia ideia cansa antes de convencer:
o que cabe junto vira um so, e a conclusao mora no fecho em vez de ocupar tres telas.
  Cada um abre o argumento da legenda em etapas, um slide por etapa, e usa a legenda do
  post irmao na publicacao.

O nome do arquivo e a ordem de postagem — ao subir um carrossel, selecionar na ordem
numerica basta.

## Formato

- **1080x1350 (4:5).** E o recorte de feed que o Instagram menos comprime e o que ocupa
  mais tela no celular. Nao usar 1:1.
- **Capturado em 2x (2160x2700).** O app reduz com nitidez; ampliar borra.
- **PNG.** Arte tipografica de cor chapada fica menor e mais limpa em PNG que em JPEG,
  que suja as bordas das letras.

## Identidade

Nada aqui e escolha nova: sao os mesmos valores de `app/landing.module.css` e o
`public/brand/zelo-icon.svg`. Quem ve o post e depois abre o site precisa reconhecer
a mesma marca.

| Papel | Valor |
|---|---|
| Fundo claro | `#f7f9f8` |
| Fundo escuro | `#132520` |
| Texto | `#182620` (claro) · `#f2f7f4` (escuro) |
| Apoio | `#58625d` (claro) · `#a8c4b7` (escuro) |
| Acento | `#247451` (claro) · `#7FCBA6` (escuro) |
| Simbolo | `#2E7D5B`, exatamente como esta no SVG |
| Tipografia | Manrope 500/700/800, embutida em base64 |

A Manrope entra embutida de proposito: a captura roda em `file://`, e uma fonte que
falha em carregar troca a arte inteira por Arial sem avisar ninguem. O script aborta
se ela nao carregar.

## Anatomia da peca

Tres faixas, sempre nesta ordem:

1. **Topo** — simbolo + "Zelo". Sempre igual, sempre no mesmo lugar.
2. **Miolo** — centralizado verticalmente (`margin-block:auto`). Olho em maiuscula
   espacada, titulo grande, apoio.
3. **Rodape** — regra fina, frase de apoio a esquerda, "30 dias grátis" em verde a
   direita. Nos carrosseis vira "arrasta →" + contador "3 / 10".

Margens: `92px 88px 84px`.

### Corpos de titulo

| Classe | Tamanho | Onde |
|---|---|---|
| `xl` | 126px | Frase curta que e a peca inteira (posts 1 e 8) |
| `cv` | 88px | Capa e fecho de carrossel — titulos longos, que quebram em 3 linhas |
| `lg` | 96px | Post com conteudo abaixo do titulo |
| `md` | 78px | Slide de miolo de carrossel |

`xl` em titulo longo quebra feio. Se o texto passa de duas linhas curtas, use `cv`.

### Miolos disponiveis

Post: `frase`, `numero`, `planilha`, `captura`, `baloes`, `comparacao`, `papeis`, `precos`.
Slide: `capa`, `ponto`, `virada`, `fecho`, `comp`.

Peca nova reaproveita um miolo existente sempre que der — miolo novo so quando o conteudo
realmente pede.

### Componentes

Planilha, captura, baloes, comparacao, papeis e precos vivem em `COMPONENTE`, escritos uma
vez. O post os usa abaixo do titulo; o slide `comp` os usa sozinhos, com `h1.sm`, porque
ali o bloco visual e o protagonista.

Um carrossel de post puxa os dados do proprio post pelo nome (`carrossel-post-03-...` acha
`post-03-...`): a planilha, os baloes e a tabela de precos existem uma vez so, e mudar o
post muda o carrossel junto.

### Formato do slide

`{ t, h, s }` — tipo, titulo e apoio. `r` e o rotulo do tipo `ponto` (numero, dia da semana
ou preco). `comp` liga um componente; `captura` aponta um arquivo de imagem proprio.

## Regras de conteudo

- **A arte carrega so o gancho.** Quem para de rolar le seis palavras, nao um paragrafo.
  O texto inteiro vive na legenda, em `docs/marketing-conteudo.md`.
- **Capa e fecho de carrossel sao escuros.** No feed eles marcam onde o carrossel comeca
  e termina, e quem ja viu um reconhece o proximo antes de ler.
- **Nenhuma prova que nao existe.** Sem numero de cliente, depoimento ou logo inventado.
  A prova possivel hoje e transparencia: preco visivel, dado nao vendido, cancelamento
  pelo painel.
- **Captura de tela e a real**, tirada de `public/demo/`. Nunca uma interface desenhada
  para o anuncio.

## Travas

O script falha em vez de entregar imagem torta:

- **Manrope nao carregou** → aborta. Arte com a fonte errada nao e a marca.
- **Texto estourando a peca** → aborta, nomeando quais. Corte que passa da altura sai
  cortado na imagem e a captura nao acusa sozinha.
- **Erro de pagina** → aborta.

## Para adicionar uma peca

1. Escreva a legenda em `docs/marketing-conteudo.md`.
2. Acrescente a entrada em `POSTS` ou `CARROSSEIS` no script, escolhendo um miolo.
3. Rode com filtro pelo nome e olhe o PNG.

Para transformar um post em carrossel: um slide por etapa do argumento que a legenda ja
faz, capa com o gancho, fecho com a chamada. Cinco a sete slides; passar disso e diluir.

## Relacionados

- `docs/marketing-conteudo.md` — as legendas e roteiros que estas artes acompanham.
- `docs/marketing-plano.md` — a estrategia e o calendario de publicacao.
- `docs/landing-visual.md` — as diretrizes visuais da landing, de onde estas cores vem.
