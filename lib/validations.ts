import { z } from "zod";

export const userRoles = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const taskStatuses = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "OVERDUE", "CANCELED"] as const;
export const recurrenceTypes = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "SPECIFIC_WEEKDAYS", "SPECIFIC_MONTH_DAY"] as const;
export const goalUnits = ["BRL", "PERCENT", "NUMBER", "TASKS", "CLIENTS", "SALES"] as const;
export const goalPeriods = ["WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"] as const;
export const goalStatuses = ["ON_TRACK", "ATTENTION", "LATE", "COMPLETED"] as const;

export const strongPasswordSchema = z
  .string()
  .min(10, "Use pelo menos 10 caracteres.")
  .regex(/[a-z]/, "Inclua uma letra minuscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiuscula.")
  .regex(/[0-9]/, "Inclua um numero.");

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa."),
    segment: z.string().trim().optional().or(z.literal("")),
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem.",
    path: ["confirmPassword"],
  });

export const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome muito curto."),
  description: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const employeeSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Informe o nome."),
    email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
    role: z.enum(userRoles),
    departmentId: z.string().min(1, "Selecione o setor."),
    position: z.string().trim().optional().or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.id && !data.password) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Informe uma senha inicial forte.",
      });
      return;
    }

    if (data.password) {
      const result = strongPasswordSchema.safeParse(data.password);

      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: result.error.issues[0]?.message ?? "Informe uma senha mais forte.",
        });
      }
    }
  });

export const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Informe um titulo claro."),
  description: z.string().trim().min(5, "Descreva a tarefa."),
  assigneeId: z.string().min(1, "Selecione o responsavel."),
  departmentId: z.string().min(1, "Selecione o setor."),
  dueDate: z.string().min(1, "Informe o prazo."),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
  recurrenceType: z.enum(recurrenceTypes).default("NONE"),
  weekDays: z.string().optional().or(z.literal("")),
  monthDay: z.coerce.number().min(1).max(31).optional().or(z.literal("")),
  recurrenceStartDate: z.string().optional().or(z.literal("")),
  recurrenceEndDate: z.string().optional().or(z.literal("")),
});

export const taskStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(taskStatuses),
});

export const commentSchema = z.object({
  taskId: z.string(),
  text: z.string().trim().min(2, "Escreva um comentario."),
});

export const attachmentSchema = z.object({
  taskId: z.string(),
  fileName: z.string().trim().min(2, "Informe o nome do arquivo."),
  fileUrl: z.string().trim().min(2, "Informe a URL ou caminho do arquivo."),
  fileType: z.string().trim().optional().or(z.literal("")),
  fileSize: z.coerce.number().min(0).optional().or(z.literal("")),
});

export const goalSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Informe o titulo da meta."),
  description: z.string().trim().optional().or(z.literal("")),
  targetValue: z.coerce.number().positive("Informe um valor alvo maior que zero."),
  currentValue: z.coerce.number().min(0, "O valor atual nao pode ser negativo."),
  unit: z.enum(goalUnits),
  period: z.enum(goalPeriods),
  status: z.enum(goalStatuses),
  departmentId: z.string().optional().or(z.literal("")),
  responsibleId: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1, "Informe a data inicial."),
  endDate: z.string().min(1, "Informe a data final."),
});

export const companySettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa."),
  segment: z.string().trim().optional().or(z.literal("")),
  employeeCount: z.coerce.number().min(0).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
