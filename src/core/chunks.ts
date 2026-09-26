/**
 * 규칙 데이터를 검색 단위(청크)로 쪼갠다.
 *
 * 청크마다 "어느 규칙의 어느 칸에서 나왔는지"를 달고 다닌다. 그래야 답변에
 * 출처와 확인일을 붙일 수 있다. 출처를 못 다는 답은 이 제품이 하지 않기로 한 것이다.
 */
import type { Lang, Rule, RuleBundle } from './types'

export type ChunkField =
  | 'title'
  | 'summary'
  | 'terms'
  | 'step'
  | 'document'
  | 'caution'
  | 'deadline'
  | 'requires'
  | 'contact'

export interface Chunk {
  id: string
  ruleId: string
  field: ChunkField
  /** 화면에 그대로 보여 줄 문장. 언어별로 따로 만들지 않고 세 언어를 한 청크에 담는다. */
  text: Record<Lang, string>
  /** 검색에 쓰는 문자열. 세 언어를 합쳐 두면 어느 언어로 물어도 같은 청크가 걸린다. */
  haystack: string
}

const LANGS: Lang[] = ['ko', 'en', 'vi']
const joinAll = (v: Record<Lang, string>) => LANGS.map((l) => v[l]).join(' ')

function push(out: Chunk[], ruleId: string, field: ChunkField, i: number, text: Record<Lang, string>) {
  out.push({ id: `${ruleId}:${field}:${i}`, ruleId, field, text, haystack: joinAll(text) })
}

export function chunksOf(rule: Rule): Chunk[] {
  const out: Chunk[] = []
  push(out, rule.id, 'title', 0, rule.title)
  push(out, rule.id, 'summary', 0, rule.summary)

  // 용어는 세 언어가 한 줄에 같이 있어서 언어를 건너뛴 질문("ARC가 뭐야")을 잡아 준다.
  rule.terms.forEach((t, i) => push(out, rule.id, 'terms', i, t))
  rule.steps.forEach((s, i) => push(out, rule.id, 'step', i, s))
  rule.documents.forEach((d, i) =>
    push(out, rule.id, 'document', i, { ko: d.ko, en: d.en, vi: d.vi }),
  )
  rule.cautions?.forEach((c, i) => push(out, rule.id, 'caution', i, c))
  rule.contacts?.forEach((c, i) => push(out, rule.id, 'contact', i, c))
  if (rule.deadline?.note) push(out, rule.id, 'deadline', 0, rule.deadline.note)
  if (rule.requires_note) push(out, rule.id, 'requires', 0, rule.requires_note)
  return out
}

export function allChunks(bundle: RuleBundle): Chunk[] {
  return bundle.rules.flatMap(chunksOf)
}
