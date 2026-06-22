const childProcess = require("child_process");

function usage() {
  console.log(`Usage:
  node scripts/deploy-to-github-cloudflare.cjs --message "Update site" [--skip-cloudflare]

This script expects the project folder to be a git worktree with a configured remote.
Cloudflare deployment uses: npx wrangler deploy --config wrangler.jsonc`);
}

function parseArgs(argv) {
  const args = { skipCloudflare: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--message") args.message = argv[++i];
    else if (token === "--skip-cloudflare") args.skipCloudflare = true;
    else if (token === "--help" || token === "-h") args.help = true;
  }
  return args;
}

function run(command, options = {}) {
  console.log(`$ ${command}`);
  return childProcess.execSync(command, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32" ? "powershell.exe" : true,
  });
}

function assertGitWorktree() {
  try {
    run("git rev-parse --is-inside-work-tree", { capture: true });
  } catch {
    throw new Error("This folder is not a git worktree. Clone the GitHub repository first, then run this script there.");
  }
}

function hasChanges() {
  const status = run("git status --porcelain", { capture: true });
  return status.trim().length > 0;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.message) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  assertGitWorktree();
  run("node --check public/app.js");
  run("node scripts/generate-card-assets.cjs");
  run("node scripts/generate-cards-html.cjs");

  if (!hasChanges()) {
    console.log("No git changes to deploy.");
  } else {
    run("git status --short");
    run("git add public worker.js wrangler.jsonc scripts README-GIT-DEPLOY.md");
    run(`git commit -m ${JSON.stringify(args.message)}`);
    run("git push");
  }

  if (!args.skipCloudflare) {
    run("npx wrangler deploy --config wrangler.jsonc");
  }
}

if (require.main === module) {
  main();
}
