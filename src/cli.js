#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSuite, validateSuite } from "./runner.js";

function usage() {
  return [
    "OpenFlow AI — local prompt testbench",
    "",
    "Usage:",
    "  npm start -- run --file examples/sentiment.json --model MODEL",
    "  npm start -- run --file examples/sentiment.json --dry-run",
    "",
    "Options:",
    "  --file PATH   JSON suite file (required)",
    "  --model ID    Anthropic model ID (live mode only; may also use ANTHROPIC_MODEL)",
    "  --dry-run     Use fixture responses only; makes no network requests",
    "  --json        Print machine-readable JSON results",
    "  --help        Show this help"
  ].join("\n");
}

function parseArgs(args) {
  const options = { command: args[0] };
  for (let index = 1; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--dry-run" || argument === "--json") {
      options[argument.slice(2).replace("-", "")] = true;
    } else if (["--file", "--model"].includes(argument)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      options[argument.slice(2)] = value;
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

async function loadLocalEnvironment() {
  const envPath = path.resolve(process.cwd(), ".env");
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw new Error(`Could not read .env: ${error.message}`);
  }

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function requestClaude({ system, input, apiKey, model }) {
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: input }]
      }),
      signal: AbortSignal.timeout(60_000)
    });
  } catch (error) {
    throw new Error(`Could not reach the Anthropic API: ${error.message}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Anthropic API returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = data?.error?.message;
    throw new Error(`Anthropic API request failed (HTTP ${response.status})${message ? `: ${message}` : "."}`);
  }

  const text = data.content
    ?.filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n");
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Anthropic API returned no text content.");
  }
  return text;
}

function printHumanReport(report) {
  console.log(`${report.suite} (${report.mode})`);
  for (const result of report.results) {
    console.log(`\n${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    for (const check of result.checks) {
      console.log(`  ${check.passed ? "✓" : "✗"} ${check.check}`);
    }
    if (result.response) console.log(`  Response: ${result.response}`);
  }
  console.log(`\n${report.passed} passed, ${report.failed} failed.`);
  if (report.mode === "dry-run") {
    console.log("Dry run only: no Claude API request was made.");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.command === "--help" || !options.command) {
    console.log(usage());
    return;
  }
  if (options.command !== "run") {
    throw new Error(`Unknown command: ${options.command}`);
  }
  if (!options.file) {
    throw new Error("Provide a suite file with --file.");
  }

  const suitePath = path.resolve(process.cwd(), options.file);
  let suite;
  try {
    suite = JSON.parse(await readFile(suitePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not load suite "${options.file}": ${error.message}`);
  }
  validateSuite(suite);

  let report;
  if (options.dryrun) {
    report = await runSuite(suite, { dryRun: true });
  } else {
    await loadLocalEnvironment();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Set ANTHROPIC_API_KEY in your environment or an untracked .env file before live runs.");
    }
    const model = options.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new Error("Choose a model with --model or set ANTHROPIC_MODEL.");
    }
    report = await runSuite(suite, {
      request: ({ system, input }) =>
        requestClaude({ system, input, apiKey, model })
    });
  }

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  if (report.failed > 0) process.exitCode = 1;
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
