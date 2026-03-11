import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineResult } from "../types";
import { getGeminiResponse, getGeminiApiKey } from "../../ai-manager";
import * as admin from "firebase-admin";

/**
 * [Step 7] Phase 4 실행 프로그램 (Bot 20: Master)
 * - 입력: 모든 이전 단계 결과 (01-19)
 * - 로직: 모든 의견을 종합하여 최종 승부 예측 (Final Decision)
 * - 출력: step7_final_result.json
 */
export class Phase4Executor {
    private db: admin.firestore.Firestore;
    private apiKey: string | null = null;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 7] Running Phase 4 (Bot 20 - Master)...`);

        if (!this.apiKey) {
            this.apiKey = await getGeminiApiKey(this.db);
            if (!this.apiKey) throw new Error("Gemini API Key not found.");
        }

        // 1. 모든 결과 로드
        const res01_15 = PipelineFileManager.loadJson<IPipelineResult[]>(`step4_results_01_15_${dateStr}.json`);
        const res16_18 = PipelineFileManager.loadJson<IPipelineResult[]>(`step5_results_16_18_${dateStr}.json`);
        const res19 = PipelineFileManager.loadJson<IPipelineResult[]>(`step6_result_19_${dateStr}.json`);

        // 2. 요약
        const summary = `
[Analysis Bots 01-15]
${res01_15.map(b => `${b.botId}: ${b.prediction}`).join(", ")}

[Evaluator Bots 16-18]
${res16_18.map(b => `${b.botId}: ${b.prediction} (Risk: ${b.risk_level})`).join("\n")}

[Global Bot 19]
${res19.map(b => `${b.botId}: ${b.prediction}`).join("\n")}
`;

        // 3. Prompt
        const promptText = `
You are AlphaPick's BOT_20 (Master Bot).
Objective: Make the FINAL decision based on all expert inputs.

${summary}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_20",
  "prediction": "L3O", 
  "confidence": 90,
  "risk_level": "LOW",
  "reason": "Final decision based on strong consensus."
}
Risk Control: If no strong consensus or risk is high, output "PASS".
`;

        // 4. Execution
        let result: IPipelineResult;
        try {
            const aiResponseText = await getGeminiResponse(this.apiKey, "You are the Master AI Decision Maker.", promptText, "gemini-pro");
            const cleaned = this.cleanJsonString(aiResponseText);
            const parsed = JSON.parse(cleaned);

            result = {
                botId: "BOT_20",
                prediction: parsed.prediction || "PASS",
                confidence: parsed.confidence || 0,
                risk_level: parsed.risk_level || "UNKNOWN",
                reason: parsed.reason || "Master Decision"
            };
        } catch (e: any) {
            console.error("Error running BOT_20:", e.message);
            result = { botId: "BOT_20", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: e.message };
        }

        // 5. Save
        const filename = `step7_final_result_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, [result]);
        console.log(`[Step 7] Complete. Final Result saved to: ${savedPath}`);
        return savedPath;
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
