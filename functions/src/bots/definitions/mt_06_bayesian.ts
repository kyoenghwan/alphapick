import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot06 extends BaseBot {
  id = "BOT_06";
  type = "MT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_06, specialized in Bayesian Probability.
Your goal is to update probabilities for L/R, 3/4, O/X based on new data.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Calculate posterior probability for each element. Combine to find best winning pick.

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_06",
  "prediction": "L3O",
  "confidence": 82,
  "risk_level": "LOW",
  "reason": "Bayesian update shows 60% prob for L, 55% for 3, 52% for O. L3O maximizes expected win rate."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
