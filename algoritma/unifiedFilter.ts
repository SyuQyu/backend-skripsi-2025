import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';
import { getCommonWords } from '../queries/commonWords.queries';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// Cache untuk menyimpan tabel Boyer-Moore yang sudah dihitung
const badCharCache = new Map<string, Record<string, number>>();

/**
 * Unified text filtering function that can run all algorithm variations:
 * - Basic Boyer-Moore
 * - Boyer-Moore with normalization
 * - Boyer-Moore with fuzzy regex
 * - Full implementation (BM + normalization + fuzzy + AI paraphrase)
 * 
 * @param text Text to filter
 * @param options Configuration options to enable/disable features
 * @returns Results of all enabled filtering methods with metrics
 */
export async function unifiedTextFilter(
    text: string,
    options: {
        trueBadWords?: string[];           // Ground truth bad words for evaluation
        useNormalization?: boolean;        // Enable character normalization (0->o, 1->i, etc.)
        useFuzzyMatching?: boolean;        // Enable fuzzy regex matching
        useAIParaphrase?: boolean;         // Enable AI paraphrasing
        disableAccuracy?: boolean;         // Skip accuracy calculations (for performance)
        runAllMethods?: boolean;           // Run all methods and compare results
    } = {}
) {
    const startTime = performance.now();

    // Default options
    const {
        trueBadWords = [],
        useNormalization = true,
        useFuzzyMatching = true,
        useAIParaphrase = true,
        disableAccuracy = false,
        runAllMethods = false
    } = options;

    // Get bad words from database
    const badWords = await getBadWordsFromDB();
    // Get common words that might cause false positives
    const commonWordsSet = await getCommonWordsSet();

    // Store results for each method if comparing all
    const allResults: any = {};

    // If running all methods, execute each one independently
    if (runAllMethods) {
        // Method 1: Only Boyer-Moore (basic)
        allResults.onlyBM = await runBoyerMooreOnly(text, badWords, commonWordsSet, trueBadWords, disableAccuracy);

        // Method 2: Boyer-Moore with normalization
        allResults.withNormalization = await runBoyerMooreNormalized(text, badWords, commonWordsSet, trueBadWords, disableAccuracy);

        // Method 3: Boyer-Moore with fuzzy
        allResults.withFuzzy = await runBoyerMooreFuzzy(text, badWords, commonWordsSet, trueBadWords, disableAccuracy);

        // Method 4: Fuzzy regex with normalization (no Boyer-Moore)
        allResults.fuzzyRegexWithNorm = await runFuzzyRegexWithNormalization(text, badWords, commonWordsSet, trueBadWords, disableAccuracy);

        // Method 5: Fuzzy regex only (no normalization, no common words)
        allResults.fuzzyRegexOnly = await runFuzzyRegexPure(text, badWords, trueBadWords, disableAccuracy);

        // Method 6: Full implementation 
        allResults.full = await runFullImplementation(text, badWords, commonWordsSet, trueBadWords, disableAccuracy, true);

        // Return comparison of all methods
        return {
            original: text,
            methods: {
                onlyBM: allResults.onlyBM,
                withNormalization: allResults.withNormalization,
                withFuzzy: allResults.withFuzzy,
                fuzzyRegexWithNorm: allResults.fuzzyRegexWithNorm,
                fuzzyRegexOnly: allResults.fuzzyRegexOnly,
                full: allResults.full
            },
            comparison: generateComparison(allResults, text, trueBadWords)
        };
    }

    // Otherwise run the configured method based on options
    return await runFullImplementation(
        text,
        badWords,
        commonWordsSet,
        trueBadWords,
        disableAccuracy,
        useAIParaphrase,
        useNormalization,
        useFuzzyMatching
    );
}

/**
 * Run the basic Boyer-Moore implementation
 */
async function runBoyerMooreOnly(
    text: string,
    badWords: Record<string, string>,
    commonWordsSet: Set<string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false
) {
    const startTime = performance.now();

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];

    // Run direct Boyer-Moore without normalization or fuzzy matching
    for (const pattern in badWords) {
        if (pattern.length < 2) continue;

        const replacement = badWords[pattern];
        // Simple direct pattern matching
        const regex = new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'i');
        let match;
        let searchText = text;
        let offset = 0;

        while ((match = regex.exec(searchText)) !== null) {
            const start = match.index + offset;
            const end = start + match[0].length;
            const rawWord = match[0];

            // Skip if common word and might be false positive
            if (commonWordsSet.has(pattern) && pattern.length <= 3) {
                // Continue searching in remaining text
                searchText = searchText.substring(match.index + match[0].length);
                offset += match.index + match[0].length;
                continue;
            }

            matches.push({
                original: pattern,
                replacement,
                start,
                end,
                rawWord
            });

            // Continue searching in remaining text
            searchText = searchText.substring(match.index + match[0].length);
            offset += match.index + match[0].length;
        }
    }

    // Sort matches by position and remove overlaps
    const filtered = removeOverlappingMatches(matches);

    // Apply replacements
    const { filteredText, replacedPositions } = applyReplacements(text, filtered);

    // Calculate metrics if needed
    const metrics = disableAccuracy ? undefined :
        calculateMetrics(filtered, text, trueBadWords);

    const endTime = performance.now();

    return {
        method: "Boyer-Moore Basic",
        status: 'success',
        original: text,
        filteredWords: filtered.map(f => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord
        })),
        filtered: filteredText,
        filteredText: filteredText,
        bannedWords: filtered.map(f => f.original),
        replacementWords: filtered.map(f => f.replacement),
        durationMs: Math.round(endTime - startTime),
        totalDetectedCount: filtered.length,
        ...metrics
    };
}

