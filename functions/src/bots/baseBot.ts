import { IBot, IBotResult, IGameData } from "./types";
import { StorageManager } from "./storageManager";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";

export abstract class BaseBot implements IBot {
    abstract id: string;
    abstract type: "ST" | "MT" | "LT" | "SP";
    protected genAI: GoogleGenerativeAI;
    protected modelName: string = "gemini-1.5-flash";

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    // 각 봇이 구현해야 할 프롬프트 생성 로직
    protected abstract createPrompt(data: IGameData, history?: IBotResult): string;

    async analyze(gameData?: IGameData, previousHistory?: IBotResult): Promise<IBotResult> {
        try {
            // 1. Data Loading: If not provided, load from local storage
            const data = gameData || await StorageManager.loadGameData();
            if (!data) throw new Error(`No game data available for ${this.id}`);

            // 2. Prompt Creation
            const prompt = this.createPrompt(data, previousHistory);

            // 3. AI Execution
            const model = this.genAI.getGenerativeModel({
                model: this.modelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // 4. Parsing
            let parsed: any;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                logger.error(`${this.id} JSON Parse Error`, { responseText });
                throw new Error("Invalid JSON response from AI");
            }

            // 5. Result Construction
            const botResult: IBotResult = {
                bot_id: this.id as any,
                prediction: parsed.prediction || "PASS",
                confidence: parsed.confidence || 0,
                risk_level: parsed.risk_level || "MEDIUM",
                reason: parsed.reason || "No reason provided",
                timestamp: Date.now()
            };

            // 6. Save Result locally
            await StorageManager.saveBotResult(botResult);

            return botResult;

        } catch (error: any) {
            logger.error(`${this.id} Analysis Error:`, error);
            const errorResult: IBotResult = {
                bot_id: this.id as any, // Cast for safety if id is generic string
                prediction: "PASS",
                confidence: 0,
                risk_level: "HIGH",
                reason: `System Error: ${error.message}`,
                timestamp: Date.now()
            };
            return errorResult;
        }
    }
}
