const MAX_CASES = 50;

export function validateSuite(suite) {
  if (!suite || typeof suite !== "object" || Array.isArray(suite)) {
    throw new Error("Suite must be a JSON object.");
  }

  if (typeof suite.name !== "string" || !suite.name.trim()) {
    throw new Error("Suite must have a non-empty name.");
  }

  if (typeof suite.system !== "string" || !suite.system.trim()) {
    throw new Error("Suite must have a non-empty system prompt.");
  }

  if (!Array.isArray(suite.cases) || suite.cases.length === 0 || suite.cases.length > MAX_CASES) {
    throw new Error(`Suite must have between 1 and ${MAX_CASES} cases.`);
  }

  const ids = new Set();
  for (const [index, testCase] of suite.cases.entries()) {
    const location = `Case ${index + 1}`;
    if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) {
      throw new Error(`${location} must be an object.`);
    }
    if (typeof testCase.id !== "string" || !testCase.id.trim()) {
      throw new Error(`${location} must have a non-empty id.`);
    }
    if (ids.has(testCase.id)) {
      throw new Error(`Duplicate case id: ${testCase.id}`);
    }
    ids.add(testCase.id);

    if (typeof testCase.input !== "string" || !testCase.input.trim()) {
      throw new Error(`${location} "${testCase.id}" must have non-empty input.`);
    }
    validateChecks(testCase.checks, location, testCase.id);
  }

  return suite;
}

function validateChecks(checks, location, id) {
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) {
    throw new Error(`${location} "${id}" must define checks.`);
  }

  const supportedChecks = new Set(["includes", "excludes", "minLength", "maxLength"]);
  for (const name of Object.keys(checks)) {
    if (!supportedChecks.has(name)) {
      throw new Error(`${location} "${id}": unsupported check "${name}".`);
    }
  }

  for (const name of ["includes", "excludes"]) {
    if (checks[name] !== undefined &&
        (!Array.isArray(checks[name]) ||
         checks[name].some(value => typeof value !== "string" || !value.trim()))) {
      throw new Error(`${location} "${id}": checks.${name} must be an array of strings.`);
    }
  }

  for (const name of ["minLength", "maxLength"]) {
    if (checks[name] !== undefined &&
        (!Number.isInteger(checks[name]) || checks[name] < 0)) {
      throw new Error(`${location} "${id}": checks.${name} must be a non-negative integer.`);
    }
  }

  if (checks.minLength !== undefined &&
      checks.maxLength !== undefined &&
      checks.minLength > checks.maxLength) {
    throw new Error(`${location} "${id}": minLength cannot be greater than maxLength.`);
  }

  if (Object.keys(checks).length === 0 ||
      (checks.includes?.length ?? 0) + (checks.excludes?.length ?? 0) === 0 &&
      checks.minLength === undefined &&
      checks.maxLength === undefined) {
    throw new Error(`${location} "${id}" must have at least one check.`);
  }
}

export function evaluateResponse(response, checks) {
  const text = response.trim();
  const normalized = text.toLocaleLowerCase();
  const results = [];

  for (const phrase of checks.includes ?? []) {
    results.push({
      check: `includes "${phrase}"`,
      passed: normalized.includes(phrase.toLocaleLowerCase())
    });
  }

  for (const phrase of checks.excludes ?? []) {
    results.push({
      check: `excludes "${phrase}"`,
      passed: !normalized.includes(phrase.toLocaleLowerCase())
    });
  }

  if (checks.minLength !== undefined) {
    results.push({
      check: `at least ${checks.minLength} characters`,
      passed: text.length >= checks.minLength
    });
  }

  if (checks.maxLength !== undefined) {
    results.push({
      check: `at most ${checks.maxLength} characters`,
      passed: text.length <= checks.maxLength
    });
  }

  return results;
}

export async function runSuite(suite, { dryRun = false, request } = {}) {
  validateSuite(suite);
  if (!dryRun && typeof request !== "function") {
    throw new Error("A model request function is required outside dry-run mode.");
  }

  const results = [];
  for (const testCase of suite.cases) {
    if (dryRun && typeof testCase.dryRunResponse !== "string") {
      throw new Error(`Case "${testCase.id}" needs a dryRunResponse for dry-run mode.`);
    }

    const response = dryRun
      ? testCase.dryRunResponse
      : await request({ system: suite.system, input: testCase.input });
    if (typeof response !== "string") {
      throw new Error(`The model returned an invalid response for case "${testCase.id}".`);
    }

    const checks = evaluateResponse(response, testCase.checks);
    results.push({
      id: testCase.id,
      passed: checks.every(check => check.passed),
      checks,
      ...(dryRun ? {} : { response })
    });
  }

  return {
    suite: suite.name,
    mode: dryRun ? "dry-run" : "live",
    passed: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed).length,
    results
  };
}
