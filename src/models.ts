import { z } from "zod";
export interface Project {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  stack: string;
  workServerId: string;
  deployServerId: string;
  createdAt: string;
}
export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  skills: string[];
  projectId: string | null;
  serverId: string;
  status: string;
  instructions: string;
}
export interface ServerConfig {
  provider: string;
  endpoint: string;
  model: string;
  fallbackModel: string;
  credentialRef: string;
  modelOverrides: Record<string, string>;
  dailyBudget: number;
  maxConcurrency: number;
  timeoutMinutes: number;
  maxRetries: number;
  requireApproval: boolean;
  isolatedWorkspace: boolean;
  stopOnBudget: boolean;
}
export interface Server {
  id: string;
  name: string;
  host: string;
  role: string;
  region: string;
  status: string;
  config: ServerConfig;
  metrics: Metrics;
  lastSeen: string | null;
}
export interface Metrics {
  cpuPercent: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  containers: Container[];
}
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
}
export interface Task {
  id: string;
  title: string;
  brief: string;
  criteria: string;
  projectId: string;
  agentId: string;
  workServerId: string;
  deployServerId: string;
  priority: string;
  status: string;
  budget: number;
  progress: number;
  model: string;
  provider: string;
  result: string;
  error: string;
  branch: string;
  createdAt: string;
  spent: number;
  leaseId?: string;
  execution: TaskExecution;
}
export interface TaskExecution {
  model: string;
  endpoint: string;
  credentialRef: string;
  instructions: string;
  repositoryUrl: string;
  timeoutMinutes: number;
  maxRetries: number;
}
export interface TaskUpdate {
  status: string;
  progress: number;
  result: string;
  error: string;
  spent: number;
  leaseId: string;
}
export interface Approval {
  id: string;
  taskId: string;
  serverId: string;
  status: string;
  reason: string;
  createdAt: string;
}
export interface ApprovalDecision {
  status: string;
  reason: string;
}
export interface Message {
  id: string;
  taskId: string;
  author: string;
  text: string;
  createdAt: string;
}
export interface Event {
  id: string;
  text: string;
  createdAt: string;
}
export interface Document {
  id: string;
  projectId: string;
  title: string;
  body: string;
}
export interface RunnerIdentity {
  serverId: string;
}
export interface PairToken {
  token: string;
  serverId: string;
}
export interface TokenHash {
  tokenHash: string;
}
export interface ContainerCommand {
  id: string;
  serverId: string;
  containerId: string;
  action: string;
  status: string;
  result: string;
  createdAt: string;
}
export interface Settings {
  workspaceName: string;
  timezone: string;
  dailyBudget: number;
  monthlyBudget: number;
}
export const containerSchema: z.ZodType<Container> = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  status: z.string(),
});
export const metricsSchema: z.ZodType<Metrics> = z.object({
  cpuPercent: z.number(),
  memoryUsedGb: z.number(),
  memoryTotalGb: z.number(),
  diskUsedGb: z.number(),
  diskTotalGb: z.number(),
  containers: z.array(containerSchema),
});
export const serverConfigSchema: z.ZodType<ServerConfig> = z.object({
  provider: z.string(),
  endpoint: z.string(),
  model: z.string(),
  fallbackModel: z.string(),
  credentialRef: z.string(),
  modelOverrides: z.record(z.string()),
  dailyBudget: z.number(),
  maxConcurrency: z.number().int(),
  timeoutMinutes: z.number().int(),
  maxRetries: z.number().int(),
  requireApproval: z.boolean(),
  isolatedWorkspace: z.boolean(),
  stopOnBudget: z.boolean(),
});
export const serverSchema: z.ZodType<Server> = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  role: z.string(),
  region: z.string(),
  status: z.string(),
  config: serverConfigSchema,
  metrics: metricsSchema,
  lastSeen: z.string().nullable(),
});
export const projectSchema: z.ZodType<Project> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  repositoryUrl: z.string(),
  stack: z.string(),
  workServerId: z.string(),
  deployServerId: z.string(),
  createdAt: z.string(),
});
export const agentSchema: z.ZodType<Agent> = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  projectId: z.string().nullable(),
  serverId: z.string(),
  status: z.string(),
  instructions: z.string(),
});
export const taskExecutionSchema: z.ZodType<TaskExecution> = z.object({
  model: z.string(),
  endpoint: z.string(),
  credentialRef: z.string(),
  instructions: z.string(),
  repositoryUrl: z.string(),
  timeoutMinutes: z.number().int(),
  maxRetries: z.number().int(),
});
export const taskSchema: z.ZodType<Task> = z.object({
  id: z.string(),
  title: z.string(),
  brief: z.string(),
  criteria: z.string(),
  projectId: z.string(),
  agentId: z.string(),
  workServerId: z.string(),
  deployServerId: z.string(),
  priority: z.string(),
  status: z.string(),
  budget: z.number(),
  progress: z.number().int(),
  model: z.string(),
  provider: z.string(),
  result: z.string(),
  error: z.string(),
  branch: z.string(),
  createdAt: z.string(),
  spent: z.number(),
  leaseId: z.string().optional(),
  execution: taskExecutionSchema,
});
export const taskUpdateSchema: z.ZodType<TaskUpdate> = z.object({
  status: z.string(),
  progress: z.number().int(),
  result: z.string(),
  error: z.string(),
  spent: z.number(),
  leaseId: z.string(),
});
export const approvalSchema: z.ZodType<Approval> = z.object({
  id: z.string(),
  taskId: z.string(),
  serverId: z.string(),
  status: z.string(),
  reason: z.string(),
  createdAt: z.string(),
});
export const approvalDecisionSchema: z.ZodType<ApprovalDecision> = z.object({
  status: z.string(),
  reason: z.string(),
});
export const messageSchema: z.ZodType<Message> = z.object({
  id: z.string(),
  taskId: z.string(),
  author: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
export const eventSchema: z.ZodType<Event> = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
export const documentSchema: z.ZodType<Document> = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  body: z.string(),
});
export const runnerIdentitySchema: z.ZodType<RunnerIdentity> = z.object({
  serverId: z.string(),
});
export const pairTokenSchema: z.ZodType<PairToken> = z.object({
  token: z.string(),
  serverId: z.string(),
});
export const tokenHashSchema: z.ZodType<TokenHash> = z.object({
  tokenHash: z.string(),
});
export const containerCommandSchema: z.ZodType<ContainerCommand> = z.object({
  id: z.string(),
  serverId: z.string(),
  containerId: z.string(),
  action: z.string(),
  status: z.string(),
  result: z.string(),
  createdAt: z.string(),
});
export const settingsSchema: z.ZodType<Settings> = z.object({
  workspaceName: z.string(),
  timezone: z.string(),
  dailyBudget: z.number(),
  monthlyBudget: z.number(),
});
