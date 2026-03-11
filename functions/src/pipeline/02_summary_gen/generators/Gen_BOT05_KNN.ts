import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_05] KNN (최근접 이웃) 패턴 매칭 분석기 (Short-Term)
 * - 목표: 현재와 유사한 과거 패턴(시퀀스)을 찾아, 그 직후 어떤 결과가 나왔는지 통계 분석
 * - 데이터 범위:
 *   - Raw: 최근 20회
 *   - Rolling: 최근 120회
 */
export class Gen_BOT05_KNN implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_05";
        // const ROLLING_WINDOW = 120;
        const RAW_WINDOW = 20;
        const rawData = allRounds.slice(-RAW_WINDOW);

        // rollingData, K, matches removed as they were unused in the new logic
        // logic now uses allRounds directly for pattern matching

        // Helper for KNN
        const findKNN = (targetSeq: string[], pool: string[], outputLabel: string) => {
            const K = 3; // K=3 neighbors

            // Simple Pattern Matching (Exact Match of last 4-5 items, or similarity)
            // For simplicity/speed in this mock, we look for exact matches of length 5
            const patternLen = 5;
            if (pool.length < patternLen + 1) return { prob: "0", count: 0, next: "None" };

            const currentPattern = targetSeq.slice(-patternLen).join("");

            // Search in history (excluding the very recent rolling window itself usually, but here we scan all)
            // Actually scanning the 'pool' which is the rolling window... might be too small.
            // Ideally should scan 'allRounds' but outside the current window.
            // For this implementation, let's scan 'pool' (mapped data) EXCEPT the last window.
            const history = pool.slice(0, -RAW_WINDOW);

            const foundNexts: string[] = [];
            for (let i = 0; i < history.length - patternLen; i++) {
                const slice = history.slice(i, i + patternLen).join("");
                if (slice === currentPattern) {
                    foundNexts.push(history[i + patternLen]);
                }
            }

            // Take last K matches
            const recentMatches = foundNexts.slice(-K);
            if (recentMatches.length === 0) return { prob: "0", count: 0, next: "None" };

            const hitCount = recentMatches.filter(x => x === outputLabel).length;
            const prob = (hitCount / recentMatches.length * 100).toFixed(0);
            return { prob, count: recentMatches.length, next: hitCount > recentMatches.length / 2 ? outputLabel : "Opposite" };
        };

        // Prepare sequences
        const seqD = allRounds.map(r => r.includes('L') ? 'L' : 'R');
        const seqL = allRounds.map(r => r.includes('3') ? '3' : '4');
        const seqO = allRounds.map(r => r.includes('O') ? 'O' : 'E');

        const knnD = findKNN(seqD.slice(-RAW_WINDOW), seqD, 'L');
        const knnL = findKNN(seqL.slice(-RAW_WINDOW), seqL, '3');
        const knnO = findKNN(seqO.slice(-RAW_WINDOW), seqO, 'O');

        const summaryText = `KNN Pattern Matching (Pattern Len=5):
[Direction L/R]
- Similar Patterns Found: ${knnD.count}
- Next Prediction: L=${knnD.prob}% (Bias: ${knnD.next})

[Line 3/4]
- Similar Patterns Found: ${knnL.count}
- Next Prediction: 3=${knnL.prob}% (Bias: ${knnL.next})

[Odd/Even O/E]
- Similar Patterns Found: ${knnO.count}
- Next Prediction: Odd=${knnO.prob}% (Bias: ${knnO.next})

Focus: Historical recurrence of the exact current sequence (5-step).`;

        const total = allRounds.length;
        const lCount = allRounds.filter(r => r.includes('L')).length;
        const line3Count = allRounds.filter(r => r.includes('3')).length;
        const oddCount = allRounds.filter(r => r.includes('O')).length;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((lCount / total * 100).toFixed(1)) : 0,
                today_3_prob: total > 0 ? parseFloat((line3Count / total * 100).toFixed(1)) : 0,
                today_o_prob: total > 0 ? parseFloat((oddCount / total * 100).toFixed(1)) : 0
            },
            layer2_rolling: {
                summary_text: summaryText,
                stats: {
                    knn: {
                        dir: { prob: parseFloat(knnD.prob), count: knnD.count, next: knnD.next },
                        line: { prob: parseFloat(knnL.prob), count: knnL.count, next: knnL.next },
                        oe: { prob: parseFloat(knnO.prob), count: knnO.count, next: knnO.next }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
