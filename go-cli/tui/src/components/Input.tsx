import React, { type FC } from "react";
import { Box, Text, useInput } from "ink";
import type { PromptController } from "../hooks/usePromptHistory.js";

interface InputProps {
  prompt: PromptController;
  onSubmit: () => void;
  onModeToggle: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

const INPUT_HINT =
  "Enter send | Shift+Enter newline | Arrows move | Tab mode | Esc cancel";
const DISABLED_HINT = "Engine busy | Esc cancel";

function renderInputLines(value: string, cursorOffset: number): string[] {
  const renderedValue =
    value.slice(0, cursorOffset) + "█" + value.slice(cursorOffset);

  return renderedValue.split("\n");
}

const Input: FC<InputProps> = ({
  prompt,
  onSubmit,
  onModeToggle,
  onCancel,
  disabled,
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (disabled) return;

    if (key.tab) {
      onModeToggle();
      return;
    }
    if (key.return) {
      if (key.shift || key.meta) {
        prompt.insertNewline();
        return;
      }

      onSubmit();
      return;
    }
    if (key.upArrow) {
      if (prompt.value.includes("\n")) {
        prompt.moveUp();
      } else {
        prompt.navigateUp();
      }
      return;
    }
    if (key.downArrow) {
      if (prompt.value.includes("\n")) {
        prompt.moveDown();
      } else {
        prompt.navigateDown();
      }
      return;
    }
    if (key.leftArrow) {
      if (key.ctrl || key.meta) {
        prompt.moveWordLeft();
      } else {
        prompt.moveLeft();
      }

      return;
    }
    if (key.rightArrow) {
      if (key.ctrl || key.meta) {
        prompt.moveWordRight();
      } else {
        prompt.moveRight();
      }

      return;
    }
    if (key.home || (key.ctrl && input === "a")) {
      prompt.moveLineStart();
      return;
    }
    if (key.end || (key.ctrl && input === "e")) {
      prompt.moveLineEnd();
      return;
    }
    if (key.backspace) {
      if (key.ctrl || key.meta) {
        prompt.deleteWordBackward();
      } else {
        prompt.backspace();
      }

      return;
    }
    if (key.delete) {
      if (key.ctrl || key.meta) {
        prompt.deleteWordForward();
      } else {
        prompt.deleteForward();
      }

      return;
    }
    if (key.ctrl) {
      switch (input) {
        case "b":
          prompt.moveLeft();
          return;
        case "f":
          prompt.moveRight();
          return;
        case "h":
          prompt.backspace();
          return;
        case "n":
          prompt.navigateDown();
          return;
        case "p":
          prompt.navigateUp();
          return;
        case "u":
          prompt.clear();
          return;
        case "w":
          prompt.deleteWordBackward();
          return;
        default:
          break;
      }
    }
    if (input) {
      prompt.insertText(input);
      return;
    }
  });

  const showPlaceholder = prompt.value.length === 0;
  const hint = disabled ? DISABLED_HINT : INPUT_HINT;
  const renderedLines = renderInputLines(prompt.value, prompt.cursorOffset);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      <Box flexDirection="column">
        {showPlaceholder ? (
          <Box>
            <Text color="cyan" bold>
              {"> "}
            </Text>
            <Text color="gray">Ask go-cli to inspect, plan, or edit code</Text>
            <Text color="gray">{"█"}</Text>
          </Box>
        ) : (
          renderedLines.map((line, index) => (
            <Box key={index}>
              <Text color={index === 0 ? "cyan" : "gray"} bold={index === 0}>
                {index === 0 ? "> " : "  "}
              </Text>
              <Text>{line.length > 0 ? line : " "}</Text>
            </Box>
          ))
        )}
      </Box>
      <Box paddingLeft={2} marginTop={1}>
        <Text dimColor>{hint}</Text>
      </Box>
    </Box>
  );
};

export default Input;
