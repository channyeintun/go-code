import React, { type FC, useEffect } from "react";
import { Box } from "ink";
import { useEngine } from "./hooks/useEngine.js";
import { useEvents } from "./hooks/useEvents.js";
import ArtifactView from "./components/ArtifactView.js";
import Input from "./components/Input.js";
import PlanPanel from "./components/PlanPanel.js";
import StreamOutput from "./components/StreamOutput.js";
import StatusBar from "./components/StatusBar.js";
import PermissionPrompt from "./components/PermissionPrompt.js";
import ToolProgress from "./components/ToolProgress.js";

interface AppProps {
  enginePath: string;
  model: string;
}

const App: FC<AppProps> = ({ enginePath, model }) => {
  const engine = useEngine(enginePath);
  const { uiState, handleEvent, clearStream, clearPermission } =
    useEvents(model);
  const planArtifact =
    uiState.artifacts.find(
      (artifact) => artifact.kind === "implementation-plan",
    ) ?? null;
  const recentArtifacts = uiState.artifacts
    .filter((artifact) => artifact.kind !== "implementation-plan")
    .slice(0, 2);

  // Dispatch incoming events to the UI state handler
  useEffect(() => {
    if (engine.events.length === 0) return;
    const latest = engine.events[engine.events.length - 1];
    if (latest) handleEvent(latest);
  }, [engine.events.length, handleEvent]);

  const handleSubmit = (text: string) => {
    clearStream();
    if (text.startsWith("/")) {
      const [cmd, ...rest] = text.slice(1).split(" ");
      engine.sendCommand(cmd!, rest.join(" "));
    } else {
      engine.sendInput(text);
    }
  };

  const handlePermissionResponse = (
    decision: "allow" | "deny" | "always_allow",
  ) => {
    if (uiState.pendingPermission) {
      engine.sendPermissionResponse(
        uiState.pendingPermission.request_id,
        decision,
      );
      clearPermission();
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        mode={uiState.mode}
        model={uiState.model}
        totalCostUsd={uiState.cost.totalUsd}
        inputTokens={uiState.cost.inputTokens}
        outputTokens={uiState.cost.outputTokens}
      />

      <Box flexDirection="column" flexGrow={1}>
        {planArtifact && (
          <PlanPanel
            title={planArtifact.title}
            content={planArtifact.content}
          />
        )}

        <StreamOutput text={uiState.streamedText} />

        {recentArtifacts.length > 0 && (
          <ArtifactView artifacts={recentArtifacts} />
        )}

        {uiState.activeTool && (
          <ToolProgress toolName={uiState.activeTool.name} />
        )}
      </Box>

      {uiState.pendingPermission ? (
        <PermissionPrompt
          tool={uiState.pendingPermission.tool}
          command={uiState.pendingPermission.command}
          risk={uiState.pendingPermission.risk}
          onRespond={handlePermissionResponse}
        />
      ) : (
        <Input
          onSubmit={handleSubmit}
          onModeToggle={engine.sendModeToggle}
          onCancel={engine.sendCancel}
          disabled={uiState.isStreaming}
        />
      )}
    </Box>
  );
};

export default App;
