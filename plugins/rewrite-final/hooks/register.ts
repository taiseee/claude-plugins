import type { Register } from 'claude-code'

// Claudeが最終回答の1行目に記載する目印
const MARK = '<!--final-->'

const isMarked = (text: string) => text.trimStart().startsWith(MARK)

export const register: Register = on => {
  // 保存の直前に、最終回答の行を書き直します。その際、transcript、モデルの文脈、画面のすべてが、書き直し後の本文となります。
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const i = e.message.content.findIndex(b => b.type === 'text')
    const block = e.message.content[i]
    if (e.agentId !== undefined || block?.type !== 'text' || !isMarked(block.text)) return next(e)
    const src = block.text.trimStart().slice(MARK.length).replace(/^\n+/, '')
    let text = src
    try {
      // `claude -p`（sdk-cli）では、目印を外す処理のみを行います。また、/bin/sh が存在しない Windows 環境でも動作するよう、シェルを経由せずに python3 から直接起動します。
      if ((await $.env.get('CLAUDE_CODE_ENTRYPOINT')) !== 'sdk-cli') {
        const r = await $.process.run(['python3', `${$.plugin.root}/bin/rewrite-agent`], { stdin: src, timeoutMs: 100_000 })
        if (r.exitCode === 0 && r.stdout.trim()) text = r.stdout.replace(/\n+$/, '')
      }
    } catch {} // 失敗やタイムアウトが発生した場合は、目印を外した状態の原文を残します。
    const content = e.message.content.map((b, j) => (j === i ? { ...block, text } : b))
    return next({ ...e, message: { ...e.message, content } })
  })

  // 書き直しが完了するまでの間は、目印を [rewriting] に置き換えて原文を表示します。保存後に書き直された内容で再描画されると、この表示は消えます。
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) =>
    isMarked(e.props.text)
      ? next({ ...e, props: { ...e.props, text: e.props.text.replace(MARK, '`[rewriting]`') } })
      : next(e),
  )
}
