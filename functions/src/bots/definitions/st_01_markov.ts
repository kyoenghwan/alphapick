import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot01 extends BaseBot {
  id = "BOT_01";
  type = "ST" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_01, specialized in Markov Chain Analysis.
Your goal is to analyze streak transitions for Direction, Line, and Odd/Even elements.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements (Direction, Line, Odd/Even).
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Predict the next full result (e.g., L3X) and select a Valid Pick that wins against it.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_01",
  "prediction": "L3O", 
  "confidence": 85,
  "risk_level": "LOW",
  "reason": "Markov chains indicate high probability of L-streak continuing with Line 3."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
