/**
 * ================================================================
 * SODAH — NEXT.JS PRODUCTION BUILD
 * ================================================================
 *
 * Purpose:
 *   Run the Next.js production build reliably on Windows.
 *
 * Fixes:
 *   1. Windows spawnSync next.cmd EINVAL
 *   2. Node.js heap out-of-memory during Next.js type checking
 *   3. Keeps Next.js worker threads disabled
 *   4. Gives the Next.js build process 6 GB heap
 * ================================================================
 */

const { spawnSync } = require("child_process");
const path = require("path");

console.log("");
console.log("================================================");
console.log(" SODAH — NEXT.JS PRODUCTION BUILD");
console.log("================================================");
console.log("");

/**
 * ---------------------------------------------------------------
 * CONFIGURATION
 * ---------------------------------------------------------------
 */

/*
 * Disable Next.js private worker threads.
 *
 * This reduces memory pressure during production builds.
 */
const NEXT_PRIVATE_WORKER_THREADS = "false";

/*
 * Give Node.js 6 GB heap.
 *
 * The default Node.js heap on your machine is reaching roughly
 * 2 GB, which is why the build crashes during type checking.
 *
 * 6144 MB = 6 GB
 */
const NODE_MAX_OLD_SPACE_SIZE = "6144";

/**
 * ---------------------------------------------------------------
 * ENVIRONMENT
 * ---------------------------------------------------------------
 */

const env = {
  ...process.env,

  NEXT_PRIVATE_WORKER_THREADS,

  NODE_OPTIONS: [
    process.env.NODE_OPTIONS || "",
    `--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}`,
  ]
    .filter(Boolean)
    .join(" "),
};

console.log(
  `[Sodah Build] NEXT_PRIVATE_WORKER_THREADS = ${NEXT_PRIVATE_WORKER_THREADS}`
);

console.log(
  `[Sodah Build] NODE_OPTIONS = ${env.NODE_OPTIONS}`
);

console.log("");

/**
 * ---------------------------------------------------------------
 * RESOLVE NEXT.JS CLI
 * ---------------------------------------------------------------
 *
 * We intentionally launch Next.js through the current Node
 * executable instead of spawning next.cmd directly.
 *
 * This avoids the Windows:
 *
 *   spawnSync next.cmd EINVAL
 *
 * error.
 * ---------------------------------------------------------------
 */

const nextCli = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

console.log(
  `[Sodah Build] Next.js CLI: ${nextCli}`
);

console.log("");

/**
 * ---------------------------------------------------------------
 * VERIFY NEXT.JS CLI
 * ---------------------------------------------------------------
 */

const fs = require("fs");

if (!fs.existsSync(nextCli)) {
  console.error(
    "[Sodah Build] ERROR: Next.js CLI was not found:"
  );

  console.error(nextCli);

  console.error("");

  console.error(
    "[Sodah Build] Run:"
  );

  console.error(
    "npm install"
  );

  process.exit(1);
}

/**
 * ---------------------------------------------------------------
 * START NEXT.JS BUILD
 * ---------------------------------------------------------------
 */

console.log(
  "[Sodah Build] Starting Next.js production build..."
);

console.log("");

const result = spawnSync(
  process.execPath,
  [
    nextCli,
    "build",
  ],
  {
    cwd: process.cwd(),

    env,

    stdio: "inherit",

    windowsHide: false,
  }
);

/**
 * ---------------------------------------------------------------
 * HANDLE SPAWN ERROR
 * ---------------------------------------------------------------
 */

if (result.error) {
  console.error("");

  console.error(
    "[Sodah Build] Failed to start Next.js:"
  );

  console.error(result.error);

  console.error("");

  process.exit(1);
}

/**
 * ---------------------------------------------------------------
 * HANDLE EXIT CODE
 * ---------------------------------------------------------------
 */

const exitCode =
  typeof result.status === "number"
    ? result.status
    : 1;

if (exitCode !== 0) {
  console.error("");

  console.error(
    `[Sodah Build] Next.js build failed with exit code ${exitCode}.`
  );

  console.error("");

  /*
   * Give a useful message if the process was killed.
   */
  if (result.signal) {
    console.error(
      `[Sodah Build] Next.js process terminated by signal: ${result.signal}`
    );

    console.error("");
  }

  process.exit(exitCode);
}

/**
 * ---------------------------------------------------------------
 * SUCCESS
 * ---------------------------------------------------------------
 */

console.log("");

console.log(
  "================================================"
);

console.log(
  " SODAH — PRODUCTION BUILD COMPLETE"
);

console.log(
  "================================================"
);

console.log("");

process.exit(0);