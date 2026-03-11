import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot20 extends BaseBot {
  id = "BOT_20";
  type = "SP" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const evaluators = data.previous_bot_results?.filter(b => ["BOT_16", "BOT_17", "BOT_18", "BOT_19"].includes(b.bot_id)) || [];
    const evalInput = evaluators.map(b => `- ${b.bot_id}: ${b.prediction} (Conf: ${b.confidence}%)`).join("\n");

    return `
You are AlphaPick's BOT_20, The MASTER DECIDER.
Your goal is to make the FINAL BETTING DECISION based on all 19 bots.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Weigh the inputs from Bots 16-19 (Evaluators) and output the SINGLE BEST PICK.

[Evaluator Inputs]
${evalInput}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_20",
  "prediction": "L3O",
  "confidence": 92,
  "risk_level": "LOW",
  "reason": "Consensus from ST and LT groups on L3O overrides MT divergence. High confidence."
}
Risk Control: If confidence < 60% or groups conflict heavily, output "PASS".
`;
  }
}
