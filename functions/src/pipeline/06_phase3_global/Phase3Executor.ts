import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineResult } from "../types";
import { getGeminiResponse, getGeminiApiKey } from "../../ai-manager";
import * as admin from "firebase-admin";

/**
 * [Step 6] Phase 3 실행 프로그램 (Bot 19: Global Sentiment)
 * - 입력: Step 4 결과 (01-15) + Step 5 결과 (16-18)
 * - 로직: 전체 봇들의 흐름과 Evaluator들의 의견을 종합하여 Global Sentiment 예측
 * - 출력: step6_result_19.json
 */
export class Phase3Executor {
    private db: admin.firestore.Firestore;
    private apiKey: string | null = null;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 6] Running Phase 3 (Bot 19)...`);

        if (!this.apiKey) {
            this.apiKey = await getGeminiApiKey(this.db);
            if (!this.apiKey) throw new Error("Gemini API Key not found.");
        }

        // 1. 이전 단계 결과 로드
        const res01_15 = PipelineFileManager.loadJson<IPipelineResult[]>(`step4_results_01_15_${dateStr}.json`);
        const res16_18 = PipelineFileManager.loadJson<IPipelineResult[]>(`step5_results_16_18_${dateStr}.json`);

        // 2. 입력 요약
        const summary = `
[Analysis Bots 01-15]
${res01_15.map(b => `${b.botId}: ${b.prediction}`).join(", ")}

[Evaluator Bots 16-18]
${res16_18.map(b => `${b.botId}: ${b.prediction} (Risk: ${b.risk_level})`).join("\n")}
`;

        // 3. Prompt
        const promptText = `
You are AlphaPick's BOT_19 (Global Sentiment).
Objective: Synthesize all bot outputs to determine the market sentiment.

${summary}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_19",
  "prediction": "PASS",
  "confidence": 0,
  "risk_level": "LOW",
  "reason": "Global sentiment analysis."
}
`;

        // 4. Execution
        let result: IPipelineResult;
        try {
            const aiResponseText = await getGeminiResponse(this.apiKey, "You are a professional market analyst AI.", promptText, "gemini-pro");
            const cleaned = this.cleanJsonString(aiResponseText);
            const parsed = JSON.parse(cleaned);

            result = {
                botId: "BOT_19",
                prediction: parsed.prediction || "PASS",
                confidence: parsed.confidence || 0,
                risk_level: parsed.risk_level || "UNKNOWN",
                reason: parsed.reason || "Global Analysis"
            };
        } catch (e: any) {
            console.error("Error running BOT_19:", e.message);
            result = { botId: "BOT_19", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: e.message };
        }

        // 5. Save
        const filename = `step6_result_19_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, [result]);
        console.log(`[Step 6] Complete. Result saved to: ${savedPath}`);
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
