import { describe, expect, it } from "vitest";
import { agentSchema, serverConfigSchema } from "./models";
describe("API contracts", () => {
  it("accepts an unassigned agent and rejects multiple project IDs", () => {
    const agent = {
      id: "a1",
      name: "Nara",
      role: "Frontend Engineer",
      description: "",
      skills: ["React"],
      projectId: null,
      serverId: "",
      status: "Available",
      instructions: "",
    };
    expect(agentSchema.parse(agent).projectId).toBeNull();
    expect(
      agentSchema.safeParse({ ...agent, projectId: ["p1", "p2"] }).success,
    ).toBe(false);
  });
  it("rejects string concurrency instead of coercing API data", () => {
    expect(
      serverConfigSchema.safeParse({
        provider: "OpenAI-compatible",
        endpoint: "https://provider.test/v1",
        model: "model",
        fallbackModel: "",
        credentialRef: "AI_API_KEY",
        modelOverrides: {},
        dailyBudget: 10,
        maxConcurrency: "2",
        timeoutMinutes: 10,
        maxRetries: 0,
        requireApproval: true,
        isolatedWorkspace: true,
        stopOnBudget: true,
      }).success,
    ).toBe(false);
  });
});
