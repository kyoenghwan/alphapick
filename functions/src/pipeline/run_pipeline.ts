import { DataFetcher } from "./01_data_fetch/DataFetcher";
import { SummaryOrchestrator } from "./02_summary_gen/SummaryOrchestrator"; // Changed
import { PromptGenerator } from "./03_prompt_gen/PromptGenerator";
import { PredictionExecutor } from "./04_prediction/PredictionExecutor";
import { Phase2Executor } from "./05_phase2_sp/Phase2Executor";
import { Phase3Executor } from "./06_phase3_global/Phase3Executor";
import { Phase4Executor } from "./07_phase4_master/Phase4Executor";
import * as admin from "firebase-admin";

/**
 * [Master Script] 전체 파이프라인 실행 스크립트
 * 1단계부터 7단계까지 순차적으로 실행하여 최종 결과를 도출합니다.
 */
export async function runFullPipeline(db: admin.firestore.Firestore, gameId: string, dateStr: string) {
    console.log(`=== Starting AlphaPick AI Pipeline for ${gameId} / ${dateStr} ===`);
    const startTime = Date.now();

    try {
        // Step 1: Data Preparation
        console.log("\n--- [Step 1] Data Fetching ---");
        const fetcher = new DataFetcher(db);
        await fetcher.run(gameId, dateStr);

        // Step 2: Summary Generation
        console.log("\n--- [Step 2] Summary Generation (Bots 01-15) - ORCHESTRATED ---");
        const orchestrator = new SummaryOrchestrator(); // Changed
        await orchestrator.run(dateStr);

        // Step 3: Prompt Generation
        console.log("\n--- [Step 3] Prompt Generation (Bots 01-15) ---");
        const prompter = new PromptGenerator();
        await prompter.run(dateStr);

        // Step 4: Prediction (Phase 1)
        console.log("\n--- [Step 4] Prediction Execution (Bots 01-15) ---");
        const predictor = new PredictionExecutor(db);
        await predictor.run(dateStr);

        // Step 5: Phase 2 (Bots 16-18)
        console.log("\n--- [Step 5] Phase 2 Execution (Bots 16-18) ---");
        const phase2 = new Phase2Executor(db);
        await phase2.run(dateStr);

        // Step 6: Phase 3 (Bot 19)
        console.log("\n--- [Step 6] Phase 3 Execution (Bot 19) ---");
        const phase3 = new Phase3Executor(db);
        await phase3.run(dateStr);

        // Step 7: Phase 4 (Bot 20)
        console.log("\n--- [Step 7] Phase 4 Execution (Bot 20) ---");
        const phase4 = new Phase4Executor(db);
        await phase4.run(dateStr);

        console.log(`\n=== Pipeline Completed Successfully in ${(Date.now() - startTime) / 1000}s ===`);

    } catch (error: any) {
        console.error(`\n!!! Pipeline Failed: ${error.message} !!!`);
        throw error;
    }
}
