import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getLiveStore } from "@/features/simulation/engine";
import { LiveStore } from "@/features/simulation/live-store";
import { requireTeamArea } from "@/lib/auth/guards";

export const metadata = { title: "Loja ao vivo" };

/**
 * A empresa de teste vista de cima: a equipe ficticia anda pela loja e faz as
 * tarefas que estao na Zelo, cada um do seu jeito. Serve para testar a Zelo
 * sem precisar de funcionarios de verdade.
 */
export default async function LojaAoVivoPage() {
  const user = await requireTeamArea();

  if (!user.company.isDemo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loja ao vivo" />
        <EmptyState
          title="Disponível só na empresa de teste"
          description="Aqui a equipe é de verdade: ninguém faz as tarefas no lugar dos funcionários. A loja ao vivo existe nas empresas de demonstração."
        />
      </div>
    );
  }

  const inicial = await getLiveStore(user.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loja ao vivo"
        description="A equipe de teste trabalha nas tarefas reais desta Zelo, cada um do seu jeito. Crie uma tarefa para alguém, cobre num comentário e acompanhe aqui."
      />
      <LiveStore inicial={inicial} />
    </div>
  );
}
