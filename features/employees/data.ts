import "server-only";
import { prisma } from "@/lib/db/client";
import { DEFAULT_PAGE_SIZE, pageOffset, paginatedResult } from "@/lib/pagination";

/**
 * Campos que a tela de funcionarios usa. Listar um a um evita que a linha
 * inteira de User — com o hash de senha — atravesse o render so porque alguem
 * acrescentou uma coluna no schema.
 */
const employeeListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  position: true,
  isActive: true,
  createdAt: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  _count: {
    select: {
      assignedTasks: true,
    },
  },
} as const;

export async function listEmployees(companyId: string, page = 1) {
  const [totalItems, activeUserCount, items] = await prisma.$transaction([
    prisma.user.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.user.findMany({
      where: {
        companyId,
      },
      select: employeeListSelect,
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return {
    ...paginatedResult(items, totalItems, page),
    activeUserCount,
  };
}

/**
 * Lista para seletor de responsavel. Vai como propriedade de componente
 * cliente, entao so pode carregar o que aparece na tela: o React serializa o
 * objeto inteiro no payload da pagina.
 */
export function listActiveEmployees(companyId: string) {
  return prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
