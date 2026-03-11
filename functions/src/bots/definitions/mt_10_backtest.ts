import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";

export class Bot10 extends BaseBot {
  id = "BOT_10";
  type = "MT" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const lastResult = history ? history.prediction : "None";
    const wasCorrect = history ? history.is_correct : "Unknown";

    return `
You are AlphaPick's BOT_10, specialized in Backtest Simulation.
Your goal is to optimize parameters based on recent performance for 2/3 matching.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Analyze which of the 4 picks would have won most recently.

[Layer 1: Macro]
- Today's L Probability: ${data.layer1_macro.today_l_prob}%
- Max Streak: (Reference from daily stats)

[Self-Correction Config]
- Last Prediction: ${lastResult}
- Was Correct: ${wasCorrect}

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.mt_summary}

[Layer 3: Raw Data (Last 100)]
${data.layer3_raw.recent_100.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_10",
  "prediction": "L3O",
  "confidence": 80,
  "risk_level": "LOW",
  "reason": "Backtest shows L3O strategy yielding highest return in last 50 rounds."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }
}
