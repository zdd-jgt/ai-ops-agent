/**
 * 不合法事件夹具 — 用于测试 Schema 校验拒绝能力。
 *
 * 每一项包含一个 `payload`（偏离 Schema 的输入）和预期的 `errorKeyword`。
 * 测试框架使用 Zod `safeParse` 验证解析失败并匹配关键词。
 */

export interface InvalidFixture {
  label: string;
  payload: unknown;
  errorKeyword: string;
}

export const invalidFixtures: InvalidFixture[] = [
  {
    label: "缺 event_type",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
    },
    errorKeyword: "event_type",
  },

  {
    label: "错误 schema_version",
    payload: {
      schema_version: "2.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "web_vital",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      vital_type: "LCP",
      value: 100,
      rating: "good",
      delta: 10,
    },
    errorKeyword: "schema_version",
  },

  {
    label: "web_vital 缺 vital_type",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "web_vital",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      value: 100,
      rating: "good",
      delta: 10,
    },
    errorKeyword: "vital_type",
  },

  {
    label: "web_vital rating 非法值",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "web_vital",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      vital_type: "LCP",
      value: 100,
      rating: "excellent",
      delta: 10,
    },
    errorKeyword: "rating",
  },

  {
    label: "route 超过最大长度",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "page_view",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/" + "a".repeat(300),
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      view_type: "initial_load",
    },
    errorKeyword: "route",
  },

  {
    label: "frontend_error message 超长",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "frontend_error",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      error_type: "js_error",
      message: "x".repeat(2000),
    },
    errorKeyword: "message",
  },

  {
    label: "frontend_log attributes 超限",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "frontend_log",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
      level: "info",
      message: "test",
      attributes: Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`key_${i}`, `value_${i}`])
      ),
    },
    errorKeyword: "attributes",
  },

  {
    label: "unknown event_type",
    payload: {
      schema_version: "1.0.0",
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "unknown_type",
      app_id: "my-app",
      environment: "staging",
      release: "v1.0",
      route: "/",
      session_id: "sess_01",
      page_url: "https://example.com/",
      sdk_version: "0.1.0",
      timestamp: "2026-07-20T12:00:00.000Z",
    },
    errorKeyword: "event_type",
  },
];
