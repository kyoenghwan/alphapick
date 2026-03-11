import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { fetchHistoricalGameData } from "./utils/gameDataUtils";

/**
 * Firestore에서 Gemini API 키를 가져옵니다.
 */
export async function getGeminiApiKey(db: admin.firestore.Firestore): Promise<string | null> {
    const aiConfig = await db.collection("settings").doc("ai_config").get();
    const configData = aiConfig.exists ? aiConfig.data() : null;

    // 1. 강제 비활성화 확인 (is_enabled가 false이면 무조건 차단)
    if (configData && configData.is_enabled === false) {
        logger.info("[AI Manager] AI Service is explicitly DISABLED in settings/ai_config.");
        return null;
    }

    // 2. 관리자 설정(Firestore) Key 우선 확인
    if (configData?.gemini_api_key) {
        return configData.gemini_api_key;
    }

    // 3. 환경변수 확인 (Fallback)
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

    return null;
}

/**
 * AI Pick Manager Backend Logic
 * - Test Date Extractor
 * - AI Simulation Engine (Gemini 2.0 Flash)
 */

interface RoundResult {
    round: number;
    result: string | null;
    resultOriginal: string | null;
    [key: string]: any;
}

/**
 * AI 프롬프트 표준 템플릿 생성기
 */
const generateStandardPrompt = (gameId: string, round: number, date: string, trend: string, flow: string, batch: any[], advices: any) => `
# [SYSTEM ANALYSIS REPORT: ALPHA-PICK ENGINE]
## GAME: ${gameId.toUpperCase()} | ROUND: ${round}
## TARGET DATE: ${date}

### 1. LONG-TERM HISTORICAL TREND (30 DAYS)
${trend || "Trend analysis in progress or insufficient data."}

### 2. RECENT SHORT-TERM FLOW (LAST 15 ROUNDS)
${flow || "No previous flow data available for this session."}

### 3. BOT-SPECIFIC DIRECTIVES
Each bot must synthesize its unique persona with the following dynamic instructions:

${batch.map(b => `
#### [[${b.bot_id}]]
- PERSONA: ${b.system_prompt}
- DYNAMIC ADVICE: ${advices?.[b.bot_id] || "Consistent analysis required based on current volatility."}
`).join("\n")}

### 4. OUTPUT PROTOCOL
- Response MUST be a valid JSON object.
- Key: Bot ID (e.g., "BOT_01")
- Value: { "pick": "R3O", "confidence": 0.85 }
- No additional text or explanation.
`;

/**
 * [Feature A: Test Date Extractor]
 * 특정 게임의 날짜별 데이터 상태를 분석하여 등급을 매깁니다.
 */
