import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js"

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">

export interface BotCommand {
  data: CommandData
  execute(interaction: ChatInputCommandInteraction, clients: BotClients): Promise<void>
}

export interface BotClients {
  primary: Client
  secondary: Client
}
