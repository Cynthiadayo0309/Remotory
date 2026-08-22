import { AI_SOURCE_MAX_CHARS } from "@/server/ai/constants";

const LEADING_CONTEXT_CHARS = 2_000;
const MATCH_CONTEXT_BEFORE_CHARS = 700;
const MATCH_CONTEXT_AFTER_CHARS = 1_100;
const EXCERPT_SEPARATOR = "\n…\n";

const RELEVANT_TERM_PATTERN =
  /フルリモート|リモートワーク|リモート勤務|在宅勤務|勤務地|勤務場所|居住地|地域制限|全国|出社|出勤|オフィス|通勤|採用|募集|求人|応募|remote|work\s+from\s+home|work\s+location|office|hiring|recruit/giu;

interface TextRange {
  start: number;
  end: number;
}

export interface PreparedAiSourceText {
  text: string;
  originalChars: number;
  truncated: boolean;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];

  for (const range of sorted) {
    const previous = merged.at(-1);

    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

export function prepareAiSourceText(
  normalizedText: string,
  maxChars = AI_SOURCE_MAX_CHARS,
): PreparedAiSourceText {
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new RangeError("maxChars must be a positive integer");
  }

  if (normalizedText.length <= maxChars) {
    return {
      text: normalizedText,
      originalChars: normalizedText.length,
      truncated: false,
    };
  }

  const ranges: TextRange[] = [
    { start: 0, end: Math.min(LEADING_CONTEXT_CHARS, normalizedText.length) },
  ];

  for (const match of normalizedText.matchAll(RELEVANT_TERM_PATTERN)) {
    const matchStart = match.index;
    ranges.push({
      start: Math.max(0, matchStart - MATCH_CONTEXT_BEFORE_CHARS),
      end: Math.min(
        normalizedText.length,
        matchStart + match[0].length + MATCH_CONTEXT_AFTER_CHARS,
      ),
    });
  }

  const selected: string[] = [];
  let remaining = maxChars;

  for (const range of mergeRanges(ranges)) {
    const separator = selected.length === 0 ? "" : EXCERPT_SEPARATOR;
    if (remaining <= separator.length) break;

    const available = remaining - separator.length;
    const excerpt = normalizedText
      .slice(range.start, range.end)
      .slice(0, available);

    selected.push(`${separator}${excerpt}`);
    remaining -= separator.length + excerpt.length;
    if (remaining === 0) break;
  }

  return {
    text: selected.join(""),
    originalChars: normalizedText.length,
    truncated: true,
  };
}
