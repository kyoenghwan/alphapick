import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_12] Z-Score 거시 분석기 (Long-Term)
 * - 목표: 이틀간의 흐름 대비 현재 하루(24h)의 편차 수치화
 * - 데이터 범위:
 *   - Raw: 최근 50회
 *   - Rolling: 960회 (48h)
 */
export class Gen_BOT12_ZScoreMacro implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_12";
        // const ROLLING_WINDOW = 960;
        const RAW_WINDOW = 50;

        // rollingData unused
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Z-Macro
        const calcZMacro = (all: string[], checker: (s: string) => boolean, label: string) => {
            // Compare last 24h (approx 480 rounds) vs previous 24h
            const recentWin = 480;
            const recentData = all.slice(-recentWin);

            // If total < 960, just use what we have, but main validation point is we need enough data
            const n = recentData.length;
            if (n < 50) return { z: "0.00", status: "Insufficient Data" };

            const count = recentData.filter(checker).length;
            const p = 0.5;
            const mean = n * p;
            const sigma = Math.sqrt(n * p * (1 - p));

            const z = (count - mean) / sigma;
            // diff removed

            let status = "Balanced";
            if (z > 1.96) status = "Over-extended (High)";
            else if (z < -1.96) status = "Over-extended (Low)";

            return { z: z.toFixed(2), status };
        };

        const zmD = calcZMacro(allRounds, r => r.includes('L'), 'Left');
        const zmL = calcZMacro(allRounds, r => r.includes('3'), '3-Line');
        const zmO = calcZMacro(allRounds, r => r.includes('O'), 'Odd');

        const summaryText = `Z-Score Macro Analysis (30-Day Data):
[Direction L/R]
- Z-Score: ${zmD.z} -> ${zmD.status}

[Line 3/4]
- Z-Score: ${zmL.z} -> ${zmL.status}

[Odd/Even O/E]
- Z-Score: ${zmO.z} -> ${zmO.status}

Focus: Statistical abnormalities on a massive scale (Law of Large Numbers Extreme).`;

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
                    zmacro: {
                        dir: { z: parseFloat(zmD.z), status: zmD.status },
                        line: { z: parseFloat(zmL.z), status: zmL.status },
                        oe: { z: parseFloat(zmO.z), status: zmO.status }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
