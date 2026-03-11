import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_01] 마르코프 체인 분석기 (Short-Term)
 * - 목표: 줄(Streak)의 유지 및 변동 확률을 계산하여 다음 패턴 예측
 * - 데이터 범위:
 *   - Raw: 최근 30회
 *   - Rolling: 최근 120회
 */
export class Gen_BOT01_Markov implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_01";
        const ROLLING_WINDOW = 120;
        const RAW_WINDOW = 30;

        // 1. 데이터 슬라이싱
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // 2. 통계 계산 (마르코프 전이 확률) - 3요소 (좌우, 3/4줄, 홀/짝) 모두 분석

        // Counters for Direction (L/R)
        let d_ll = 0, d_lr = 0, d_rr = 0, d_rl = 0;
        let d_l_count = 0, d_r_count = 0;

        // Counters for Line (3/4)
        let l_33 = 0, l_34 = 0, l_44 = 0, l_43 = 0;
        let l_3_count = 0, l_4_count = 0;

        // Counters for OE (Odd/Even) - Assuming 'O' for Odd, 'X' or other for Even
        let o_oo = 0, o_oe = 0, o_ee = 0, o_eo = 0;
        let o_o_count = 0, o_e_count = 0;

        for (let i = 0; i < rollingData.length - 1; i++) {
            const curStr = rollingData[i];
            const nextStr = rollingData[i + 1];

            // --- Direction Analysis ---
            const curD = curStr.includes('L') ? 'L' : 'R';
            const nextD = nextStr.includes('L') ? 'L' : 'R';
            if (curD === 'L') {
                d_l_count++;
                if (nextD === 'L') d_ll++; else d_lr++;
            } else {
                d_r_count++;
                if (nextD === 'R') d_rr++; else d_rl++;
            }

            // --- Line Analysis ---
            const curLine = curStr.includes('3') ? '3' : '4';
            const nextLine = nextStr.includes('3') ? '3' : '4';
            if (curLine === '3') {
                l_3_count++;
                if (nextLine === '3') l_33++; else l_34++;
            } else {
                l_4_count++;
                if (nextLine === '4') l_44++; else l_43++;
            }

            // --- OE Analysis ---
            // 'O' is Odd, anything else (likely 'X') is Even
            const curOE = curStr.includes('O') ? 'O' : 'E';
            const nextOE = nextStr.includes('O') ? 'O' : 'E';
            if (curOE === 'O') {
                o_o_count++;
                if (nextOE === 'O') o_oo++; else o_oe++;
            } else {
                o_e_count++;
                if (nextOE === 'E') o_ee++; else o_eo++;
            }
        }

        // Helper to formatting
        const getProb = (hits: number, total: number) => total > 0 ? (hits / total * 100).toFixed(1) : "0";

        // Direction Probs
        const p_LL = getProb(d_ll, d_l_count);
        const p_LR = getProb(d_lr, d_l_count); // L->R (Flip)
        const p_RR = getProb(d_rr, d_r_count);
        const p_RL = getProb(d_rl, d_r_count); // R->L (Flip)

        // Line Probs
        const p_33 = getProb(l_33, l_3_count);
        const p_34 = getProb(l_34, l_3_count);
        const p_44 = getProb(l_44, l_4_count);
        const p_43 = getProb(l_43, l_4_count);

        // OE Probs
        const p_OO = getProb(o_oo, o_o_count);
        const p_OE = getProb(o_oe, o_o_count);
        const p_EE = getProb(o_ee, o_e_count);
        const p_EO = getProb(o_eo, o_e_count);

        // Explicitly identify the LAST round state for AI clarity
        const lastRound = rawData[rawData.length - 1] || "Unknown";
        const lastD = lastRound.includes('L') ? 'L' : (lastRound.includes('R') ? 'R' : '?');
        const lastLine = lastRound.includes('3') ? '3' : (lastRound.includes('4') ? '4' : '?');
        const lastOE = lastRound.includes('O') ? 'Odd' : (lastRound.includes('E') ? 'Even' : 'Odd'); // Assuming O/E logic

        // 3. 요약 텍스트 생성
        const summaryText = `Short-Term Markov Analysis (Last ${ROLLING_WINDOW}):
[Current State]
- Last Round: ${lastRound} (Direction=${lastD}, Line=${lastLine}, OE=${lastOE})

[Direction L/R]
- L Transition: Keep=${p_LL}%, Flip=${p_LR}%
- R Transition: Keep=${p_RR}%, Flip=${p_RL}%

[Line 3/4]
- 3-Line Transition: Keep=${p_33}%, Flip=${p_34}%
- 4-Line Transition: Keep=${p_44}%, Flip=${p_43}%

[Odd/Even O/E]
- Odd Transition: Keep=${p_OO}%, Flip=${p_OE}%
- Even Transition: Keep=${p_EE}%, Flip=${p_EO}%

Focus: Analyze the 'Current State' against the transitions above to predict the next outcome.`;

        // 4. Layer 1 (Macro) 계산
        const total = allRounds.length;
        const lTotal = allRounds.filter(r => r.includes('L')).length;
        const line3Total = allRounds.filter(r => r.includes('3')).length;
        const oddTotal = allRounds.filter(r => r.includes('O')).length; // Assuming 'O' for Odd

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((lTotal / total * 100).toFixed(1)) : 0,
                today_3_prob: total > 0 ? parseFloat((line3Total / total * 100).toFixed(1)) : 0,
                today_o_prob: total > 0 ? parseFloat((oddTotal / total * 100).toFixed(1)) : 0
            },
            layer2_rolling: {
                summary_text: summaryText,
                stats: {
                    lastRound: { dir: lastD, line: lastLine, oe: lastOE },
                    transitions: {
                        dir: { LL: parseFloat(p_LL), LR: parseFloat(p_LR), RR: parseFloat(p_RR), RL: parseFloat(p_RL) },
                        line: { L33: parseFloat(p_33), L34: parseFloat(p_34), L44: parseFloat(p_44), L43: parseFloat(p_43) },
                        oe: { OO: parseFloat(p_OO), OE: parseFloat(p_OE), EE: parseFloat(p_EE), EO: parseFloat(p_EO) }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