/**
 * Run Boyer-Moore with normalization
 */
async function runBoyerMooreNormalized(
    text: string,
    badWords: Record<string, string>,
    commonWordsSet: Set<string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false
) {
    const startTime = performance.now();

    // Normalize text and map to original positions
    const { normalized: normalizedText, mapping: normToOrig } = getNormalizationMapping(text);

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];

    // Run Boyer-Moore on normalized text
    for (const pattern in badWords) {
        // Skip very short patterns to avoid false positives
        if (pattern.length < 2) continue;

        const replacement = badWords[pattern];
        const normalizedPattern = normalizeWord(pattern);

        const bmMatches = boyerMooreSearch(
            normalizedText,
            text,
            normToOrig,
            normalizedPattern,
            commonWordsSet
        );

        for (const match of bmMatches) {
            // Extra verification to prevent false positives
            if (!verifyMatch(match.rawWord, normalizedPattern, commonWordsSet)) continue;

            matches.push({
                original: pattern,
                replacement,
                start: match.start,
                end: match.end,
                rawWord: match.rawWord
            });
        }
    }

    // Sort matches by position and remove overlaps
    const filtered = removeOverlappingMatches(matches);

    // Apply replacements
    const { filteredText, replacedPositions } = applyReplacements(text, filtered);

    // Calculate metrics if needed
    const metrics = disableAccuracy ? undefined :
        calculateMetrics(filtered, text, trueBadWords);

    const endTime = performance.now();

    return {
        method: "Boyer-Moore with Normalization",
        status: 'success',
        original: text,
        filteredWords: filtered.map(f => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord
        })),
        filtered: filteredText,
        filteredText: filteredText,
        bannedWords: filtered.map(f => f.original),
        replacementWords: filtered.map(f => f.replacement),
        durationMs: Math.round(endTime - startTime),
        totalDetectedCount: filtered.length,
        ...metrics
    };
}

/**
 * Run Boyer-Moore with fuzzy regex matching
 */
async function runBoyerMooreFuzzy(
    text: string,
    badWords: Record<string, string>,
    commonWordsSet: Set<string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false
) {
    const startTime = performance.now();

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];

    // Tokenize text to words
    const wordRegex = /\b\w+\b/g;
    const tokens: { token: string; start: number; end: number }[] = [];
    let m;

    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({
            token: m[0],
            start: m.index,
            end: m.index + m[0].length
        });
    }

    // Check each token against fuzzy patterns
    const checkedFuzzyKeys = new Set<string>();

    for (const pattern in badWords) {
        // Fuzzy search only for longer patterns
        if (pattern.length < 4) continue;
        // Skip common words as they cause many false positives
        if (commonWordsSet.has(pattern)) continue;

        const replacement = badWords[pattern];
        const fuzzyRx = buildFuzzyRegex(pattern);

        for (const { token, start, end } of tokens) {
            // Skip if token already matched by another pattern
            if (matches.some(m => m.start <= start && m.end >= end)) continue;

            const key = `${pattern}@${start}`;
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key);

            // Skip if token is too short
            if (token.length < pattern.length) continue;

            if (fuzzyRx.test(token)) {
                // Extra verification to prevent false positives
                if (!verifyMatch(token, pattern, commonWordsSet)) continue;

                matches.push({
                    original: pattern,
                    replacement,
                    start,
                    end,
                    rawWord: token
                });
            }
        }
    }

    // Sort matches by position and remove overlaps
    const filtered = removeOverlappingMatches(matches);

    // Apply replacements
    const { filteredText, replacedPositions } = applyReplacements(text, filtered);

    // Calculate metrics if needed
    const metrics = disableAccuracy ? undefined :
        calculateMetrics(filtered, text, trueBadWords);

    const endTime = performance.now();

    return {
        method: "Boyer-Moore with Fuzzy Matching",
        status: 'success',
        original: text,
        filteredWords: filtered.map(f => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord
        })),
        filtered: filteredText,
        filteredText: filteredText,
        bannedWords: filtered.map(f => f.original),
        replacementWords: filtered.map(f => f.replacement),
        durationMs: Math.round(endTime - startTime),
        totalDetectedCount: filtered.length,
        ...metrics
    };
}

