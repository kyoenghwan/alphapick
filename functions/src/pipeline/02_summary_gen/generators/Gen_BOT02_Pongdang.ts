import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_02] 퐁당(Pongdang) 분석기 (Short-Term)
 * - 목표: 퐁당(L-R-L-R) 패턴의 지속성과 반전(Flip) 임계치 포착
 * - 데이터 범위:
 *   - Raw: 최근 25회
 *   - Rolling: 최근 120회
 */
export class Gen_BOT02_Pongdang implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_02";
        const ROLLING_WINDOW = 120;
        const RAW_WINDOW = 25;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Pongdang
        const analyzePongdang = (seq: string[], checker: (s: string) => boolean, label: string) => {
            // Calculate Flip Count
            let flips = 0;
            let maxStr = 0;
            let curStr = 0;
            let lastVal = false;

            if (seq.length > 0) lastVal = checker(seq[0]);

            // Streak calc inside loop
            let currentStreakVal = checker(seq[0]);
            curStr = 1;

            for (let i = 1; i < seq.length; i++) {
                const val = checker(seq[i]);
                if (val !== lastVal) flips++;
                lastVal = val;

                // Streak Logic
                if (val === currentStreakVal) {
                    curStr++;
                } else {
                    if (curStr > maxStr) maxStr = curStr;
                    curStr = 1;
                    currentStreakVal = val;
                }
            }
            if (curStr > maxStr) maxStr = curStr;

            const flipRate = seq.length > 1 ? flips / (seq.length - 1) : 0;
            const isPongdang = flipRate > 0.6; // 60% is pretty high alternation

            return {
                flips,
                rate: (flipRate * 100).toFixed(1),
                maxStr,
                curStr: curStr,
                status: isPongdang ? "High Alternation (Pongdang)" : "Streaky/Choppy"
            };
        };

        const dirs = rollingData.map(r => r.includes('L') ? 'L' : 'R');
        const lines = rollingData.map(r => r.includes('3') ? '3' : '4');
        const oes = rollingData.map(r => r.includes('O') ? 'O' : 'E');

        const statD = analyzePongdang(dirs, (s: string) => s === 'L', "Direction L/R");
        const statL = analyzePongdang(lines, (s: string) => s === '3', "Line 3/4");
        const statO = analyzePongdang(oes, (s: string) => s === 'O', "Odd/Even O/E");

        const totalMoves = rollingData.length - 1;

        const summaryText = `Pongdang Pattern Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Flip Rate: ${statD.flips}/${totalMoves} (${statD.rate}%)
- Max Streak: ${statD.maxStr}
- Current Streak: ${statD.curStr}
- Status: ${statD.status}

[Line 3/4]
- Flip Rate: ${statL.flips}/${totalMoves} (${statL.rate}%)
- Max Streak: ${statL.maxStr}
- Current Streak: ${statL.curStr}
- Status: ${statL.status}

[Odd/Even O/E]
- Flip Rate: ${statO.flips}/${totalMoves} (${statO.rate}%)
- Max Streak: ${statO.maxStr}
- Current Streak: ${statO.curStr}
- Status: ${statO.status}

Focus: Identify if any component is in a high-tension alternating state (Pongdang).`;

        // Macro
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
                    pongdang: {
                        dir: { flips: statD.flips, rate: parseFloat(statD.rate), status: statD.status, isPongdang: parseFloat(statD.rate) > 60 },
                        line: { flips: statL.flips, rate: parseFloat(statL.rate), status: statL.status, isPongdang: parseFloat(statL.rate) > 60 },
                        oe: { flips: statO.flips, rate: parseFloat(statO.rate), status: statO.status, isPongdang: parseFloat(statO.rate) > 60 }
                    },
                    lastRound: {
                        dir: rollingData[rollingData.length - 1]?.includes('L') ? 'L' : 'R',
                        line: rollingData[rollingData.length - 1]?.includes('3') ? '3' : '4',
                        oe: rollingData[rollingData.length - 1]?.includes('O') ? 'O' : 'E'
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
