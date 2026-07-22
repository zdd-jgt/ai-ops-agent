import { useEffect, useState } from "react";

export type ServiceState = "checking" | "online" | "offline";

interface ServiceHealth {
  telemetryApi: ServiceState;
  agentRuntime: ServiceState;
}

export function useServiceHealth(): ServiceHealth {
  const [health, setHealth] = useState<ServiceHealth>({
    telemetryApi: "checking",
    agentRuntime: "checking",
  });

  useEffect(() => {
    const controller = new AbortController();
    void check("/api/health", controller.signal).then((telemetryApi) => {
      setHealth((current) => ({ ...current, telemetryApi }));
    });
    void check("/agent-api/healthz", controller.signal).then((agentRuntime) => {
      setHealth((current) => ({ ...current, agentRuntime }));
    });
    return () => controller.abort();
  }, []);

  return health;
}

async function check(url: string, signal: AbortSignal): Promise<ServiceState> {
  try {
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}
