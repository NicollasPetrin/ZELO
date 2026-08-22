import { Building2 } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import type { DepartmentMetric } from "@/features/premium/report-types";

/**
 * Mesma tabela nos relatorios basicos e nos completos. A unica diferenca real
 * era a coluna de metas em risco, que so existe no plano Completo, entao ela
 * virou uma opcao em vez de uma segunda copia da tabela.
 */
export function DepartmentMetricsTable({
  departments,
  showGoalsAtRisk = false,
}: {
  departments: DepartmentMetric[];
  showGoalsAtRisk?: boolean;
}) {
  const columns = showGoalsAtRisk ? 5 : 4;

  return (
    <DataTable>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th>Setor</Th>
            <Th>Abertas</Th>
            <Th>Atrasadas</Th>
            {showGoalsAtRisk ? <Th>Metas em risco</Th> : null}
            <Th>Conclusao</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {departments.length ? (
            departments.map((department) => (
              <tr key={department.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-950">{department.name}</span>
                    {/* Setor inativo continua somando tarefas antigas: sem marca, o numero parece de um setor em operacao. */}
                    {department.isActive ? null : <span className="text-xs text-slate-400">(inativo)</span>}
                  </div>
                </Td>
                <Td>{department.openTasks}</Td>
                <Td>{department.overdueTasks}</Td>
                {showGoalsAtRisk ? <Td>{department.goalsAtRisk}</Td> : null}
                <Td>{department.completionRate}%</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={columns}>
                <span className="text-slate-500">Nenhum setor cadastrado ainda.</span>
              </Td>
            </tr>
          )}
        </tbody>
      </table>
    </DataTable>
  );
}
