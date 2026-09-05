# Landing Zelo

A landing usa os valores de `lib/plans.ts` e o prazo de `lib/subscription.ts`.
Os textos de apresentacao, a comparacao e as perguntas frequentes ficam em
`lib/landing-content.ts`. Nao ha alteracoes de autenticacao, cobranca ou banco.

## Capturas do produto

Os arquivos `public/demo/zelo-*.webp` sao capturas das paginas e componentes
reais, renderizados com dados ficticios. A empresa Horizonte, as pessoas,
tarefas e metricas dessas imagens nao representam clientes ou resultados reais.
Os arquivos antigos em `public/demo` foram preservados, mas nao sao mais usados
na landing.

O teste `scripts/landing-screenshots.test.tsx` substitui somente os limites de
framework, autenticacao e dados por fixtures em memoria. Nenhuma rota publica
de demonstracao, excecao de autenticacao ou conexao de banco e criada.

Para regenerar as imagens, com o servidor local na porta 3000:

```powershell
$env:EXPORT_LANDING_CAPTURES='1'
npm exec vitest run scripts/landing-screenshots.test.tsx
node scripts/capture-landing.mjs
```

O script requer Playwright e um navegador instalado. `PLAYWRIGHT_MODULE` pode
apontar para o modulo instalado fora do projeto e `BROWSER_CHANNEL=msedge`
permite usar o Edge. Sharp ja esta disponivel na arvore de dependencias do Next.
O servidor auxiliar de captura usa somente 127.0.0.1:3001 e encerra ao terminar.

## Verificacao

```powershell
npm run test
npm run lint
npx tsc --noEmit
node scripts/verify-landing.mjs
```

A verificacao visual automatizada cobre 1440, 1280, 1920, 768, 390 e 360 px:
imagens, overflow, abas por mouse e teclado, ampliacao, comparacao, FAQ,
enderecos de contratacao e alinhamento dos botoes de planos. As capturas e o
resultado ficam em `.next/landing-review` (nao versionado).

## Ambiente local

Esta copia do projeto nao continha `.env`. A landing pode ser visualizada sem
credenciais. Login, cadastro, pagamentos e persistencia exigem as configuracoes
reais descritas em `.env.example`; elas nao foram criadas ou alteradas nesta entrega.

O build foi validado com `DATABASE_URL` local inoperante e `SESSION_SECRET`
aleatorio fornecidos apenas ao processo de verificacao. Isso testa compilacao,
tipos e geracao estatica, nao integracao com banco ou pagamentos. Nao use esses
valores de verificacao em producao.
