import type { ChatStore } from "@/types";

/**
 * Slash command definition
 */
export interface SlashCommand {
  /** Command name (without the leading /) */
  name: string;
  /** Alternative names for the command */
  aliases?: string[];
  /** Human-readable description */
  description: string;
  /** Whether this command requires a shared conversation */
  requiresShared?: boolean;
  /** Execute the command */
  execute: (store: ChatStore) => void;
}

/**
 * Available slash commands
 */
export const COMMANDS: Record<string, SlashCommand> = {
  chat: {
    name: "chat",
    aliases: ["c"],
    description: "Toggle chat-only mode (no AI response)",
    requiresShared: true,
    execute: (store) => store.setChatOnlyMode(!store.chatOnlyMode),
  },
  ai: {
    name: "ai",
    description: "Enable AI responses",
    requiresShared: true,
    execute: (store) => store.setChatOnlyMode(false),
  },
};

/**
 * Parse a command from user input
 * @param input The user input string
 * @returns The matching command or null if not found
 */
export function parseCommand(input: string): SlashCommand | null {
  if (!input.startsWith("/")) return null;

  const trimmed = input.trim();
  const cmd = trimmed.slice(1).split(" ")[0].toLowerCase();

  // Direct match
  if (COMMANDS[cmd]) {
    return COMMANDS[cmd];
  }

  // Alias match
  return Object.values(COMMANDS).find((c) => c.aliases?.includes(cmd)) || null;
}

/**
 * Get all commands that match a partial input (for autocomplete)
 * @param partial The partial command input (without leading /)
 * @returns Array of matching commands
 */
export function getMatchingCommands(partial: string): SlashCommand[] {
  const lower = partial.toLowerCase();
  return Object.values(COMMANDS).filter(
    (cmd) =>
      cmd.name.startsWith(lower) || cmd.aliases?.some((a) => a.startsWith(lower))
  );
}

/**
 * Check if input is a complete command (ready to execute)
 * @param input The user input string
 * @returns true if the input is exactly a command (e.g., "/chat" not "/chat message")
 */
export function isCompleteCommand(input: string): boolean {
  if (!input.startsWith("/")) return false;
  const trimmed = input.trim();
  // A complete command is just the slash and command name, no additional text
  return trimmed.split(" ").length === 1 && parseCommand(trimmed) !== null;
}
