# Zelo

Zelo e uma aplicacao SaaS para microempresas organizarem tarefas, prazos, setores, metas, equipe e controle operacional sem depender de cobrancas soltas no WhatsApp, planilhas espalhadas ou memoria do gestor.

O projeto foi montado como um MVP funcional com cara de produto comercial: landing page antes do login, criacao real de conta, planos de assinatura, painel interno, controle de permissoes, banco de dados completo via Prisma e funcionalidades liberadas conforme a assinatura ativa.

## Resumo executivo

A Zelo resolve um problema comum em microempresas: a rotina cresce, mas a gestao continua informal. O dono ou gerente precisa saber quem esta fazendo o que, quais tarefas estao atrasadas, quais metas precisam de atencao e qual setor esta travando a operacao.

A proposta do produto e entregar uma camada simples de gestao operacional:

- Tarefas com responsavel, prazo, setor, prioridade e status.
- Metas por empresa, setor ou responsavel.
- Painel com indicadores de atraso, urgencia e progresso.
- Relatorios basicos no Plano Gestao.
- Relatorios completos, automacoes e controles avancados no Plano Completo.
- Assinatura SaaS com limites e funcionalidades por plano.

## Status atual do projeto

O projeto ja possui:

- Landing page institucional antes da pagina de login.
- Apresentacao dos planos de assinatura.
- Cadastro real de empresa e dono da conta.
- Login com credenciais cadastradas.
- Painel interno autenticado.
- Diferencas reais entre planos dentro da aplicacao.
- Menu lateral desktop e navegacao mobile responsiva.
- Banco PostgreSQL com schema completo para SaaS, pronto para Neon/Vercel.
- Seed opcional com empresas, usuarios, tarefas, metas, assinaturas, faturas, relatorios e suporte para desenvolvimento.
- Testes unitarios para regras puras de permissoes, senha e recorrencia.
- PDF de pitch para investidor em `output/pdf/`.

## Publico-alvo

O produto foi pensado para microempresas e pequenas operacoes que ja tem equipe, mas ainda fazem controle de rotina de maneira informal.

Exemplos de segmentos:

- Mercados e varejos locais.
- Oficinas e prestadores de servico.
- Clinicas pequenas.
- Operacoes administrativas familiares.
- Negocios com varios setores, mas sem sistema de gestao proprio.

## Proposta de valor

A Zelo ajuda a empresa a sair de uma rotina baseada em cobranca manual e entrar em uma operacao visivel:

- O dono enxerga atrasos, prioridades, metas e setores criticos.
- O gerente organiza a rotina da equipe sem perder historico.
- O funcionario ve suas tarefas e atualiza andamento em um lugar claro.
- A empresa passa a ter dados para revisar sua propria execucao.

## Stack tecnica

- Next.js 16.2.10 com App Router.
- React 19.2.4.
- TypeScript.
- Tailwind CSS 4.
- Prisma 6.
- PostgreSQL em Neon para desenvolvimento/producao.
- Zod para validacoes.
- React Hook Form.
- Lucide React para icones.
- Vitest para testes unitarios.

## Estrutura principal

```text
app/                         Rotas, layouts e telas Next.js
app/page.tsx                 Landing page publica
app/login/page.tsx           Login com credenciais reais
app/signup/page.tsx          Criacao de conta e empresa
app/(app)/                   Area autenticada do produto
components/                  Componentes reutilizaveis de UI e layout
features/                    Modulos por dominio com data/actions/forms
lib/                         Regras compartilhadas, auth, permissoes, planos e utils
prisma/schema.prisma         Schema completo do banco SaaS
prisma/seed.ts               Seed opcional para desenvolvimento local
scripts/                     Scripts de setup do banco
public/landing-hero.png      Imagem principal da landing page
output/pdf/                  Materiais gerados, incluindo pitch em PDF
```

## Experiencia do usuario

### Landing page

A primeira tela apresenta a Zelo como uma empresa consolidada no mercado. Ela inclui:

- Hero com posicionamento comercial.
- Sessoes de produto.
- Beneficios principais.
- Planos de assinatura.
- Tabela de diferencas entre planos.
- Chamada para criacao de conta.

### Login

A tela de login permite entrar com uma conta cadastrada. Novos clientes podem criar empresa, dono da conta e senha forte pela rota `/signup`.

### Area autenticada

Apos o login, o usuario entra em uma aplicacao operacional com:

- Painel.
- Relatorios.
- Minhas tarefas.
- Tarefas da equipe.
- Setores.
- Funcionarios.
- Metas.
- Notificacoes.
- Configuracoes.
- Gerenciamento de assinatura.

## Funcionalidades por modulo

### Painel

O painel mostra uma visao rapida da operacao:

