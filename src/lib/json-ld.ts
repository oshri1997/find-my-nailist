/**
 * Serializes a value for embedding inside a <script type="application/ld+json">
 * tag.
 *
 * JSON.stringify alone is NOT safe here. It escapes quotes and backslashes,
 * but leaves "<" untouched — so a nailist whose business name contains
 * "</script><script>…" closes the tag from inside the JSON and runs whatever
 * follows, on every visitor's browser. The public profile and city pages both
 * embed names and bios their owners typed, which makes that stored XSS.
 *
 * Escaping to < keeps the document valid JSON — a reader still parses the
 * exact same string back out, so structured-data consumers are unaffected —
 * while the HTML parser never sees a tag. U+2028/U+2029 are escaped because
 * they are valid inside a JSON string but terminate a line in JavaScript.
 */

// Built from escape sequences rather than written as literal characters: two
// of these are line terminators, and a source file carrying them raw does not
// survive every parser it passes through.
const UNSAFE = new RegExp('[<>&\\u2028\\u2029]', 'g')

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  [String.fromCharCode(0x2028)]: '\\u2028',
  [String.fromCharCode(0x2029)]: '\\u2029',
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE, (char) => ESCAPES[char])
}
