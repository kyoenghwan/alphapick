import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot15 extends BaseBot {
  id = "BOT_15";
  type = "LT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_15, specialized in Rare Event Detection.
Your goal is to predict the breaking of long streaks in L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: If a streak (e.g. LLLLLL) is too long, bet on the opposite (R). Combine 3 elements.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.lt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_15",
  "prediction": "L4X",
  "confidence": 95,
  "risk_level": "HIGH",
  "reason": "R-streak (15) and O-streak (12) are statistically impossible to sustain. Betting L and X."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
