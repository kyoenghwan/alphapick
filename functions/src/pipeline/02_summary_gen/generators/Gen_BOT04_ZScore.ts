import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_04] Z-Score (표준점수) 분석기 (Short-Term)
 * - 목표: 평균 대비 현재 상태의 이탈 정도(Deviation)를 측정하여 회귀(Mean Reversion) 예측
 * - 데이터 범위:
 *   - Raw: 최근 40회
 *   - Rolling: 최근 240회
 */
export class Gen_BOT04_ZScore implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_04";
        const ROLLING_WINDOW = 240;
        const RAW_WINDOW = 40;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Z-Score
        const calcZStats = (windowData: string[], checker: (s: string) => boolean, label: string) => {
            const count = windowData.filter(checker).length;
            const mean = windowData.length * 0.5; // Assuming 50/50 fair game
            const stdDev = Math.sqrt(windowData.length * 0.5 * 0.5);
            const z = (count - mean) / stdDev;

            let interpretation = "Normal";
            if (z > 2.0) interpretation = `Extreme ${label} Overload (Reversion Likely)`;
            else if (z < -2.0) interpretation = `Extreme ${label} Deficit (Reversion Likely)`;

            return { count, z: z.toFixed(2), interp: interpretation };
        };

        const zD = calcZStats(rollingData, r => r.includes('L'), 'Left');
        const zL = calcZStats(rollingData, r => r.includes('3'), '3-Line');
        const zO = calcZStats(rollingData, r => r.includes('O'), 'Odd');

        const summaryText = `Z-Score Deviation Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Z-Score: ${zD.z} (L-Count: ${zD.count})
- Status: ${zD.interp}

[Line 3/4]
- Z-Score: ${zL.z} (3-Count: ${zL.count})
- Status: ${zL.interp}

[Odd/Even O/E]
- Z-Score: ${zO.z} (Odd-Count: ${zO.count})
- Status: ${zO.interp}

Focus: Identify statistical extremes (>2.0 sigma) suggesting mean reversion.`;

        const total = allRounds.length;
        const overallL = allRounds.filter(r => r.includes('L')).length;
        const line3Count = allRounds.filter(r => r.includes('3')).length;
        const oddCount = allRounds.filter(r => r.includes('O')).length;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((overallL / total * 100).toFixed(1)) : 0,
                today_3_prob: total > 0 ? parseFloat((line3Count / total * 100).toFixed(1)) : 0,
                today_o_prob: total > 0 ? parseFloat((oddCount / total * 100).toFixed(1)) : 0
            },
            layer2_rolling: {
                summary_text: summaryText,
                stats: {
                    zscore: {
                        dir: { z: parseFloat(zD.z), count: zD.count, interp: zD.interp },
                        line: { z: parseFloat(zL.z), count: zL.count, interp: zL.interp },
                        oe: { z: parseFloat(zO.z), count: zO.count, interp: zO.interp }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