- Tarefas pendentes.
- Tarefas em andamento.
- Tarefas concluidas.
- Tarefas urgentes.
- Tarefas atrasadas.
- Metas em dia ou em atencao.
- Proximos prazos.
- Pontos de atencao por funcionario e setor.

### Tarefas

O sistema permite controlar tarefas com:

- Titulo e descricao.
- Setor.
- Responsavel.
- Criador.
- Prazo.
- Prioridade.
- Status.
- Comentarios.
- Anexos modelados.
- Historico de atividade.
- Regras de recorrencia.

### Setores

O gestor pode organizar a empresa por setores, como vendas, financeiro, atendimento, estoque, operacao, administrativo e gestao.

### Funcionarios

O dono da empresa pode cadastrar e gerenciar funcionarios, vinculando cada pessoa a um setor e a um papel de acesso.

### Metas

As metas permitem acompanhar progresso por:

- Empresa inteira.
- Setor.
- Responsavel.
- Valor financeiro.
- Percentual.
- Quantidade.
- Tarefas.
- Clientes.
- Vendas.

### Notificacoes

A aplicacao modela notificacoes internas para eventos como:

- Tarefa atribuida.
- Prazo proximo.
- Tarefa atrasada.
- Novo comentario.
- Status atualizado.
- Meta em atencao.

### Configuracoes e assinatura

A tela de configuracoes possui uma area de gerenciamento de assinatura com:

- Plano ativo.
- Preco mensal.
- Limite de usuarios.
- Nome do painel contratado.
- Lista das funcionalidades liberadas naquele plano.
- Dados basicos da empresa.
- Dados do usuario logado.

### Relatorios

Os relatorios mudam conforme o plano:

- Plano Basico: area bloqueada, com orientacao para upgrade.
- Plano Gestao: relatorios basicos de tarefas, setores, responsaveis, atrasos e status.
- Plano Completo: relatorios completos com saude operacional, leitura executiva, gargalos, metas em risco, recomendacoes e distribuicoes por prioridade/status.

## Planos de assinatura

| Plano | Preco base | Usuarios incluidos | Usuario extra | Teto | Posicionamento |
| --- | ---: | ---: | ---: | ---: | --- |
| Basico | R$59,90/mes | Ate 5 | R$14,90/mes | 15 | Entrada para organizar tarefas, prazos e responsabilidades. |
| Gestao | R$249,90/mes | Ate 20 | R$11,90/mes | 45 | Plano mais escolhido, com filtros avancados, recorrencia, desempenho e relatorios basicos. |
| Completo | R$599,90/mes | Ate 60 | R$9,90/mes | Ilimitado | Plano avancado com relatorios completos, automacoes e controles executivos. |

## Diferencas entre planos

| Funcionalidade | Basico | Gestao | Completo |
| --- | --- | --- | --- |
| Usuarios incluidos | Ate 5 | Ate 20 | Ate 60 |
| Usuarios extras | R$14,90 por usuario/mes | R$11,90 por usuario/mes | R$9,90 por usuario/mes |
| Teto de usuarios ativos | 15 | 45 | Ilimitado |
| Painel | Painel simples de tarefas | Painel completo do gestor | Painel executivo de operacao |
| Filtros | Busca e status | Setor, responsavel, prioridade e prazo | Filtros completos para operacao maior |
| Tarefas recorrentes | Bloqueado | Liberado | Liberado |
| Desempenho por pessoa/setor | Bloqueado | Liberado | Liberado com visao executiva |
| Metas | Metas simples | Metas por setor ou responsavel | Metas com leitura executiva |
| Relatorios | Nao incluido | Relatorios basicos | Relatorios completos com leitura executiva |
| Suporte | Basico | Prioritario | Premium |

## Permissoes

| Papel | Permissoes principais |
| --- | --- |
| OWNER | Gerencia empresa, equipe, funcionarios, tarefas, metas, assinatura e configuracoes. |
| MANAGER | Gerencia tarefas e metas da equipe, acessa area operacional e relatorios permitidos. |
| EMPLOYEE | Acessa tarefas proprias, metas visiveis e notificacoes. |

As regras ficam centralizadas em `lib/permissions.ts` e os guardas de rota/actions ficam em `lib/auth/guards.ts`.

## Banco de dados

O banco usa Prisma com PostgreSQL. O schema foi desenhado para suportar uma aplicacao SaaS real, com dominios separados para operacao, assinatura, relatorios e suporte.

Principais entidades:

