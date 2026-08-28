import { z } from "zod";
import { isValidDocument } from "@/lib/document";
import { isValidPhone } from "@/lib/phone";

export const userRoles = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export const subscriptionPlans = ["BASIC", "MANAGEMENT", "COMPLETE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const taskStatuses = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "OVERDUE", "CANCELED"] as const;
export const recurrenceTypes = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "SPECIFIC_WEEKDAYS", "SPECIFIC_MONTH_DAY"] as const;
export const goalUnits = ["BRL", "PERCENT", "NUMBER", "TASKS", "CLIENTS", "SALES"] as const;
export const goalPeriods = ["WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"] as const;
export const goalStatuses = ["ON_TRACK", "ATTENTION", "LATE", "COMPLETED"] as const;
const commonPasswords = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "senha",
  "qwerty",
  "admin123",
  "zelo123",
  "demo123",
]);

export const strongPasswordSchema = z
  .string()
  .min(10, "Use pelo menos 10 caracteres.")
  .regex(/[a-z]/, "Inclua uma letra minuscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiuscula.")
  .regex(/[0-9]/, "Inclua um numero.")
  .refine((password) => !commonPasswords.has(password.trim().toLowerCase()), {
    message: "Use uma senha menos comum.",
  });

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

/** Campos que o Asaas exige do pagador para aceitar o checkout. */
const camposDeCobranca = ["document", "phone", "postalCode", "address", "addressNumber", "province"] as const;

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa."),
    // Opcionais quando a pessoa so quer conhecer o produto. Viram obrigatorios
    // assim que um plano e escolhido, porque sem eles o Asaas recusa o checkout.
    document: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidDocument(value), "CNPJ ou CPF invalido.")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidPhone(value), "Telefone invalido. Use DDD + numero.")
      .optional()
      .or(z.literal("")),
    postalCode: z
      .string()
      .trim()
      .refine((value) => value === "" || value.replace(/\D/g, "").length === 8, "CEP invalido.")
      .optional()
      .or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    addressNumber: z.string().trim().optional().or(z.literal("")),
    addressComplement: z.string().trim().optional().or(z.literal("")),
    province: z.string().trim().optional().or(z.literal("")),
    segment: z.string().trim().optional().or(z.literal("")),
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha."),
    /** Vazio quando a pessoa cria conta sem assinar agora. */
    plan: z.enum(subscriptionPlans).optional().or(z.literal("")),
    /** "1" quando a assinatura comeca com o mes de teste. */
    trial: z.literal("1").optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem.",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (!data.plan) {
      return;
    }

    for (const campo of camposDeCobranca) {
      if (!data[campo]) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: "Obrigatorio para assinar um plano.",
        });
      }
    }
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
    confirmExtraUserCharge: z.boolean().default(false),
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
  // Vazio e permitido: so vira obrigatorio na hora de assinar um plano.
  document: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidDocument(value), "CNPJ ou CPF invalido.")
    .optional()
    .or(z.literal("")),
  // Idem: opcional no cadastro, obrigatorio para assinar.
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidPhone(value), "Telefone invalido. Use DDD + numero.")
    .optional()
    .or(z.literal("")),
  // Endereco de cobranca. Exigido pela processadora na hora de assinar, e
  // tambem pela nota fiscal, entao vale coletar mesmo antes da venda.
  postalCode: z
    .string()
    .trim()
    .refine((value) => value === "" || value.replace(/\D/g, "").length === 8, "CEP invalido.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  addressNumber: z.string().trim().optional().or(z.literal("")),
  addressComplement: z.string().trim().optional().or(z.literal("")),
  province: z.string().trim().optional().or(z.literal("")),
  segment: z.string().trim().optional().or(z.literal("")),
  employeeCount: z.coerce.number().min(0).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const idSchema = z.string().trim().min(1, "Identificador invalido.");
export const onboardingKeySchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/i, "Chave invalida.");
export const subscriptionPlanSchema = z.enum(subscriptionPlans);
