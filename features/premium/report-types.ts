import type { getPremiumWorkspaceData } from "@/features/premium/data";

/**
 * Derivado do proprio data layer em vez de redigitado: se a consulta mudar de
 * forma, o erro aparece aqui na compilacao e nao como coluna vazia na tela.
 * `import type` e apagado na compilacao, entao nada de "server-only" vaza para
 * os componentes.
 */
export type WorkspaceReport = Awaited<ReturnType<typeof getPremiumWorkspaceData>>;

export type DepartmentMetric = WorkspaceReport["departmentMetrics"][number];
export type EmployeeMetric = WorkspaceReport["employeeMetrics"][number];
export type CriticalTask = WorkspaceReport["criticalTasks"][number];
