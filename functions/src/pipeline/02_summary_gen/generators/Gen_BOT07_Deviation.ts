import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_07] 구간 편차 분석기 (Mid-Term)
 * - 목표: 24시간 평균 대비 최근 100판의 확률적 결손/괴리 측정
 * - 데이터 범위:
 *   - Raw: 100회
 *   - Rolling: 480회
 */
export class Gen_BOT07_Deviation implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_07";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 100;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Deviation
        const calcDev = (recent: string[], total: string[], checker: (s: string) => boolean, label: string) => {
            const recentRate = recent.filter(checker).length / recent.length;
            const totalRate = total.filter(checker).length / total.length;
            const GAP = (totalRate - recentRate) * 100; // Positive gap means recent is under-performing -> Reversion to mean implies it should come out.

            return {
                recent: (recentRate * 100).toFixed(1),
                total: (totalRate * 100).toFixed(1),
                gap: GAP.toFixed(1),
                dir: GAP > 0 ? `Under-supplied (Expect ${label})` : `Over-supplied (Expect Opposite)`
            };
        };

        const devD = calcDev(rollingData, allRounds, r => r.includes('L'), 'L');
        const devL = calcDev(rollingData, allRounds, r => r.includes('3'), '3');
        const devO = calcDev(rollingData, allRounds, r => r.includes('O'), 'Odd');

        const summaryText = `Deviation Analysis (Global vs Last ${ROLLING_WINDOW}):
[Direction L/R]
- Global L: ${devD.total}% vs Recent L: ${devD.recent}%
- Gap: ${devD.gap}% -> ${devD.dir}

[Line 3/4]
- Global 3: ${devL.total}% vs Recent 3: ${devL.recent}%
- Gap: ${devL.gap}% -> ${devL.dir}

[Odd/Even O/E]
- Global Odd: ${devO.total}% vs Recent Odd: ${devO.recent}%
- Gap: ${devO.gap}% -> ${devO.dir}

Focus: Balancing 'Law of Totals' - bet on what is currently missing.`;

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
                    deviation: {
                        dir: { recent: parseFloat(devD.recent), total: parseFloat(devD.total), gap: parseFloat(devD.gap), dir: devD.dir },
                        line: { recent: parseFloat(devL.recent), total: parseFloat(devL.total), gap: parseFloat(devL.gap), dir: devL.dir },
                        oe: { recent: parseFloat(devO.recent), total: parseFloat(devO.total), gap: parseFloat(devO.gap), dir: devO.dir }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
