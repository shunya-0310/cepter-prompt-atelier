# Cepter Prompt Atelier Git Deploy

このフォルダはCloudflare WorkersのGit連携デプロイ用です。
DashboardのDirect Upload用フォルダとは分けています。

## 狙い

Git連携版では、生成プロンプト本文を短くし、AIが読むべき情報をDossier URLに集約します。

```text
https://cepter-atelier.com/ai/dossier/<token>.md
```

このURLはWorkerがMarkdownを直接返します。
Dossierには以下を含めます。

- 相談内容
- ブック内カード
- 所持している未採用候補カード
- ユーザーのストラテジー
- 基本ルールと評価軸の要約
- 秘蔵ナレッジ
- 公開ナレッジ

## Cloudflare Workers 設定

このリポジトリは `wrangler.jsonc` を使って、Workers + Static Assetsとしてデプロイします。

- Build command: 空欄
- Deploy command: `npx wrangler deploy --config wrangler.jsonc`
- Root directory: リポジトリ直下
- Static assets directory: `public` (`wrangler.jsonc` の `assets.directory`)
- Worker entry: `worker.js`

`functions/` ディレクトリは、Pages Functions用の旧構成です。
現在のCloudflare側が `npx wrangler deploy` を実行している場合、動的URLは `worker.js` が担当します。
GitHub上に古い `functions/` が残っていても、`wrangler.jsonc` が正しく読まれていれば使われません。

## 主な動的URL

- `/ai/dossier/<token>.md`
  - 共有コンテキストを読み、公開ナレッジを追記したMarkdownを返します。
- `/ai/knowledge/public.md`
  - 公開ナレッジだけをMarkdownで返します。

## ユーザーに見せるURL

`*.workers.dev` はCloudflareの仮URLです。
アカウントサブドメインが入るため、公開導線や生成プロンプトでは使いません。

本番ではWorkerにカスタムドメインを割り当てます。

```text
https://cepter-atelier.com/
```

Cloudflare Dashboardでは、Workerの `Settings > Domains & Routes` から `cepter-atelier.com` をCustom Domainとして追加します。
カスタムドメインで動作確認できたら、同じ画面で `workers.dev` をDisableしておくと、仮URLを表に出しにくくできます。

## 環境変数

未設定でも公開anon keyのデフォルト値で動きます。
運用ではCloudflare WorkersのVariablesに以下を設定できます。

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 管理ページと自動化依頼

スマホからCodex向けの更新依頼を作るため、以下の管理ページを用意しています。

```text
https://cepter-atelier.com/admin-requests.html
```

このページは、カード更新依頼やデプロイ依頼をGitHub Issueとして登録します。
フロントエンドにはGitHub tokenを置かず、Worker側の環境変数で保護します。

Cloudflare WorkersのVariables/Secretsに以下を設定してください。

- `CEPTER_ADMIN_KEY`: 管理ページから送る合言葉。長いランダム文字列にする。
- `GITHUB_TOKEN`: GitHub Issueを作成できるfine-grained token。
- `GITHUB_REPO`: Issueを作成するリポジトリ。例: `owner/repository`

Codex側では以下のSkillを使います。

- `cepter-card-update`: カード更新依頼をTSVへ反映し、Markdown/HTMLを再生成する。
- `cepter-deploy`: GitHubへの反映とCloudflareデプロイを行う。

## デプロイ後の確認

1. GitHubに `wrangler.jsonc`、`worker.js`、`public/` が入っていることを確認する。
2. CloudflareのDeploy commandを `npx wrangler deploy --config wrangler.jsonc` にする。
3. CloudflareのDeploymentsで再デプロイが成功していることを確認する。
4. ビルドログに `Create wrangler.jsonc` が出ていないことを確認する。
5. `https://cepter-atelier.com/ai/knowledge/public.md` を開き、Markdown本文が表示されることを確認する。
6. トップページを開く。
7. `プロンプト生成` を押す。
8. 生成されたプロンプトのDossier URLが `/ai/dossier/<token>.md` になっていることを確認する。
9. Dossier URLをブラウザで開き、Markdown本文が表示されることを確認する。
10. ChatGPTなどに短いプロンプトを投げ、Dossier内容を取得できるか確認する。
