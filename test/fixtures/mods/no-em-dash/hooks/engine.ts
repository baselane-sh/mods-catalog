import type { On, PluginOptions } from 'claude-code'

// One style rule: an id and the text it adds to the system prompt. A rule
// that depends on a userConfig value gives a function of the options.
export type StyleRule = {
  id: string
  section: string | ((options: PluginOptions) => string)
}

// The section id for a rule. A plugin's own id is `<plugin>:<name>`, so two
// style mods installed together never collide.
export const sectionId = (rule: StyleRule): string => `${rule.id}:style`

const textOf = (rule: StyleRule, options: PluginOptions): string =>
  typeof rule.section === 'function' ? rule.section(options) : rule.section

// Answers prompt.compose with everything the engine and the plugins beneath
// composed, plus one section per rule at the end. A section that already has
// the same id is replaced, so the ids in the list stay unique.
export const registerStyles = (on: On, rules: readonly StyleRule[], options: PluginOptions): void => {
  on('prompt.compose', async (_$, e, next) => {
    const { sections } = await next(e)
    const added = rules.map(rule => ({ id: sectionId(rule), text: textOf(rule, options), scope: 'session' as const }))
    const ids = new Set(added.map(section => section.id))
    return { sections: [...sections.filter(section => !ids.has(section.id)), ...added] }
  })
}
