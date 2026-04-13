package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/channyeintun/chan/internal/debuglog"
)

type debugViewOptions struct {
	FilePath  string
	Level     string
	Component string
	Event     string
	Raw       bool
	Lines     int
}

func newDebugViewCommand() *cobra.Command {
	options := debugViewOptions{}
	cmd := &cobra.Command{
		Use:   "debug-view",
		Short: "Tail a structured debug log with a live monitor view",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runDebugView(options)
		},
	}
	cmd.Flags().StringVar(&options.FilePath, "file", "", "Path to the session debug log")
	cmd.Flags().StringVar(&options.Level, "level", "", "Filter by log level")
	cmd.Flags().StringVar(&options.Component, "component", "", "Filter by component")
	cmd.Flags().StringVar(&options.Event, "event", "", "Filter by event name")
	cmd.Flags().BoolVar(&options.Raw, "raw", false, "Print raw JSONL instead of the formatted monitor view")
	cmd.Flags().IntVar(&options.Lines, "lines", 40, "Number of existing lines to print before following new events")
	return cmd
}

func runDebugView(options debugViewOptions) error {
	path := strings.TrimSpace(options.FilePath)
	if path == "" {
		return fmt.Errorf("--file is required")
	}

	if !options.Raw {
		fmt.Printf("Debug monitor: %s\n", path)
		fmt.Printf("Filters: level=%s component=%s event=%s\n\n", debugFilterValue(options.Level), debugFilterValue(options.Component), debugFilterValue(options.Event))
	}

	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	if options.Lines > 0 {
		if err := printRecentDebugLines(file, options); err != nil {
			return err
		}
	}

	if _, err := file.Seek(0, io.SeekEnd); err != nil {
		return err
	}
	reader := bufio.NewReader(file)

	for {
		line, err := reader.ReadString('\n')
		if err == nil {
			printDebugMonitorLine(line, options)
			continue
		}
		if err != io.EOF {
			return err
		}

		info, statErr := os.Stat(path)
		if statErr == nil {
			position, seekErr := file.Seek(0, io.SeekCurrent)
			if seekErr == nil && info.Size() < position {
				if _, err := file.Seek(0, io.SeekStart); err != nil {
					return err
				}
				reader.Reset(file)
			}
		}
		time.Sleep(250 * time.Millisecond)
	}
}

func printRecentDebugLines(file *os.File, options debugViewOptions) error {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}

	scanner := bufio.NewScanner(file)
	lines := make([]string, 0, options.Lines)
	for scanner.Scan() {
		line := scanner.Text()
		if len(lines) == options.Lines {
			copy(lines, lines[1:])
			lines[len(lines)-1] = line
			continue
		}
		lines = append(lines, line)
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	for _, line := range lines {
		printDebugMonitorLine(line, options)
	}
	return nil
}

func printDebugMonitorLine(line string, options debugViewOptions) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return
	}

	var envelope debuglog.Envelope
	if err := json.Unmarshal([]byte(trimmed), &envelope); err != nil {
		fmt.Println(trimmed)
		return
	}
	if !matchesDebugFilters(envelope, options) {
		return
	}

	if options.Raw {
		fmt.Println(trimmed)
		return
	}

	level := strings.ToUpper(debugFilterValue(envelope.Level))
	stamp := envelope.TS
	if len(stamp) >= 19 {
		stamp = stamp[11:19]
	}
	summary := summarizeDebugEnvelope(envelope)
	lineText := fmt.Sprintf("[%s] %-5s %-12s %-20s %s", stamp, level, debugFilterValue(envelope.Component), envelope.Event, summary)
	if envelope.Error != nil && strings.TrimSpace(envelope.Error.Message) != "" {
		lineText += " | error=" + envelope.Error.Message
	}
	fmt.Println(lineText)
}

func matchesDebugFilters(envelope debuglog.Envelope, options debugViewOptions) bool {
	if options.Level != "" && !strings.EqualFold(envelope.Level, options.Level) {
		return false
	}
	if options.Component != "" && !strings.EqualFold(envelope.Component, options.Component) {
		return false
	}
	if options.Event != "" && !strings.EqualFold(envelope.Event, options.Event) {
		return false
	}
	return true
}

func summarizeDebugEnvelope(envelope debuglog.Envelope) string {
	parts := make([]string, 0, 6)
	appendField := func(key string) {
		if envelope.Data == nil {
			return
		}
		value, ok := envelope.Data[key]
		if !ok {
			return
		}
		text := strings.TrimSpace(fmt.Sprint(value))
		if text == "" {
			return
		}
		parts = append(parts, key+"="+text)
	}

	appendField("type")
	appendField("tool_name")
	appendField("tool_id")
	appendField("model")
	appendField("stop_reason")
	appendField("message_count")

	if envelope.Metrics != nil {
		if bytesValue, ok := envelope.Metrics["bytes"]; ok {
			parts = append(parts, "bytes="+fmt.Sprint(bytesValue))
		}
		if durationValue, ok := envelope.Metrics["duration_ms"]; ok {
			parts = append(parts, "duration_ms="+fmt.Sprint(durationValue))
		}
	}

	if len(parts) > 0 {
		return strings.Join(parts, " ")
	}
	if envelope.Data != nil {
		payload, err := json.Marshal(envelope.Data)
		if err == nil {
			text := string(payload)
			if len(text) > 140 {
				return text[:140] + "..."
			}
			return text
		}
	}
	return "-"
}

func openDebugMonitorPopup(filePath string) error {
	if runtime.GOOS != "darwin" {
		return fmt.Errorf("automatic debug monitor popup is currently supported on macOS only")
	}

	execPath, err := os.Executable()
	if err != nil {
		return err
	}
	if resolved, resolveErr := filepath.EvalSymlinks(execPath); resolveErr == nil {
		execPath = resolved
	}
	commandLine := debugViewCommandLine(execPath, filePath)
	script := []string{
		`tell application "Terminal"`,
		`activate`,
		fmt.Sprintf(`do script %q`, commandLine),
		`end tell`,
	}
	return exec.Command("osascript", flattenAppleScript(script)...).Start()
}

func debugViewCommandLine(execPath string, filePath string) string {
	return shellQuote(execPath) + " debug-view --file " + shellQuote(filePath)
}

func flattenAppleScript(lines []string) []string {
	args := make([]string, 0, len(lines)*2)
	for _, line := range lines {
		args = append(args, "-e", line)
	}
	return args
}

func shellQuote(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", `"'"'"`) + "'"
}

func debugFilterValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "*"
	}
	return trimmed
}
