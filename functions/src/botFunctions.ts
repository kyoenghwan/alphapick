import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getGeminiApiKey } from "./ai-manager";
import { BotManager } from "./bots/botManager";

// Helper to get DB (simplified version of index.ts logic)
async function getDb(): Promise<admin.firestore.Firestore> {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    return admin.firestore();
}

/**
 * [Bot Test] Test Game Data Generation
 * 특정 날짜 기준 30일치 데이터를 가져와서 로컬 JSON (game_data_latest.json)을 생성합니다.
 */
export const generateBotTestGameData = onRequest({
    cors: true,
    timeoutSeconds: 300
}, async (req, res) => {
    try {
        const { gameId, date } = req.body;
        if (!gameId || !date) {
            res.status(400).json({ error: "gameId와 date가 필요합니다." });
            return;
        }

        const db = await getDb();
        const apiKey = await getGeminiApiKey(db);
        if (!apiKey) throw new Error("API Key not found");

        const botManager = new BotManager(db, apiKey);
        const gameData = await botManager.generateTestGameData(gameId, date);

        res.status(200).json({ success: true, message: `Game Data generated for ${date}`, dataSummary: gameData.layer2_rolling });
    } catch (error: any) {
        logger.error("generateBotTestGameData error:", error);
        res.status(200).json({ success: false, message: error.message });
    }
});

/**
 * [Bot Test] Preview Bot Prompt
 * 특정 봇의 프롬프트를 미리보기합니다. (AI 호출 X)
 */
export const previewBotPrompt = onRequest({
    cors: true
}, async (req, res) => {
    try {
        const { botId, gameId, date } = req.body;
        if (!botId || !gameId || !date) {
            res.status(400).json({ error: "botId, gameId, date가 필요합니다." });
            return;
        }

        const db = await getDb();
        const apiKey = await getGeminiApiKey(db);
        if (!apiKey) throw new Error("API Key not found");

        // Note: BotManager doesn't expose just "getPrompt" yet easily without "analyze".
        // Temporarily returning not implemented or mocked.
        res.status(501).json({ error: "Preview Prompt Not Implemented Yet" });
    } catch (error: any) {
        logger.error("previewBotPrompt error:", error);
        res.status(200).json({ success: false, message: error.message });
    }
});

/**
 * [Bot Test] Run Bot Prediction
 * 특정 봇을 실행하여 결과를 반환합니다.
 */
export const runBotTest = onRequest({
    cors: true,
    timeoutSeconds: 60
}, async (req, res) => {
    try {
        const { botId } = req.body;
        if (!botId) {
            res.status(400).json({ error: "botId가 필요합니다." });
            return;
        }

        const db = await getDb();
        const apiKey = await getGeminiApiKey(db);
        if (!apiKey) throw new Error("API Key not found");

        const botManager = new BotManager(db, apiKey);
        const result = await botManager.runBot(botId);

        res.status(200).json({ success: true, result });
    } catch (error: any) {
        logger.error("runBotTest error:", error);
        res.status(200).json({ success: false, message: error.message });
    }
});