/**
 * Run full implementation with all features
 */
async function runFullImplementation(
    text: string,
    badWords: Record<string, string>,
    commonWordsSet: Set<string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false,
    useAIParaphrase: boolean = true,
    useNormalization: boolean = true,
    useFuzzyMatching: boolean = true
) {
    const startTime = performance.now();

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];

    // Normalize text if enabled
    const normalizedData = useNormalization ?
        getNormalizationMapping(text) :
        { normalized: text, mapping: Array.from({ length: text.length }, (_, i) => i) };

    const { normalized: normalizedText, mapping: normToOrig } = normalizedData;

    // Tokenize text to words
    const wordRegex = /\b\w+\b/g;
    const tokens: { token: string; start: number; end: number }[] = [];
    let m;

    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({
            token: m[0],
            start: m.index,
            end: m.index + m[0].length
        });
    }

    // Step 1: Boyer-Moore on normalized text (if normalization enabled)
    if (useNormalization) {
        for (const pattern in badWords) {
            // Skip very short patterns to avoid false positives
            if (pattern.length < 2) continue;

            const replacement = badWords[pattern];
            const normalizedPattern = normalizeWord(pattern);

            const bmMatches = boyerMooreSearch(
                normalizedText,
                text,
                normToOrig,
                normalizedPattern,
                commonWordsSet
            );

            for (const match of bmMatches) {
                // Extra verification to prevent false positives
                if (!verifyMatch(match.rawWord, normalizedPattern, commonWordsSet)) continue;

                matches.push({
                    original: pattern,
                    replacement,
                    start: match.start,
                    end: match.end,
                    rawWord: match.rawWord
                });
            }
        }
    } else {
        // Direct Boyer-Moore without normalization
        for (const pattern in badWords) {
            if (pattern.length < 2) continue;

            const replacement = badWords[pattern];
            // Simple direct pattern matching
            const regex = new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'i');
            let match;
            let searchText = text;
            let offset = 0;

            while ((match = regex.exec(searchText)) !== null) {
                const start = match.index + offset;
                const end = start + match[0].length;
                const rawWord = match[0];

                // Skip if common word and might be false positive
                if (commonWordsSet.has(pattern) && pattern.length <= 3) continue;

                matches.push({
                    original: pattern,
                    replacement,
                    start,
                    end,
                    rawWord
                });

                // Continue searching in remaining text
                searchText = searchText.substring(match.index + match[0].length);
                offset += match.index + match[0].length;
            }
        }
    }

    // Step 2: Fuzzy matching if enabled
    if (useFuzzyMatching) {
        const checkedFuzzyKeys = new Set<string>();

        for (const pattern in badWords) {
            // Fuzzy search only for longer patterns
            if (pattern.length < 4) continue;
            // Skip common words as they cause many false positives
            if (commonWordsSet.has(pattern)) continue;

            const replacement = badWords[pattern];
            const fuzzyRx = buildFuzzyRegex(pattern);

            for (const { token, start, end } of tokens) {
                // Skip if token already matched by another pattern
                if (matches.some(m => m.start <= start && m.end >= end)) continue;

                const key = `${pattern}@${start}`;
                if (checkedFuzzyKeys.has(key)) continue;
                checkedFuzzyKeys.add(key);

                const normalizedToken = useNormalization ? normalizeWord(token) : token.toLowerCase();

                // Skip if token is too short
                if (normalizedToken.length < pattern.length) continue;

                if (fuzzyRx.test(normalizedToken)) {
                    // Extra verification to prevent false positives
                    if (!verifyMatch(token, pattern, commonWordsSet)) continue;

                    matches.push({
                        original: pattern,
                        replacement,
                        start,
                        end,
                        rawWord: token
                    });
                }
            }
        }
    }

    // Sort matches by position and remove overlaps
    const filtered = removeOverlappingMatches(matches);

    // Apply replacements
    const { filteredText, replacedPositions } = applyReplacements(text, filtered);

    // AI paraphrase results if enabled and if bad words were found
    let paraphrased = false;
    let paraphrasedResult = filteredText;

    if (useAIParaphrase && filtered.length > 0) {
        try {
            // Extract sentences containing bad words
            const sentencePositions = extractSentencePositions(filteredText, replacedPositions);

            // Paraphrase each sentence
            const { paraphrasedText, success } = await paraphraseSentences(filteredText, sentencePositions);

            if (success) {
                paraphrasedResult = paraphrasedText;
                paraphrased = true;
            }
        } catch (error) {
            console.error('Error during paraphrasing:', error);
            paraphrased = false;
        }
    }

    // Calculate metrics if needed
    const metrics = disableAccuracy ? undefined :
        calculateMetrics(filtered, text, trueBadWords);

    const endTime = performance.now();

    return {
        method: "Full Implementation (BM + Normalization + Fuzzy + AI)",
        status: 'success',
        original: text,
        filteredWords: filtered.map(f => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord
        })),
        filtered: paraphrasedResult,
        filteredText: paraphrasedResult,
        filteredBeforeAI: filteredText,
        filteredAI: paraphrasedResult,
        bannedWords: filtered.map(f => f.original),
        replacementWords: filtered.map(f => f.replacement),
        durationMs: Math.round(endTime - startTime),
        totalDetectedCount: filtered.length,
        paraphrased,
        ...metrics
    };
}

