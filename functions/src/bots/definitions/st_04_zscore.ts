import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot04 extends BaseBot {
  id = "BOT_04";
  type = "ST" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_04, specialized in Z-Score Deviation Analysis.
Your goal is to identify mean reversion points matching 2 out of 3 elements.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Check Z-Score for L/R, 3/4, O/X. Bet against extreme deviations.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_04",
  "prediction": "R4O",
  "confidence": 90,
  "risk_level": "LOW",
  "reason": "Z-Score indicates L and 3 are overextended. Predicting reversion to R and 4."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
