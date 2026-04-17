import path from "node:path";
import React, { type FC, useMemo, useState } from "react";
import { Box, Text, useInput } from "silvery";
import type { PermissionResponseDecision } from "../protocol/types.js";

type PermissionDecision = PermissionResponseDecision;

interface PermissionOption {
  decision: PermissionDecision;
  label: string;
  description: string;
  shortcut: string;
  color: "$success" | "$error" | "$primary" | "$accent";
}

interface PermissionPromptProps {
  tool: string;
  command: string;
  risk: string;
  riskReason?: string;
  permissionLevel?: string;
  targetKind?: string;
  targetValue?: string;
  workingDir?: string;
  onRespond: (decision: PermissionDecision, feedback?: string) => void;
  onCancelTurn: () => void;
}

interface DetailPreview {
  lines: string[];
  hiddenLineCount: number;
  truncated: boolean;
}

const DETAIL_PREVIEW_MAX_LINES = 4;
const DETAIL_PREVIEW_MAX_CHARS = 320;
const DETAIL_PREVIEW_MAX_LINE_CHARS = 120;

const OPTIONS: PermissionOption[] = [
  {
    decision: "allow",
    label: "Allow Once",
    description: "Run this request and ask again next time.",
    shortcut: "Y",
    color: "$success",
  },
  {
    decision: "deny",
    label: "Deny",
    description: "Block this request and return control to the agent.",
    shortcut: "N",
    color: "$error",
  },
  {
    decision: "always_allow",
    label: "Always Allow",
    description: "Persist approval for matching requests outside this session.",
    shortcut: "A",
    color: "$primary",
  },
  {
    decision: "allow_all_session",
    label: "Allow Safe This Session",
    description:
      "Auto-approve future non-destructive, non-sensitive requests in this session.",
    shortcut: "S",
    color: "$accent",
  },
];

function getRiskColor(risk: string): "$error" | "$warning" | "$info" {
  if (risk === "destructive") {
    return "$error";
  }

  if (risk === "high") {
    return "$warning";
  }

  return "$info";
}

