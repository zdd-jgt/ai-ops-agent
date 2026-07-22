/**
 * 模型管理 API — 查看和切换当前使用的 LLM Provider。
 *
 * GET  /api/model/status  → 当前模型 + 可用列表 + Key 配置状态
 * POST /api/model/switch  → 切换模型 Provider
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireRole } from "@ai-ops/auth-contracts";
import { authenticateRequest } from "./policy/auth.js";

// ---- 模型定义 ----

interface ModelDef {
  id: string;
  name: string;
  provider: string;
  url: string;
  envKey: string;
}

const AVAILABLE_MODELS: ModelDef[] = [
  {
    id: "deepseek",
    name: "DeepSeek Chat",
    provider: "deepseek",
    url: "https://api.deepseek.com/v1",
    envKey: "DEEPSEEK_API_KEY",
  },
  {
    id: "qwen",
    name: "Qwen Turbo",
    provider: "qwen",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    envKey: "QWEN_API_KEY",
  },
  {
    id: "local",
    name: `本地模型 (${process.env["LOCAL_MODEL_NAME"] ?? "qwen2.5:7b"})`,
    provider: "local",
    url: process.env["LOCAL_MODEL_ENDPOINT"] ?? "http://localhost:11434/v1",
    envKey: "",
  },
];

// ---- Router ----

export const modelRouter = new Hono();

/** 获取当前模型状态 */
modelRouter.get("/model/status", (c) => {
  const principal = authenticateRequest(c.req.header("Authorization"));
  const currentProvider = process.env["MODEL_PROVIDER"] ?? "deepseek";
  const current = AVAILABLE_MODELS.find((m) => m.id === currentProvider) ?? AVAILABLE_MODELS[0]!;

  const models = AVAILABLE_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    isCurrent: m.id === current.id,
    hasApiKey: m.envKey ? Boolean(process.env[m.envKey]) : true, // local 不需要 key
    apiKeyHint: m.envKey
      ? process.env[m.envKey]
        ? "已配置"
        : "未配置"
      : "无需配置",
  }));

  return c.json({
    tenantId: principal.tenantId,
    current: {
      id: current.id,
      name: current.name,
      provider: current.provider,
      hasApiKey: current.envKey ? Boolean(process.env[current.envKey]) : true,
      mode: (current.envKey && process.env[current.envKey]) || !current.envKey ? "live" : "mock",
    },
    models,
  });
});

/** 切换模型 Provider */
modelRouter.post(
  "/model/switch",
  zValidator("json", z.object({ provider: z.string() })),
  (c) => {
    const principal = authenticateRequest(c.req.header("Authorization"));
    requireRole(principal, "admin");
    const { provider } = c.req.valid("json");
    const target = AVAILABLE_MODELS.find((m) => m.id === provider);

    if (!target) {
      return c.json({ error: `未知模型: ${provider}`, available: AVAILABLE_MODELS.map((m) => m.id) }, 400);
    }

    // 检查是否需要 API Key
    if (target.envKey && !process.env[target.envKey]) {
      return c.json(
        {
          error: `${target.name} 需要配置 ${target.envKey}`,
          hint: `在 .env 中设置 ${target.envKey}=你的key`,
          switched: false,
        },
        400,
      );
    }

    // 运行时切换
    process.env["MODEL_PROVIDER"] = target.id;

    return c.json({
      switched: true,
      current: { id: target.id, name: target.name, provider: target.provider },
      note: "模型已切换。注：已初始化的 Agent 需重启 agent-runtime 后生效。",
    });
  },
);
