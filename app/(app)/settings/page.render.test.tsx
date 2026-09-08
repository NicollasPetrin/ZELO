import { describe, expect, it, vi } from "vitest";

/**
 * A pagina de Configuracoes e a unica tela onde o cliente resolve dinheiro:
 * ver plano, comprar, conferir pagamento e cancelar. Se ela quebra, nao ha
 * outro caminho — e foi o que aconteceu. Este teste a renderiza inteira, com
 * banco e sessao simulados, para que uma quebra assim apareca aqui e nao em
 * producao.
 */

// Valores de fachada: o banco e a processadora estao simulados, mas lib/env
// valida o ambiente ao ser importada e derrubaria o teste antes do render.
process.env.DATABASE_URL ??= "postgresql://zelo:zelo@localhost:5432/zelo";
process.env.SESSION_SECRET ??= "0123456789abcdef0123456789abcdef";

const empresa = {
  id: "empresa-1",
  name: "Totalpack",
  document: "66636645000123",
  phone: "11987654321",
  postalCode: "01310100",
  address: "Avenida Paulista",
  addressNumber: "1000",
  addressComplement: null,
  province: "Bela Vista",
  segment: "Servicos",
  email: "dono@totalpack.com",
  employeeCount: 1,
  isActive: true,
  isDemo: false,
  asaasCustomerId: "cus_000196747780",
  subscriptions: [] as unknown[],
};

const assinaturaAtiva = [
    {
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      plan: { code: "BASIC" as const },
    },
  ];

empresa.subscriptions = assinaturaAtiva;

// Modulos server-only sao carregados aqui sem o bundler do Next, que e quem
// normalmente satisfaz essa marcacao.
vi.mock("server-only", () => ({}));

// O router so existe dentro do Next; aqui os componentes de cliente sao
// renderizados soltos.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

vi.mock("@/lib/auth/guards", () => ({
  requireCompanyManager: async () => ({
    id: "usuario-1",
    companyId: empresa.id,
    name: "Nicollas Petrin de Carvalho",
    email: "dono@totalpack.com",
    role: "OWNER",
    position: "Dono",
    company: empresa,
    department: null,
  }),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: { count: async () => 1 },
    companySubscription: { count: async () => 1 },
  },
}));

async function renderizar(searchParams: Record<string, string> = {}) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: SettingsPage } = await import("./page");

  return renderToStaticMarkup(await SettingsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("pagina de configuracoes", () => {
  it("renderiza com plano ativo, que e o estado em que o cancelamento aparece", async () => {
    const html = await renderizar();

    expect(html).toContain("Cancelar assinatura");
    expect(html).toContain("Ja paguei, conferir agora");
  });

  it("renderiza na volta do pagamento", async () => {
    expect(await renderizar({ pagamento: "confirmado" })).toContain("Gerenciamento de assinatura");
  });

  it("renderiza para quem acabou de se cadastrar", async () => {
    expect(await renderizar({ welcome: "1", plano: "MANAGEMENT" })).toContain("Gerenciamento de assinatura");
  });

  it("renderiza sem assinatura nenhuma", async () => {
    empresa.subscriptions = [];
    try {
      expect(await renderizar()).toContain("Gerenciamento de assinatura");
    } finally {
      empresa.subscriptions = assinaturaAtiva;
    }
  });
});