/**
 * Fuzzy Regex + Normalisasi (tanpa Boyer-Moore)
 */
async function runFuzzyRegexWithNormalization(
    text: string,
    badWords: Record<string, string>,
    commonWordsSet: Set<string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false
) {
    const startTime = performance.now();

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];
    const wordRegex = /\b\w+\b/g;
    const tokens: { token: string; start: number; end: number }[] = [];
    let m;

    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({
            token: m[0],
            start: m.index,
            end: m.index + m[0].length
        });
    }

    const checkedFuzzyKeys = new Set<string>();
    for (const pattern in badWords) {
        if (pattern.length < 4) continue;
        if (commonWordsSet.has(pattern)) continue;
        const replacement = badWords[pattern];
        const fuzzyRx = buildFuzzyRegex(pattern);
        for (const { token, start, end } of tokens) {
            if (matches.some((m) => m.start <= start && m.end >= end)) continue;
            const key = `${pattern}@${start}`;
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key);
            const normalizedToken = normalizeWord(token);
            if (normalizedToken.length < pattern.length) continue;
            if (fuzzyRx.test(normalizedToken)) {
                if (!verifyMatch(token, pattern, commonWordsSet)) continue;
                matches.push({ original: pattern, replacement, start, end, rawWord: token });
            }
        }
    }

    // Hapus overlap match, hanya ambil yang pertama
    matches.sort((a, b) => a.start - b.start);
    const filtered: Match[] = [];
    let lastEnd = -1;
    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m);
            lastEnd = m.end;
        }
    }

    // Membuat teks hasil filter dengan penggantian kata
    let result = '';
    let idx = 0;
    for (const f of filtered) {
        result += text.slice(idx, f.start);
        result += f.replacement;
        idx = f.end;
    }
    result += text.slice(idx);

    // Hitung akurasi deteksi jika diberikan ground-truth
    let detectionAccuracy: number | undefined = undefined;
    let detectedTrueArr: string[] = [];
    let detectedTrueCount = 0;
    if (trueBadWords && trueBadWords.length > 0) {
        const normalizeArr = (arr: string[]) => arr.map(w => normalizeWord(w));
        const detected = filtered.map(f => f.original);
        const normalizedDetected = normalizeArr(detected);
        const normalizedTrue = normalizeArr(trueBadWords);
        detectedTrueArr = normalizedTrue.filter(word => normalizedDetected.includes(word));
        detectedTrueCount = detectedTrueArr.length;
        detectionAccuracy = Number(((detectedTrueCount / normalizedTrue.length) * 100).toFixed(2));
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    return {
        method: "Fuzzy Regex + Normalisasi",
        status: 'success',
        original: text,
        filteredWords: filtered.map((f) => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord,
        })),
        filtered: result,
        filteredText: result,
        bannedWords: filtered.map((f) => f.original),
        replacementWords: filtered.map((f) => f.replacement),
        durationMs,
        detectionAccuracy,
        detectedTrueArr,
        detectedTrueCount,
        totalDetectedCount: filtered.length
    };
}

/**
 * Fuzzy Regex Saja (tanpa normalisasi, tanpa commonWords)
 */
