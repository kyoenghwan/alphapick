import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_13] 회귀 매칭 분석기 (Long-Term)
 * - 목표: 초장기 흐름 중 30일 족보와 가장 닮은 마디(Chunk) 찾기
 * - 데이터 범위:
 *   - Raw: 최근 50회
 *   - Rolling: 720회 (36h)
 */
export class Gen_BOT13_Regression implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_13";
        const ROLLING_WINDOW = 720;
        const RAW_WINDOW = 50;

        const rawData = allRounds.slice(-RAW_WINDOW);
        const rollingData = allRounds.slice(-ROLLING_WINDOW);

        // Helper for Regression/Similarity
        const findSimChunk = (rolling: string[], all: string[], checker: (s: string) => number, label: string) => {
            // Visualize rolling as number array
            const target = rolling.map(checker); // array of 0,1
            const tLen = target.length; // 720

            // Scan all history for similar chunk (Pattern Matching)
            // Use Match Rate (Hamming Distance inverse) for Similarity

            let bestSimilarity = -1;
            let bestNext = 0.5;

            // Randomly sample or scan steps to save time, but for better accuracy we scan denser
            const scanStep = 5;

            // Limit scanning to avoid timeout if allRounds is huge, or just scan recent 5000?
            // For now scan all available history minus current window
            const historyLimit = all.length - tLen - 1;

            for (let i = 0; i < historyLimit; i += scanStep) {
                // Optimize: Checking 720 items every step is heavy. 
                // Let's compare a smaller representative sample or just the last 50 items of the chunk for speed?
                // Or if we want "Long Term" similarity, we should compare the shape.
                // For performance, let's compare the last 100 items of the window.

                const compareLen = Math.min(tLen, 100);
                // Target's last 100
                const tPart = target.slice(-compareLen);
                // History chunk's last 100 (which ends at i + tLen)
                const cPart = all.slice(i + tLen - compareLen, i + tLen).map(checker);

                let matchCount = 0;
                for (let k = 0; k < compareLen; k++) {
                    if (tPart[k] === cPart[k]) matchCount++;
                }

                const similarity = (matchCount / compareLen) * 100;

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    // Check what happened next in history
                    bestNext = checker(all[i + tLen]);
                }
            }

            return {
                diff: bestSimilarity, // Now returning Similarity % (0-100)
                pred: bestNext === 1 ? label : "Opposite"
            };
        };

        const regD = findSimChunk(rollingData, allRounds, r => r.includes('L') ? 1 : 0, 'L');
        const regL = findSimChunk(rollingData, allRounds, r => r.includes('3') ? 1 : 0, '3');
        const regO = findSimChunk(rollingData, allRounds, r => r.includes('O') ? 1 : 0, 'Odd');

        const summaryText = `Regression/Similarity Pattern (Chunk Matching):
[Direction L/R]
- Best Match Diff: ${regD.diff}
- Predicted Next: ${regD.pred}

[Line 3/4]
- Best Match Diff: ${regL.diff}
- Predicted Next: ${regL.pred}

[Odd/Even O/E]
- Best Match Diff: ${regO.diff}
- Predicted Next: ${regO.pred}

Focus: Using long-term history to find the 'closest' historical scenario and its outcome.`;

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
                    regression: {
                        dir: { diff: regD.diff, pred: regD.pred },
                        line: { diff: regL.diff, pred: regL.pred },
                        oe: { diff: regO.diff, pred: regO.pred }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
