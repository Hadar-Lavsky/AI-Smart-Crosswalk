import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trafficSocket } from "../socket";
import { queryKeys } from "../hooks/queryKeys";
import { useToast } from "../components/ui";
import { formatLocation } from "../utils/formatters";

function normalizeDangerLevel(level) {
  return String(level || "").toLowerCase();
}

export function SocketBridge() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  useEffect(() => {
    const onConnect = () => {
      // Join the server dashboard room to receive global alert events.
      // Emit: client sends an event to ask server-side room subscription.
      trafficSocket.emit("subscribe:dashboard", (response) => {
        if (!response?.success) {
          console.warn("Dashboard subscribe failed", response);
        }
      });

      console.log(`Traffic socket connected: ${trafficSocket.id}`);
    };

    const onDisconnect = (reason) => {
      console.warn(`Traffic socket disconnected: ${reason}`);
    };

    const onNewAlert = (payload) => {
      // Support both payload shapes: { data } and raw alert object.
      const alert = payload?.data ?? payload;
      const crosswalkId =
        alert?.crosswalkId?._id ||
        alert?.crosswalkId ||
        null;
      const dangerLevel = normalizeDangerLevel(alert?.dangerLevel);

      if (dangerLevel === "high" || dangerLevel === "medium") {
        // Show a quick human-visible alarm for risky alerts.
        const location = formatLocation(alert?.crosswalkId?.location);
        const timestamp = alert?.timestamp
          ? new Date(alert.timestamp).toLocaleTimeString()
          : "now";

        addToast(
          `ALARM ${dangerLevel.toUpperCase()} | ${location} | ${timestamp}`,
          dangerLevel === "high" ? "error" : "warning",
          7000,
        );
      }

      // Update page-1 cache immediately so the UI feels real-time.
      queryClient.setQueryData(queryKeys.alerts.list(1), (oldData) => {
        const data = (oldData || {});
        if (!data?.data || !Array.isArray(data?.data)) return oldData;

        const exists = data.data.some((item) => item?._id === alert?._id);
        if (exists) return oldData;

        const nextItems = [alert, ...data.data];
        const pageLimit = data.pagination?.limit;
        const cappedItems =
          typeof pageLimit === "number" && pageLimit > 0
            ? nextItems.slice(0, pageLimit)
            : nextItems;

        return {
          ...data,
          data: cappedItems,
          pagination: data.pagination
            ? { ...data.pagination, total: (data.pagination.total || 0) + 1 }
            : data.pagination,
        };
      });

      // Update aggregate counters instantly when stats are already cached.
      queryClient.setQueryData(queryKeys.alerts.stats, (oldStats) => {
        const stats = (oldStats || {});
        if (!stats || typeof stats !== "object") return oldStats;

        return {
          ...stats,
          total: (stats?.total || 0) + 1,
          low: (stats?.low || 0) + (dangerLevel === "low" ? 1 : 0),
          medium: (stats?.medium || 0) + (dangerLevel === "medium" ? 1 : 0),
          high: (stats?.high || 0) + (dangerLevel === "high" ? 1 : 0),
        };
      });

      // Revalidate in background to keep all screens consistent with server state.
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.all,
        refetchType: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.stats,
        refetchType: "inactive",
      });

      // Refresh crosswalk-specific feeds and stats if the alert is linked.
      if (crosswalkId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.crosswalks.alertsPrefix(crosswalkId),
          refetchType: "inactive",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.crosswalks.detailStats(crosswalkId),
          refetchType: "inactive",
        });
      }
    };

    // On (Listener): client listens for server and transport lifecycle events.
    trafficSocket.on("connect", onConnect);
    trafficSocket.on("disconnect", onDisconnect);
    trafficSocket.on("alert:new", onNewAlert);

    return () => {
      trafficSocket.off("alert:new", onNewAlert);
      trafficSocket.off("connect", onConnect);
      trafficSocket.off("disconnect", onDisconnect);
    };
  }, [addToast, queryClient]);

  return null;
}