async function runFuzzyRegexPure(
    text: string,
    badWords: Record<string, string>,
    trueBadWords: string[] = [],
    disableAccuracy: boolean = false
) {
    const startTime = performance.now();

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };

    const matches: Match[] = [];
    const wordRegex = /\b\w+\b/g;
    const tokens: { token: string; start: number; end: number }[] = [];
    let m;

    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({
            token: m[0],
            start: m.index,
            end: m.index + m[0].length
        });
    }

    const checkedFuzzyKeys = new Set<string>();
    for (const pattern in badWords) {
        if (pattern.length < 4) continue;
        const replacement = badWords[pattern];
        const fuzzyRx = buildFuzzyRegex(pattern);
        for (const { token, start, end } of tokens) {
            if (matches.some((m) => m.start <= start && m.end >= end)) continue;
            const key = `${pattern}@${start}`;
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key);
            if (token.length < pattern.length) continue;
            if (fuzzyRx.test(token)) {
                matches.push({ original: pattern, replacement, start, end, rawWord: token });
            }
        }
    }

    // Hapus overlap match, hanya ambil yang pertama
    matches.sort((a, b) => a.start - b.start);
    const filtered: Match[] = [];
    let lastEnd = -1;
    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m);
            lastEnd = m.end;
        }
    }

    // Membuat teks hasil filter dengan penggantian kata
    let result = '';
    let idx = 0;
    for (const f of filtered) {
        result += text.slice(idx, f.start);
        result += f.replacement;
        idx = f.end;
    }
    result += text.slice(idx);

    // Hitung akurasi deteksi jika diberikan ground-truth
    let detectionAccuracy: number | undefined = undefined;
    let detectedTrueArr: string[] = [];
    let detectedTrueCount = 0;
    if (trueBadWords && trueBadWords.length > 0) {
        const detected = filtered.map(f => f.original);
        detectedTrueArr = trueBadWords.filter(word => detected.includes(word));
        detectedTrueCount = detectedTrueArr.length;
        detectionAccuracy = Number(((detectedTrueCount / trueBadWords.length) * 100).toFixed(2));
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    return {
        method: "Fuzzy Regex Only (Tanpa Normalisasi)",
        status: 'success',
        original: text,
        filteredWords: filtered.map((f) => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord,
        })),
        filtered: result,
        filteredText: result,
        bannedWords: filtered.map((f) => f.original),
        replacementWords: filtered.map((f) => f.replacement),
        durationMs,
        detectionAccuracy,
        detectedTrueArr,
        detectedTrueCount,
        totalDetectedCount: filtered.length
    };
}

// Helper functions for text processing

/**
 * Normalize a word by replacing similar characters and removing non-letters
 */
function normalizeWord(word: string): string {
    const charMap: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
    };

    return word
        .toLowerCase()
        .replace(/[013457]/g, (ch) => charMap[ch] || ch)
        .replace(/[^a-z]/g, '');
}

/**
 * Create a normalization mapping between original text and normalized text
 */
function getNormalizationMapping(text: string) {
    const charMap: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
    };

    let normalized = '';
    let mapping: number[] = [];

    for (let i = 0; i < text.length; ++i) {
        let ch = text[i].toLowerCase();
        if (charMap[ch]) ch = charMap[ch];
        if (!/[a-z]/.test(ch)) continue;
        normalized += ch;
        mapping.push(i);
    }

    return { normalized, mapping };
}

/**
 * Create fuzzy regex pattern that matches characters with possible gaps between them
 */
function buildFuzzyRegex(pattern: string): RegExp {
    try {
        // Escape special regex characters
        const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Create fuzzy pattern with possible gaps between characters
        const fuzzyPattern = escaped.split('').join('.*');
        // Add word boundary for more precise matching
        return new RegExp(`\\b${fuzzyPattern}\\b`, 'i');
    } catch (error) {
        console.error(`Invalid regex pattern for: ${pattern}`, error);
        // Fallback to exact match if regex creation fails
        return new RegExp(`\\b${pattern}\\b`, 'i');
    }
}

/**
 * Apply replacements to text and track replaced positions
 */
function applyReplacements(text: string, filtered: Array<{
    start: number;
    end: number;
    replacement: string;
}>) {
    let filteredText = '';
    let idx = 0;
    const replacedPositions: Array<{ start: number; end: number }> = [];

    for (const f of filtered) {
        filteredText += text.slice(idx, f.start);
        const replacementStart = filteredText.length;
        filteredText += f.replacement;
        const replacementEnd = filteredText.length;
        idx = f.end;

        replacedPositions.push({
            start: replacementStart,
            end: replacementEnd
        });
    }

    filteredText += text.slice(idx);

    return { filteredText, replacedPositions };
}

/**
 * Boyer-Moore search on normalized text
 */
function boyerMooreSearch(
    haystack: string,
    origText: string,
    origMapping: number[],
    pattern: string,
    commonWordsSet: Set<string>
): Array<{ start: number; end: number; pattern: string; rawWord: string }> {
    const results: Array<{ start: number; end: number; pattern: string; rawWord: string }> = [];
    const badCharTable = buildBadCharacterTable(pattern);
    let i = 0;

    while (i <= haystack.length - pattern.length) {
        let j = pattern.length - 1;
        while (j >= 0 && haystack[i + j] === pattern[j]) {
            j--;
        }

        if (j < 0) {
            const origStart = origMapping[i];
            const origEnd = origMapping[i + pattern.length - 1] + 1;
            const { start, end, rawWord } = expandToWord(origText, origStart, origEnd);

            // Check if this word is part of a larger word
            // If yes, and it's in common words list, skip it
            if (commonWordsSet.has(pattern) && isPartOfLargerWord(origText, start, end)) {
                i += pattern.length;
                continue;
            }

            results.push({ start, end, pattern, rawWord });
            i += pattern.length;
        } else {
            const shiftChar = haystack[i + j];
            const shiftValue = badCharTable[shiftChar] ?? pattern.length;
            i += shiftValue;
        }
    }

    return results;
}

/**
 * Create bad character table for Boyer-Moore algorithm
 */
