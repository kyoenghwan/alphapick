import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot02 extends BaseBot {
  id = "BOT_02";
  type = "ST" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    return `
You are AlphaPick's BOT_02, specialized in Pongdang (Alternating Pattern) Analysis.
Your goal is to detect alternating pattern stability in Direction, Line, and Odd/Even.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Analyze if current alternating patterns (e.g. L-R, 3-4, O-X) will continue or break.

[Layer 1: Macro]
- Max Pongdang Length: 12 (Example)

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_02",
  "prediction": "R3X",
  "confidence": 80,
  "risk_level": "LOW",
  "reason": "Direction pongdang expected to break to R, Line pongdang stable."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
