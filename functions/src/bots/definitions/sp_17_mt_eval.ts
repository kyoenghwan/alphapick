import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot17 extends BaseBot {
  id = "BOT_17";
  type = "SP" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const mtBots = data.previous_bot_results?.filter(b => ["BOT_06", "BOT_07", "BOT_08", "BOT_09", "BOT_10"].includes(b.bot_id)) || [];
    const mtInput = mtBots.map(b => `- ${b.bot_id}: ${b.prediction} (Conf: ${b.confidence}%)`).join("\n");

    return `
You are AlphaPick's BOT_17, specialized in MT Group Evaluation.
Your goal is to synthesize predictions from Bots 06-10.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Identify the consensus pick among MT bots.

[MT Bots Input]
${mtInput}

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_17",
  "prediction": "R4O",
  "confidence": 82,
  "risk_level": "LOW",
  "reason": "MT bots (Trend/Cycle) uniformly point to R4O for the next phase."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
