/**
 * text utils
 *
 * stripLeadingIcons: remove translated textorbefore titleused fordecorative's Emoji/symbol，
 * withforatin component selflineplace iconwhenno duplicateshow。
 */

/**
 * remove prefix'sdecorative Emoji/symbolwithand following'sdelimiter（space/colon/periodetc）。
 */
export function stripLeadingIcons(input: string | undefined | null): string {
  if (!input) return ''
  let s = String(input)

  // 1) remove common's Emoji/symbol block（arrow、miscsymbol、geometric shapes、emojietc）
  //    cover common ranges，better compatibility thanUse Unicode property class。
  s = s.replace(
    /^[\s\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\u1F000-\u1FAFF]+/u,
    ''
  )

  // 2) remove possible prefix'sdelimiter（space、hyphen、colon、alignindotetc）
  s = s.replace(/^[\s\-:•·]+/, '')

  return s.trim()
}

export default { stripLeadingIcons }
