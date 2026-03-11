import { IBotSummaryGenerator } from "./IGenerator";
import { IPipelineSummary } from "../../types";

/**
 * [BOT_06] 베이지안 추론 분석기 (Mid-Term)
 * - 목표: 사전 확률(30일 전체 평균) 대비 현재 구간(사후 확률)의 업데이트를 통해 추세 판단.
 * - 데이터 범위:
 *   - Raw: 최근 60회
 *   - Rolling: 최근 480회 (24시간)
 */
export class Gen_BOT06_Bayes implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_06";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 60;

        const rollingData = allRounds.slice(-ROLLING_WINDOW); // 24시간
        const rawData = allRounds.slice(-RAW_WINDOW); // 최근 1시간 정도

        // Helper for Bayes
        const calcBayes = (totalRounds: string[], rolling: string[], checker: (s: string) => boolean, label: string) => {
            const prior = totalRounds.length > 0 ? totalRounds.filter(checker).length / totalRounds.length : 0.5;
            const evidence = rolling.length > 0 ? rolling.filter(checker).length / rolling.length : 0.5;

            // Posterior = (Likelihood * Prior) / Evidence
            // Simplified Bayes Update: Posterior = (Prior * Evidence_weight) ...
            // Let's use simple weighted update or just 'Shift' analysis.
            // If Evidence (recent) differs from Prior (long-term), tendency is shifting.

            const posterior = (prior * 0.7) + (evidence * 0.3); // Weighted update

            const shift = Math.abs(evidence - prior);
            let interp = "Stable";
            if (shift > 0.05) interp = `Shifting ${evidence > prior ? 'Up' : 'Down'}`;

            return {
                prior: (prior * 100).toFixed(1),
                evidence: (evidence * 100).toFixed(1),
                post: (posterior * 100).toFixed(1),
                interp
            };
        };

        const bayesD = calcBayes(allRounds, rollingData, r => r.includes('L'), 'Left');
        const bayesL = calcBayes(allRounds, rollingData, r => r.includes('3'), '3-Line');
        const bayesO = calcBayes(allRounds, rollingData, r => r.includes('O'), 'Odd');

        const summaryText = `Bayesian Trend Update (Prior=Global, Evidence=Last ${ROLLING_WINDOW}):
[Direction L/R]
- Prior: ${bayesD.prior}% -> Evidence: ${bayesD.evidence}%
- Posterior: ${bayesD.post}% (${bayesD.interp})

[Line 3/4]
- Prior: ${bayesL.prior}% -> Evidence: ${bayesL.evidence}%
- Posterior: ${bayesL.post}% (${bayesL.interp})

[Odd/Even O/E]
- Prior: ${bayesO.prior}% -> Evidence: ${bayesO.evidence}%
- Posterior: ${bayesO.post}% (${bayesO.interp})

Focus: How recent evidence shifts the long-term prior belief.`;

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
                    bayes: {
                        dir: { prior: parseFloat(bayesD.prior), evidence: parseFloat(bayesD.evidence), post: parseFloat(bayesD.post), interp: bayesD.interp },
                        line: { prior: parseFloat(bayesL.prior), evidence: parseFloat(bayesL.evidence), post: parseFloat(bayesL.post), interp: bayesL.interp },
                        oe: { prior: parseFloat(bayesO.prior), evidence: parseFloat(bayesO.evidence), post: parseFloat(bayesO.post), interp: bayesO.interp }
                    }
                }
            },
            layer3_raw: rawData
        };
    }
}
