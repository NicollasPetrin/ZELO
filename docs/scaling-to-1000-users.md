# Escala da Zelo para 1.000 usuarios

## Meta adotada

"1.000 usuarios" pode significar duas cargas muito diferentes. Esta preparacao considera 1.000 contas cadastradas, ate 100 usuarios ativos ao mesmo tempo e picos de 20 a 50 requisicoes por segundo. Mil usuarios simultaneos exigem outro ensaio, infraestrutura paga maior e um teste distribuido.

Metas iniciais de operacao:

- menos de 1% de respostas com erro;
- p95 abaixo de 1,2 segundo nas paginas publicas;
- p95 abaixo de 2 segundos nas paginas autenticadas;
- disponibilidade mensal alvo de 99,9%;
- nenhuma consulta de listagem crescendo sem limite por empresa.

## O que o codigo ja faz

- PostgreSQL no Neon com URL pooled para o trafego da aplicacao e URL direta para migrations.
- Uma unica instancia de Prisma Client por processo.
- Sessao autenticada deduplicada durante a mesma renderizacao.
- Paginacao de 25 itens em tarefas, funcionarios, metas e notificacoes.
- Dashboard com agregacoes no PostgreSQL em vez de carregar todos os atrasos na memoria.
- Relatorios com selecao reduzida de colunas e calculo linear por tarefa.
- Indices compostos para empresa, usuario ativo, responsavel, status, setor e prazo.
- Indices GIN/trigram para busca por titulo e descricao de tarefas.
- Aplicacao no Railway em US East (Virginia), proxima ao banco Neon em US East.
- Endpoint `GET /api/health` para monitorar aplicacao e banco.
- Teste de carga com rampa, limites automaticos e massa sintetica de staging.

## Infraestrutura necessaria

### Railway

A aplicacao roda no Railway. Execute o servico o mais perto possivel do banco: as regioes disponiveis sao US West, US East (Virginia), EU West e Sudeste Asiatico, e nao existe regiao na America do Sul, entao US East e a mais proxima do Brasil e a unica que fica junto do Neon em US East. Servico e banco em regioes diferentes cobram a latencia entre elas em toda consulta, e uma pagina faz varias.

A regiao se troca em Settings do servico, sem downtime enquanto nao houver volume anexado.

Documentacao: [regioes de deploy](https://docs.railway.com/reference/deployment-regions), [variaveis de ambiente](https://docs.railway.com/reference/variables).

### Neon

Use a URL com `-pooler` em `DATABASE_URL` e a URL direta somente em `DIRECT_URL`. Para uma operacao comercial, migre do Free para Launch antes do trafego real, configure autoscaling, desative scale-to-zero no banco de producao se a latencia de retomada incomodar e mantenha branches separadas para staging.

O Neon informa suporte a ate 10.000 conexoes de clientes pelo PgBouncer, mas elas compartilham um conjunto menor de conexoes reais; consultas lentas ainda formam fila. Monitore conexoes do pooler, CPU, working set, cache hit e queries lentas.

Documentacao: [pool de conexoes](https://neon.com/docs/connect/connection-pooling), [computes e autoscaling](https://neon.com/docs/manage/endpoints/), [planos](https://neon.com/pricing).

## Dependencias externas ainda necessarias

Estas partes dependem de conta, credencial ou decisao comercial e nao podem ser ativadas apenas pelo repositorio:

- monitoramento do scale to zero do Neon: no plano gratuito o compute suspende apos 5 minutos parado e a primeira consulta seguinte paga o tempo de religar, que domina a percepcao de lentidao; desligar exige plano pago;
- monitoramento de erros e desempenho com Sentry, Axiom, Datadog ou equivalente;
- monitor de uptime chamando `/api/health` a cada 1 a 5 minutos;
- alertas para erro acima de 1%, p95 acima da meta, conexoes aguardando e banco acima de 70% de CPU por varios minutos;
- storage externo para anexos, como S3, Cloudflare R2 ou equivalente;
- provedor de e-mail transacional para convites, redefinicao de senha e alertas;
- backup/restauracao testados e politica de retencao compativel com a LGPD.

## Processo de validacao

1. Crie uma branch de staging no Neon e um ambiente separado no Railway.
2. Aplique `npm run db:deploy` nessa branch.
3. Gere a massa com `LOAD_SEED_CONFIRM=ZELO_STAGING` e `npm run db:load-seed -- --users 1000 --tasks 20000`.
4. Rode primeiro a rampa publica e depois `auth-read` com a conta de carga.
5. Observe ao mesmo tempo Railway e Neon. O primeiro recurso que saturar define o proximo ajuste.
6. Repita com 50.000 e 100.000 tarefas antes de afirmar capacidade em contrato ou material comercial.

## Proximo limite tecnico

O relatorio completo ainda precisa ler as tarefas da empresa para montar todos os recortes executivos. O processamento agora e linear e traz apenas as colunas usadas, mas empresas com centenas de milhares de tarefas devem migrar esse relatorio para snapshots pre-calculados por job. Isso nao impede 1.000 usuarios distribuidos entre empresas; e o ponto a evoluir para uma unica empresa com volume operacional muito alto.
