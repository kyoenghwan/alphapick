import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot03 extends BaseBot {
  id = "BOT_03";
  type = "ST" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_03, specialized in EMA (Exponential Moving Average) Analysis.
Your goal is to analyze short-term momentum for all 3 elements (L/R, 3/4, O/X).

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Follow the strongest momentum signals (Golden Cross) for Direction & Line.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_03",
  "prediction": "L4X",
  "confidence": 75,
  "risk_level": "MEDIUM",
  "reason": "EMA shows strong momentum for L and 4."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
