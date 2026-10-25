import { WOOD_OPTIONS, FINISH_OPTIONS, canonicalWood } from '../geometry/materials.js'

// What the pattern library's search box and the command palette look in for a pattern:
//   • its name                                   (a hit here counts most)
//   • for a custom pattern, the name of the built-in shape it is based on
//     (a custom pattern stores that shape's id, so the name is looked up from the built-ins)
//   • its wood and finish ("walnut", "oiled")
// `builtIns` is the list of built-in patterns the base names are looked up in.
export function patternFields(pattern, builtIns) {
  const sp = pattern.stripProperties?.[0]
  const base = pattern.readOnly ? null : builtIns.find((b) => b.id === pattern.basePatternId)?.name
  const fields = [{ text: pattern.name, weight: 1 }]
  if (base && base !== pattern.name) fields.push({ text: base, weight: 0.8 })
  if (sp?.material) fields.push({ text: WOOD_OPTIONS.find((o) => o.id === canonicalWood(sp.material))?.label ?? sp.material, weight: 0.5 })
  if (sp?.finish) fields.push({ text: FINISH_OPTIONS.find((o) => o.id === sp.finish)?.label ?? sp.finish, weight: 0.4 })
  return fields
}
