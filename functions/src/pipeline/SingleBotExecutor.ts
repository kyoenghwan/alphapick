import { IPipelineGameData, IPipelineResult } from "./types";
import { PromptGenerator } from "./03_prompt_gen/PromptGenerator";
import { getGeminiResponse } from "../ai-manager";
import { Gen_BOT01_Markov } from "./02_summary_gen/generators/Gen_BOT01_Markov";
import { Gen_BOT02_Pongdang } from "./02_summary_gen/generators/Gen_BOT02_Pongdang";
import { Gen_BOT03_EMA } from "./02_summary_gen/generators/Gen_BOT03_EMA";
import { Gen_BOT04_ZScore } from "./02_summary_gen/generators/Gen_BOT04_ZScore";
import { Gen_BOT05_KNN } from "./02_summary_gen/generators/Gen_BOT05_KNN";
import { Gen_BOT06_Bayes } from "./02_summary_gen/generators/Gen_BOT06_Bayes";
import { Gen_BOT07_Deviation } from "./02_summary_gen/generators/Gen_BOT07_Deviation";
import { Gen_BOT08_Cycle } from "./02_summary_gen/generators/Gen_BOT08_Cycle";
import { Gen_BOT09_Trend } from "./02_summary_gen/generators/Gen_BOT09_Trend";
import { Gen_BOT10_Pattern } from "./02_summary_gen/generators/Gen_BOT10_Pattern";
import { Gen_BOT11_LLN } from "./02_summary_gen/generators/Gen_BOT11_LLN";
import { Gen_BOT12_ZScoreMacro } from "./02_summary_gen/generators/Gen_BOT12_ZScoreMacro";
import { Gen_BOT13_Regression } from "./02_summary_gen/generators/Gen_BOT13_Regression";
import { Gen_BOT14_GiantCycle } from "./02_summary_gen/generators/Gen_BOT14_GiantCycle";
import { Gen_BOT15_RarePattern } from "./02_summary_gen/generators/Gen_BOT15_RarePattern";

export class SingleBotExecutor {

    async run(botId: string, gameData: IPipelineGameData, apiKey: string): Promise<{ summary: any, prediction: IPipelineResult }> {
        console.log(`[SingleBotExecutor] Running ${botId}...`);

        const allRounds = gameData.allRounds;
        if (!allRounds || allRounds.length === 0) {
            throw new Error("No round data found.");
        }

        // 1. Generate Summary (Step 2)
        const summary = this.generateSummary(botId, allRounds);

        // 2. Generate Prompt (Step 3 Logic)
        const botNum = parseInt(botId.split('_')[1]);
        let promptText = "";

        if (botNum <= 5) {
            promptText = PromptGenerator.getSTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        } else if (botNum <= 10) {
            promptText = PromptGenerator.getMTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        } else {
            promptText = PromptGenerator.getLTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        }

        // 3. Execute AI Prediction (Step 4)
        console.log(`[SingleBotExecutor] Calling AI for ${botId}...`);

        let result: IPipelineResult;

        try {
            const aiResponseText = await getGeminiResponse(apiKey, "You are a professional lottery analyst AI.", promptText, "gemini-pro");
            const cleanedJson = this.cleanJsonString(aiResponseText);
            const parsed = JSON.parse(cleanedJson);

            result = {
                botId: parsed.bot_id || botId,
                prediction: parsed.prediction || "PASS",
                confidence: parsed.confidence || 0,
                risk_level: parsed.risk_level || "UNKNOWN",
                reason: parsed.reason || "AI Error"
            };

        } catch (error: any) {
            console.error(`[SingleBotExecutor] Error: ${error.message}`);
            result = {
                botId,
                prediction: "PASS",
                confidence: 0,
                risk_level: "ERROR",
                reason: `Execution Error: ${error.message}`
            };
        }

        return {
            summary,
            prediction: result
        };
    }

    public generateSummary(botId: string, allRounds: string[]): any {
        switch (botId) {
            case "BOT_01": return new Gen_BOT01_Markov().generate(allRounds);
            case "BOT_02": return new Gen_BOT02_Pongdang().generate(allRounds);
            case "BOT_03": return new Gen_BOT03_EMA().generate(allRounds);
            case "BOT_04": return new Gen_BOT04_ZScore().generate(allRounds);
            case "BOT_05": return new Gen_BOT05_KNN().generate(allRounds);
            case "BOT_06": return new Gen_BOT06_Bayes().generate(allRounds);
            case "BOT_07": return new Gen_BOT07_Deviation().generate(allRounds);
            case "BOT_08": return new Gen_BOT08_Cycle().generate(allRounds);
            case "BOT_09": return new Gen_BOT09_Trend().generate(allRounds);
            case "BOT_10": return new Gen_BOT10_Pattern().generate(allRounds);
            case "BOT_11": return new Gen_BOT11_LLN().generate(allRounds);
            case "BOT_12": return new Gen_BOT12_ZScoreMacro().generate(allRounds);
            case "BOT_13": return new Gen_BOT13_Regression().generate(allRounds);
            case "BOT_14": return new Gen_BOT14_GiantCycle().generate(allRounds);
            case "BOT_15": return new Gen_BOT15_RarePattern().generate(allRounds);
            default: throw new Error(`Unknown Bot ID: ${botId}`);
        }
    }

    private cleanJsonString(raw: string): string {
        try {
            let cleared = raw.replace(/```json/g, "").replace(/```/g, "").trim();
            const firstBrace = cleared.indexOf('{');
            const lastBrace = cleared.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleared = cleared.substring(firstBrace, lastBrace + 1);
            }
            return cleared;
        } catch (e) {
            return raw;
        }
    }
}
