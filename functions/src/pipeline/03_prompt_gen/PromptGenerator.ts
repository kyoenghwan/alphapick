import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineSummary, IPipelinePrompt } from "../types";

/**
 * [Step 3] AI 프롬프트 생성 프로그램 (Phase 1: Bots 01~15)
 * - 입력: Step 2에서 생성된 step2_summaries_01_15.json
 * - 로직: 각 봇별 프롬프트 템플릿에 요약 데이터를 주입하여 최종 프롬프트 텍스트 생성
 * - 출력: step3_prompts_01_15.json
 */
export class PromptGenerator {

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 3] Generating Prompts for Bots 01-15...`);

        // 1. Step 2 데이터 로드
        const step2Filename = `step2_summaries_01_15_${dateStr}.json`;
        const summaries = PipelineFileManager.loadJson<IPipelineSummary[]>(step2Filename);

        if (!summaries || summaries.length === 0) {
            throw new Error("No summary data found in Step 2 JSON.");
        }

        const prompts: IPipelinePrompt[] = [];

        // 2. 각 봇별 프롬프트 생성
        for (const summary of summaries) {
            const { botId, layer1_macro, layer2_rolling, layer3_raw } = summary;
            let promptText = "";

            // 봇 ID로 템플릿 선택 (실제로는 더 세분화될 수 있음)
            // 여기서는 그룹별 대표 템플릿을 사용하여 구현
            const botNum = parseInt(botId.split('_')[1]);

            if (botNum <= 5) {
                // [ST Group 01-05]
                promptText = PromptGenerator.getSTPromptTemplate(botId, layer1_macro, layer2_rolling, layer3_raw);
            } else if (botNum <= 10) {
                // [MT Group 06-10]
                promptText = PromptGenerator.getMTPromptTemplate(botId, layer1_macro, layer2_rolling, layer3_raw);
            } else {
                // [LT Group 11-15]
                promptText = PromptGenerator.getLTPromptTemplate(botId, layer1_macro, layer2_rolling, layer3_raw);
            }

            prompts.push({
                botId,
                promptText
            });
        }

        // 3. 개별 파일 저장
        for (const p of prompts) {
            PipelineFileManager.saveJson(`details/step3_${p.botId}_prompt_${dateStr}.json`, p);
        }

        // 4. 통합 JSON 저장
        const filename = `step3_prompts_01_15_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, prompts);

        console.log(`[Step 3] Complete. Prompts saved to: ${savedPath} (Details in /data/details/)`);
        return savedPath;
    }

    // --- Templates ---
    // Public Static for reuse in SingleBotExecutor (Admin Test)

    // --- Bot Strategies Definition ---
    private static readonly BOT_STRATEGIES: Record<string, string> = {
        // [Short-Term Group: STREAK & PATTERN]
        "BOT_01": "Methodology: Analyze **Markov Chain**. Calculate Transition Probability (Keep vs Flip) from the last state of the current pattern (Layer 3). Compare with historical stats (Layer 2). Logic: If >70% maintained in history, predict 'Maintain'.",
        "BOT_02": "Methodology: Analyze **Pongdang (Alternating) Lifespan**. Measure current alternating length. Compare with average lifespan in Layer 2. Logic: If current length > average lifespan, predict 'Break' (Streak or Copy).",
        "BOT_03": "Methodology: Analyze **EMA (Exponential Moving Average)**. Treat L=+1, R=-1. Calculate momentum. Logic: If EMA slope is steep, predict 'Momentum Continuation'.",
        "BOT_04": "Methodology: Analyze **Z-Score (Standard Deviation)**. Measure deviation of L/R/3/4 ratios from mean. Logic: If Z-Score > ±2.0 (Extreme), predict 'Mean Reversion' (Opposite).",
        "BOT_05": "Methodology: Analyze **KNN (K-Nearest Neighbors)**. Search for the current 5-step pattern in history (Layer 2/3). Logic: Follow the majority outcome of the top 10 most similar past patterns.",

        // [Mid-Term Group: TREND & MOMENTUM]
        "BOT_06": "Methodology: Analyze **Bayesian Inference**. Update 30-day Prior probability with likelihood of recent results. Logic: Filter short-term noise and follow the 'Posterior' probability.",
        "BOT_07": "Methodology: Analyze **Deviation Gap**. Compare 24h average win rate vs recent 100 round win rate. Logic: Apply 'Law of Total Probability' - Pick the under-represented side.",
        "BOT_08": "Methodology: Analyze **Time-Series Cycle**. Identify wave patterns (1-2 hour peaks/troughs) in Layer 2. Logic: Predict next phase (Rising/Falling) of the wave.",
        "BOT_09": "Methodology: Analyze **Trend Strength (MA)**. Check Moving Averages (60/120 period). Logic: If MA aligns (Golden Cross), follow Trend. If Divergent, PASS or Revert.",
        "BOT_10": "Methodology: Analyze **Backtest Validator**. Check which strategy (Decal/Streak/etc) is winning currently. Logic: 'Meta-Gaming' - Copy the currently winning strategy.",

        // [Long-Term Group: EQUILIBRIUM]
        "BOT_11": "Methodology: Analyze **Law of Large Numbers**. Compare 30-day Macro stats vs All-time Equilibrium. Logic: Bet on the outcome that is strictly 'Running Behind' its theoretical prob.",
        "BOT_12": "Methodology: Analyze **Macro Z-Score**. Compare 24h deviation vs 48h rolling mean. Logic: Detect daily-level extremes and predict correction.",
        "BOT_13": "Methodology: Analyze **Regression Matching (Fractals)**. Find long-term similar curves in 30-day history. Logic: History repeats—follow the fractal continuation.",
        "BOT_14": "Methodology: Analyze **Giant Cycle**. Identify 3-day major wave pivot points. Logic: Predict Trend Reversal at major pivot points.",
        "BOT_15": "Methodology: Analyze **Rare Patterns (Black Swan)**. Detailed scan for anomalies (e.g. 15-streaks). Logic: Bet strictly AGAINST anomalies unless confirmed by Macro.",

        // [Special/Risk Group]
        "BOT_16": "Methodology: **Group Evaluator (Short-Term)**. Review BOT_01~05 predictions. Logic: If variance is high, PASS. If consensus > 4/5, follow Consensus.",
        "BOT_17": "Methodology: **Group Evaluator (Mid-Term)**. Review BOT_06~10. Logic: Weight BOT_09 (Trend) higher. Ensure alignment with 24h Trend.",
        "BOT_18": "Methodology: **Group Evaluator (Long-Term)**. Review BOT_11~15. Logic: Only approve if Macro Z-Score supports the Short-Term signal.",
        "BOT_19": "Methodology: **Global Integrator**. Synthesize signals from ST, MT, LT groups. Logic: Resolve conflicts (e.g. ST=L, LT=R -> Look at Momentum).",
        "BOT_20": "Methodology: **The Master Filter**. Capital Protection Mode. Logic: 1. Conflict Check. 2. Confidence Check (>60%). 3. Risk Check. Output PASS if ANY fail."
    };

    private static getStrategy(botId: string): string {
        return this.BOT_STRATEGIES[botId] || "Methodology: Analyze patterns using standard statistical methods.";
    }

    public static getSTPromptTemplate(botId: string, l1: any, l2: any, l3: string[], round?: number): string {
        const strategy = PromptGenerator.getStrategy(botId);
        return `
You are AlphaPick's ${botId} (Short-Term Group).
Objective: Analyze short-term streak transitions and predict the next outcome${round ? ` (Target Round: ${round})` : ''}.
${strategy}

Instructions:
1. Apply your specific Methodology defined above.
2. Rank factors by strength relevant to YOUR strategy.
3. Determine the 4 Valid Outcomes (L3O, L4X, R3X, R4O).
4. Calculate Confidence (0-100%) based on how perfectly the data fits YOUR strategy.

[Layer 1: Macro (30-Day)]
- L Probability: ${l1.today_l_prob}%
- Max Streak/Pongdang Limits applied.

[Layer 2: Rolling Summary (Last 120)]
${l2.summary_text}

[Layer 3: Raw Data (Last 30)]
${l3.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "${botId}",
  "prediction": "L3O", 
  "confidence": 87,
  "risk_level": "LOW",
  "risk_level": "LOW"
}
${botId === "BOT_20" ? 'Risk Control: If confidence < 60%, output "PASS".' : 'Risk Control: Output your best prediction even if confidence is low. do NOT output "PASS".'}
`;
    }

    public static getMTPromptTemplate(botId: string, l1: any, l2: any, l3: string[], round?: number): string {
        const strategy = PromptGenerator.getStrategy(botId);
        return `
You are AlphaPick's ${botId} (Mid-Term Group).
Objective: Analyze mid-term trends (24h Window) and patterns${round ? ` (Target Round: ${round})` : ''}.
${strategy}

Instructions:
1. Apply your specific Methodology defined above.
2. Determine the 4 Valid Outcomes (L3O, L4X, R3X, R4O).
3. Calculate Confidence (0-100%) based on how perfectly the data fits YOUR strategy.
- L Probability: ${l1.today_l_prob}%

[Layer 2: Rolling Summary (Last 480)]
${l2.summary_text}

[Layer 3: Raw Data (Last 100)]
${l3.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "${botId}",
  "prediction": "R4X", 
  "confidence": 82,
  "risk_level": "MID",
  "risk_level": "MID"
}
${botId === "BOT_20" ? 'Risk Control: If confidence < 60%, output "PASS".' : 'Risk Control: Output your best prediction even if confidence is low. do NOT output "PASS".'}
`;
    }

    public static getLTPromptTemplate(botId: string, l1: any, l2: any, l3: string[], round?: number): string {
        const strategy = PromptGenerator.getStrategy(botId);
        return `
You are AlphaPick's ${botId} (Long-Term Group).
Objective: Analyze long-term equilibrium and Law of Large Numbers${round ? ` (Target Round: ${round})` : ''}.
${strategy}

Instructions:
1. Apply your specific Methodology defined above.
2. Determine the 4 Valid Outcomes (L3O, L4X, R3X, R4O).
3. Calculate Confidence (0-100%) based on how perfectly the data fits YOUR strategy.
- L/R Global Balance: ${l2.lt_stats?.l || 0}% / ${l2.lt_stats?.r || 0}%

[Layer 2: Rolling Summary (Last 1440)]
${l2.summary_text}

[Layer 3: Recent Snippet (Last 100)]
${l3.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "${botId}",
  "prediction": "L4O", 
  "confidence": 75,
  "risk_level": "HIGH",
  "risk_level": "HIGH"
}
${botId === "BOT_20" ? 'Risk Control: If confidence < 60%, output "PASS".' : 'Risk Control: Output your best prediction even if confidence is low. do NOT output "PASS".'}
`;
    }
}
