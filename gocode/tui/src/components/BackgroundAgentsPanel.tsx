import React, { type FC } from "react";
import { Box, Text } from "ink";
import type { UIBackgroundAgent } from "../hooks/useEvents.js";

interface BackgroundAgentsPanelProps {
  agents: UIBackgroundAgent[];
}

const MAX_VISIBLE_AGENTS = 4;

const BackgroundAgentsPanel: FC<BackgroundAgentsPanelProps> = ({ agents }) => {
  const visibleAgents = agents.slice(0, MAX_VISIBLE_AGENTS);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      marginTop={1}
    >
      <Text color="cyan">Background Agents</Text>
      {visibleAgents.map((agent, index) => (
        <Box
          key={agent.agentId}
          flexDirection="column"
          marginTop={index === 0 ? 0 : 1}
        >
          <Box flexDirection="row" gap={1}>
            <Text color={statusColor(agent.status)}>
              {statusLabel(agent.status)}
            </Text>
            <Text bold>{agent.description || agent.agentId}</Text>
            <Text dimColor>{formatSubagentType(agent.subagentType)}</Text>
          </Box>
          <Text dimColor>{truncate(agent.summary, 120)}</Text>
          <Text dimColor>{formatMeta(agent)}</Text>
        </Box>
      ))}
      {agents.length > MAX_VISIBLE_AGENTS ? (
        <Text
          dimColor
        >{`+${agents.length - MAX_VISIBLE_AGENTS} more recent child agents`}</Text>
      ) : null}
    </Box>
  );
};

export default BackgroundAgentsPanel;

function statusLabel(status: string): string {
  switch (status) {
    case "running":
      return "RUNNING";
    case "cancelling":
      return "STOPPING";
    case "completed":
      return "DONE";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    default:
      return status.toUpperCase() || "UPDATED";
  }
}

function statusColor(status: string): "cyan" | "yellow" | "green" | "red" {
  switch (status) {
    case "running":
      return "cyan";
    case "cancelling":
      return "yellow";
    case "completed":
      return "green";
    case "failed":
    case "cancelled":
      return "red";
    default:
      return "cyan";
  }
}

function formatSubagentType(subagentType: string): string {
  return subagentType ? `(${subagentType})` : "";
}

function formatMeta(agent: UIBackgroundAgent): string {
  const parts = [agent.agentId];

  if (agent.sessionId) {
    parts.push(agent.sessionId);
  }
  if (agent.outputFile) {
    parts.push(`result ${basename(agent.outputFile)}`);
  }

  return parts.join(" | ");
}

function basename(value: string): string {
  const parts = value.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

function truncate(value: string, limit: number): string {
  const flattened = value.replace(/\s+/g, " ").trim();
  if (flattened.length <= limit) {
    return flattened;
  }
  return `${flattened.slice(0, limit - 3)}...`;
}
