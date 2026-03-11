import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PipelineFileManager } from "../PipelineFileManager";

/**
 * [Step 2] 봇 요약 정보 생성 프로그램 (Phase 1: Bots 01~15)
 * - 입력: Step 1에서 생성된 Firestore Data (admin_test_runs/{runId}/daily_data)
 * - 로직: 각 봇(01~15)에 필요한 Layer 1(거시), Layer 2(롤링) 통계 계산
 * - 출력: admin_test_runs/{runId} 문서 내 step2_summary 필드 업데이트
 */
export class SummaryGenerator {

    async run(db: admin.firestore.Firestore, runId: string, targetBotId?: string, targetRound?: number): Promise<string> {
        console.log(`[Step 2] Generating Summaries for Run ID: ${runId} (TargetBot: ${targetBotId || "ALL"}, TargetRound: ${targetRound || "ALL"})...`);

        // Parse gameId and date from runId (format: {gameId}_{date})
        const lastUnderscoreIndex = runId.lastIndexOf('_');
        const gameId = runId.substring(0, lastUnderscoreIndex);
        const targetDateStr = runId.substring(lastUnderscoreIndex + 1);

        // 1. Step 1 데이터 로드 (Firestore)
        console.log(`Loading data from Firestore: ai_bots_step_log/${runId}/daily_data...`);
        const allRoundsRaw = await PipelineFileManager.loadStep1(db, gameId, targetDateStr);

        // [Filtering Logic] If targetRound is set, we must only use data BEFORE this round (simulate past state)
        // Correct Logic: Keep PREVIOUS days fully. Only slice the TARGET date.

        let filteredRoundsRaw = allRoundsRaw;
        if (targetRound) {
            filteredRoundsRaw = allRoundsRaw.filter(r => {
                // If the data row belongs to the target date, apply the cut-off
                if (r.date === targetDateStr) {
                    return r.round < targetRound;
                }
                // For past dates, keep everything.
                // Note: DataFetcher ensures we don't have future dates relative to targetDate.
                return true;
            });
            console.log(`[Time Travel] Filtered data for ${targetDateStr} up to Round ${targetRound - 1}. Count: ${filteredRoundsRaw.length}`);
        }

        // Raw object -> string array (legacy logic needs string array of results)
        // Assuming round object has { result: "L3O" } etc.
        const allRounds = filteredRoundsRaw.map(r => r.result).filter(r => r);

        if (!allRounds || allRounds.length === 0) {
            throw new Error("No round data found in Step 1 Firestore Data (after filtering).");
        }
        console.log(`Loaded and processed ${allRounds.length} rounds.`);

        // 2. 공통 통계 계산 함수 (Layer 1 & 2 공용)
        const calculateStats = (rounds: string[]) => {
            const total = rounds.length;
            if (total === 0) return { l: 0, r: 0, line3: 0, line4: 0, odd: 0, even: 0 };
            const count = (regex: RegExp) => rounds.filter(s => regex.test(s)).length;
            return {
                l: parseFloat(((count(/L/) / total) * 100).toFixed(1)),
                r: parseFloat(((count(/R/) / total) * 100).toFixed(1)),
                line3: parseFloat(((count(/3/) / total) * 100).toFixed(1)),
                line4: parseFloat(((count(/4/) / total) * 100).toFixed(1)),
                odd: parseFloat(((count(/O/) / total) * 100).toFixed(1)),
                even: parseFloat(((count(/X/) / total) * 100).toFixed(1))
            };
        };

        // 3. Layer 1: Macro Stats (30일 전체)
        const macroStats = calculateStats(allRounds);

        // 4. Layer 2: Rolling Stats (Specific Windows)
        // 각 그룹별로 필요한 윈도우 크기가 다름.
        // ST (Short-Term): 120 rounds
        // MT (Mid-Term): 480 rounds
        // LT (Long-Term): 1440 rounds
        const stStats = calculateStats(allRounds.slice(-120));
        const mtStats = calculateStats(allRounds.slice(-480));
        const ltStats = calculateStats(allRounds.slice(-1440));

        // 2. Helper: Markov Analysis
        const analyzeMarkov = (rounds: string[], label: string) => {
            if (rounds.length < 2) return "Insufficient data for Markov analysis.";

            // Parse Rounds into components
            const parsed = rounds.map(r => ({
                raw: r,
                dir: r.includes("L") ? "L" : "R",
                line: r.includes("3") ? "3" : "4",
                oe: r.includes("O") ? "Odd" : "Even"
            }));

            // Last Round State
            const last = parsed[parsed.length - 1];
            const currentState = `- Last Round: ${last.raw} (Direction=${last.dir}, Line=${last.line}, OE=${last.oe})`;

            // Calculate Transitions
            const transitions = {
                dir: { L_L: 0, L_R: 0, R_R: 0, R_L: 0, total_L: 0, total_R: 0 },
                line: { 33: 0, 34: 0, 44: 0, 43: 0, total_3: 0, total_4: 0 },
                oe: { OO: 0, OE: 0, EE: 0, EO: 0, total_O: 0, total_E: 0 }
            };

            for (let i = 0; i < parsed.length - 1; i++) {
                const curr = parsed[i];
                const next = parsed[i + 1];

                // Direction
                if (curr.dir === 'L') {
                    transitions.dir.total_L++;
                    if (next.dir === 'L') transitions.dir.L_L++; else transitions.dir.L_R++;
                } else {
                    transitions.dir.total_R++;
                    if (next.dir === 'R') transitions.dir.R_R++; else transitions.dir.R_L++;
                }

                // Line
                if (curr.line === '3') {
                    transitions.line.total_3++;
                    if (next.line === '3') transitions.line[33]++; else transitions.line[34]++;
                } else {
                    transitions.line.total_4++;
                    if (next.line === '4') transitions.line[44]++; else transitions.line[43]++;
                }

                // OE
                if (curr.oe === 'Odd') {
                    transitions.oe.total_O++;
                    if (next.oe === 'Odd') transitions.oe.OO++; else transitions.oe.OE++;
                } else {
                    transitions.oe.total_E++;
                    if (next.oe === 'Even') transitions.oe.EE++; else transitions.oe.EO++;
                }
            }

            // Helper for percentage
            const p = (num: number, total: number) => total === 0 ? "0.0" : ((num / total) * 100).toFixed(1);

            return `${label}:
[Current State]
${currentState}

[Direction L/R]
- L Transition: Keep=${p(transitions.dir.L_L, transitions.dir.total_L)}%, Flip=${p(transitions.dir.L_R, transitions.dir.total_L)}%
- R Transition: Keep=${p(transitions.dir.R_R, transitions.dir.total_R)}%, Flip=${p(transitions.dir.R_L, transitions.dir.total_R)}%

[Line 3/4]
- 3-Line Transition: Keep=${p(transitions.line[33], transitions.line.total_3)}%, Flip=${p(transitions.line[34], transitions.line.total_3)}%
- 4-Line Transition: Keep=${p(transitions.line[44], transitions.line.total_4)}%, Flip=${p(transitions.line[43], transitions.line.total_4)}%

[Odd/Even O/E]
- Odd Transition: Keep=${p(transitions.oe.OO, transitions.oe.total_O)}%, Flip=${p(transitions.oe.OE, transitions.oe.total_O)}%
- Even Transition: Keep=${p(transitions.oe.EE, transitions.oe.total_E)}%, Flip=${p(transitions.oe.EO, transitions.oe.total_E)}%

Focus: Analyze the 'Current State' against the transitions above to predict the next outcome.`;
        };

        // 5. 각 봇별 요약 생성 및 저장 (Subcollection: prompts)
        const promptsRef = db.collection("ai_bots_step_log").doc(runId).collection("prompts");
        // Root Doc Update (Layer 1 Only)
        await db.collection("ai_bots_step_log").doc(runId).set({
            layer1_macro: {
                today_l_prob: macroStats.l,
                today_r_prob: macroStats.r,
                today_3_prob: macroStats.line3,
                today_4_prob: macroStats.line4,
                today_o_prob: macroStats.odd,
                today_e_prob: macroStats.even
            },
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // If targetBotId is provided, only process that bot. Otherwise, process all.
        const botIds = targetBotId
            ? [targetBotId]
            : Array.from({ length: 15 }, (_, i) => `BOT_${String(i + 1).padStart(2, '0')}`);

        const writeBatch = db.batch();

        for (const botId of botIds) {
            const botNum = parseInt(botId.split('_')[1]);
            let rollingSummary = "";
            let rawDataSnippet: string[] = [];

            // 그룹별 로직 분기
            if (botNum <= 5) {
                // [ST Group 01-05]
                rollingSummary = analyzeMarkov(allRounds.slice(-120), "Short-Term Markov Analysis (Last 120)");
                rawDataSnippet = allRounds.slice(-30);
            } else if (botNum <= 10) {
                // [MT Group 06-10]
                rollingSummary = analyzeMarkov(allRounds.slice(-480), "Mid-Term Markov Analysis (Last 480)");
                rawDataSnippet = allRounds.slice(-100);
            } else {
                // [LT Group 11-15]
                rollingSummary = analyzeMarkov(allRounds.slice(-1440), "Long-Term Markov Analysis (Last 1440)");
                rawDataSnippet = allRounds.slice(-100);
            }

            const botDocRef = promptsRef.doc(botId);
            writeBatch.set(botDocRef, {
                botId,
                layer2_rolling: {
                    summary_text: rollingSummary,
                    st_stats: stStats,
                    mt_stats: mtStats,
                    lt_stats: ltStats
                },
                layer3_raw: rawDataSnippet,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        await writeBatch.commit();

        console.log(`[Step 2] Complete. Root Summary & ${botIds.length} Bot Docs saved to ai_bots_step_log/${runId}`);
        return runId;
    }
}
