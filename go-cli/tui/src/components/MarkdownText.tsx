import React, { type FC, useMemo } from "react";
import { Text } from "ink";
import { marked, type MarkedExtension } from "marked";
import { markedTerminal } from "marked-terminal";

marked.use(
  markedTerminal({ reflowText: true, tab: 2 }) as MarkedExtension,
);

// marked-terminal's `text` renderer discards inline tokens (bold, italic,
// code spans) inside tight list items by reading only the raw `.text`
// property. Override it so inline tokens are parsed when present.
marked.use({
  renderer: {
    text(token: string | { tokens?: unknown[]; text: string }) {
      if (typeof token === "object" && Array.isArray(token.tokens) && token.tokens.length > 0) {
        return (this as unknown as { parser: { parseInline(tokens: unknown[]): string } }).parser.parseInline(token.tokens);
      }
      if (typeof token === "object") return token.text;
      return token;
    },
  },
});

interface MarkdownTextProps {
  text: string;
}

const MarkdownText: FC<MarkdownTextProps> = ({ text }) => {
  const rendered = useMemo(() => {
    const result = marked.parse(text);
    if (typeof result !== "string") return text;
    return result.replace(/\n+$/, "");
  }, [text]);

  return <Text>{rendered}</Text>;
};

export default MarkdownText;
