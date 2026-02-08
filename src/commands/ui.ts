export async function uiCommand(): Promise<void> {
  console.log("Aido UI is coming soon.");
  console.log("");
  console.log("In the meantime, use the CLI:");
  console.log("  aido sandbox up     Create a sandbox");
  console.log("  aido run <task>     Run a task");
  console.log("  aido logs           View run logs");
  console.log("  aido sandbox destroy  Clean up");
}
