import test from "node:test";
import assert from "node:assert/strict";
import { evaluateResponse, runSuite, validateSuite } from "../src/runner.js";
import suite from "../examples/sentiment.json" with { type: "json" };

test("validates the example test suite", () => {
  assert.equal(validateSuite(suite), suite);
});

test("rejects duplicate case identifiers", () => {
  const invalid = {
    ...suite,
    cases: [suite.cases[0], { ...suite.cases[1], id: suite.cases[0].id }]
  };
  assert.throws(() => validateSuite(invalid), /Duplicate case id/);
});

test("rejects invalid length checks", () => {
  const invalid = {
    ...suite,
    cases: [{ ...suite.cases[0], checks: { minLength: 8, maxLength: 4 } }]
  };
  assert.throws(() => validateSuite(invalid), /minLength cannot be greater/);
});

test("rejects misspelled or empty checks instead of silently passing them", () => {
  const invalidCheck = {
    ...suite,
    cases: [{ ...suite.cases[0], checks: { include: ["positive"] } }]
  };
  const emptyCheck = {
    ...suite,
    cases: [{ ...suite.cases[0], checks: { includes: [] } }]
  };
  assert.throws(() => validateSuite(invalidCheck), /unsupported check "include"/);
  assert.throws(() => validateSuite(emptyCheck), /must have at least one check/);
});

test("evaluates case-insensitive inclusion, exclusion, and length checks", () => {
  const checks = evaluateResponse("POSITIVE", {
    includes: ["positive"],
    excludes: ["negative"],
    minLength: 4,
    maxLength: 10
  });
  assert.ok(checks.every(check => check.passed));
});

test("dry run evaluates every fixture without calling an API", async () => {
  const report = await runSuite(suite, { dryRun: true });
  assert.equal(report.mode, "dry-run");
  assert.equal(report.passed, 3);
  assert.equal(report.failed, 0);
  assert.ok(report.results.every(result => !("response" in result)));
});

test("live run records model responses and failing checks", async () => {
  const responses = ["positive", "negative", "negative"];
  const requests = [];
  const report = await runSuite(suite, {
    request: async request => {
      requests.push(request);
      return responses.shift();
    }
  });
  assert.equal(report.mode, "live");
  assert.equal(report.passed, 2);
  assert.equal(report.failed, 1);
  assert.equal(report.results[1].response, "negative");
  assert.equal(requests[0].system, suite.system);
  assert.equal(requests[0].input, suite.cases[0].input);
});

test("dry run requires fixture responses for all cases", async () => {
  const invalid = {
    ...suite,
    cases: [{ ...suite.cases[0], dryRunResponse: undefined }]
  };
  await assert.rejects(() => runSuite(invalid, { dryRun: true }), /needs a dryRunResponse/);
});
