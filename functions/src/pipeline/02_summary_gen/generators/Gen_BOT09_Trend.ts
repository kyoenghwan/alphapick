import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_09] 추세 강도(MACD/EMA) 분석기 (Mid-Term)
 * - 목표: 중기 이동평균선(60vs120선)의 골든/데드크로스 분석
 * - 데이터 범위:
 *   - Raw: 100회
 *   - Rolling: 480회
 */
export class Gen_BOT09_Trend implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_09";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 100;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Trend
        const calcTrend = (nums: number[]) => {
            const shortLen = 7;
            const longLen = 25;
            if (nums.length < longLen) return { maS: "0.00", maL: "0.00", gap: 0, signal: "No Data" };

            const maShort = nums.slice(-shortLen).reduce((a, b) => a + b, 0) / shortLen;
            const maLong = nums.slice(-longLen).reduce((a, b) => a + b, 0) / longLen;

            const gap = maShort - maLong;
            let signal = "Neutral";
            if (gap > 0.1) signal = "Strong Up-Trend (Golden Cross)";
            else if (gap < -0.1) signal = "Strong Down-Trend (Dead Cross)";
            else signal = "Sideways / Choppy";

            return { maS: maShort.toFixed(2), maL: maLong.toFixed(2), gap, signal };
        };

        const numD = rollingData.map(r => r.includes('L') ? 1 : 0);
        const numL = rollingData.map(r => r.includes('3') ? 1 : 0);
        const numO = rollingData.map(r => r.includes('O') ? 1 : 0);

        const tD = calcTrend(numD);
        const tL = calcTrend(numL);
        const tO = calcTrend(numO);

        const summaryText = `Trend Cross Analysis (MA7 vs MA25):
[Direction L/R]
- MA7: ${tD.maS} vs MA25: ${tD.maL} (Gap: ${tD.gap.toFixed(3)})
- Signal: ${tD.signal}

[Line 3/4]
- MA7: ${tL.maS} vs MA25: ${tL.maL} (Gap: ${tL.gap.toFixed(3)})
- Signal: ${tL.signal}

[Odd/Even O/E]
- MA7: ${tO.maS} vs MA25: ${tO.maL} (Gap: ${tO.gap.toFixed(3)})
- Signal: ${tO.signal}

Focus: Golden Cross (Short > Long) vs Dead Cross (Short < Long).`;

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
                    trend: {
                        dir: { maS: parseFloat(tD.maS), maL: parseFloat(tD.maL), gap: tD.gap, signal: tD.signal },
                        line: { maS: parseFloat(tL.maS), maL: parseFloat(tL.maL), gap: tL.gap, signal: tL.signal },
                        oe: { maS: parseFloat(tO.maS), maL: parseFloat(tO.maL), gap: tO.gap, signal: tO.signal }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
