import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_08] 시계열 사이클 분석기 (Mid-Term)
 * - 목표: 1~2시간 단위로 반복되는 파동(Wave) 주기 및 현재 위치(상승장/하락장) 분석
 * - 데이터 범위:
 *   - Raw: 80회
 *   - Rolling: 480회
 */
export class Gen_BOT08_Cycle implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_08";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 80;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Cycle
        const analyzeCycle = (seq: number[]) => {
            // Find trends using a larger mid-term window
            let waveState = "Flat"; // Rising, Falling
            let slope = 0;
            const WINDOW = 20; // Expanded from 5 -> 20 for Mid-Term granularity

            if (seq.length >= WINDOW) {
                const recent = seq.slice(-WINDOW);
                const mid = Math.floor(WINDOW / 2); // 10

                // Compare Avg of Oldest 10 vs Newest 10 to get Trend Slope
                const oldPart = recent.slice(0, mid);
                const newPart = recent.slice(mid);

                const avgOld = oldPart.reduce((a, b) => a + b, 0) / oldPart.length;
                const avgNew = newPart.reduce((a, b) => a + b, 0) / newPart.length;

                slope = avgNew - avgOld;

                if (slope > 0.1) waveState = "Rising";
                else if (slope < -0.1) waveState = "Falling";
                else waveState = "Flat";
            }
            return { state: waveState, slope };
        };

        const numD = rollingData.map(r => r.includes('L') ? 1 : 0); // 1=L, 0=R
        const numL = rollingData.map(r => r.includes('3') ? 1 : 0); // 1=3, 0=4
        const numO = rollingData.map(r => r.includes('O') ? 1 : 0); // 1=O, 0=E

        const cycleD = analyzeCycle(numD);
        const cycleL = analyzeCycle(numL);
        const cycleO = analyzeCycle(numO);

        const summaryText = `Cycle Wave Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Current Wave Phase: ${cycleD.state} (Slope: ${cycleD.slope.toFixed(2)})

[Line 3/4]
- Current Wave Phase: ${cycleL.state} (Slope: ${cycleL.slope.toFixed(2)})

[Odd/Even O/E]
- Current Wave Phase: ${cycleO.state} (Slope: ${cycleO.slope.toFixed(2)})

Focus: Identify if we are on the rising edge or falling edge of a probability wave.`;

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
                    cycle: {
                        dir: { state: cycleD.state, slope: cycleD.slope },
                        line: { state: cycleL.state, slope: cycleL.slope },
                        oe: { state: cycleO.state, slope: cycleO.slope }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
