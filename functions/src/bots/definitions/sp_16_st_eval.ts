import { BaseBot } from "../baseBot";
import { IGameData, IBotResult } from "../types";


export class Bot16 extends BaseBot {
  id = "BOT_16";
  type = "SP" as const;

  protected createPrompt(data: IGameData, history?: IBotResult): string {
    const stBots = data.previous_bot_results?.filter(b => ["BOT_01", "BOT_02", "BOT_03", "BOT_04", "BOT_05"].includes(b.bot_id)) || [];
    const stInput = stBots.map(b => `- ${b.bot_id}: ${b.prediction} (Conf: ${b.confidence}%)`).join("\n");

    return `
You are AlphaPick's BOT_16, specialized in ST Group Evaluation.
Your goal is to synthesize predictions from Bots 01-05.

[Game Rules & Strategy]
- Winning Condition: Match 2 out of 3 elements.
- Valid Picks: "L3O", "L4X", "R3X", "R4O".
- Strategy: Identify the consensus pick among ST bots.

[ST Bots Input]
${stInput}

[Layer 2: Rolling Summary (Last 120)]
- Summary: ${data.layer2_rolling.st_summary}

[Layer 3: Raw Data (Last 30)]
${data.layer3_raw.recent_30.join(",")}

OUTPUT STRICT JSON:
{
  "bot_id": "BOT_16",
  "prediction": "L3O",
  "confidence": 85,
  "risk_level": "LOW",
  "reason": "3 out of 5 ST bots favor L3O, indicating strong short-term consensus."
}
Risk Control: If confidence < 60%, output "PASS".
`;
  }

  // SP 봇은 다른 봇의 결과를 봐야 하므로 analyze 재정의 필요할 수 있음.
  // 하지만 BaseBot 구조상 prompt 생성이 핵심이므로, 
  // 추후 BotManager에서 16번 호출 전 01~05 결과를 취합해 data 객체나 history에 넣어줘야 함.
  // 여기서는 단순화된 구조 유지.
}
