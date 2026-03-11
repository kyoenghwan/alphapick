import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_10] 패턴 복기 검증 분석기 (Mid-Term)
 * - 목표: 최근 6시간 내 특정 기법(L 연속 후 꺾임 등)의 실제 적중률 추적
 * - 데이터 범위:
 *   - Raw: 70회
 *   - Rolling: 480회
 */
export class Gen_BOT10_Pattern implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_10";
        // const ROLLING_WINDOW = 300; // unused
        const RAW_WINDOW = 20;

        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Pattern (Streak Reversal)
        const checkStreakReversal = (seq: string[], checker: (s: string) => boolean, label: string) => {
            // Check current streak
            let curStr = 0;
            let currentVal = false;

            if (seq.length > 0) {
                currentVal = checker(seq[seq.length - 1]);
                for (let i = seq.length - 1; i >= 0; i--) {
                    if (checker(seq[i]) === currentVal) curStr++;
                    else break;
                }
            }

            // Calculate Reversal Probability based on Historical Data
            // "When streak reached X, how often did it reverse?"
            let countAtCur = 0;
            let flipAtCur = 0;

            let sCount = 1;
            let sVal = checker(seq[0]);

            for (let i = 1; i < seq.length; i++) {
                const val = checker(seq[i]);
                if (val === sVal) {
                    sCount++;
                } else {
                    // Sequence ended.
                    // Did it encompass curStr?
                    if (sCount >= curStr && curStr > 0) {
                        countAtCur++; // It reached at least curStr
                        if (sCount === curStr) flipAtCur++; // It flipped exactly after curStr
                        // If sCount > curStr, it continued, so NO flip at curStr step.
                    }
                    sCount = 1;
                    sVal = val;
                }
            }

            // Probability of Flip at exactly current streak length
            const prob = countAtCur > 0 ? (flipAtCur / countAtCur * 100) : 50.0;

            return { curStr, prob: prob.toFixed(1) };
        };

        const patD = checkStreakReversal(allRounds, r => r.includes('L'), 'Direction L/R');
        const patL = checkStreakReversal(allRounds, r => r.includes('3'), 'Line 3/4');
        const patO = checkStreakReversal(allRounds, r => r.includes('O'), 'Odd/Even O/E');

        const summaryText = `Pattern Success Rate Analysis:
[Direction L/R]
- Current Streak: ${patD.curStr}
- Reversal Prob: ${patD.prob}%

[Line 3/4]
- Current Streak: ${patL.curStr}
- Reversal Prob: ${patL.prob}%

[Odd/Even O/E]
- Current Streak: ${patO.curStr}
- Reversal Prob: ${patO.prob}%

Focus: Validating if 'Streak Reversal' betting system is currently profitable.`;

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
                    pattern: {
                        dir: { curStr: patD.curStr, prob: parseFloat(patD.prob) },
                        line: { curStr: patL.curStr, prob: parseFloat(patL.prob) },
                        oe: { curStr: patO.curStr, prob: parseFloat(patO.prob) }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
