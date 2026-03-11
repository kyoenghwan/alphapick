import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot11 extends BaseBot {
  id = "BOT_11";
  type = "LT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_11, specialized in Law of Large Numbers.
Your goal is to balance the long-term distributions of L/R, 3/4, O/X.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Identify under-represented elements. If 'Left' and 'Odd' are below 50% historically, Pick L3O to catch up.

[Layer 1: Macro (30-Day Stats)]
- Direction: L=${data.layer1_macro.today_l_prob}% / R=${data.layer1_macro.today_r_prob}%
- Line: 3=${data.layer1_macro.today_3_prob}% / 4=${data.layer1_macro.today_4_prob}%
- Odd/Even: O=${data.layer1_macro.today_o_prob}% / E=${data.layer1_macro.today_e_prob}%
- Note: Analyze which elements are below statistical average (50%).

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.lt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_11",
  "prediction": "R4O",
  "confidence": 85,
  "risk_level": "LOW",
  "reason": "R, 4, and O are all statistically under-represented in the last 1000 rounds."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
