export interface CleaningOptions {
  removeHiddenChars: boolean;
  convertNonBreakingSpaces: boolean;
  normalizeDashes: boolean;
  normalizeQuotes: boolean;
  convertEllipsis: boolean;
  removeTrailingWhitespace: boolean;
  removeAsterisks: boolean;
  removeMarkdownHeadings: boolean;
}

export interface CleaningStats {
  hiddenChars: number;
  nonBreakingSpaces: number;
  dashesNormalized: number;
  quotesNormalized: number;
  ellipsesConverted: number;
  trailingWhitespace: number;
  asterisksRemoved: number;
  markdownHeadings: number;
  totalCleaned: number;
}

export const DEFAULT_OPTIONS: CleaningOptions = {
  removeHiddenChars: true,
  convertNonBreakingSpaces: true,
  normalizeDashes: true,
  normalizeQuotes: true,
  convertEllipsis: true,
  removeTrailingWhitespace: true,
  removeAsterisks: true,
  removeMarkdownHeadings: true,
};

export function cleanText(
  input: string,
  options: CleaningOptions
): { cleaned: string; stats: CleaningStats } {
  let text = input;
  const stats: CleaningStats = {
    hiddenChars: 0,
    nonBreakingSpaces: 0,
    dashesNormalized: 0,
    quotesNormalized: 0,
    ellipsesConverted: 0,
    trailingWhitespace: 0,
    asterisksRemoved: 0,
    markdownHeadings: 0,
    totalCleaned: 0,
  };

  if (options.removeHiddenChars) {
    const hiddenPattern =
      /[\u200B\u200C\u200D\uFEFF\u200E\u200F\u2028\u2029\u00AD\u034F\u061C\u180E\u2060\u2061\u2062\u2063\u2064\u2066\u2067\u2068\u2069\u206A\u206B\u206C\u206D\u206E\u206F]/g;
    const matches = text.match(hiddenPattern);
    stats.hiddenChars = matches ? matches.length : 0;
    text = text.replace(hiddenPattern, "");
  }

  if (options.convertNonBreakingSpaces) {
    const nbspPattern = /\u00A0/g;
    const matches = text.match(nbspPattern);
    stats.nonBreakingSpaces = matches ? matches.length : 0;
    text = text.replace(nbspPattern, " ");
  }

  if (options.normalizeDashes) {
    const dashPattern = /[\u2013\u2014\u2015]/g;
    const matches = text.match(dashPattern);
    stats.dashesNormalized = matches ? matches.length : 0;
    text = text.replace(dashPattern, "-");
  }

  if (options.normalizeQuotes) {
    const smartSinglePattern = /[\u2018\u2019\u201A\u201B]/g;
    const smartDoublePattern = /[\u201C\u201D\u201E\u201F]/g;
    const singleMatches = text.match(smartSinglePattern);
    const doubleMatches = text.match(smartDoublePattern);
    stats.quotesNormalized =
      (singleMatches ? singleMatches.length : 0) +
      (doubleMatches ? doubleMatches.length : 0);
    text = text.replace(smartSinglePattern, "'");
    text = text.replace(smartDoublePattern, '"');
  }

  if (options.convertEllipsis) {
    const ellipsisPattern = /\u2026/g;
    const matches = text.match(ellipsisPattern);
    stats.ellipsesConverted = matches ? matches.length : 0;
    text = text.replace(ellipsisPattern, "...");
  }

  if (options.removeTrailingWhitespace) {
    const trailingPattern = /[ \t]+$/gm;
    const matches = text.match(trailingPattern);
    stats.trailingWhitespace = matches
      ? matches.reduce((sum, m) => sum + m.length, 0)
      : 0;
    text = text.replace(trailingPattern, "");
  }

  if (options.removeAsterisks) {
    const asteriskPattern = /\*/g;
    const matches = text.match(asteriskPattern);
    stats.asterisksRemoved = matches ? matches.length : 0;
    text = text.replace(asteriskPattern, "");
  }

  if (options.removeMarkdownHeadings) {
    const headingPattern = /^#{1,6}\s+/gm;
    const matches = text.match(headingPattern);
    stats.markdownHeadings = matches ? matches.length : 0;
    text = text.replace(headingPattern, "");
  }

  stats.totalCleaned =
    stats.hiddenChars +
    stats.nonBreakingSpaces +
    stats.dashesNormalized +
    stats.quotesNormalized +
    stats.ellipsesConverted +
    stats.trailingWhitespace +
    stats.asterisksRemoved +
    stats.markdownHeadings;

  return { cleaned: text, stats };
}
