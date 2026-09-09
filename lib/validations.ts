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
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[A-Z]/, "Inclua uma letra maiuscula.")
  // Especial e tudo que nao e letra sem acento nem numero. Listar os simbolos
  // aceitos rejeitaria teclado que a pessoa usa todo dia, e a lista esquecida
  // vira senha recusada sem motivo aparente.
  .regex(/[^A-Za-z0-9]/, "Inclua um caractere especial, como ! @ # ou $.")
  .refine((password) => !commonPasswords.has(password.trim().toLowerCase()), {
    message: "Use uma senha menos comum.",
  });

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa."),
    // Cadastro completo desde a porta, mesmo sem cobranca nenhuma no ato.
    //
    // Sao os dados que o Asaas exige do pagador. Pedir agora e o que permite
    // que, no fim do teste, pagar seja um clique: se ficassem para depois, a
    // pessoa teria que refazer o cadastro justamente no momento em que decide
    // pagar, que e o pior momento possivel para inventar um formulario novo.
    //
    // O documento tambem e o que sustenta a regra de um teste por empresa: sem
    // ele nao ha chave unica, e criar conta nova daria mes gratuito de novo.
    document: z
      .string()
      .trim()
      .min(1, "Informe o CNPJ ou CPF da empresa.")
      .refine(isValidDocument, "CNPJ ou CPF invalido."),
    phone: z
      .string()
      .trim()
      .min(1, "Informe o telefone da empresa.")
      .refine(isValidPhone, "Telefone invalido. Use DDD + numero."),
    postalCode: z
      .string()
      .trim()
      .refine((value) => value.replace(/D/g, "").length === 8, "CEP invalido."),
    address: z.string().trim().min(2, "Informe o logradouro."),
    addressNumber: z.string().trim().min(1, "Informe o numero."),
    province: z.string().trim().min(2, "Informe o bairro."),
    // Complemento e o unico campo de endereco que pode faltar sem quebrar a
    // cobranca.
    addressComplement: z.string().trim().optional().or(z.literal("")),
    segment: z.string().trim().optional().or(z.literal("")),
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().email("Informe um e-mail valido.").trim().toLowerCase(),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha."),
    /** Plano escolhido na landing. So define qual vem destacado depois; o teste
     * comeca dentro do produto, nunca no cadastro. */
    plan: z.enum(subscriptionPlans).optional().or(z.literal("")),
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
  /// Checkbox do formulario: chega "on" quando marcado, ausente quando nao.
  requiresProof: z.coerce.boolean().default(false),
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

/** Limite de uma mensagem de chat. Comprido o bastante para explicar um
 * problema ao suporte, curto o bastante para nao virar anexo disfarcado. */
export const MESSAGE_MAX = 4000;

export const messageSchema = z.object({
  conversationId: idSchema,
  body: z.string().trim().min(1, "Escreva a mensagem.").max(MESSAGE_MAX, "Mensagem muito longa."),
});

export const newConversationSchema = z.object({
  participantIds: z.array(idSchema).min(1, "Escolha com quem falar."),
  title: z.string().trim().max(80, "Titulo muito longo.").optional().or(z.literal("")),
});

export const proofReviewSchema = z.object({
  taskId: idSchema,
  reason: z.string().trim().max(500, "Motivo muito longo.").optional().or(z.literal("")),
});
