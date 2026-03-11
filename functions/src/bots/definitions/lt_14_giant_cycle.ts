import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot14 extends BaseBot {
  id = "BOT_14";
  type = "LT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_14, specialized in Giant Cycle Analysis.
Your goal is to identify day-long cycles in L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Align with the macro-cycle phase for all 3 elements.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.lt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_14",
  "prediction": "R3X",
  "confidence": 72,
  "risk_level": "MEDIUM",
  "reason": "Daily cycle suggests afternoon shift towards Right-Side and Even numbers."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