function buildBadCharacterTable(pattern: string): Record<string, number> {
    if (badCharCache.has(pattern)) return badCharCache.get(pattern)!;

    const table: Record<string, number> = {};

    for (let i = 0; i < pattern.length - 1; i++) {
        table[pattern[i]] = pattern.length - 1 - i;
    }

    badCharCache.set(pattern, table);
    return table;
}

/**
 * Expand indices to include whole word
 */
function expandToWord(
    text: string,
    startIdx: number,
    endIdx: number
): { start: number; end: number; rawWord: string } {
    while (startIdx > 0 && /[a-zA-Z0-9]/.test(text[startIdx - 1])) startIdx--;
    while (endIdx < text.length && /[a-zA-Z0-9]/.test(text[endIdx])) endIdx++;
    return { start: startIdx, end: endIdx, rawWord: text.slice(startIdx, endIdx) };
}

/**
 * Check if a word is part of a larger word by looking at adjacent characters
 */
function isPartOfLargerWord(text: string, start: number, end: number): boolean {
    // Check if there are alphanumeric characters directly before or after the word
    const prevChar = start > 0 ? text[start - 1] : '';
    const nextChar = end < text.length ? text[end] : '';

    return /[a-zA-Z0-9]/.test(prevChar) || /[a-zA-Z0-9]/.test(nextChar);
}

/**
 * Verify if a match is a true positive or false positive
 */
function verifyMatch(token: string, pattern: string, commonWordsSet: Set<string>): boolean {
    // If pattern is in common words list and not exactly same as token,
    // consider it a false positive
    if (commonWordsSet.has(pattern) && normalizeWord(token) !== pattern) {
        return false;
    }

    // If pattern is very short, it must match exactly
    if (pattern.length <= 2 && normalizeWord(token) !== pattern) {
        return false;
    }

    return true;
}

/**
 * Remove overlapping matches by taking the earliest one
 */
function removeOverlappingMatches<T extends { start: number; end: number }>(matches: T[]): T[] {
    matches.sort((a, b) => a.start - b.start);
    const filtered: T[] = [];
    let lastEnd = -1;

    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m);
            lastEnd = m.end;
        }
    }

    return filtered;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract sentences from text that contain replaced bad words
 */
function extractSentencePositions(
    text: string,
    replacedPositions: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
    const sentencePositions: Array<{ start: number; end: number }> = [];

    for (const { start, end } of replacedPositions) {
        let sentStart = text.lastIndexOf('.', start - 1);
        sentStart = sentStart === -1 ? 0 : sentStart + 1;

        let sentEnd = text.indexOf('.', end);
        sentEnd = sentEnd === -1 ? text.length : sentEnd + 1;

        sentencePositions.push({ start: sentStart, end: sentEnd });
    }

    // Merge overlapping sentence positions
    return mergeOverlappingRanges(sentencePositions);
}

/**
 * Merge overlapping ranges
 */
function mergeOverlappingRanges<T extends { start: number; end: number }>(ranges: T[]): { start: number; end: number }[] {
    if (ranges.length === 0) return [];

    // Sort by start position
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    let current = { ...sortedRanges[0] };

    for (let i = 1; i < sortedRanges.length; i++) {
        const range = sortedRanges[i];

        if (range.start <= current.end) {
            // Ranges overlap, merge them
            current.end = Math.max(current.end, range.end);
        } else {
            // No overlap, add current to result and start new current
            merged.push(current);
            current = { ...range };
        }
    }

    // Add the last range
    merged.push(current);

    return merged;
}

/**
 * Paraphrase sentences containing bad words using external API
 */
async function paraphraseSentences(
    text: string,
    sentencePositions: Array<{ start: number; end: number }>
): Promise<{ paraphrasedText: string; success: boolean }> {
    try {
        if (sentencePositions.length === 0) {
            return { paraphrasedText: text, success: false };
        }

        // Extract sentences to paraphrase
        const sentences = sentencePositions.map(pos => text.slice(pos.start, pos.end));

        // Paraphrase each sentence
        const paraphrasedSentences = await Promise.all(
            sentences.map(sentence => paraphraseWithPython(sentence))
        );

        // Replace original sentences with paraphrased ones
        let resultText = '';
        let cursor = 0;

        for (let i = 0; i < sentencePositions.length; i++) {
            const { start, end } = sentencePositions[i];
            resultText += text.slice(cursor, start);
            resultText += paraphrasedSentences[i];
            cursor = end;
        }

        resultText += text.slice(cursor);

        return {
            paraphrasedText: resultText,
            success: true
        };
    } catch (error) {
        console.error('Error paraphrasing sentences:', error);
        return {
            paraphrasedText: text,
            success: false
        };
    }
}

