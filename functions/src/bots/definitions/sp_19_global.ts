import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot19 extends BaseBot {
  id = "BOT_19";
  type = "SP" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const allBots = data.previous_bot_results?.filter(b => parseInt(b.bot_id.split("_")[1]) <= 15) || [];
    const allInput = allBots.map(b => `- ${b.bot_id}: ${b.prediction} (Conf: ${b.confidence}%)`).join("\n");

    return `
You are AlphaPick's BOT_19, specialized in Global Sentiment.
Your goal is to find the most 'popular' pick across all groups based on momentum.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Crowd wisdom. If everyone is shouting R3X, follow it.

[All Bots Input (01-15)]
${allInput}
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_19",
  "prediction": "R3X",
  "confidence": 75,
  "risk_level": "MEDIUM",
  "reason": "Global sentiment analysis detects strong momentum for R3X across groups."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
