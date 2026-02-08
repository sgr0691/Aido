#!/usr/bin/env node

import { Command } from "commander";
import { sandboxUpCommand } from "./commands/sandbox-up.js";
import { sandboxDestroyCommand } from "./commands/sandbox-destroy.js";
import { runCommand } from "./commands/run.js";
import { logsCommand } from "./commands/logs.js";
import { uiCommand } from "./commands/ui.js";

const program = new Command();

program
  .name("aido")
  .description("Run AI-generated code safely against real infrastructure")
  .version("0.1.0");

const sandbox = program
  .command("sandbox")
  .description("Manage sandboxes");

sandbox
  .command("up")
  .description("Create a new sandbox from a spec")
  .option("-s, --spec <path>", "Path to sandbox.yaml", "sandbox.yaml")
  .action(sandboxUpCommand);

sandbox
  .command("destroy")
  .description("Tear down a sandbox and clean up")
  .option("--sandbox <id>", "Sandbox ID to destroy")
  .option("--all", "Destroy all sandboxes")
  .action(sandboxDestroyCommand);

program
  .command("run")
  .description("Execute a task inside a sandbox")
  .argument("<task>", "Path to the task file to execute")
  .option("--sandbox <id>", "Sandbox ID to use")
  .option("--json", "Output results as JSON")
  .option("--verbose", "Enable verbose output")
  .option(
    "--dangerous-allow-mutations",
    "Allow write access to inputs (unsafe)"
  )
  .action(runCommand);

program
  .command("logs")
  .description("View logs from the latest run")
  .option("--sandbox <id>", "Sandbox ID")
  .option("-f, --follow", "Follow log output")
  .action(logsCommand);

program
  .command("ui")
  .description("Launch terminal UI")
  .action(uiCommand);

program.parse();
