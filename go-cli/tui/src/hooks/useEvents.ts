import { useState, useCallback } from "react";
import type {
  ArtifactCreatedPayload,
  ArtifactUpdatedPayload,
  CostUpdatePayload,
  ErrorPayload,
  ModeChangedPayload,
  ModelChangedPayload,
  PermissionRequestPayload,
  SessionRestoredPayload,
  StreamEvent,
  TokenDeltaPayload,
  ToolStartPayload,
} from "../protocol/types.js";

export interface UIArtifact {
  id: string;
  kind: string;
  title: string;
  content: string;
}

export interface EngineUIState {
  streamedText: string;
  mode: string;
  model: string;
  cost: { totalUsd: number; inputTokens: number; outputTokens: number };
  artifacts: UIArtifact[];
  activeTool: { id: string; name: string } | null;
  pendingPermission: PermissionRequestPayload | null;
  error: string | null;
  isStreaming: boolean;
}

const initialState = (model: string): EngineUIState => ({
  streamedText: "",
  mode: "plan",
  model,
  cost: { totalUsd: 0, inputTokens: 0, outputTokens: 0 },
  artifacts: [],
  activeTool: null,
  pendingPermission: null,
  error: null,
  isStreaming: false,
});

export function useEvents(initialModel: string) {
  const [uiState, setUIState] = useState<EngineUIState>(() =>
    initialState(initialModel),
  );

  const handleEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "token_delta": {
        const p = event.payload as TokenDeltaPayload;
        setUIState((s) => ({
          ...s,
          streamedText: s.streamedText + p.text,
          isStreaming: true,
        }));
        break;
      }
      case "turn_complete":
        setUIState((s) => ({ ...s, isStreaming: false, activeTool: null }));
        break;
      case "tool_start": {
        const p = event.payload as ToolStartPayload;
        setUIState((s) => ({
          ...s,
          activeTool: { id: p.tool_id, name: p.name },
        }));
        break;
      }
      case "tool_result":
      case "tool_error":
        setUIState((s) => ({ ...s, activeTool: null }));
        break;
      case "permission_request": {
        const p = event.payload as PermissionRequestPayload;
        setUIState((s) => ({ ...s, pendingPermission: p }));
        break;
      }
      case "mode_changed": {
        const p = event.payload as ModeChangedPayload;
        setUIState((s) => ({ ...s, mode: p.mode }));
        break;
      }
      case "model_changed": {
        const p = event.payload as ModelChangedPayload;
        setUIState((s) => ({ ...s, model: p.model }));
        break;
      }
      case "cost_update": {
        const p = event.payload as CostUpdatePayload;
        setUIState((s) => ({
          ...s,
          cost: {
            totalUsd: p.total_usd,
            inputTokens: p.input_tokens,
            outputTokens: p.output_tokens,
          },
        }));
        break;
      }
      case "artifact_created": {
        const p = event.payload as ArtifactCreatedPayload;
        setUIState((s) => ({
          ...s,
          artifacts: upsertArtifact(s.artifacts, {
            id: p.id,
            kind: p.kind,
            title: p.title,
            content: "",
          }),
        }));
        break;
      }
      case "artifact_updated": {
        const p = event.payload as ArtifactUpdatedPayload;
        setUIState((s) => ({
          ...s,
          artifacts: upsertArtifact(s.artifacts, {
            id: p.id,
            kind: findArtifactField(s.artifacts, p.id, "kind", "artifact"),
            title: findArtifactField(s.artifacts, p.id, "title", "Artifact"),
            content: p.content,
          }),
        }));
        break;
      }
      case "session_restored": {
        const p = event.payload as SessionRestoredPayload;
        setUIState((s) => ({
          ...s,
          mode: p.mode,
          isStreaming: false,
          error: null,
        }));
        break;
      }
      case "error": {
        const p = event.payload as ErrorPayload;
        setUIState((s) => ({ ...s, error: p.message }));
        break;
      }
    }
  }, []);

  const clearStream = useCallback(() => {
    setUIState((s) => ({ ...s, streamedText: "", error: null }));
  }, []);

  const clearPermission = useCallback(() => {
    setUIState((s) => ({ ...s, pendingPermission: null }));
  }, []);

  return { uiState, handleEvent, clearStream, clearPermission };
}

function upsertArtifact(
  artifacts: UIArtifact[],
  nextArtifact: UIArtifact,
): UIArtifact[] {
  const remaining = artifacts.filter(
    (artifact) => artifact.id !== nextArtifact.id,
  );
  return [nextArtifact, ...remaining];
}

function findArtifactField(
  artifacts: UIArtifact[],
  id: string,
  field: "kind" | "title",
  fallback: string,
): string {
  const artifact = artifacts.find((entry) => entry.id === id);
  return artifact?.[field] ?? fallback;
}
