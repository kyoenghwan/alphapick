import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot07 extends BaseBot {
  id = "BOT_07";
  type = "MT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_07, specialized in Standard Deviation Analysis.
Your goal is to measure volatility and identify stable trends for L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Bet on the most stable elements. If L is stable and 3 is stable, Pick L3O.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_07",
  "prediction": "R4O",
  "confidence": 75,
  "risk_level": "MEDIUM",
  "reason": "Low volatility in R-sequences, 4 is currently trending within 1-sigma."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
