import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { IBotResult, IGameData } from "./types";
import * as logger from "firebase-functions/logger";

const TMP_DIR = os.tmpdir();
const GAME_DATA_FILE = "game_data_latest.json";

export class StorageManager {
    // 게임 데이터 저장 (Source of Truth)
    static async saveGameData(data: IGameData): Promise<void> {
        const filePath = path.join(TMP_DIR, GAME_DATA_FILE);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    // 게임 데이터 로드
    static async loadGameData(): Promise<IGameData | null> {
        const filePath = path.join(TMP_DIR, GAME_DATA_FILE);
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return JSON.parse(content) as IGameData;
        } catch (error) {
            logger.warn(`Failed to load game data from ${filePath}`, error);
            return null;
        }
    }

    // 개별 봇 결과 저장
    static async saveBotResult(result: IBotResult): Promise<void> {
        const fileName = `bot_${result.bot_id}_latest.json`;
        const filePath = path.join(TMP_DIR, fileName);
        await fs.writeFile(filePath, JSON.stringify(result, null, 2));
    }

    // 개별 봇 결과 로드
    static async loadBotResult(botId: string): Promise<IBotResult | null> {
        const fileName = `bot_${botId}_latest.json`;
        const filePath = path.join(TMP_DIR, fileName);
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return JSON.parse(content) as IBotResult;
        } catch (error) {
            // 파일이 없으면 아직 실행 안 된 것
            return null;
        }
    }

    // 모든 봇 결과 로드 (Master Bot용)
    static async loadAllBotResults(): Promise<IBotResult[]> {
        const results: IBotResult[] = [];
        const botIds = [
            "BOT_01", "BOT_02", "BOT_03", "BOT_04", "BOT_05",
            "BOT_06", "BOT_07", "BOT_08", "BOT_09", "BOT_10",
            "BOT_11", "BOT_12", "BOT_13", "BOT_14", "BOT_15",
            "BOT_16", "BOT_17", "BOT_18", "BOT_19"
        ];

        for (const id of botIds) {
            const res = await this.loadBotResult(id);
            if (res) results.push(res);
        }
        return results;
    }
}
