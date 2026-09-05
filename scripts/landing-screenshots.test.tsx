import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

// Only data and framework boundaries are mocked. The rendered pages and their
// visual components are the product itself; no public preview/auth bypass exists.
const fixture = vi.hoisted(() => {
  const departments = ["Operação", "Atendimento", "Gestão"].map((name, index) => ({ id: `dept-${index}`, name, isActive: true }));
  const users = ["Marina Costa", "Lucas Almeida", "Ana Martins"].map((name, index) => ({ id: `person-${index}`, name }));
  const tasks = [
    ["Conferir pedidos da semana", "Validar quantidades e datas de entrega.", "HIGH", "IN_PROGRESS"],
    ["Revisar estoque de materiais", "Atualizar os itens para a próxima reposição.", "MEDIUM", "PENDING"],
    ["Retornar aos clientes", "Confirmar os atendimentos de amanhã.", "URGENT", "PENDING"],
    ["Organizar escala da equipe", "Revisar os horários com os responsáveis.", "MEDIUM", "IN_REVIEW"],
    ["Fechar os indicadores do mês", "Consolidar as entregas de cada setor.", "LOW", "COMPLETED"],
    ["Atualizar cadastro de fornecedores", "Conferir contatos e condições comerciais.", "MEDIUM", "IN_PROGRESS"],
  ].map(([title, description, priority, status], index) => ({ id: `task-${index}`, title, description, priority, status, dueDate: new Date(`2026-09-${String(5 + index).padStart(2, "0")}T15:00:00Z`), assignee: users[index % 3], department: departments[index % 3] }));
  return { pathname: "/dashboard", departments, users, tasks, user: { id: "owner-fictional", companyId: "company-fictional", name: "Marina Costa", role: "OWNER", company: { name: "Horizonte · Empresa fictícia", subscriptions: [{ status: "ACTIVE", currentPeriodEnd: new Date("2026-10-04"), plan: { code: "COMPLETE" } }] } } };
});

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...props }, children) }));
vi.mock("next/image", () => ({ default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className: string }) => createElement("img", { src, alt, width, height, className }) }));
vi.mock("next/navigation", () => ({ usePathname: () => fixture.pathname, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => fixture.user }));
vi.mock("@/lib/auth/guards", () => ({ requireTeamArea: async () => fixture.user }));
vi.mock("@/lib/onboarding", () => ({ isOnboardingCompleted: async () => true }));
vi.mock("@/features/auth/actions", () => ({ logoutAction: async () => undefined }));
vi.mock("@/features/onboarding/actions", () => ({ completeOnboardingStepAction: async () => undefined }));
vi.mock("@/features/tasks/actions", () => ({ createTaskAction: vi.fn(), updateTaskAction: vi.fn() }));
vi.mock("@/features/tasks/data", () => ({
  listTeamTasks: async () => ({ items: fixture.tasks, totalItems: 6, page: 1, pageCount: 1, pageSize: 25 }),
  getTaskFormOptions: async () => ({ users: fixture.users, departments: fixture.departments }),
}));
vi.mock("@/features/dashboard/data", () => ({ getDashboardData: async () => ({
  teamScope: true, stats: { pending: 12, overdue: 3, completed: 48, inProgress: 8, urgent: 2, goalsOnTrack: 4, goalsAttention: 1 },
  upcomingTasks: fixture.tasks.slice(0, 3), employeeHotspots: [["Lucas Almeida", 2], ["Ana Martins", 1]], departmentHotspots: [["Operação", 2], ["Atendimento", 1]], attentionItems: ["3 tarefas atrasadas precisam de atenção.", "2 tarefas urgentes aguardam uma ação."],
}) }));
vi.mock("@/features/premium/data", () => ({ getPremiumWorkspaceData: async () => ({
  companyName: fixture.user.company.name,
  totals: { healthScore: 84, completionRate: 68, completedTasks: 48, totalTasks: 71, openTasks: 23, overdueTasks: 3, overdueRate: 13, goalsAtRisk: 1, averageGoalProgress: 76, activeUsers: 8, activeDepartments: 3 },
  recommendations: ["Priorize as 3 tarefas atrasadas antes das próximas entregas.", "Revise a distribuição de tarefas do setor Operação.", "Acompanhe a meta em atenção com o responsável."],
  priorityDistribution: [{ priority: "URGENT", count: 2, percent: 9 }, { priority: "HIGH", count: 6, percent: 26 }, { priority: "MEDIUM", count: 12, percent: 52 }, { priority: "LOW", count: 3, percent: 13 }],
  departmentMetrics: fixture.departments.map((department, index) => ({ ...department, openTasks: [10, 8, 5][index], overdueTasks: [2, 1, 0][index], goalsAtRisk: index === 0 ? 1 : 0, completionRate: [63, 72, 80][index] })),
  employeeMetrics: fixture.users.map((user, index) => ({ ...user, department: fixture.departments[index].name, openTasks: [10, 8, 5][index], overdueTasks: [2, 1, 0][index], completionRate: [63, 72, 80][index] })),
  criticalTasks: fixture.tasks.slice(0, 2), goalsAtRisk: [],
  statusDistribution: [{ status: "COMPLETED", count: 48, percent: 68 }, { status: "PENDING", count: 12, percent: 17 }, { status: "IN_PROGRESS", count: 8, percent: 11 }, { status: "OVERDUE", count: 3, percent: 4 }],
}) }));

beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-04T12:00:00Z")); });
afterAll(() => vi.useRealTimers());

test("renders the actual product with fictional data and no database", async () => {
  const { AppShell } = await import("@/components/layout/app-shell");
  const { default: Dashboard } = await import("@/app/(app)/dashboard/page");
  const { default: Tasks } = await import("@/app/(app)/team-tasks/page");
  const { default: Reports } = await import("@/app/(app)/reports/page");
  const pages = [
    { id: "painel", path: "/dashboard", element: await Dashboard() },
    { id: "tarefas", path: "/team-tasks", element: await Tasks({ searchParams: Promise.resolve({}) }) },
    { id: "relatorios", path: "/reports", element: await Reports() },
  ];
  for (const page of pages) {
    fixture.pathname = page.path;
    const html = renderToStaticMarkup(<AppShell companyName={fixture.user.company.name} userName="Marina Costa" role="OWNER" plan="COMPLETE" unreadCount={2}>{page.element}</AppShell>);
    expect(html).toContain("Empresa fictícia");
    expect(html).toContain("Plano Completo");
    expect(html).not.toContain("@demo.com");
    if (process.env.EXPORT_LANDING_CAPTURES === "1") {
      const output = resolve(".next/landing-captures");
      await mkdir(output, { recursive: true });
      await writeFile(resolve(output, `${page.id}.html`), html);
    }
  }
});
