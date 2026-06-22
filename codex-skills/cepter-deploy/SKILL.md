---
name: cepter-deploy
description: Deploy Cepter Prompt Atelier changes. Use when the user says "デプロイお願い", "GitHubに上げて", "Cloudflareに反映して", asks to publish card updates or site file changes, or wants GitHub commit/push plus Cloudflare Workers deployment for the Cepter Prompt Atelier project.
---

# Cepter Deploy

Use this skill to publish Cepter Prompt Atelier changes to GitHub and Cloudflare.

## Project

Default project folder:

`D:\ドキュメント\Obsidian\shunya_vault_pc\culdcept-ai-prompt-prototype-git-clean`

Deploy command:

```powershell
npx wrangler deploy --config wrangler.jsonc
```

Operational secrets:

- GitHub fine-grained token name: `Cepter Atelier Issue Bot`.
- Token expiry: `2026-09-20`.
- Before expiry, renew the token and update the Cloudflare runtime Secret `GITHUB_TOKEN`.

The helper script is:

```powershell
node .\scripts\deploy-to-github-cloudflare.cjs --message "Update Cepter Prompt Atelier"
```

## Workflow

1. Confirm the newest user request is actually asking for deployment.
2. Move to the project folder.
3. Validate before publishing:

```powershell
node --check .\public\app.js
node --check .\worker.js
node .\scripts\generate-card-assets.cjs
node .\scripts\generate-cards-html.cjs
```

4. Confirm the starter/owned book files were not accidentally changed unless the user explicitly requested it.
5. Use a git worktree.
   - If the current folder is not a git worktree, do not pretend deployment is complete.
   - Either use a real clone of the GitHub repository or ask the user to point Codex at the clone.
6. Run the helper:

```powershell
node .\scripts\deploy-to-github-cloudflare.cjs --message "Short commit message"
```

7. If Cloudflare deployment is handled by GitHub integration and direct Wrangler deploy is not desired, run:

```powershell
node .\scripts\deploy-to-github-cloudflare.cjs --message "Short commit message" --skip-cloudflare
```

8. Report:
   - Commit message.
   - Whether `git push` succeeded.
   - Whether `wrangler deploy` ran or was skipped.
   - Any URL that should be checked.

## GitHub Issue Requests

If the request came from `/admin-requests.html`, the Worker creates a GitHub Issue containing JSON. For deploy requests, extract the fenced JSON and use `reason` and `files` to choose the commit message and final summary.

## Safety Rules

- Never use `git reset --hard` or `git checkout --` to clean unrelated changes.
- Never deploy if validation fails.
- Never claim Cloudflare deployment succeeded unless the command/log confirms it.
- Keep unrelated local changes intact.