/**
 * Get bad words from database with their replacements
 */
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    // Ambil semua relasi many-to-many antara kata kasar dan kata baik
    const badWordGoodWords = await prisma.badWordGoodWord.findMany({
        include: {
            badWord: true,
            goodWord: true
        }
    });

    // Map badword (sudah dinormalisasi) ke goodword (ambil satu padanan utama untuk setiap badword)
    const badWords: Record<string, string> = {};
    for (const rel of badWordGoodWords) {
        const normalized = normalizeWord(rel.badWord.word);
        // Hanya tambahkan kata dengan panjang minimal tertentu untuk menghindari false positive
        if (normalized.length < 2) continue;
        // Jika sudah ada, jangan timpa (ambil padanan pertama saja)
        if (!badWords[normalized]) {
            badWords[normalized] = rel.goodWord.word;
        }
    }
    // Jika ada badword tanpa padanan, tambahkan dirinya sendiri sebagai pengganti
    const allBadWords = await prisma.badWord.findMany();
    for (const item of allBadWords) {
        const normalized = normalizeWord(item.word);
        if (normalized.length < 2) continue;
        if (!badWords[normalized]) {
            badWords[normalized] = item.word;
        }
    }
    return badWords;
}

/**
 * Get common words that might cause false positives
 */
async function getCommonWordsSet(): Promise<Set<string>> {
    try {
        // Get data from database
        const commonWordsList = await getCommonWords();

        // Convert to set for faster lookups
        const wordSet = new Set<string>();

        for (const item of commonWordsList) {
            const normalized = normalizeWord(item.word);
            if (normalized.length > 0) {
                wordSet.add(normalized);
            }
        }

        // Add default common words if database is empty
        if (wordSet.size === 0) {
            return new Set([
                'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
                'nakal', 'makan', 'tidak', 'pasang', 'kasih'
            ]);
        }

        return wordSet;
    } catch (error) {
        console.error('Error fetching common words:', error);
        // Fallback to default list if there's an error
        return new Set([
            'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
            'nakal', 'makan', 'tidak', 'pasang', 'kasih'
        ]);
    }
}

/**
 * Paraphrase text using external Python API
 */
