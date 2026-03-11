import { PromptGenerator } from "./03_prompt_gen/PromptGenerator";
import { getGeminiResponse } from "../ai-manager";
import { SingleBotExecutor } from "./SingleBotExecutor";
import { DataFetcher } from "./01_data_fetch/DataFetcher";
import * as admin from "firebase-admin";

export class DebugExecutor {
    private db: admin.firestore.Firestore;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    // Step 1: Use DataFetcher (already exists, but wrapped here for consistency if needed)
    async step1_fetchData(gameId: string, dateStr: string) {
        // This is mainly for inspection. In the new flow, Step 2-5 will fetch internally.
        // But we can reuse DataFetcher to save a file for user inspection.
        const fetcher = new DataFetcher(this.db);
        const result = await fetcher.run(gameId, dateStr);
        return result;
    }

    // Step 2: Data Summary (General Stats)
    async step2_generalSummary(gameId: string, dateStr: string) {
        // Fetch data in-memory without saving to file
        const fetcher = new DataFetcher(this.db);
        const gameData = await fetcher.internalFetch(gameId, dateStr);

        if (!gameData.allRounds || gameData.allRounds.length === 0) {
            throw new Error("No data found for summary.");
        }

        // Generate some basic stats
        const total = gameData.allRounds.length;
        const last10 = gameData.allRounds.slice(-10);

        return {
            totalDataCount: total,
            dateRange: {
                start: gameData.datasetInfo.startDate,
                end: gameData.datasetInfo.endDate
            },
            last10Rounds: last10,
            sampleData: gameData.allRounds[0]
        };
    }

    // Step 3: Bot Specific Summary
    async step3_botSummary(botId: string, gameId: string, dateStr: string) {
        const fetcher = new DataFetcher(this.db);
        const gameData = await fetcher.internalFetch(gameId, dateStr);

        // Access private method logic via public wrapper or duplicate logic?
        // SingleBotExecutor's generateSummary is private. 
        // We will make a temporary public accessible instance or method in SingleBotExecutor.
        // Actually, SingleBotExecutor.generateSummary is private. Let's make it public or use 'any' cast.

        const executor = new SingleBotExecutor();
        // @ts-ignore
        const summary = executor.generateSummary(botId, gameData.allRounds);
        return summary;
    }

    // Step 4: Generate Prompt
    async step4_generatePrompt(botId: string, gameId: string, dateStr: string) {
        const summary = await this.step3_botSummary(botId, gameId, dateStr);

        const botNum = parseInt(botId.split('_')[1]);
        let promptText = "";

        if (botNum <= 5) {
            promptText = PromptGenerator.getSTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        } else if (botNum <= 10) {
            promptText = PromptGenerator.getMTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        } else {
            promptText = PromptGenerator.getLTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw);
        }

        return { promptText, summaryUsed: summary };
    }

    // Step 5: Execute AI
    async step5_executeAi(apiKey: string, promptText: string, botId: string) {
        // Call AI
        const executor = new SingleBotExecutor(); // Reuse for cleaning logic

        const aiResponseText = await getGeminiResponse(apiKey, "You are a professional lottery analyst AI.", promptText, "gemini-pro");
        // @ts-ignore
        const cleanedJson = executor.cleanJsonString(aiResponseText);

        let parsed;
        try {
            parsed = JSON.parse(cleanedJson);
        } catch (e) {
            parsed = { error: "JSON Parse Failed", raw: aiResponseText };
        }

        return {
            rawResponse: aiResponseText,
            cleanedJson: cleanedJson,
            parsedResult: parsed
        };
    }
}
