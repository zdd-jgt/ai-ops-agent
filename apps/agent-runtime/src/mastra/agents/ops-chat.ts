/**
 * Ops Chat Agent — 使用 Mastra Agent + 模型网关。
 *
 * 模型选择策略：
 * - 开发阶段默认使用 DeepSeek（成本低、中文好）
 * - Qwen 作为备选（通过环境变量切换）
 * - Air-Gapped 使用本地模型
 * - 正式 AWS 交付保留 Bedrock 适配
 */
import { Agent } from "@mastra/core/agent";
import { SYSTEM_PROMPT } from "../../agents/ops-chat/prompt.js";

// ---- 模型配置 ----

type ModelConfig = { id: string; url: string; apiKey?: string };

function getModelConfig(): ModelConfig {
  const provider = process.env["MODEL_PROVIDER"] ?? "deepseek";

  switch (provider) {
    case "deepseek": {
      return {
        id: "deepseek/deepseek-chat",
        url: "https://api.deepseek.com/v1",
        apiKey: process.env["DEEPSEEK_API_KEY"],
      };
    }
    case "qwen": {
      return {
        id: "custom/qwen-turbo",
        url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: process.env["QWEN_API_KEY"],
      };
    }
    case "local": {
      return {
        id: `custom/${process.env["LOCAL_MODEL_NAME"] ?? "qwen2.5:7b"}`,
        url: process.env["LOCAL_MODEL_ENDPOINT"] ?? "http://localhost:11434/v1",
      };
    }
    default: {
      // 自定义 OpenAI-compatible Provider
      return {
        id: `custom/${process.env["CUSTOM_MODEL_NAME"] ?? "default"}`,
        url: process.env["CUSTOM_MODEL_ENDPOINT"] ?? "http://localhost:11434/v1",
        apiKey: process.env["CUSTOM_MODEL_API_KEY"],
      };
    }
  }
}

// ---- Agent ----

const modelConfig = getModelConfig();

// 启动时打印当前模型配置
const hasKey = Boolean(modelConfig.apiKey);
console.log(
  JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    service: "agent-runtime",
    message: `Agent model: ${modelConfig.id}`,
    provider: process.env["MODEL_PROVIDER"] ?? "deepseek",
    hasApiKey: hasKey,
    mode: hasKey ? "live" : "mock",
    ...(hasKey ? {} : { hint: "配置 DEEPSEEK_API_KEY 或 QWEN_API_KEY 以启用 AI 诊断" }),
  }),
);

export const opsChatAgent = new Agent({
  id: "ops-chat-agent",
  name: "Ops Chat Agent",
  instructions: SYSTEM_PROMPT,
  model: {
    id: modelConfig.id,
    url: modelConfig.url,
    ...(modelConfig.apiKey ? { apiKey: modelConfig.apiKey } : {}),
  } as any,
});

/** 当前模型信息（供 UI 展示） */
export const currentModelInfo = {
  id: modelConfig.id,
  provider: process.env["MODEL_PROVIDER"] ?? "deepseek",
  hasApiKey: Boolean(modelConfig.apiKey),
};
