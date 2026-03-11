import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_14] 거대 사이클 분석기 (Long-Term)
 * - 목표: 3일간의 흐름 속에서 발생하는 거대 변곡점(Peak/Valley) 포착
 * - 데이터 범위:
 *   - Raw: 50회
 *   - Rolling: 1440회 (72h)
 */
export class Gen_BOT14_GiantCycle implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_14";
        // const ROLLING_WINDOW = 2880; // unused
        const RAW_WINDOW = 50;

        const rawData = allRounds.slice(-RAW_WINDOW);
        // rollingData unused

        // Helper for Giant Cycle (SMA Cross)
        const checkCyclePosition = (all: string[], checker: (s: string) => boolean, label: string) => {
            // Need much data
            if (all.length < 100) return { phase: "Insufficient Data", val: "0", base: "0" };

            // Short MA (100) vs Long MA (500)
            const calcMA = (period: number) => {
                const slice = all.slice(-period);
                return slice.filter(checker).length / slice.length;
            };

            const maS = calcMA(100);
            const maL = calcMA(500);

            let phase = "Neutral";
            if (maS > maL + 0.02) phase = "Expansion Phase (Bull)";
            else if (maS < maL - 0.02) phase = "Contraction Phase (Bear)";

            return { phase, val: maS.toFixed(2), base: maL.toFixed(2) };
        };

        const cycD = checkCyclePosition(allRounds, r => r.includes('L'), 'Direction L/R');
        const cycL = checkCyclePosition(allRounds, r => r.includes('3'), 'Line 3/4');
        const cycO = checkCyclePosition(allRounds, r => r.includes('O'), 'Odd/Even O/E');

        const summaryText = `Giant Cycle Analysis (Global Trend):
[Direction L/R]
- Phase: ${cycD.phase} (MA100=${cycD.val} vs MA500=${cycD.base})

[Line 3/4]
- Phase: ${cycL.phase} (MA100=${cycL.val} vs MA500=${cycL.base})

[Odd/Even O/E]
- Phase: ${cycO.phase} (MA100=${cycO.val} vs MA500=${cycO.base})

Focus: Identifying major multi-day trends (Expansion vs Contraction).`;

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
                    giant: {
                        dir: { phase: cycD.phase, val: parseFloat(cycD.val), base: parseFloat(cycD.base) },
                        line: { phase: cycL.phase, val: parseFloat(cycL.val), base: parseFloat(cycL.base) },
                        oe: { phase: cycO.phase, val: parseFloat(cycO.val), base: parseFloat(cycO.base) }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
