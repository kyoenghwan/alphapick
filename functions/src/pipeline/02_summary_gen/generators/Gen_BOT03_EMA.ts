import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_03] EMA (지수이동평균) 분석기 (Short-Term)
 * - 목표: 승률/방향성의 기세(Momentum) 측정. 최근 데이터에 가중치 부여.
 * - 데이터 범위:
 *   - Raw: 최근 30회
 *   - Rolling: 최근 180회
 */
export class Gen_BOT03_EMA implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_03";
        const ROLLING_WINDOW = 180;
        const RAW_WINDOW = 30;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for EMA
        const calcEMA = (data: number[], period: number) => {
            const k = 2 / (period + 1);
            let ema = data[0];
            for (let i = 1; i < data.length; i++) {
                ema = (data[i] * k) + (ema * (1 - k));
            }
            return ema;
        };

        // Convert to numeric signals: L=+1, R=-1 / 3=+1, 4=-1 / O=+1, E=-1
        const numD = rollingData.map(r => r.includes('L') ? 1 : -1);
        const numL = rollingData.map(r => r.includes('3') ? 1 : -1);
        const numO = rollingData.map(r => r.includes('O') ? 1 : -1);

        const emaD = calcEMA(numD, 12); // Short period EMA
        const emaL = calcEMA(numL, 12);
        const emaO = calcEMA(numO, 12);

        const getSignal = (val: number, labelPlus: string, labelMinus: string) => {
            // RSI-like simplified strength
            // const strength = Math.abs(ema - 0.5) * 200; // unused

            let trend = "Neutral";
            if (val > 0.55) trend = `Strong ${labelPlus}`; // Assuming val is already scaled or represents a probability/ratio
            else if (val < -0.55) trend = `Strong ${labelMinus}`; // Assuming val is already scaled or represents a probability/ratio
            else if (val > 0.1) trend = `Weak ${labelPlus}`;
            else if (val < -0.1) trend = `Weak ${labelMinus}`;

            return { val: (val * 100).toFixed(1), trend };
        };

        const sD = getSignal(emaD, 'L', 'R');
        const sL = getSignal(emaL, '3', '4');
        const sO = getSignal(emaO, 'Odd', 'Even');

        const summaryText = `EMA Momentum Analysis (Short-Term Trend):
[Direction L/R]
- Value: ${sD.val} (Threshold: +/-10.0)
- Trend: ${sD.trend}

[Line 3/4]
- Value: ${sL.val}
- Trend: ${sL.trend}

[Odd/Even O/E]
- Value: ${sO.val}
- Trend: ${sO.trend}

Focus: Follow the trend if 'Strong', otherwise expect chop.`;

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
                    ema: {
                        dir: { val: parseFloat(sD.val), trend: sD.trend },
                        line: { val: parseFloat(sL.val), trend: sL.trend },
                        oe: { val: parseFloat(sO.val), trend: sO.trend }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
