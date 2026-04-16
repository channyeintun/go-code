import React, { type FC, useMemo, useState } from "react";
import { Box, Text, useInput } from "silvery";
import type { UIRewindSelection } from "../hooks/useEvents.js";

interface RewindSelectionPromptProps {
  selection: UIRewindSelection;
  onSelect: (messageIndex: number) => void;
  onCancel: () => void;
}

const VISIBLE_WINDOW = 8;

const RewindSelectionPrompt: FC<RewindSelectionPromptProps> = ({
  selection,
  onSelect,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(selection.turns.length - 1, 0),
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((current) =>
        current === 0 ? selection.turns.length - 1 : current - 1,
      );
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((current) => (current + 1) % selection.turns.length);
      return;
    }

    if (key.return) {
      const selected = selection.turns[selectedIndex];
      if (selected) {
        onSelect(selected.messageIndex);
      }
      return;
    }

    const shortcut = input?.toLowerCase();
    if (!shortcut) {
      return;
    }

    if (shortcut === "q") {
      onCancel();
    }
  });

  const startIndex = useMemo(() => {
    if (selection.turns.length <= VISIBLE_WINDOW) {
      return 0;
    }
    const centered = selectedIndex - Math.floor(VISIBLE_WINDOW / 2);
    return Math.max(
      0,
      Math.min(centered, selection.turns.length - VISIBLE_WINDOW),
    );
  }, [selectedIndex, selection.turns.length]);

  const visibleTurns = selection.turns.slice(
    startIndex,
    startIndex + VISIBLE_WINDOW,
  );

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      minWidth={0}
      minHeight={0}
      backgroundColor="$popover-bg"
      borderStyle="double"
      borderColor="$inputborder"
      overflow="hidden"
      paddingX={2}
      paddingY={1}
    >
      <Box flexDirection="column" flexShrink={0} minWidth={0}>
        <Text bold color="$warning">
          Rewind Conversation
        </Text>
        <Box marginTop={1} flexDirection="column" minWidth={0}>
          <Text>
            Choose the user turn to keep. Later messages will be dropped.
          </Text>
          <Text color="$muted">
            {selection.turns.length} available turn
            {selection.turns.length === 1 ? "" : "s"}
          </Text>
        </Box>
      </Box>

      <Box
        marginTop={1}
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        minHeight={0}
        minWidth={0}
        overflow="scroll"
      >
        {visibleTurns.map((turn, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === selectedIndex;

          return (
            <Box
              key={`${turn.turnNumber}-${turn.messageIndex}`}
              flexDirection="column"
              backgroundColor={isSelected ? "$selectionbg" : undefined}
              paddingX={1}
              marginBottom={1}
              minWidth={0}
            >
              <Text color={isSelected ? "$selection" : "$fg"} bold={isSelected}>
                {isSelected ? "›" : " "} Turn {turn.turnNumber}
              </Text>
              <Text color={isSelected ? "$selection" : "$muted"}>
                {turn.preview}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="column" flexShrink={0}>
        <Text dimColor>
          Enter rewind · Up/Down change selection · Esc or Q cancel
        </Text>
      </Box>
    </Box>
  );
};

export default RewindSelectionPrompt;
