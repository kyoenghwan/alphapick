import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot18 extends BaseBot {
  id = "BOT_18";
  type = "SP" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const ltBots = data.previous_bot_results?.filter(b => ["BOT_11", "BOT_12", "BOT_13", "BOT_14", "BOT_15"].includes(b.bot_id)) || [];
    const ltInput = ltBots.map(b => `- ${b.bot_id}: ${b.prediction} (Conf: ${b.confidence}%)`).join("\n");

    return `
You are AlphaPick's BOT_18, specialized in LT Group Evaluation.
Your goal is to synthesize predictions from Bots 11-15.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Identify the consensus pick among LT bots.

[LT Bots Input]
${ltInput}

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.lt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_18",
  "prediction": "L4X",
  "confidence": 88,
  "risk_level": "LOW",
  "reason": "Long-term statistical models all indicate L4X is due for correction."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