- `PlanCatalog` e `PlanFeature`: catalogo de planos e funcionalidades.
- `Company`: empresa cliente.
- `User`: usuarios vinculados a empresa e papel.
- `Department`: setores da empresa.
- `Task`, `TaskComment`, `TaskAttachment`, `TaskActivity`: gestao completa de tarefas.
- `RecurrenceRule`: regras de recorrencia.
- `Goal`: metas por empresa, setor ou responsavel.
- `Notification`: notificacoes internas.
- `OnboardingStep`: progresso de onboarding por usuario.
- `CompanySubscription`, `SubscriptionEvent`: assinatura ativa e eventos.
- `PaymentMethod`, `Invoice`: metodo de pagamento e faturas.
- `UsageSnapshot`: uso da conta por periodo.
- `ActivityLog`: auditoria operacional.
- `ReportSnapshot`: snapshots de relatorios.
- `SupportTicket`: suporte por empresa.

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST_POOLER/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
SESSION_SECRET="troque-esta-chave-em-producao-com-valor-longo"
```

Use `DATABASE_URL` com a URL pooled do Neon para a aplicacao e `DIRECT_URL` com a URL direta para migrations.

3. Gere o Prisma Client e aplique as migrations:

```bash
npm run db:deploy
```

4. Se quiser massa de desenvolvimento, rode o seed:

```bash
npm run db:seed
```

5. Rode os testes:

```bash
npm run test
```

6. Inicie o localhost:

```bash
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Scripts disponiveis

| Script | Funcao |
| --- | --- |
| `npm run dev` | Inicia o servidor local Next.js. |
| `npm run build` | Gera build de producao. |
| `npm run start` | Inicia a aplicacao em modo producao apos build. |
| `npm run lint` | Executa ESLint. |
| `npm run test` | Executa testes unitarios com Vitest. |
| `npm run db:generate` | Gera Prisma Client. |
| `npm run db:migrate` | Roda migracoes Prisma em desenvolvimento. |
| `npm run db:deploy` | Aplica migrations em ambiente remoto/producao. |
| `npm run db:setup` | Gera Prisma Client, aplica migrations e executa seed. |
| `npm run db:seed` | Executa seed do Prisma. |
| `npm run db:reset` | Reseta o banco via Prisma. |

## Arquitetura da aplicacao

O projeto segue uma divisao por dominio:

- `app/`: rotas, layouts e composicao de telas.
- `components/`: componentes visuais reutilizaveis.
- `features/*/data.ts`: consultas e read models por dominio.
- `features/*/actions.ts`: mutacoes via Server Actions.
- `features/*/*-form.tsx`: formularios de cada modulo.
- `lib/auth/`: sessao, senha e guardas.
- `lib/plans.ts`: definicao central dos planos, precos, limites e flags de acesso.
- `lib/permissions.ts`: regras de RBAC.
- `lib/validations.ts`: schemas Zod compartilhados.
- `lib/db/client.ts`: instancia Prisma.
- `prisma/schema.prisma`: contrato do banco.
- `prisma/seed.ts`: massa de desenvolvimento local.

## Responsividade mobile

A aplicacao ja esta preparada para uso mobile:

- Landing page responsiva.
- Cards e tabelas com rolagem horizontal quando necessario.
- Menu lateral no desktop.
- Navegacao superior/horizontal no mobile.
- Layouts com grids adaptaveis.
- Controles com tamanhos estaveis para evitar quebra visual.

## Materiais de apresentacao

O projeto tambem possui um PDF de apresentacao comercial para investidor:

```text
output/pdf/
```

Esse material resume problema, produto, modelo de negocio, planos, diferenciais, roadmap e tese de investimento.

## Pontos tecnicos importantes

- A autenticacao atual e local, com cookie assinado e senha com `scrypt`.
- O upload de anexos esta modelado no banco, mas ainda pode evoluir para storage local ou externo.
- A recorrencia ja possui schema e helper; um job/cron pode ser adicionado para gerar proximas tarefas automaticamente.
- O banco usa PostgreSQL, com `DATABASE_URL` pooled e `DIRECT_URL` direta para migrations.
- Para producao, o caminho natural e configurar storage, pagamento real e monitoramento.

## Roadmap sugerido

Proximas evolucoes naturais para transformar o MVP em produto vendavel:

- Integracao com pagamento real.
- Checkout e troca de plano self-service.
- Exportacao de relatorios em PDF/Excel.
- Upload real de anexos.
- Convite de usuarios por e-mail.
- Notificacoes externas por e-mail ou WhatsApp.
- Templates de tarefas por segmento.
- Dashboard financeiro da assinatura.
- Painel administrativo interno para suporte.
- Inteligencia operacional para sugerir riscos, prioridades e tarefas recorrentes.

## Tese de produto

A Zelo pode se tornar uma camada operacional simples para microempresas brasileiras: uma ferramenta acessivel, recorrente e focada na clareza da execucao diaria. O crescimento por planos permite entrada com baixo risco no Basico, expansao natural no Gestao e aumento de ticket no Completo com automacoes, limites maiores e relatorios executivos.
