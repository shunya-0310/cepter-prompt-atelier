---
name: cepter-card-update
description: Update Cepter Prompt Atelier card data. Use when the user says card information was added or corrected, asks to process a card update request from the admin page or GitHub Issue, says "カード更新して", "カード情報を更新して", or wants card TSVs, generated Markdown/HTML, and cache versions refreshed without changing user book/owned-card data.
---

# Cepter Card Update

Use this skill to update only the card master data for Cepter Prompt Atelier.

## Project

Default project folder:

`D:\ドキュメント\Obsidian\shunya_vault_pc\culdcept-ai-prompt-prototype-git-clean`

Important source files:

- `public/assets/carddata/*.tsv`: authoritative card master data.
- `public/assets/bookdata/*.txt`: initial owned cards and starter books. Do not edit these unless the user explicitly asks.
- `scripts/apply-card-updates.cjs`: deterministic card update script.
- `scripts/generate-card-assets.cjs`: regenerates AI Markdown and embedded data.
- `scripts/generate-cards-html.cjs`: regenerates `cards-begins.html`.

Operational secrets:

- GitHub fine-grained token name: `Cepter Atelier Issue Bot`.
- Token expiry: `2026-09-20`.
- Before expiry, renew the token and update the Cloudflare runtime Secret `GITHUB_TOKEN`.

## Workflow

1. Get the request.
   - If the user gives a GitHub Issue, read its body and extract the fenced JSON.
   - If the user pasted card info, convert it to the request JSON format shown below.
   - If the user created the request from `/admin-requests.html`, it should already contain JSON.
2. Save the request JSON or Issue body to a temp file inside the workspace, for example `temp/card-update-request.json`.
3. Run a dry run first:

```powershell
node .\scripts\apply-card-updates.cjs --request ..\temp\card-update-request.json --dry-run
```

4. If the dry run looks correct, run the real update:

```powershell
node .\scripts\apply-card-updates.cjs --request ..\temp\card-update-request.json
```

5. Validate:

```powershell
node --check .\public\app.js
node --check .\worker.js
node .\scripts\generate-card-assets.cjs
node .\scripts\generate-cards-html.cjs
```

6. Check that starter/owned data was not changed:

```powershell
node -e "const fs=require('fs'),path=require('path');for(const f of ['initial-owned.txt','starter-water-air.txt','starter-fire-earth.txt']){const lines=fs.readFileSync(path.join('public/assets/bookdata',f),'utf8').trim().split(/\r?\n/).slice(2);const total=lines.reduce((s,l)=>s+Number(l.split('\t')[1]||0),0);console.log(f,total,lines.length);}"
```

Expected totals unless the user explicitly requests otherwise:

- `initial-owned.txt`: 60 copies, 36 rows.
- `starter-water-air.txt`: 40 copies, 24 rows.
- `starter-fire-earth.txt`: 40 copies, 24 rows.

7. Summarize created/updated cards and validation results.
8. If the user also asked for deployment, use the `cepter-deploy` skill after this workflow.

## Request JSON

```json
{
  "type": "card-update",
  "versionLabel": "20260622-card-update",
  "updates": [
    {
      "operation": "upsert",
      "category": "creature",
      "name": "グーバクイーン",
      "element": "地",
      "kind": "",
      "rarity": "",
      "cost": "G30+地地",
      "at": "10",
      "hp": "40",
      "placement": "-",
      "usage": "-",
      "effect": "領地能力：選んだ空き地に「グーバ」を配置する(G20)"
    }
  ]
}
```

Notes:

- `category`: `creature`, `item`, or `spell`.
- For creatures, `element` selects the TSV file: `無`, `火`, `水`, `地`, `風`.
- `kind` is optional for creatures. If omitted, the script uses `element + rarity`.
- For spells and items, set `kind` when the type is known, for example `複瞬`, `武`, `防`.
- If cost contains `カード`, the script converts it to `□`.
- The script normalizes `ST` to `AT`.

## Safety Rules

- Never edit `public/assets/bookdata/*.txt` during a card-master update.
- Never manually rewrite generated files before updating the TSV source.
- Never deploy if validation fails.
- Preserve user-facing Japanese card text as provided unless the user asks for normalization.
