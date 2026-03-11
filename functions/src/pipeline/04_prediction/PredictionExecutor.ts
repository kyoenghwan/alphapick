import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelinePrompt, IPipelineResult } from "../types";
import { getGeminiResponse, getGeminiApiKey } from "../../ai-manager";
import * as admin from "firebase-admin";

/**
 * [Step 4] AI 예측 실행 프로그램 (Phase 1: Bots 01~15)
 * - 입력: Step 3에서 생성된 step3_prompts_01_15.json
 * - 로직: 구글 Gemini AI API를 호출하여 각 봇의 예측 결과를 수신
 * - 출력: step4_results_01_15.json
 */
export class PredictionExecutor {
    private db: admin.firestore.Firestore;
    private apiKey: string | null = null;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 4] Running AI Predictions for Bots 01-15...`);

        // API Key 로드
        if (!this.apiKey) {
            this.apiKey = await getGeminiApiKey(this.db);
            if (!this.apiKey) throw new Error("Gemini API Key not found.");
        }

        // 1. Step 3 데이터 로드
        const step3Filename = `step3_prompts_01_15_${dateStr}.json`;
        const prompts = PipelineFileManager.loadJson<IPipelinePrompt[]>(step3Filename);

        if (!prompts || prompts.length === 0) {
            throw new Error("No prompt data found in Step 3 JSON.");
        }



        // 2. 각 봇별 AI API 호출 (병렬 처리 - Promise.all)
        const promptPromises = prompts.map(async (promptItem) => {
            const { botId, promptText } = promptItem;
            console.log(`Running Bot: ${botId}...`);

            try {
                // AI API 호출 (System Prompt는 ai-manager 내부 로직 따름)
                const aiResponseText = await getGeminiResponse(this.apiKey, "You are a professional lottery analyst AI.", promptText, "gemini-pro");

                // JSON 파싱
                const cleanedJson = this.cleanJsonString(aiResponseText);
                const parsedResult = JSON.parse(cleanedJson);

                const result: IPipelineResult = {
                    botId: parsedResult.bot_id || botId,
                    prediction: parsedResult.prediction || "PASS",
                    confidence: parsedResult.confidence || 0,
                    risk_level: parsedResult.risk_level || "UNKNOWN",
                    reason: parsedResult.reason || "AI Error"
                };

                // 개별 파일 저장 (비동기로 처리하되, 메인 흐름을 막지 않음)
                PipelineFileManager.saveJson(`details/step4_${result.botId}_result_${dateStr}.json`, result);

                return result;

            } catch (error: any) {
                console.error(`Error running ${botId}:`, error.message);
                const errorResult: IPipelineResult = {
                    botId,
                    prediction: "PASS",
                    confidence: 0,
                    risk_level: "ERROR",
                    reason: `Error: ${error.message}`
                };
                PipelineFileManager.saveJson(`details/step4_${botId}_result_${dateStr}.json`, errorResult);
                return errorResult;
            }
        });

        const results = await Promise.all(promptPromises);

        // 3. (Optional) Wait completely for file writes if needed, but saveJson is usually sync in this project or ignored.
        // In this project PipelineFileManager seems to use fs.writeFileSync based heavily on context, 
        // but if it's sync, the above map works. If async, we might not await individual saves needed
        // Since loadJson/saveJson in PipelineFileManager likely use fs.readFileSync/writeFileSync (standard for simple scripts), this is fine.


        // 4. 통합 JSON 저장
        const filename = `step4_results_01_15_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, results);

        console.log(`[Step 4] Complete. Results saved to: ${savedPath} (Details in /data/details/)`);
        return savedPath;
    }

    // Helper: JSON 문자열 정제
    private cleanJsonString(raw: string): string {
        try {
            let cleared = raw.replace(/```json/g, "").replace(/```/g, "").trim();
            // 가끔 AI가 부가 설명 텍스트를 붙이는 경우, 첫 '{' 와 마지막 '}' 사이만 추출
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
