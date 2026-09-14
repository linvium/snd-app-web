/**
 * Serbian has a 1:1 Cyrillic-Latin mapping. The UI is always latinica, so
 * Nominatim hits and older stored names get converted before they are shown.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: 'A',
  а: 'a',
  Б: 'B',
  б: 'b',
  В: 'V',
  в: 'v',
  Г: 'G',
  г: 'g',
  Д: 'D',
  д: 'd',
  Ђ: 'Đ',
  ђ: 'đ',
  Е: 'E',
  е: 'e',
  Ж: 'Ž',
  ж: 'ž',
  З: 'Z',
  з: 'z',
  И: 'I',
  и: 'i',
  Ј: 'J',
  ј: 'j',
  К: 'K',
  к: 'k',
  Л: 'L',
  л: 'l',
  Љ: 'Lj',
  љ: 'lj',
  М: 'M',
  м: 'm',
  Н: 'N',
  н: 'n',
  Њ: 'Nj',
  њ: 'nj',
  О: 'O',
  о: 'o',
  П: 'P',
  п: 'p',
  Р: 'R',
  р: 'r',
  С: 'S',
  с: 's',
  Т: 'T',
  т: 't',
  Ћ: 'Ć',
  ћ: 'ć',
  У: 'U',
  у: 'u',
  Ф: 'F',
  ф: 'f',
  Х: 'H',
  х: 'h',
  Ц: 'C',
  ц: 'c',
  Ч: 'Č',
  ч: 'č',
  Џ: 'Dž',
  џ: 'dž',
  Ш: 'Š',
  ш: 'š',
}

const DIGRAPH_UPPER = new Set(['Љ', 'Њ', 'Џ'])

function isUppercaseLetter(char: string | undefined): boolean {
  if (!char) return false
  return char !== char.toLowerCase()
}

export function toSerbianLatin(value: string): string {
  let result = ''

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const mapped = CYRILLIC_TO_LATIN[char]
    if (mapped === undefined) {
      result += char
      continue
    }

    if (DIGRAPH_UPPER.has(char) && isUppercaseLetter(value[index + 1])) {
      result += mapped.toUpperCase()
      continue
    }

    result += mapped
  }

  return result
}

export function toSerbianLatinOrNull(value: string | null | undefined): string | null {
  if (value == null) return null
  return toSerbianLatin(value)
}
