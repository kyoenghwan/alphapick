import { IBot, IBotResult, IGameData } from "./types";
import { StorageManager } from "./storageManager";
import { fetchHistoricalGameData } from "../utils/gameDataUtils";
import { Bot01 } from "./definitions/st_01_markov";
import { Bot02 } from "./definitions/st_02_pongdang";
import { Bot03 } from "./definitions/st_03_ema";
import { Bot04 } from "./definitions/st_04_zscore";
import { Bot05 } from "./definitions/st_05_knn";
import { Bot06 } from "./definitions/mt_06_bayesian";
import { Bot07 } from "./definitions/mt_07_deviation";
import { Bot08 } from "./definitions/mt_08_cycle";
import { Bot09 } from "./definitions/mt_09_trend";
import { Bot10 } from "./definitions/mt_10_backtest";
import { Bot11 } from "./definitions/lt_11_law";
import { Bot12 } from "./definitions/lt_12_macro_z";
import { Bot13 } from "./definitions/lt_13_regression";
import { Bot14 } from "./definitions/lt_14_giant_cycle";
import { Bot15 } from "./definitions/lt_15_rare";
import { Bot16 } from "./definitions/sp_16_st_eval";
import { Bot17 } from "./definitions/sp_17_mt_eval";
import { Bot18 } from "./definitions/sp_18_lt_eval";
import { Bot19 } from "./definitions/sp_19_global";
import { Bot20 } from "./definitions/sp_20_master";
import * as admin from "firebase-admin";

export class BotManager {
    private bots: Map<string, IBot> = new Map();
    private db: admin.firestore.Firestore;
    private apiKey: string;

    constructor(db: admin.firestore.Firestore, apiKey: string) {
        this.db = db;
        this.apiKey = apiKey;
        this.initializeBots();
    }

    private initializeBots() {
        this.registerBot(new Bot01(this.apiKey));
        this.registerBot(new Bot02(this.apiKey));
        this.registerBot(new Bot03(this.apiKey));
        this.registerBot(new Bot04(this.apiKey));
        this.registerBot(new Bot05(this.apiKey));

        this.registerBot(new Bot06(this.apiKey));
        this.registerBot(new Bot07(this.apiKey));
        this.registerBot(new Bot08(this.apiKey));
        this.registerBot(new Bot09(this.apiKey));
        this.registerBot(new Bot10(this.apiKey));

        this.registerBot(new Bot11(this.apiKey));
        this.registerBot(new Bot12(this.apiKey));
        this.registerBot(new Bot13(this.apiKey));
        this.registerBot(new Bot14(this.apiKey));
        this.registerBot(new Bot15(this.apiKey));

        this.registerBot(new Bot16(this.apiKey));
        this.registerBot(new Bot17(this.apiKey));
        this.registerBot(new Bot18(this.apiKey));
        this.registerBot(new Bot19(this.apiKey));
        this.registerBot(new Bot20(this.apiKey));
    }

    private registerBot(bot: IBot) {
        this.bots.set(bot.id, bot);
    }

    getBot(id: string): IBot | undefined {
        return this.bots.get(id);
    }

    /**
     * Executes all bots in 3 phases to ensure dependencies are met.
     * Phase 1: Standard Bots (01-15)
     * Phase 2: Evaluators & Global (16-19) - Receiving Phase 1 results
     * Phase 3: Master (20) - Receiving Phase 1+2 results
     * 
     * @param gameData - The current game data to analyze
     * @param activeGroups - Optional configuration to filter which groups of bots to run.
     *                       Keys: st, mt, lt, comp1, comp2, final
     */
    async runAllBots(gameData: IGameData, activeGroups?: Record<string, boolean>): Promise<IBotResult[]> {
        const results: IBotResult[] = [];

        // Group Definitions
        const isGroupActive = (id: string): boolean => {
            if (!activeGroups) return true;
            const num = parseInt(id.split('_')[1], 10);
            if (num >= 1 && num <= 5) return activeGroups.st !== false;
            if (num >= 6 && num <= 10) return activeGroups.mt !== false;
            if (num >= 11 && num <= 15) return activeGroups.lt !== false;
            if (num >= 16 && num <= 18) return activeGroups.comp1 !== false;
            if (num === 19) return activeGroups.comp2 !== false;
            if (num === 20) return activeGroups.final !== false;
            return true;
        };

        // Phase 1: Run Bots 01-15
        const phase1Ids = Array.from({ length: 15 }, (_, i) => `BOT_${String(i + 1).padStart(2, '0')}`)
            .filter(id => isGroupActive(id));

        if (phase1Ids.length > 0) {
            const phase1Promises = phase1Ids.map(id => this.runBotWithData(id, gameData));
            const phase1Results = await Promise.all(phase1Promises);
            results.push(...phase1Results);
        }

        // Update GameData with Phase 1 results for Phase 2
        const gameDataPhase2 = {
            ...gameData,
            previous_bot_results: results
        };

        // Phase 2: Run Bots 16-19
        const phase2Ids = ["BOT_16", "BOT_17", "BOT_18", "BOT_19"]
            .filter(id => isGroupActive(id));

        if (phase2Ids.length > 0) {
            const phase2Promises = phase2Ids.map(id => this.runBotWithData(id, gameDataPhase2));
            const phase2Results = await Promise.all(phase2Promises);
            results.push(...phase2Results);
        }

        // Update GameData with Phase 1+2 results for Phase 3
        const gameDataPhase3 = {
            ...gameData,
            previous_bot_results: results
        };

        // Phase 3: Run Bot 20
        if (isGroupActive("BOT_20")) {
            const bot20Result = await this.runBotWithData("BOT_20", gameDataPhase3);
            results.push(bot20Result);
        }

        return results;
    }

