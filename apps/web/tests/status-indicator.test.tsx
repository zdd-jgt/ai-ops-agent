import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusIndicator, Skeleton, EmptyState, InsufficientData } from "../src/features/observability/states/StatusIndicator.js";

afterEach(() => cleanup());

describe("StatusIndicator", () => {
  it("渲染 pending 状态", () => {
    render(<StatusIndicator status="pending" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "加载中");
    expect(screen.getByText("正在加载数据…")).toBeInTheDocument();
  });

  it("渲染 error 状态", () => {
    render(<StatusIndicator status="error" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "加载失败");
    expect(screen.getByText("数据加载失败，请稍后重试")).toBeInTheDocument();
  });

  it("渲染 forbidden 状态", () => {
    render(<StatusIndicator status="forbidden" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "权限不足");
    expect(screen.getByText("无权访问该数据源，请联系管理员")).toBeInTheDocument();
  });

  it("渲染 timeout 状态", () => {
    render(<StatusIndicator status="timeout" />);
    expect(screen.getByText("请求超时，请缩小时间范围后重试")).toBeInTheDocument();
  });

  it("渲染 partial 状态", () => {
    render(<StatusIndicator status="partial" />);
    expect(screen.getByText("部分数据可用，可能存在缺失")).toBeInTheDocument();
  });

  it("支持自定义消息", () => {
    render(<StatusIndicator status="error" message="自定义错误消息" />);
    expect(screen.getByText("自定义错误消息")).toBeInTheDocument();
  });

  it("有 aria-live 属性用于屏幕阅读器", () => {
    render(<StatusIndicator status="pending" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

describe("Skeleton", () => {
  it("渲染正确数量的骨架行", () => {
    render(<Skeleton lines={3} />);
    const status = screen.getByRole("status");
    expect(status.querySelectorAll("div").length).toBe(3);
  });

  it("渲染单行骨架", () => {
    render(<Skeleton lines={1} />);
    const status = screen.getByRole("status");
    expect(status.querySelectorAll("div").length).toBe(1);
  });

  it("设置 aria-busy=true", () => {
    render(<Skeleton lines={1} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});

describe("EmptyState", () => {
  it("渲染默认消息", () => {
    render(<EmptyState />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("渲染自定义消息", () => {
    render(<EmptyState message="没有找到记录" />);
    expect(screen.getByText("没有找到记录")).toBeInTheDocument();
  });
});

describe("InsufficientData", () => {
  it("渲染默认消息", () => {
    render(<InsufficientData />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "样本不足，不足以判断");
  });
});
