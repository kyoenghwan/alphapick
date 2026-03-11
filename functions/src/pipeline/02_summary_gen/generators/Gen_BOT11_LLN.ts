import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_11] 대수의 법칙 분석기 (Long-Term)
 * - 목표: 초장기 승률이 30일 거시 평균(50% 근사)으로 수렴하는지 감시
 * - 데이터 범위:
 *   - Raw: 최근 50회 + 24h 요약
 *   - Rolling: 1440회 (72h)
 */
export class Gen_BOT11_LLN implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_11";
        // const ROLLING_WINDOW = 1440; // unused
        const RAW_WINDOW = 50;

        // const rollingData = ... // unused
        const rawData = allRounds.slice(-RAW_WINDOW);

        // 1. 전체(30일) 평균 vs 3일(1440) 평균 비교
        const total = allRounds.length;
        // Helper for LLN
        const calcLLN = (seq: string[], checker: (s: string) => boolean) => {
            const count = seq.filter(checker).length;
            const rate = count / seq.length;
            const diff = 0.5 - rate; // Assuming 50% is the law
            return {
                rate: (rate * 100).toFixed(2),
                diff: (diff * 100).toFixed(2),
                force: Math.abs(diff) > 0.05 ? (diff > 0 ? "Strong Push Up" : "Strong Pull Down") : "Balanced"
            };
        };

        const llnD = calcLLN(allRounds, r => r.includes('L'));
        const llnL = calcLLN(allRounds, r => r.includes('3'));
        const llnO = calcLLN(allRounds, r => r.includes('O'));

        const summaryText = `Law of Large Numbers (Total ${total} Rounds):
[Direction L (Target 50%)]
- Actual: ${llnD.rate}% (Diff: ${llnD.diff}%)
- Force: ${llnD.force}

[Line 3 (Target 50%)]
- Actual: ${llnL.rate}% (Diff: ${llnL.diff}%)
- Force: ${llnL.force}

[Odd/Even Odd (Target 50%)]
- Actual: ${llnO.rate}% (Diff: ${llnO.diff}%)
- Force: ${llnO.force}

Focus: Long-term convergence towards 50.0%. Large deviations imply strong corrective force.`;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: parseFloat(llnD.rate),
                today_3_prob: parseFloat(llnL.rate),
                today_o_prob: parseFloat(llnO.rate)
            },
            layer2_rolling: {
                summary_text: summaryText,
                stats: {
                    lln: {
                        dir: { rate: parseFloat(llnD.rate), diff: parseFloat(llnD.diff), force: llnD.force },
                        line: { rate: parseFloat(llnL.rate), diff: parseFloat(llnL.diff), force: llnL.force },
                        oe: { rate: parseFloat(llnO.rate), diff: parseFloat(llnO.diff), force: llnO.force }
                    }
                }
            },
            layer3_raw: rawData // + needed extra context in prompt if spec requires 24h summary here
        };
    }
}
