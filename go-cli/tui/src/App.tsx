import React, { type FC, useEffect } from "react";
import { Box, Text } from "ink";
import { useEngine } from "./hooks/useEngine.js";
import { useEvents, type UIToolCall } from "./hooks/useEvents.js";
import ArtifactView from "./components/ArtifactView.js";
import Input from "./components/Input.js";
import PlanPanel from "./components/PlanPanel.js";
import StreamOutput from "./components/StreamOutput.js";
import StatusBar from "./components/StatusBar.js";
import PermissionPrompt from "./components/PermissionPrompt.js";
import ToolProgress from "./components/ToolProgress.js";
import { usePromptHistory } from "./hooks/usePromptHistory.js";

type ActiveToolCall = UIToolCall & {
  status: "running" | "waiting_permission";
};

interface AppProps {
  enginePath: string;
  model: string;
  mode: string;
}

const App: FC<AppProps> = ({ enginePath, model, mode }) => {
  const engine = useEngine(enginePath, { model, mode });
  const prompt = usePromptHistory();
  const {
    uiState,
    handleEvent,
    clearStream,
    clearPermission,
    appendUserMessage,
    beginAssistantTurn,
  } = useEvents(model, mode);
  const planArtifact =
    uiState.artifacts.find(
      (artifact) => artifact.kind === "implementation-plan",
    ) ?? null;
  const recentArtifacts = uiState.artifacts
    .filter(
      (artifact) =>
        artifact.kind !== "implementation-plan" && artifact.kind !== "tool-log",
    )
    .slice(0, 2);
  const activeTool = findActiveTool(uiState.toolCalls);

  // Dispatch incoming events to the UI state handler
  useEffect(() => {
    if (!engine.lastEvent) return;
    handleEvent(engine.lastEvent);
  }, [engine.eventVersion, engine.lastEvent, handleEvent]);

  const handleSubmit = () => {
    const text = prompt.submit();
    if (!text) {
      return;
    }

    appendUserMessage(text);
    clearStream();
    beginAssistantTurn();
    if (text.startsWith("/")) {
      const [cmd, ...rest] = text.slice(1).split(" ");
      engine.sendCommand(cmd!, rest.join(" "));
    } else {
      engine.sendInput(text);
    }
  };

  const handlePermissionResponse = (
    decision: "allow" | "deny" | "always_allow" | "allow_all_session",
  ) => {
    if (uiState.pendingPermission) {
      beginAssistantTurn();
      clearPermission(decision);
      engine.sendPermissionResponse(
        uiState.pendingPermission.request_id,
        decision,
      );
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        ready={uiState.ready || engine.ready}
        mode={uiState.mode}
        model={uiState.model}
        totalCostUsd={uiState.cost.totalUsd}
        inputTokens={uiState.cost.inputTokens}
        outputTokens={uiState.cost.outputTokens}
      />

      <Box flexDirection="column" flexGrow={1}>
        {engine.error && !uiState.error && (
          <Box borderStyle="round" borderColor="red" paddingX={1} marginTop={1}>
            <Text color="red">{engine.error}</Text>
          </Box>
        )}

        {!uiState.ready && !engine.error && (
          <Box paddingLeft={1} marginTop={1}>
            <Text color="gray">Starting Go engine...</Text>
          </Box>
        )}

        {uiState.statusLine && (
          <Box paddingLeft={1} marginTop={1}>
            <Text color="cyan">{uiState.statusLine}</Text>
          </Box>
        )}

        {uiState.compact && (
          <Box paddingLeft={1} marginTop={1}>
            <Text color="yellow">
              {uiState.compact.active
                ? `Compacting conversation (${uiState.compact.strategy}, ${uiState.compact.tokensBefore} tokens)...`
                : `Compaction complete (${uiState.compact.tokensAfter} tokens)`}
            </Text>
          </Box>
        )}

        <StreamOutput
          messages={uiState.messages}
          liveText={uiState.streamedText}
          liveThinkingText={uiState.thinkingText}
          isStreaming={uiState.isStreaming}
        />

        {uiState.error && (
          <Box borderStyle="round" borderColor="red" paddingX={1} marginTop={1}>
            <Text color="red">{uiState.error}</Text>
          </Box>
        )}

        {planArtifact && (
          <PlanPanel
            title={planArtifact.title}
            content={planArtifact.content}
          />
        )}

        {recentArtifacts.length > 0 && (
          <ArtifactView artifacts={recentArtifacts} />
        )}

        {activeTool && (
          <ToolProgress
            toolName={activeTool.name}
            toolInput={activeTool.input}
            status={activeTool.status}
            progressBytes={activeTool.progressBytes}
          />
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
          value={prompt.value}
          onChange={prompt.setValue}
          onSubmit={handleSubmit}
          onHistoryUp={prompt.navigateUp}
          onHistoryDown={prompt.navigateDown}
          onModeToggle={engine.sendModeToggle}
          onCancel={engine.sendCancel}
          disabled={
            !uiState.ready ||
            !!engine.error ||
            uiState.pendingPermission !== null
          }
        />
      )}
    </Box>
  );
};

export default App;

function findActiveTool(toolCalls: UIToolCall[]): ActiveToolCall | null {
  for (let index = toolCalls.length - 1; index >= 0; index -= 1) {
    const toolCall = toolCalls[index];
    if (toolCall?.status === "running") {
      return toolCall as ActiveToolCall;
    }
    if (toolCall?.status === "waiting_permission") {
      return toolCall as ActiveToolCall;
    }
  }
  return null;
}
