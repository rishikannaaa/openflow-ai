# OpenFlow AI

OpenFlow AI is a local-first command-line tool for checking Claude prompt behavior against repeatable test cases. Define a system prompt, example inputs, and simple assertions in JSON, then run the suite in fixture-only mode or against Anthropic's API.

This is an early, single-contributor project. It is not a hosted service, does not include a backend, and does not claim to be eligible for any startup program or credits. The repository is public but currently has no license, so don't treat it as open-source software with reuse rights until a license is chosen and added.

## Requirements

- Node.js 20 or newer
- For live model runs only: an Anthropic API key and an API model available to your account. API requests can incur charges; check Console pricing and limits before running them.

## Try it without an API key or network requests

```powershell
npm test
npm start -- run --file examples/sentiment.json --dry-run
```

Dry-run responses are fixtures in the example file. This checks the test runner and assertions; it does **not** call Claude or measure real model output.

## Run against Claude

1. Create an API key through your Anthropic Console account. Do not share it or commit it to GitHub.
2. Copy `.env.example` to `.env` and put your key in the `ANTHROPIC_API_KEY` value. `.env` is ignored by Git. You can instead set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in your terminal environment.
3. Use a model ID available to your account:

```powershell
npm start -- run --file examples/sentiment.json --model YOUR_MODEL_ID
```

The CLI calls the Anthropic Messages API once for each case, sequentially. It prints the response and assertion results; the command exits non-zero when one or more assertions fail. Live calls use your API account and may incur costs. Never put an API key in a command-line argument.

For machine-readable output:

```powershell
npm start -- run --file examples/sentiment.json --model YOUR_MODEL_ID --json
```

## Write a test suite

Each suite is a JSON file with a name, a shared system prompt, and 1–50 test cases. Each case must have a unique `id`, an `input`, and at least one check.

Supported checks are case-insensitive `includes` and `excludes` string arrays, and `minLength` / `maxLength` response character counts. Optional `dryRunResponse` values provide local fixtures only; live mode ignores them.

```json
{
  "name": "Greeting behavior",
  "system": "Reply with a short, friendly greeting.",
  "cases": [
    {
      "id": "greet",
      "input": "Say hello.",
      "checks": {
        "includes": ["hello"],
        "maxLength": 100
      },
      "dryRunResponse": "Hello! How can I help?"
    }
  ]
}
```

## Deploy the project page

The public repo's GitHub Actions workflow deploys the static project information page on each push to `main`. The site is documentation and marketing material; the CLI and live API testing run locally, not in the browser.

- Repository: [github.com/rishikannaaa/openflow-ai](https://github.com/rishikannaaa/openflow-ai)
- Project page: [rishikannaaa.github.io/openflow-ai](https://rishikannaaa.github.io/openflow-ai/)

## Roadmap

- Markdown and JSON report export
- More assertion types and prompt variables
- Run history and side-by-side model comparisons
- Better cost and token summaries

Bug reports and focused feature requests are welcome. Please describe issues or needs that you have personally encountered.
