import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineGameData, IPipelineSummary } from "../types";
import { Gen_BOT01_Markov } from "./generators/Gen_BOT01_Markov";
import { Gen_BOT02_Pongdang } from "./generators/Gen_BOT02_Pongdang";
import { Gen_BOT03_EMA } from "./generators/Gen_BOT03_EMA";
import { Gen_BOT04_ZScore } from "./generators/Gen_BOT04_ZScore";
import { Gen_BOT05_KNN } from "./generators/Gen_BOT05_KNN";
import { Gen_BOT06_Bayes } from "./generators/Gen_BOT06_Bayes";
import { Gen_BOT07_Deviation } from "./generators/Gen_BOT07_Deviation";
import { Gen_BOT08_Cycle } from "./generators/Gen_BOT08_Cycle";
import { Gen_BOT09_Trend } from "./generators/Gen_BOT09_Trend";
import { Gen_BOT10_Pattern } from "./generators/Gen_BOT10_Pattern";
import { Gen_BOT11_LLN } from "./generators/Gen_BOT11_LLN";
import { Gen_BOT12_ZScoreMacro } from "./generators/Gen_BOT12_ZScoreMacro";
import { Gen_BOT13_Regression } from "./generators/Gen_BOT13_Regression";
import { Gen_BOT14_GiantCycle } from "./generators/Gen_BOT14_GiantCycle";
import { Gen_BOT15_RarePattern } from "./generators/Gen_BOT15_RarePattern";

/**
 * [Step 2 Orchestrator]
 * 각 봇별 개별 생성기들을 호출하고 결과를 하나로 모아 저장합니다.
 * 또한 사용자 요청에 따라 개별 JSON 파일도 저장합니다.
 * 구현 완료: Bots 01 ~ 15 (전체 완료)
 */
export class SummaryOrchestrator {

    async run(dateStr: string): Promise<string> {
        console.log(`[Step 2] Running Individual Bot Generators...`);

        // 1. 데이터 로드
        const step1Filename = `step1_game_data_${dateStr}.json`;
        const gameData = PipelineFileManager.loadJson<IPipelineGameData>(step1Filename);
        const allRounds = gameData.allRounds;

        if (!allRounds || allRounds.length === 0) {
            throw new Error("No round data found.");
        }

        const summaries: IPipelineSummary[] = [];

        // 2. 각 제너레이터 실행 (순차 또는 병렬 처리가능)
        console.log("Generating ST Group (01-05)...");
        summaries.push(new Gen_BOT01_Markov().generate(allRounds));
        summaries.push(new Gen_BOT02_Pongdang().generate(allRounds));
        summaries.push(new Gen_BOT03_EMA().generate(allRounds));
        summaries.push(new Gen_BOT04_ZScore().generate(allRounds));
        summaries.push(new Gen_BOT05_KNN().generate(allRounds));

        console.log("Generating MT Group (06-10)...");
        summaries.push(new Gen_BOT06_Bayes().generate(allRounds));
        summaries.push(new Gen_BOT07_Deviation().generate(allRounds));
        summaries.push(new Gen_BOT08_Cycle().generate(allRounds));
        summaries.push(new Gen_BOT09_Trend().generate(allRounds));
        summaries.push(new Gen_BOT10_Pattern().generate(allRounds));

        console.log("Generating LT Group (11-15)...");
        summaries.push(new Gen_BOT11_LLN().generate(allRounds));
        summaries.push(new Gen_BOT12_ZScoreMacro().generate(allRounds));
        summaries.push(new Gen_BOT13_Regression().generate(allRounds));
        summaries.push(new Gen_BOT14_GiantCycle().generate(allRounds));
        summaries.push(new Gen_BOT15_RarePattern().generate(allRounds));

        // 3. 개별 파일 저장 (Transparency)
        for (const s of summaries) {
            PipelineFileManager.saveJson(`details/step2_${s.botId}_summary_${dateStr}.json`, s);
        }

        // 4. 통합 JSON 저장 (Pipeline Flow)
        const filename = `step2_summaries_01_15_${dateStr}.json`;
        const savedPath = PipelineFileManager.saveJson(filename, summaries);

        console.log(`[Step 2] Complete. Orchestrated ${summaries.length} summaries. (Details in /data/details/)`);
        return savedPath;
    }
}