export async function analyzeGameDays(
    db: admin.firestore.Firestore,
    gameId: string,
    year: string,
    startDate?: string,
    endDate?: string
) {
    const collectionPath = `games/${year}_${gameId}/counts`;
    logger.info(`Analyzing days in: ${collectionPath}`);
    const querySnapshot = await db.collection(collectionPath).get();

    let filteredDocs = querySnapshot.docs;
    if (startDate) {
        filteredDocs = filteredDocs.filter(doc => doc.id >= startDate);
    }
    if (endDate) {
        filteredDocs = filteredDocs.filter(doc => doc.id <= endDate);
    }

    const report = [];
    for (const doc of filteredDocs) {
        const dateStr = doc.id;
        const data = doc.data();
        const collected = data.total_collected || 0;

        // 기본적으로 480회차 기준
        const expected = 480;
        const missing = expected - collected;

        let grade = "Mixed";
        if (missing === 0) grade = "Golden";
        else if (missing >= 10) grade = "Danger";

        report.push({
            date: dateStr,
            collected,
            missing,
            grade,
            last_updated: data.last_updated
        });
    }

    return report.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * [Feature B: AI Simulation Engine]
 * Gemini 2.0 Flash를 사용하여 시뮬레이션을 수행하고 결과를 ai_analysis에 저장합니다.
 */
export async function runAiSimulation(
    db: admin.firestore.Firestore,
    gameId: string,
    dateStr: string,
    startRound?: number,
    endRound?: number
) {
    const year = dateStr.substring(0, 4);
    const roundsRef = db.collection("games").doc(`${year}_${gameId}`).collection("result").doc(dateStr).collection("rounds");
    const roundsSnapshot = await roundsRef.orderBy("round", "asc").get();

    const analysisRef = db.collection("ai_analysis").doc(`${year}_${gameId}`).collection("days").doc(dateStr);

    const GEMINI_API_KEY = await getGeminiApiKey(db);
    if (!GEMINI_API_KEY) {
        logger.error("GEMINI_API_KEY is missing");
        throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 관리자 페이지 > 설정에서 API 키를 입력해주세요.");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 1. [Long-term Lookback] 과거 30일치 통계 데이터 요약 및 봇별 지침 생성
    const targetDate = new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8))
    );
    const startDate = new Date(targetDate);
    startDate.setDate(targetDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, "");
    const endDateStr = dateStr;

    logger.info(`Fetching 30-day context: ${startDateStr} ~ ${endDateStr}`);

    const startYear = startDate.getFullYear().toString();
    const endYear = targetDate.getFullYear().toString();

    let historicalData: any[] = [];

    // Fetch from endYear (current)
    const currentCountsSnapshot = await db.collection("games").doc(`${endYear}_${gameId}`).collection("counts").get();
    historicalData.push(...currentCountsSnapshot.docs.map(doc => ({ date: doc.id, ...doc.data() })));

    // If spans year boundary, fetch from startYear (previous)
    if (startYear !== endYear) {
        const prevCountsSnapshot = await db.collection("games").doc(`${startYear}_${gameId}`).collection("counts").get();
        historicalData.push(...prevCountsSnapshot.docs.map(doc => ({ date: doc.id, ...doc.data() })));
    }

    historicalData = historicalData.filter(d => d.date >= startDateStr && d.date < endDateStr);

    // [Step A] 데이터 요약 및 봇별 맞춤 비기 생성
    const summarizationPrompt = `
# [LONG-TERM TREND ANALYSIS REQUEST]
- TARGET GAME: ${gameId.toUpperCase()}
- DATA COUNT: ${historicalData.length} days found in the last 30 days.
- HISTORICAL DATA (JSON): ${JSON.stringify(historicalData)}

Please perform a deep statistical analysis on the provided 30-day historical data.
If DATA COUNT is low (e.g., < 5), please note that data is limited but provide the best possible analysis.
Return a JSON object with:
1. "overall_summary": A professional, data-driven summary of the 30-day trend.
2. "bot_advice": A strategy guide for ALL bots (BOT_01 through BOT_20) based on this trend.

FORMAT: { "overall_summary": "...", "bot_advice": { "BOT_01": "...", ... } }
`;

    let longTermAnalysis: any = { overall_summary: "Long-term trend data unavailable or insufficient.", bot_advice: {} };
    try {
        const summaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const summaryResult = await summaryModel.generateContent(summarizationPrompt);
        const summaryText = summaryResult.response.text().replace(/```json|```/g, "").trim();

        try {
            longTermAnalysis = JSON.parse(summaryText);
        } catch (parseErr) {
            const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
            if (jsonMatch) longTermAnalysis = JSON.parse(jsonMatch[0]);
        }
        logger.info(`Trend analysis completed for ${dateStr}. Summary: ${longTermAnalysis.overall_summary.substring(0, 50)}...`);
    } catch (e) {
        logger.error("Trend analysis engine failure:", e);
    }

    // 봇 정보 조회
    const botsSnapshot = await db.collection("ai_bots").where("active", "==", true).get();
    const allBots = botsSnapshot.docs.map(d => d.data());

    let currentLossStreak = 0;
    let cumulativeProfit = 0;

    let rounds = roundsSnapshot.docs;

    // 회차 범위 필터링
    if (startRound !== undefined || endRound !== undefined) {
        rounds = rounds.filter(doc => {
            const r = doc.data().round;
            const isAfterStart = startRound !== undefined ? r >= startRound : true;
            const isBeforeEnd = endRound !== undefined ? r <= endRound : true;
            return isAfterStart && isBeforeEnd;
        });
        logger.info(`Filtered rounds: ${startRound} ~ ${endRound} (Count: ${rounds.length})`);
    }

    for (let i = 0; i < rounds.length; i++) {
        const roundDoc = rounds[i];
        const roundData = roundDoc.data() as RoundResult;
        const roundId = roundDoc.id;

        if (!roundData.result) {
            await analysisRef.collection("rounds").doc(roundId).set({
                round_info: roundData,
                final_decision: { pick: "PASS", status: "VOID", profit: 0 },
                metadata: { note: "Data gap detected", timestamp: admin.firestore.FieldValue.serverTimestamp() }
            });
            currentLossStreak = 0;
            continue;
        }

        const contextHistory = rounds.slice(Math.max(0, i - 10), i)
            .map(r => r.data().result)
            .filter(res => !!res)
            .join(", ");

        // 15+5 분할 배칭 처리
        const botBatch1 = allBots.filter(b => {
            const idNum = parseInt(b.bot_id.replace("BOT_", ""));
            return idNum >= 1 && idNum <= 15;
        });
        const botBatch2 = allBots.filter(b => {
            const idNum = parseInt(b.bot_id.replace("BOT_", ""));
            return idNum >= 16 && idNum <= 20;
        });

        const combinedResponses: any = {};


        const executeBatch = async (batch: any[]) => {
            const prompt = generateStandardPrompt(gameId, roundData.round, dateStr, longTermAnalysis.overall_summary, contextHistory, batch, longTermAnalysis.bot_advice);
            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
        };

        try {
            // Batch 1 (1~15)
            const resp1 = await executeBatch(botBatch1);
            Object.assign(combinedResponses, resp1);

            // Batch 2 (16~20) - 필요 시 실행 (15+5 전략)
            if (botBatch2.length > 0) {
                const resp2 = await executeBatch(botBatch2);
                Object.assign(combinedResponses, resp2);
            }

            // 최종 픽 결정 (예: BOT_01 기준 또는 투표)
            const finalPick = combinedResponses["BOT_01"]?.pick || "R3O";
            const actual = roundData.result;

            let matchCount = 0;
            if (actual && finalPick.length === 3 && actual.length === 3) {
                for (let charIdx = 0; charIdx < 3; charIdx++) {
                    if (finalPick[charIdx] === actual[charIdx]) matchCount++;
                }
            }

            let profit = -30000;
            let status = "LOSE";

            if (matchCount >= 2) {
                profit = 9000;
                status = "WIN";
                currentLossStreak = 0;
            } else {
                currentLossStreak++;
            }

            cumulativeProfit += profit;

            await analysisRef.collection("rounds").doc(roundId).set({
                round_info: roundData,
                final_decision: {
                    pick: finalPick,
                    status,
                    profit,
                    match_count: matchCount,
                    cumulative_profit: cumulativeProfit
                },
                bot_responses: combinedResponses,
                metadata: {
                    loss_streak: currentLossStreak,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                }
            });
        } catch (e: any) {
            logger.error(`Round ${roundId} Simulation Error:`, e);
        }
    }

    await analysisRef.set({
        game_id: gameId,
        date: dateStr,
        total_profit: cumulativeProfit,
        status: "COMPLETED",
        historical_summary: longTermAnalysis.overall_summary,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, totalProfit: cumulativeProfit };
}

