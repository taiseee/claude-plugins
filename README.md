# claude-plugins

Claude Code 用のプラグインを提供するマーケットプレイスです。マーケットプレイス名は `taisei-plugins` です。

| プラグイン | 内容 |
|---|---|
| [rewrite-final](plugins/rewrite-final) | 最終回答やファイル内の文章を `rewrite-agent` で読みやすく書き直す |

## rewrite-final

Claude の最終回答が保存される直前に、別の LLM（Command Code 経由の Gemini Flash）で読みやすく書き直します。書き直された内容は、画面表示、transcript、Claude 自身のコンテキストのすべてに反映されます。また、ファイルに書き込む文章についても、同様にこの CLI を使って書き直すよう Claude に徹底させます。

プラグインは以下の 3 つで構成されています。

- `hooks/register.ts`：Claude Code の mod（内部イベントに関数をフックする仕組み）です。1 行目が `<!--final-->` で始まる発話を検知すると、その目印を外した本文を `bin/rewrite-agent` に渡し、返ってきた文章に差し替えます。
- `bin/rewrite-agent`：文章を書き直す Python スクリプトです。プラグインが有効な間は、Bash ツールの PATH に追加されます。
- `skills/rewrite-agent/SKILL.md`：最終回答に目印を付けることや、ファイルに書いた文章を `rewrite-agent --replace-in` で書き直すことを Claude に指示するルール定義です。

### 必要なもの

- mod に対応した Claude Code
- Python 3
- [Command Code](https://commandcode.ai) の API キー（環境変数 `CMD_API_KEY` に設定するか、`commandcode login` を実行して `~/.commandcode/auth.json` を作成しておきます）

### インストール

```bash
claude plugin marketplace add taiseee/claude-plugins
```

```bash
claude plugin install rewrite-final@taisei-plugins
```

続いて、`~/.claude/CLAUDE.md` に次の 1 行を追加します。

```text
@~/.claude/plugins/marketplaces/taisei-plugins/plugins/rewrite-final/skills/rewrite-agent/SKILL.md
```

スキルは通常、Claude がタスクに適していると判断したときにのみ読み込まれます。しかし、本プラグインのルールは毎ターン適用する必要があるため、CLAUDE.md から `@` 参照で常時読み込ませています。`@` で指定したファイルは、セッション開始時に CLAUDE.md 内へ展開されます。なお、スキル一覧に同じ内容が重複して登録されないよう、SKILL.md 側には `disable-model-invocation: true` を指定しています。

参照パスには、プラグインのキャッシュ（`~/.claude/plugins/cache/`）ではなく、必ずマーケットプレイスのクローン先（`~/.claude/plugins/marketplaces/`）を指定してください。キャッシュのパスにはバージョン番号が含まれるため、プラグインを更新すると参照が切れてしまいます。

### 書き直しの対象外

- サブエージェントによる発話
- `claude -p` で実行した場合（目印を外すのみで、書き直しは行われません）
- 発話内に含まれる 2 つ目以降の text ブロック
- 書き直しに失敗した場合やタイムアウトした場合（目印を外した原文がそのまま残ります）

### 更新

```bash
claude plugin marketplace update taisei-plugins
```

```bash
claude plugin update rewrite-final@taisei-plugins
```

CLAUDE.md が参照するルール定義はマーケットプレイスのクローンから、mod はプラグインのキャッシュから読み込まれます。バージョンの不整合を防ぐため、上記 2 つのコマンドは必ず続けて実行してください。

## ライセンス

MIT
