import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot05 extends BaseBot {
  id = "BOT_05";
  type = "ST" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_05, specialized in KNN (K-Nearest Neighbors) Pattern Matching.
Your goal is to predict based on the most similar historical sequences for L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Find similar past sequences. What result followed? Pick the 4-choice that wins against it.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_05",
  "prediction": "L3O",
  "confidence": 78,
  "risk_level": "MEDIUM",
  "reason": "80% of similar past patterns resulted in L3X, so L3O wins."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
