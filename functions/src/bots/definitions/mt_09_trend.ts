import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot09 extends BaseBot {
  id = "BOT_09";
  type = "MT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_09, specialized in Trend Line Analysis.
Your goal is to follow the strongest mid-term trend across all 3 elements.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Don't fight the trend. If '3 lines' is trending hot, pick it.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_09",
  "prediction": "R3X",
  "confidence": 88,
  "risk_level": "LOW",
  "reason": "Mid-term trend strongly favors Right Direction and 3-Lines."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