/**
 * [Transparency Feature]
 * 시뮬레이션 시작 전, 실제 전송될 프롬프트의 미리보기를 생성합니다.
 */
export async function getAiPromptPreview(
    db: admin.firestore.Firestore,
    gameId: string,
    dateStr: string,
    startRound?: number,
    endRound?: number
) {
    const year = dateStr.substring(0, 4);
    const roundsRef = db.collection("games").doc(`${year}_${gameId}`).collection("result").doc(dateStr).collection("rounds");

    // 특정 회차 또는 첫 번째 회차 데이터 가져오기
    const targetRound = startRound || 1;
    const roundsSnapshot = await roundsRef.where("round", "==", targetRound).get();

    if (roundsSnapshot.empty) {
        return {
            success: false,
            message: `${targetRound}회차 데이터가 Firestore에 존재하지 않습니다. (수집 상태 확인 필요)`
        };
    }


    const GEMINI_API_KEY = await getGeminiApiKey(db);
    if (!GEMINI_API_KEY) {
        return {
            success: false,
            message: "GEMINI_API_KEY가 설정되지 않았습니다. 관리자 페이지 > 설정에서 API 키를 입력해주세요."
        };
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // 30일 데이터 조회
    const targetDate = new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8))
    );
    const startDate = new Date(targetDate);
    startDate.setDate(targetDate.getDate() - 30);

    // 타임존 영향을 피하기 위해 로컬 날짜 기준으로 문자열 생성
    const formatYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${y}${m}${day}`;
    };

    const startDateStr = formatYMD(startDate);
    const startYear = startDate.getFullYear().toString();
    const endYear = targetDate.getFullYear().toString();

    const historicalData = await fetchHistoricalGameData(db, gameId, dateStr);

    const totalFoundFiltered = historicalData.length;

    // [Step A] 데이터 요약 및 봇별 맞춤 비기 생성
    const summarizationPrompt = `
# [LONG-TERM TREND ANALYSIS REQUEST]
- TARGET GAME: ${gameId.toUpperCase()}
- DATA COUNT: ${historicalData.length} days of real game results.
- HISTORICAL DATA (JSON): ${JSON.stringify(historicalData)}

Please perform a deep statistical and pattern analysis on the provided 30-day "results" sequence.
Each "results" string is a comma-separated sequence of outcomes (e.g., L3X, R4O) for that day.
Analyze the flow, repetition, and shifts in these patterns.

