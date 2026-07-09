"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { addTaskAttachmentAction, addTaskCommentAction, updateTaskStatusAction } from "@/features/tasks/actions";
import { statusLabels } from "@/lib/labels";
import { taskStatuses } from "@/lib/validations";
import type { TaskStatus } from "@prisma/client";

export function TaskStatusForm({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [selected, setSelected] = useState<TaskStatus>(status);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(undefined);
        startTransition(async () => {
          const result = await updateTaskStatusAction({ taskId, status: selected });
          if (result.ok) {
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <div className="min-w-48 space-y-1.5">
        <Label>Status</Label>
        <Select value={selected} onChange={(event) => setSelected(event.target.value as TaskStatus)}>
          {taskStatuses.map((taskStatus) => (
            <option key={taskStatus} value={taskStatus}>
              {statusLabels[taskStatus]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        Atualizar
      </Button>
      {error ? <p className="pb-2 text-xs font-medium text-rose-600">{error}</p> : null}
    </form>
  );
}

export function TaskCommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(undefined);
        setError(undefined);
        startTransition(async () => {
          const result = await addTaskCommentAction({ taskId, text });
          if (result.ok) {
            setText("");
            setMessage(result.message);
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Novo comentario</Label>
        <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Registre uma atualizacao objetiva sobre a tarefa." />
        <FieldError message={text.length === 1 ? "Escreva ao menos 2 caracteres." : undefined} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <FormMessage message={message} error={error} />
        <Button type="submit" disabled={isPending}>
          Comentar
        </Button>
      </div>
    </form>
  );
}

export function TaskAttachmentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setMessage(undefined);
        setError(undefined);
        startTransition(async () => {
          const result = await addTaskAttachmentAction({
            taskId,
            fileName: form.get("fileName"),
            fileUrl: form.get("fileUrl"),
            fileType: form.get("fileType"),
            fileSize: form.get("fileSize"),
          });
          if (result.ok) {
            event.currentTarget.reset();
            setMessage(result.message);
            router.refresh();
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Arquivo</Label>
        <Input name="fileName" placeholder="contrato.pdf" />
      </div>
      <div className="space-y-1.5">
        <Label>URL ou caminho</Label>
        <Input name="fileUrl" placeholder="/uploads/contrato.pdf" />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Input name="fileType" placeholder="PDF" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          Anexar
        </Button>
      </div>
      <div className="md:col-span-4">
        <FormMessage message={message} error={error} />
      </div>
    </form>
  );
}