const PermissionPrompt: FC<PermissionPromptProps> = ({
  tool,
  command,
  risk,
  riskReason,
  permissionLevel,
  targetKind,
  targetValue,
  workingDir,
  onRespond,
  onCancelTurn,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancelTurn();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((current) =>
        current === 0 ? OPTIONS.length - 1 : current - 1,
      );
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((current) => (current + 1) % OPTIONS.length);
      return;
    }

    if (key.return) {
      const selected = OPTIONS[selectedIndex];
      if (selected) {
        onRespond(selected.decision);
      }
      return;
    }

    const shortcut = input?.toLowerCase();
    if (!shortcut) {
      return;
    }

    const matched = OPTIONS.find(
      (option) => option.shortcut.toLowerCase() === shortcut,
    );
    if (matched) {
      onRespond(matched.decision);
    }
  });

  const riskColor = getRiskColor(risk);
  const selectedOption = OPTIONS[selectedIndex] ?? OPTIONS[0];
  const detailValue = targetValue?.trim() || command;
  const question = useMemo(
    () => buildQuestion(tool, targetKind, detailValue),
    [detailValue, targetKind, tool],
  );
  const detailLabel = useMemo(() => buildDetailLabel(targetKind), [targetKind]);
  const toolLabel = useMemo(() => formatToolLabel(tool), [tool]);
  const accessLabel = permissionLevel?.trim() || inferAccessLabel(tool);
  const detailPreview = useMemo(
    () => buildDetailPreview(detailValue, targetKind, tool),
    [detailValue, targetKind, tool],
  );

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      minWidth={0}
      minHeight={0}
      borderStyle="round"
      borderColor={riskColor}
      overflow="hidden"
      paddingX={1}
      userSelect="contain"
    >
      <Box flexDirection="column" flexShrink={0} minWidth={0}>
        <Text bold color={riskColor}>
          Permission Required
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column" flexShrink={0} minWidth={0}>
        <Text wrap="truncate-end">{question}</Text>
        <Text color="$muted" wrap="truncate-end">
          Tool: <Text color="$fg">{toolLabel}</Text>
        </Text>
        <Text color="$muted" wrap="truncate-end">
          Access: <Text color="$fg">{accessLabel}</Text>
        </Text>
        <Text color="$muted" wrap="truncate-end">
          Risk: <Text color={riskColor}>{risk || "normal"}</Text>
        </Text>
        {riskReason?.trim() ? (
          <Text color="$warning" wrap="truncate-end">{`Policy: ${riskReason}`}</Text>
        ) : null}
        {workingDir ? (
          <Text color="$muted" wrap="truncate-end">
            Cwd: <Text color="$fg">{workingDir}</Text>
          </Text>
        ) : null}
      </Box>
      <Box
        marginTop={1}
        paddingX={1}
        paddingY={1}
        borderStyle="round"
        borderColor="$border"
        flexDirection="column"
        flexShrink={0}
        minWidth={0}
        overflow="hidden"
      >
        <Text color="$muted">{detailLabel}</Text>
        <Box flexDirection="column" minWidth={0}>
          {detailPreview.lines.map((line, index) => (
            <Text
              key={`${detailLabel.toLowerCase()}-${index}`}
              wrap="truncate-end"
            >
              {line.length > 0 ? line : " "}
            </Text>
          ))}
        </Box>
        {detailPreview.truncated ? (
          <Text dimColor>{formatDetailPreviewHint(detailPreview.hiddenLineCount)}</Text>
        ) : null}
      </Box>
      <Box
        marginTop={1}
        flexDirection="column"
        flexShrink={0}
      >
        {OPTIONS.map((option, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Box key={option.decision} flexDirection="column" marginBottom={1}>
              <Text
                color={isSelected ? option.color : "$muted"}
                bold={isSelected}
              >
                {isSelected ? "›" : " "} {option.label}{" "}
                <Text dimColor>[{option.shortcut}]</Text>
              </Text>
              <Text color="$muted"> {option.description}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="column" flexShrink={0}>
        <Text dimColor>
          Enter confirm · Up/Down change selection · Esc cancel turn
        </Text>
        <Text dimColor>
          Selected:{" "}
          <Text color={selectedOption.color}>{selectedOption.label}</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default PermissionPrompt;

function buildQuestion(
  tool: string,
  targetKind: string | undefined,
  targetValue: string,
): string {
  if (targetKind === "file" && targetValue.trim()) {
    const fileName = path.basename(targetValue.trim());
    if (tool === "file_edit" || tool === "replace_string_in_file") {
      return `Allow edits to ${fileName}?`;
    }
    if (tool === "multi_replace_string_in_file") {
      return `Allow edits to ${fileName}?`;
    }
    if (tool === "apply_patch") {
      return `Allow patch updates to ${fileName}?`;
    }
    if (tool === "create_file") {
      return `Allow creation of ${fileName}?`;
    }
    if (tool === "file_write") {
      return `Allow overwrite of ${fileName}?`;
    }
    return `Allow access to ${fileName}?`;
  }

  if (targetKind === "files" && targetValue.trim()) {
    if (
      tool === "file_edit" ||
      tool === "replace_string_in_file" ||
      tool === "multi_replace_string_in_file"
    ) {
      return "Allow edits to these files?";
    }
    if (tool === "apply_patch") {
      return "Allow patch updates to these files?";
    }
    if (tool === "create_file") {
      return "Allow creation of these files?";
    }
    if (tool === "file_write") {
      return "Allow overwrite of these files?";
    }
    return "Allow access to these files?";
  }

  if (tool === "bash") {
    return "Allow shell command to run?";
  }

  if (targetKind === "url" && targetValue.trim()) {
    return `Allow access to ${targetValue.trim()}?`;
  }

  return `Allow ${formatToolLabel(tool)} to continue?`;
}

function buildDetailLabel(targetKind: string | undefined): string {
  switch (targetKind) {
    case "file":
      return "File";
    case "files":
      return "Files";
    case "url":
      return "URL";
    case "query":
      return "Query";
    case "pattern":
      return "Pattern";
    case "command":
      return "Command";
    default:
      return "Target";
  }
}

function formatToolLabel(tool: string): string {
  switch (tool) {
    case "bash":
      return "Bash";
    case "apply_patch":
      return "Apply Patch";
    case "create_file":
      return "Create File";
    case "file_write":
      return "File Write";
    case "file_edit":
      return "File Edit";
    case "replace_string_in_file":
      return "Replace String In File";
    case "multi_replace_string_in_file":
      return "Multi Replace String In File";
    default:
      return tool.replace(/_/g, " ");
  }
}

function inferAccessLabel(tool: string): string {
  if (tool === "bash") {
    return "execute";
  }
  if (
    tool === "apply_patch" ||
    tool === "create_file" ||
    tool === "file_write" ||
    tool === "file_edit" ||
    tool === "replace_string_in_file" ||
    tool === "multi_replace_string_in_file"
  ) {
    return "write";
  }
  return "ask";
}

function buildDetailPreview(
  value: string,
  targetKind: string | undefined,
  tool: string,
): DetailPreview {
  if (targetKind === "command" || tool === "bash") {
    const singleLine = value.replace(/\s+/g, " ").trim();
    return {
      lines: [truncateEnd(singleLine, DETAIL_PREVIEW_MAX_CHARS)],
      hiddenLineCount: 0,
      truncated: singleLine.length > DETAIL_PREVIEW_MAX_CHARS,
    };
  }

  const sourceLines = value.replace(/\r\n/g, "\n").split("\n");
  const previewLines: string[] = [];
  let remainingChars = DETAIL_PREVIEW_MAX_CHARS;
  let consumedSourceLines = 0;
  let truncated = false;

  for (const line of sourceLines) {
    if (
      previewLines.length >= DETAIL_PREVIEW_MAX_LINES ||
      remainingChars <= 0
    ) {
      truncated = true;
      break;
    }

    const lineBudget = Math.min(DETAIL_PREVIEW_MAX_LINE_CHARS, remainingChars);
    if (line.length > lineBudget) {
      truncated = true;
    }

    previewLines.push(truncateEnd(line, lineBudget));
    remainingChars -= Math.min(line.length, lineBudget);
    consumedSourceLines += 1;
  }

  if (consumedSourceLines < sourceLines.length) {
    truncated = true;
  }

  return {
    lines: previewLines.length > 0 ? previewLines : [""],
    hiddenLineCount: Math.max(0, sourceLines.length - consumedSourceLines),
    truncated,
  };
}

function truncateEnd(value: string, limit: number): string {
  if (limit <= 0) {
    return "";
  }

  if (value.length <= limit) {
    return value;
  }

  if (limit <= 3) {
    return ".".repeat(limit);
  }

  return `${value.slice(0, limit - 3)}...`;
}

function formatDetailPreviewHint(hiddenLineCount: number): string {
  if (hiddenLineCount > 0) {
    return `Preview truncated to keep actions visible. ${hiddenLineCount} more line${hiddenLineCount === 1 ? "" : "s"} hidden.`;
  }

  return "Preview truncated to keep actions visible.";
}
