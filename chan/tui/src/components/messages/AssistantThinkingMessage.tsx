import React, { type FC, useMemo } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface AssistantThinkingMessageProps {
  text: string;
  streaming?: boolean;
  toggleHint?: string;
}

function truncateThinking(text: string, maxLines: number): string {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  return lines.slice(-maxLines).join("\n");
}

const AssistantThinkingMessage: FC<AssistantThinkingMessageProps> = ({
  text,
  streaming = false,
  toggleHint,
}) => {
  const content = useMemo(
    () => (streaming ? truncateThinking(text, 4) : text.trimEnd()),
    [streaming, text],
  );
  if (!content) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Text color="gray" italic>
        {streaming ? <Spinner type="dots" /> : null}
        {streaming ? " Thinking" : "Thinking"}
        {toggleHint ? ` (${toggleHint})` : ""}
      </Text>
      <Text color="gray">{content}</Text>
    </Box>
  );
};

export default AssistantThinkingMessage;