Return a JSON object with:
1. "overall_summary": A professional, data-driven summary of the 30-day game result trends.
2. "bot_advice": A strategy guide for ALL bots (BOT_01 through BOT_20) based on these patterns.

FORMAT: { "overall_summary": "...", "bot_advice": { "BOT_01": "...", ... } }
`;

    let longTermAnalysis: any = { overall_summary: "Long-term trend data unavailable or insufficient.", bot_advice: {} };
    let rawAiResponse = "";
    let summaryError = "";

    try {
        const summaryModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });
        const summaryResult = await summaryModel.generateContent(summarizationPrompt);
        rawAiResponse = summaryResult.response.text();
        const summaryText = rawAiResponse.replace(/```json|```/g, "").trim();

        try {
            longTermAnalysis = JSON.parse(summaryText);
        } catch (parseError: any) {
            summaryError = `JSON Parsing Error: ${parseError.message}`;
            const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                longTermAnalysis = JSON.parse(jsonMatch[0]);
            }
        }
    } catch (e: any) {
        logger.error("Preview summary error:", e);
        summaryError = `AI Generation Error: ${e.message}`;
    }

    // 봇 정보 조회
    const botsSnapshot = await db.collection("ai_bots").where("active", "==", true).get();
    const allBots = botsSnapshot.docs.map(d => d.data());

    // 실제 최근 15회차 흐름 가져오기
    const contextDateStr = dateStr;
    const yearForContext = dateStr.substring(0, 4); // Use year from dateStr
    const contextRoundsRef = db.collection("games").doc(`${yearForContext}_${gameId}`).collection("result").doc(contextDateStr).collection("rounds");
    const contextRoundsSnapshot = await contextRoundsRef.orderBy("round", "asc").get();
    const contextRoundsDocs = contextRoundsSnapshot.docs.map(doc => doc.data() as RoundResult);

    // 대상 회차 인덱스 찾기
    const targetIdx = contextRoundsDocs.findIndex(r => r.round === targetRound);
    const contextHistory = contextRoundsDocs.slice(Math.max(0, targetIdx - 15), targetIdx)
        .map(r => r.result)
        .filter(res => !!res)
        .join(", ");

    const fullPrompt = generateStandardPrompt(
        gameId,
        targetRound,
        dateStr,
        longTermAnalysis.overall_summary,
        contextHistory,
        allBots.slice(0, 20),
        longTermAnalysis.bot_advice
    );

    return {
        success: true,
        validation_steps: {
            data_check: {
                passed: historicalData.length > 0,
                count: historicalData.length,
                message: historicalData.length > 0
                    ? `${historicalData.length}일치 과거 데이터를 성공적으로 가져왔습니다.`
                    : "최근 30일 내에 수집된 과거 데이터가 없습니다.",
                debug_info: {
                    target_date: dateStr,
                    query_years: startYear === endYear ? [endYear] : [startYear, endYear],
                    query_range: `${startDateStr} ~ ${dateStr} (미만)`,
                    final_count: totalFoundFiltered,
                    all_ids: historicalData.map(d => d.date)
                }
            },
            summary_check: {
                passed: !!longTermAnalysis.overall_summary && !longTermAnalysis.overall_summary.includes("unavailable"),
                summary: longTermAnalysis.overall_summary,
                message: (!!longTermAnalysis.overall_summary && !longTermAnalysis.overall_summary.includes("unavailable"))
                    ? "장기 트렌드 분석 요약이 생성되었습니다."
                    : "분석 데이터를 충분히 확보하지 못해 요약 생성에 실패했습니다.",
                debug_info: {
                    prompt: summarizationPrompt,
                    raw_text: rawAiResponse,
                    error: summaryError
                }
            }
        },
        summary: longTermAnalysis.overall_summary || "분석 데이터를 충분히 확보하지 못했습니다.",
        bot_advice_sample: longTermAnalysis.bot_advice?.["BOT_01"] || "데이터에 기반하여 신중한 분석을 수행하세요.",
        full_prompt_preview: fullPrompt
    };
}

/**
 * Simple wrapper for Gemini API call
 * 이 함수는 PredictionExecutor 등에서 사용됩니다.
 */
export async function getGeminiResponse(
    apiKey: string | null,
    systemPrompt: string,
    userPrompt: string,
    modelName: string = "gemini-2.5-flash"
): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API Key is missing.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // systemPrompt가 있는 경우 model config에 포함
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt ? { role: "system", parts: [{ text: systemPrompt }] } : undefined,
        generationConfig: {
            temperature: 0.0, // Zero temperature for maximum speed and determinism
            maxOutputTokens: 800, // Increased to prevent JSON truncation
        }
    });

    try {
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}
