import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot13 extends BaseBot {
  id = "BOT_13";
  type = "LT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_13, specialized in Logistic Regression.
Your goal is to calculate the separate probability of L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: P(Win|Pick) = P(Match >= 2 elements). Select Pick with Max P.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.lt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_13",
  "prediction": "R4O",
  "confidence": 77,
  "risk_level": "MEDIUM",
  "reason": "Logistic Model: P(R)=0.6, P(4)=0.55, P(O)=0.51. R4O has highest expected value."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
