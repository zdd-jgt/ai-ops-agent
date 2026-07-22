import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../src/features/observability/DashboardPage.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AIOps cockpit", () => {
  it("renders the three-column workspace without inventing source status", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "智能运维大脑" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "诊断证据库" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "智能诊断与治理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Copilot" })).toBeInTheDocument();
    expect(screen.getAllByText("未配置")).toHaveLength(3);
    expect(screen.getByText("待计算")).toBeInTheDocument();
  });

  it("switches between alert aggregation and guarded healing views", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "告警智能聚合" }));
    expect(screen.getByText("暂无可聚合的告警事件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "优化与自愈建议" }));
    expect(screen.getByText("自动执行当前关闭")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "授权 Agent 执行" })).toBeDisabled();
  });
});
