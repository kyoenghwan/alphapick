
export interface IBotResult {
    bot_id: "BOT_01" | "BOT_02" | "BOT_03" | "BOT_04" | "BOT_05" |
    "BOT_06" | "BOT_07" | "BOT_08" | "BOT_09" | "BOT_10" |
    "BOT_11" | "BOT_12" | "BOT_13" | "BOT_14" | "BOT_15" |
    "BOT_16" | "BOT_17" | "BOT_18" | "BOT_19" | "BOT_20";
    prediction: "L3O" | "L4X" | "R3X" | "R4O" | "PASS";
    confidence: number; // 0-100
    risk_level: "LOW" | "MEDIUM" | "HIGH";
    reason: string;
    timestamp: number;
    is_correct?: boolean;
}

export interface IGameData {
    timestamp: number;
    roundId: number; // e.g. 481
    layer1_macro: {
        today_l_prob: number; // Left %
        today_r_prob: number; // Right %
        today_3_prob: number; // 3-Line %
        today_4_prob: number; // 4-Line %
        today_o_prob: number; // Odd %
        today_e_prob: number; // Even %
    };
    layer2_rolling: {
        st_summary: string; // Text summary of short-term trends
        mt_summary: string; // Text summary of mid-term trends
        lt_summary: string; // Text summary of long-term trends
        // Optional: structured rolling stats could be added here if needed
    };
    layer3_raw: {
        recent_30: string[]; // ["L3O", "R4X", ...]
        recent_100: string[];
    };
    previous_bot_results?: IBotResult[]; // Added for SP bots to review others
}

export interface IBot {
    id: string;
    type: "ST" | "MT" | "LT" | "SP";
    analyze(gameData: IGameData, previousHistory?: IBotResult): Promise<IBotResult>;
}
