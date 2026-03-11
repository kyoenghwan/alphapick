import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineResult } from "../types";
import { getGeminiResponse, getGeminiApiKey } from "../../ai-manager";
import * as admin from "firebase-admin";

/**
 * [Step 5] Phase 2 실행 프로그램 (Bots 16-18: Evaluators)
 * - 입력: Step 1 데이터 + Step 4 결과 (Bots 01-15)
 * - 로직:
 *   1. 이전 01-15번 봇들의 예측 결과를 분석 (Summary)
 *   2. Evaluator 봇(16: ST, 17: MT, 18: LT) 프롬프트 생성
 *   3. AI 예측 실행
 * - 출력: step5_results_16_18.json
 */
export class Phase2Executor {
    private db: admin.firestore.Firestore;
    private apiKey: string | null = null;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 5] Running Phase 2 (Bots 16-18)...`);

        // API Key
        if (!this.apiKey) {
            this.apiKey = await getGeminiApiKey(this.db);
            if (!this.apiKey) throw new Error("Gemini API Key not found.");
        }

        // 1. 필요한 데이터 로드
        // 1. 필요한 데이터 로드
        // const step1Filename = `step1_game_data_${dateStr}.json`; 
        // const gameData = PipelineFileManager.loadJson<IPipelineGameData>(step1Filename); // gameData unused

        const step4Filename = `step4_results_01_15_${dateStr}.json`;
        const previousResults = PipelineFileManager.loadJson<IPipelineResult[]>(step4Filename);

        // 2. 입력 데이터 요약 (Evaluators용)
        // 각 그룹별 예측 현황을 텍스트로 변환
        const stBots = previousResults.filter(r => parseInt(r.botId.split('_')[1]) <= 5);
        const mtBots = previousResults.filter(r => {
            const n = parseInt(r.botId.split('_')[1]);
            return n >= 6 && n <= 10;
        });
        const ltBots = previousResults.filter(r => {
            const n = parseInt(r.botId.split('_')[1]);
            return n >= 11 && n <= 15;
        });

        const formatResults = (bots: IPipelineResult[]) =>
            bots.map(b => `- ${b.botId}: Pick=${b.prediction}, Conf=${b.confidence}%, Risk=${b.risk_level}`).join("\n");

        const summaries = {
            st: formatResults(stBots),
            mt: formatResults(mtBots),
            lt: formatResults(ltBots)
        };

        // 3. 프롬프트 생성 및 실행
        const evaluatorIds = ["BOT_16", "BOT_17", "BOT_18"];

        const evaluationPromises = evaluatorIds.map(async (botId) => {
            console.log(`Running Bot: ${botId}...`);
            let promptText = "";
            let targetSummary = "";

            // 프롬프트 구성
            if (botId === "BOT_16") {
                targetSummary = `[ST Group Inputs]\n${summaries.st}`;
                promptText = this.getEvaluatorPrompt(botId, "Short-Term", targetSummary);
            } else if (botId === "BOT_17") {
                targetSummary = `[MT Group Inputs]\n${summaries.mt}`;
                promptText = this.getEvaluatorPrompt(botId, "Mid-Term", targetSummary);
            } else if (botId === "BOT_18") {
                targetSummary = `[LT Group Inputs]\n${summaries.lt}`;
                promptText = this.getEvaluatorPrompt(botId, "Long-Term", targetSummary);
            }

            try {
                const aiResponseText = await getGeminiResponse(this.apiKey, "You are a professional lottery evaluator AI.", promptText, "gemini-pro");
                const cleanedJson = this.cleanJsonString(aiResponseText);
                const parsedResult = JSON.parse(cleanedJson);

                return {
                    botId,
                    prediction: parsedResult.prediction || "PASS",
                    confidence: parsedResult.confidence || 0,
                    risk_level: parsedResult.risk_level || "UNKNOWN",
                    reason: parsedResult.reason || "Evaluator error"
                } as IPipelineResult;

            } catch (e: any) {
                console.error(`Error running ${botId}:`, e.message);
                return { botId, prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: e.message } as IPipelineResult;
            }
        });

        const results = await Promise.all(evaluationPromises);

        // 4. 저장
        const filename = `step5_results_16_18_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, results);
        console.log(`[Step 5] Complete. Results saved to: ${savedPath}`);
        return savedPath;
    }

    private getEvaluatorPrompt(botId: string, groupName: string, inputs: string): string {
        return `
You are AlphaPick's ${botId} (${groupName} Evaluator).
Objective: Evaluate the predictions of the ${groupName} bots and determine the best course of action.

${inputs}

OUTPUT STRICT JSON:
{
  "bot_id": "${botId}",
  "prediction": "PASS", 
  "confidence": 0,
  "risk_level": "LOW",
  "reason": "Consensus analysis of inputs."
}
Risk Control: If consensus uses conflicting signals, output "PASS".
`;
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
