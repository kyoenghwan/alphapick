import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot12 extends BaseBot {
  id = "BOT_12";
  type = "LT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_12, specialized in Macro Z-Score.
Your goal is to find extreme macro-deviations in L/R, 3/4, O/X over 30 days.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Bet against the macro-trend if Z-score > 2.0.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_12",
  "prediction": "L3O",
  "confidence": 80,
  "risk_level": "MEDIUM",
  "reason": "Macro Z-Score for 'R' is +2.5. Predicting heavy correction to L elements."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