    // Helper to run a specific bot with provided data (internal use)
    private async runBotWithData(botId: string, data: IGameData): Promise<IBotResult> {
        const bot = this.bots.get(botId);
        if (!bot) throw new Error(`Bot ${botId} not found`);
        return await bot.analyze(data);
    }

    // 테스트용: 특정 봇 실행
    async runBot(botId: string): Promise<IBotResult> {
        const bot = this.bots.get(botId);
        if (!bot) throw new Error(`Bot ${botId} not found`);
        return await bot.analyze(null as any); // Load from local Storage
    }

    // 테스트용: 게임 데이터 준비 (Real Logic)
    async generateTestGameData(gameId: string, dateStr: string): Promise<IGameData> {
        // 1. 30일치 데이터 가져오기 (Raw)
        const historicalData = await fetchHistoricalGameData(this.db, gameId, dateStr);

        // 2. IGameData 구조로 변환
        // 최신순으로 정렬되었는지 확인 (fetchHistorical returns sorted desc usually, let's verify)
        // fetchHistorical does: .sort((a, b) => b.localeCompare(a)) -> Descending (20250130, 20250129...)
        // We want chronological order for rolling window: 20250101 -> 20250130
        const sortedHistory = [...historicalData].sort((a, b) => a.date.localeCompare(b.date));

        // 모든 라운드 결과를 하나의 배열로 합침
        let allRounds: string[] = [];
        sortedHistory.forEach(day => {
            if (day.rawArray) allRounds = allRounds.concat(day.rawArray);
        });

        const recent30 = allRounds.slice(-30);
        const recent100 = allRounds.slice(-100);

        // Layer 1: Macro (30-Day Stats Calculation)
        const calculateStats = (rounds: string[]) => {
            const total = rounds.length;
            if (total === 0) return { l: 0, r: 0, line3: 0, line4: 0, odd: 0, even: 0 };
            const count = (regex: RegExp) => rounds.filter(s => regex.test(s)).length;
            return {
                l: parseFloat(((count(/L/) / total) * 100).toFixed(1)),
                r: parseFloat(((count(/R/) / total) * 100).toFixed(1)),
                line3: parseFloat(((count(/3/) / total) * 100).toFixed(1)),
                line4: parseFloat(((count(/4/) / total) * 100).toFixed(1)),
                odd: parseFloat(((count(/O/) / total) * 100).toFixed(1)),
                even: parseFloat(((count(/X/) / total) * 100).toFixed(1))
            };
        };

        // Layer 1: Macro (Should use 30-day "allRounds")
        const stats = calculateStats(allRounds);

        // Layer 2: Rolling Stats
        const stStats = calculateStats(allRounds.slice(-120));
        const mtStats = calculateStats(allRounds.slice(-480));
        const ltStats = calculateStats(allRounds.slice(-1440));

        const gameData: IGameData = {
            timestamp: Date.now(),
            roundId: 480,
            layer1_macro: {
                today_l_prob: stats.l,
                today_r_prob: stats.r,
                today_3_prob: stats.line3,
                today_4_prob: stats.line4,
                today_o_prob: stats.odd,
                today_e_prob: stats.even
            },
            layer2_rolling: {
                // Generate clear text summaries for the AI using specific windows
                st_summary: `Short-Term Analysis (Last 120 rounds): 
- Direction: L=${stStats.l}%, R=${stStats.r}%
- Line: 3=${stStats.line3}%, 4=${stStats.line4}%
- Odd/Even: O=${stStats.odd}%, E=${stStats.even}%`,
                mt_summary: `Mid-Term Trends (Last 480 rounds):
- Dominant Direction: ${mtStats.l > mtStats.r ? 'Left' : 'Right'}
- Dominant Line: ${mtStats.line3 > mtStats.line4 ? '3-Line' : '4-Line'}
- Dominant OE: ${mtStats.odd > mtStats.even ? 'Odd' : 'Even'}`,
                lt_summary: `Long-Term Stats (Last 1440 rounds):
- L/R Balance: ${ltStats.l}% / ${ltStats.r}%
- 3/4 Balance: ${ltStats.line3}% / ${ltStats.line4}%
- O/E Balance: ${ltStats.odd}% / ${ltStats.even}%`
            },
            layer3_raw: {
                recent_30: recent30,
                recent_100: recent100
            }
        };

        await StorageManager.saveGameData(gameData);
        return gameData;
    }
}
