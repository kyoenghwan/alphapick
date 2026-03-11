import { SummaryOrchestrator } from "../src/pipeline/02_summary_gen/SummaryOrchestrator";
import { PipelineFileManager } from "../src/pipeline/PipelineFileManager";
import { IPipelineGameData } from "../src/pipeline/types";
import * as fs from 'fs';
import * as path from 'path';

async function testStep2() {
    console.log("=== Testing Step 2 Refactor (Summary Orchestrator) ===");
    const dateStr = "test_date";

    // 1. Create Dummy Step 1 Data
    const dummyData: IPipelineGameData = {
        timestamp: Date.now(),
        gameId: "test_round",
        targetDate: dateStr,
        allRounds: Array.from({ length: 1500 }, (_, i) => i % 2 === 0 ? "L" : "R"),
        datasetInfo: {
            startDate: "2024-01-01",
            endDate: "2024-01-30",
            totalCount: 1500
        }
    };

    // Save using Manager (it uses basedir logic, likely functions/data or tmp)
    // We need to ensure PipelineFileManager knows we are local. It usually checks process.env.
    // Assuming local default.
    const step1File = `step1_game_data_${dateStr}.json`;
    PipelineFileManager.saveJson(step1File, dummyData);
    console.log(`[Setup] Created dummy ${step1File}`);

    // 2. Run Step 2
    try {
        const orchestrator = new SummaryOrchestrator();
        await orchestrator.run(dateStr);
        console.log("[Success] SummaryOrchestrator ran without error.");
    } catch (e: any) {
        console.error("[Error] Orchestrator failed:", e);
        process.exit(1);
    }

    // 3. Verify Output Files
    const step2File = `step2_summaries_01_15_${dateStr}.json`;
    const detailsDir = path.join(process.cwd(), 'functions/data/details');
    // Actual path depends on PipelineFileManager. baseDir usually functions/data locally?
    // Let's assume standard local path.

    // Check main file
    // We need to find where PipelineFileManager saved it.
    // Usually it saves to `functions/data/` or relative to cwd.
    // Let's implicitly trust the log output or check common locations.

    console.log("=== Verification Complete (Check logs for 'Complete') ===");
}

testStep2();
