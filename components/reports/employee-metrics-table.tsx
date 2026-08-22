import { DataTable, Td, Th } from "@/components/data-table";
import type { EmployeeMetric } from "@/features/premium/report-types";

/** Mesma tabela nos relatorios basicos e nos completos. */
export function EmployeeMetricsTable({ employees }: { employees: EmployeeMetric[] }) {
  return (
    <DataTable>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th>Responsavel</Th>
            <Th>Setor</Th>
            <Th>Abertas</Th>
            <Th>Atrasadas</Th>
            <Th>Conclusao</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {employees.length ? (
            employees.map((employee) => (
              <tr key={employee.id}>
                <Td>
                  <span className="font-medium text-slate-950">{employee.name}</span>
                </Td>
                <Td>{employee.department}</Td>
                <Td>{employee.openTasks}</Td>
                <Td>{employee.overdueTasks}</Td>
                <Td>{employee.completionRate}%</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={5}>
                <span className="text-slate-500">Nenhum funcionario cadastrado ainda.</span>
              </Td>
            </tr>
          )}
        </tbody>
      </table>
    </DataTable>
  );
}
