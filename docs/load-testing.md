# Teste de carga da Zelo

Este projeto tem um runner simples em `scripts/load-test.ts`. Ele faz requisicoes HTTP GET com concorrencia fixa e mostra RPS, p50, p90, p95, p99, erros e status codes.

Use primeiro em localhost ou staging. Em producao, comece pequeno para nao gastar banco/Vercel sem necessidade.

## Localhost

Em um terminal:

```powershell
npm run build
npm run start
```

Em outro terminal:

```powershell
npm run load:public -- --base-url http://localhost:3000 --duration 30 --concurrency 10
```

## Producao leve

```powershell
npm run load:public -- --base-url https://zeloapp.vercel.app --duration 30 --concurrency 10
```

Depois suba aos poucos:

```powershell
npm run load:public -- --base-url https://zeloapp.vercel.app --duration 60 --concurrency 25
npm run load:public -- --base-url https://zeloapp.vercel.app --duration 60 --concurrency 50
```

Ou execute a rampa pronta, com 30 segundos em cada nivel:

```powershell
npm run load:ramp -- --base-url https://zeloapp.vercel.app --max-error-rate 1 --max-p95-ms 1200
```

Para escolher outros niveis:

```powershell
npm run load:test -- --base-url https://zeloapp.vercel.app --scenario public --concurrencies 10,25,50,100 --duration 30
```

## Paginas autenticadas

Para testar dashboard e paginas internas, entre no site pelo navegador, copie o cookie `zelo_session` e coloque em uma variavel de ambiente local. Nao salve esse cookie em arquivo e nao commite.

PowerShell:

```powershell
$env:LOAD_COOKIE = "zelo_session=COLE_O_VALOR_AQUI"
npm run load:test -- --base-url https://zeloapp.vercel.app --scenario auth-read --duration 30 --concurrency 10
```

Tambem e possivel deixar o runner autenticar sem copiar o cookie. Use uma conta exclusiva de staging e mantenha a senha apenas na sessao do terminal:

```powershell
$env:LOAD_LOGIN_EMAIL = "load.owner@zelo.invalid"
$env:LOAD_LOGIN_PASSWORD = "SENHA_DA_CONTA_DE_STAGING"
npm run load:test -- --base-url https://SEU-STAGING.vercel.app --scenario auth-read --duration 30 --concurrency 10
Remove-Item Env:LOAD_LOGIN_EMAIL, Env:LOAD_LOGIN_PASSWORD
```

Rotas do scenario `auth-read`:

```text
/dashboard
/my-tasks
/team-tasks
/departments
/employees
/goals
/reports
/settings
/notifications
```

## Rotas customizadas

```powershell
npm run load:test -- --base-url https://zeloapp.vercel.app --scenario public --paths /,/login,/signup --duration 30 --concurrency 10
```

## Massa de staging

Nunca gere massa sintetica no banco de producao. Crie antes uma branch de staging no Neon, configure o `.env` para essa branch e confirme explicitamente:

```powershell
$env:LOAD_SEED_CONFIRM = "ZELO_STAGING"
npm run db:load-seed -- --users 1000 --tasks 20000
```

O script cria uma empresa isolada chamada `Zelo Load Test`. O login de staging e mostrado ao final da execucao.

## Limites de aceite sugeridos

Para uma primeira versao comercial:

- erro HTTP abaixo de 1%;
- p95 abaixo de 1200ms em paginas publicas;
- p95 abaixo de 2000ms em paginas internas;
- sem muitos 500;
- sem crescimento continuo de latencia durante o teste.

Exemplo com limite automatico:

```powershell
npm run load:test -- --base-url https://zeloapp.vercel.app --scenario public --duration 30 --concurrency 10 --max-error-rate 1 --max-p95-ms 1200
```

## Como interpretar

- `Throughput`: quantas requisicoes por segundo a aplicacao sustentou.
- `Latency p95`: 95% das requisicoes responderam abaixo desse tempo.
- `Status counts`: se aparecer muito `500`, existe erro de servidor; se aparecer `307`/`302` em paginas internas, provavelmente o cookie nao foi enviado ou expirou.
- `Error rate`: soma de respostas fora de 2xx/3xx e erros de rede.

## Cuidados

- Nao rode concorrencia alta direto na producao.
- Nao teste Server Actions de escrita em massa contra dados reais.
- Para teste serio de tenant e escrita, crie um banco de staging com massa propria.
- Se o teste autenticado ficar lento, olhe primeiro dashboard, relatorios e listagens sem paginacao.
- Pare a rampa quando os erros passarem de 1%, o p95 romper o limite ou o banco comecar a acumular conexoes em espera.
