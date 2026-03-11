import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_15] 희소 패턴 분석기 (Long-Term)
 * - 목표: 최근 1.5일 내 30일 족보상 희귀 현상의 출현 빈도 및 재현성
 * - 데이터 범위:
 *   - Raw: 50회
 *   - Rolling: 720회 (36h)
 */
export class Gen_BOT15_RarePattern implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_15";
        // const ROLLING_WINDOW = 720;
        const RAW_WINDOW = 50;

        // rollingData unused
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Rare Pattern
        const checkRare = (seq: string[], checker: (s: string) => boolean, label: string) => {
            // Detection: Streak > 7 or Alternating > 8
            let maxStr = 0;
            let curStr = 0;
            let lastVal = false;

            for (const item of seq) {
                const val = checker(item);
                if (val === lastVal) {
                    curStr++;
                } else {
                    if (curStr > maxStr) maxStr = curStr;
                    curStr = 1;
                    lastVal = val;
                }
            }
            if (curStr > maxStr) maxStr = curStr;

            // Is current rare?
            // Re-calc current only
            let currentRun = 0;
            if (seq.length > 0) {
                const last = checker(seq[seq.length - 1]);
                for (let i = seq.length - 1; i >= 0; i--) {
                    if (checker(seq[i]) === last) currentRun++;
                    else break;
                }
            }

            const isRare = currentRun >= 7;
            const warning = isRare ? `CRITICAL WARNING: Rare Streak (${currentRun}) Detected!` : "No rare patterns.";

            return { maxStr, curStr: currentRun, warning };
        };

        const rareD = checkRare(allRounds, r => r.includes('L'), 'Left');
        const rareL = checkRare(allRounds, r => r.includes('3'), '3');
        const rareO = checkRare(allRounds, r => r.includes('O'), 'Odd');

        const summaryText = `Rare Pattern Detector (Alert System):
[Direction L/R]
- Max Streak Found: ${rareD.maxStr}
- Status: ${rareD.warning}

[Line 3/4]
- Max Streak Found: ${rareL.maxStr}
- Status: ${rareL.warning}

[Odd/Even O/E]
- Max Streak Found: ${rareO.maxStr}
- Status: ${rareO.warning}

Focus: If a rare pattern is active, tread carefully or bet on breakage.`;

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
                    rare: {
                        dir: { maxStr: rareD.maxStr, curStr: rareD.curStr, warning: rareD.warning },
                        line: { maxStr: rareL.maxStr, curStr: rareL.curStr, warning: rareL.warning },
                        oe: { maxStr: rareO.maxStr, curStr: rareO.curStr, warning: rareO.warning }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