async function paraphraseWithPython(text: string): Promise<string> {
    console.log('Paraphrasing text:', text);

    try {
        // Limit text length to API constraints
        if (text.length > 500) return text;

        const response = await fetch('http://localhost:8000/paraphrase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (data.result) return data.result;
        return text;
    } catch (err) {
        console.error('Python paraphrase error:', err);
        return text;
    }
}

/**
 * Calculate accuracy metrics using confusion matrix
 */
function calculateMetrics(
    filtered: Array<{ original: string }>,
    text: string,
    trueBadWords: string[] = []
) {
    if (trueBadWords.length === 0) {
        return {
            detectionAccuracy: undefined,
            confusionMatrix: undefined,
            detectedTrueArr: [],
            detectedTrueCount: 0,
            precisionScore: undefined,
            recallScore: undefined,
            f1Score: undefined
        };
    }

    // Normalize for fair comparison
    const normalizeArr = (arr: string[]) => arr.map(w => normalizeWord(w));
    const detected = filtered.map(f => f.original);
    const normalizedDetected = new Set(normalizeArr(detected));
    const normalizedTrue = new Set(normalizeArr(trueBadWords));

    // Count word tokens in original text
    const allWords = text.match(/\b\w+\b/g) || [];
    const normalizedAllWords = normalizeArr(allWords);
    const uniqueWords = new Set(normalizedAllWords);

    // Calculate confusion matrix
    let TP = 0; // True Positives: bad words correctly identified
    let FP = 0; // False Positives: good words incorrectly flagged as bad
    let FN = 0; // False Negatives: bad words missed
    let TN = 0; // True Negatives: good words correctly ignored

    // Calculate TP and FP
    for (const word of normalizedDetected) {
        if (normalizedTrue.has(word)) {
            TP++;
        } else {
            FP++;
        }
    }

    // Calculate FN - bad words that weren't detected
    for (const word of normalizedTrue) {
        if (!normalizedDetected.has(word)) {
            FN++;
        }
    }

    // Calculate TN - words that aren't bad and weren't detected as bad
    for (const word of uniqueWords) {
        if (!normalizedTrue.has(word) && !normalizedDetected.has(word)) {
            TN++;
        }
    }

    // Store confusion matrix
    const confusionMatrix = { TP, TN, FP, FN };

    // Calculate standard classification metrics
    // Accuracy = (TP + TN) / (TP + TN + FP + FN)
    const totalWords = TP + TN + FP + FN;
    const detectionAccuracy = totalWords > 0 ?
        Number((((TP + TN) / totalWords) * 100).toFixed(2)) : 0;

    // Precision = TP / (TP + FP) - when we detect a bad word, how often are we right?
    const precisionScore = (TP + FP) > 0 ?
        Number((TP / (TP + FP) * 100).toFixed(2)) : 0;

    // Recall = TP / (TP + FN) - what percentage of actual bad words do we catch?
    const recallScore = (TP + FN) > 0 ?
        Number((TP / (TP + FN) * 100).toFixed(2)) : 0;

    // F1 Score = 2 * (Precision * Recall) / (Precision + Recall)
    const f1Score = (precisionScore + recallScore) > 0 ?
        Number((2 * (precisionScore * recallScore) / (precisionScore + recallScore)).toFixed(2)) : 0;

    // For backward compatibility
    const detectedTrueArr = Array.from(normalizedTrue).filter(word => normalizedDetected.has(word));
    const detectedTrueCount = TP;

    return {
        detectionAccuracy,
        confusionMatrix,
        detectedTrueArr,
        detectedTrueCount,
        precisionScore,
        recallScore,
        f1Score
    };
}

/**
 * Generate comparison statistics between methods
 */
function generateComparison(results: any, text: string, trueBadWords: string[]) {
    return {
        performance: {
            onlyBM: `${(results.onlyBM.durationMs / 1000).toFixed(3)}s`,
            withNormalization: `${(results.withNormalization.durationMs / 1000).toFixed(3)}s`,
            withFuzzy: `${(results.withFuzzy.durationMs / 1000).toFixed(3)}s`,
            fuzzyRegexWithNorm: `${(results.fuzzyRegexWithNorm.durationMs / 1000).toFixed(3)}s`,
            fuzzyRegexOnly: `${(results.fuzzyRegexOnly.durationMs / 1000).toFixed(3)}s`,
            full: `${(results.full.durationMs / 1000).toFixed(3)}s`
        },
        detectionCounts: {
            onlyBM: results.onlyBM.totalDetectedCount,
            withNormalization: results.withNormalization.totalDetectedCount,
            withFuzzy: results.withFuzzy.totalDetectedCount,
            fuzzyRegexWithNorm: results.fuzzyRegexWithNorm.totalDetectedCount,
            fuzzyRegexOnly: results.fuzzyRegexOnly.totalDetectedCount,
            full: results.full.totalDetectedCount
        },
        metrics: {
            onlyBM: {
                accuracy: results.onlyBM.detectionAccuracy,
                precision: results.onlyBM.precisionScore,
                recall: results.onlyBM.recallScore,
                f1Score: results.onlyBM.f1Score
            },
            withNormalization: {
                accuracy: results.withNormalization.detectionAccuracy,
                precision: results.withNormalization.precisionScore,
                recall: results.withNormalization.recallScore,
                f1Score: results.withNormalization.f1Score
            },
            withFuzzy: {
                accuracy: results.withFuzzy.detectionAccuracy,
                precision: results.withFuzzy.precisionScore,
                recall: results.withFuzzy.recallScore,
                f1Score: results.withFuzzy.f1Score
            },
            fuzzyRegexWithNorm: {
                accuracy: results.fuzzyRegexWithNorm.detectionAccuracy,
                precision: results.fuzzyRegexWithNorm.precisionScore,
                recall: results.fuzzyRegexWithNorm.recallScore,
                f1Score: results.fuzzyRegexWithNorm.f1Score
            },
            fuzzyRegexOnly: {
                accuracy: results.fuzzyRegexOnly.detectionAccuracy,
                precision: results.fuzzyRegexOnly.precisionScore,
                recall: results.fuzzyRegexOnly.recallScore,
                f1Score: results.fuzzyRegexOnly.f1Score
            },
            full: {
                accuracy: results.full.detectionAccuracy,
                precision: results.full.precisionScore,
                recall: results.full.recallScore,
                f1Score: results.full.f1Score
            }
        },
        relativeToFull: {
            onlyBM: calculateDetectionOverlap(results.onlyBM, results.full),
            withNormalization: calculateDetectionOverlap(results.withNormalization, results.full),
            withFuzzy: calculateDetectionOverlap(results.withFuzzy, results.full),
            fuzzyRegexWithNorm: calculateDetectionOverlap(results.fuzzyRegexWithNorm, results.full),
            fuzzyRegexOnly: calculateDetectionOverlap(results.fuzzyRegexOnly, results.full),
        }
    };
}

/**
 * Calculate detection overlap between a method and the full implementation
 */
function calculateDetectionOverlap(method: any, fullMethod: any) {
    const methodWords = new Set(method.bannedWords.map((w: string) => w.toLowerCase()));
    const fullWords = new Set(fullMethod.bannedWords.map((w: string) => w.toLowerCase()));

    const intersection = new Set([...methodWords].filter(x => fullWords.has(x)));
    const missed = new Set([...fullWords].filter(x => !methodWords.has(x)));
    const extra = new Set([...methodWords].filter(x => !fullWords.has(x)));

    return {
        matchedWordsCount: intersection.size,
        matchPercentage: fullWords.size > 0
            ? Number(((intersection.size / fullWords.size) * 100).toFixed(2))
            : 100,
        missedWords: Array.from(missed),
        missedCount: missed.size,
        extraWords: Array.from(extra),
        extraCount: extra.size
    };
}