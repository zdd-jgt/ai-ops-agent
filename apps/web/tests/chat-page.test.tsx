import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPage } from "../src/features/ops-chat/ChatPage.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatPage", () => {
  it("calls Agent Runtime and renders real evidence from its response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "complete",
      answer: "诊断范围：demo-app。\n证据数：1。",
      evidence: [{ id: "real-log-1", type: "log", summary: "/checkout: request failed" }],
      steps: [{ name: "collect_log_evidence", status: "complete", evidenceIds: ["real-log-1"] }],
      missingInfo: [],
      nextRecommendations: ["打开错误 Evidence"],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/chat?appId=demo-app&environment=production&timeRange=1h"]}>
        <ChatPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/首页 LCP/), {
      target: { value: "最近有什么错误？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    await screen.findByText(/证据数：1/);
    expect(screen.getByText(/real-log-1/)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/agent-api/v1/diagnosis");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      question: "最近有什么错误？",
      appId: "demo-app",
      environment: "production",
    });
  });

  it("shows a visible failure instead of a fabricated answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <ChatPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/首页 LCP/), {
      target: { value: "查询错误日志" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText(/诊断失败：connection refused/)).toBeInTheDocument();
    expect(screen.queryByText(/未发现明显异常/)).not.toBeInTheDocument();
  });
});
