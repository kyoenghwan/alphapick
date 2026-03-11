import * as admin from "firebase-admin";
import * as puppeteer from "puppeteer";
import { BotManager } from "./bots/botManager";
import { PipelineFileManager } from "./pipeline/PipelineFileManager";

// 1. Firebase Admin 초기화
const projectId = "alphapick-a9b9e";
const serviceAccount = require("../serviceAccountKey.json");

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
        storageBucket: `${projectId}.firebasestorage.app`
    });
}

const db = admin.firestore();

/**
 * [Collector] 수집 로직
 */
async function collectResults() {
    console.log(`\n[${new Date().toLocaleString()}] [Collector] 수집 사이클 시작...`);

    try {
        const activeGamesSnap = await db.collection("categories").where("isActive", "==", true).get();
        const activeGames = activeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`[Collector] 활성 게임 수: ${activeGames.length}`);

        if (activeGames.length === 0) return;

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            for (const game of activeGames as any[]) {
                const gameCode = game.gameCode;
                if (!gameCode) continue;

                const urlMap: { [key: string]: string } = {
                    "bubble_ladder": "bubbleladder",
                    "eos_powerball_5": "eosball5m",
                    "dh_powerball": "powerball"
                };
                const bepickCode = urlMap[gameCode] || gameCode;

                try {
                    await page.goto(`https://bepick.net/live/${bepickCode}`, { waitUntil: "networkidle2", timeout: 30000 });

                    const data = await page.evaluate(() => {
                        const getByX = (path: string) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;
                        const h3 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3');
                        const roundMatch = h3?.textContent?.trim().match(/-?\s*(\d+)\s*$/);
                        const round = roundMatch ? parseInt(roundMatch[1], 10) : null;

                        const s1 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[1]');
                        const s2 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[2]');
                        const span3 = document.evaluate('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[3]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;

                        if (s1 && s2 && span3) {
                            const getStyle = (el: Element) => window.getComputedStyle(el, "::after").content.replace(/^["']|["']$/g, "");
                            const v1 = getStyle(s1);
                            const v2 = getStyle(s2).replace(/줄/g, "");
                            const v3 = getStyle(span3);

                            if (v1 && v2 && v3) {
                                const direction = v1.includes("우") ? "R" : "L";
                                const oddEven = v3.includes("홀") ? "O" : "X";
                                return { round, converted: `${direction}${v2}${oddEven}`, original: `${v1}${v2}${v3}` };
                            }
                        }
                        return { round, converted: null, original: null };
                    });

                    if (data.round && data.converted) {
                        const { round, converted, original } = data;
                        const today = new Date();
                        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
                        const roundStr = String(round).padStart(3, "0");

                        const yearGameCode = `${today.getFullYear()}_${gameCode}`;
                        const gameRef = db.collection("games").doc(yearGameCode).collection("result").doc(dateStr).collection("rounds").doc(roundStr);

                        // 데이터 존재 여부 확인 후 저장 (중복 쓰기 방지)
                        const docSnap = await gameRef.get();
                        if (!docSnap.exists) {
                            await gameRef.set({
                                result: converted,
                                resultOriginal: original,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                            console.log(`[Collector] 수집 완료: ${gameCode} - ${round}회차 (${converted})`);
                        }
                    }
                } catch (gameError) {
                    console.error(`[Collector] [${gameCode}] 수집 오류:`, gameError);
                }
            }
        } finally {
            await browser.close();
        }
    } catch (error) {
        console.error("[Collector] 치명적 오류:", error);
    }
}

/**
 * [Predictor] 실시간 분석 로직 (Firestore 리스너)
 */
async function runPredictor(gameCode: string, yearGameCode: string, dateStr: string, roundStr: string, newData: any) {
    const round = parseInt(roundStr);
    const result = newData.result;

    console.log(`\n[${new Date().toLocaleString()}] [Predictor] 분석 시작: ${gameCode}, ${round}회차 결과=${result}`);

    try {
        // 1. 적중 여부 확인 (Round N)
        const predRef = db.collection("predictions").doc(`${gameCode}_${dateStr}_${round}`);
        const predSnap = await predRef.get();
        const prediction = predSnap.exists ? predSnap.data()?.prediction : null;
        const isHit = prediction ? (prediction === result) : null;

        // 결과 문서에 적중 여부 업데이트 (collectionGroup으로 찾았으므로 ref가 직접 없음. 경로 재구성)
        await db.collection("games").doc(yearGameCode).collection("result").doc(dateStr).collection("rounds").doc(roundStr).set({ is_hit: isHit }, { merge: true });

        // 2. 다음 회차 분석 (Round N + 1)
        const configSnap = await db.collection("settings").doc("ai_config").get();
        const config = configSnap.exists ? configSnap.data() : null;

        if (!config || config.is_enabled === false || !config.gemini_api_key) {
            console.log("[Predictor] AI 설정이 비활성화되어 있거나 API 키가 없습니다.");
            return;
        }

        const activeGroups = {
            st: config.active_st !== false,
            mt: config.active_mt !== false,
            lt: config.active_lt !== false,
            comp1: config.active_comp1 !== false,
            comp2: config.active_comp2 !== false,
            final: config.active_final !== false,
        };

        const botManager = new BotManager(db, config.gemini_api_key);
        const gameData = await botManager.generateTestGameData(gameCode, dateStr);
        const botResults = await botManager.runAllBots(gameData, activeGroups);

        const nextRound = round + 1;
        const nextDocId = `${gameCode}_${dateStr}_${nextRound}`;
        const masterBot = botResults.find(r => r.bot_id === "BOT_20");

        // 예측값 저장
        await db.collection("predictions").doc(nextDocId).set({
            round: nextRound,
            gameCode,
            prediction: masterBot ? masterBot.prediction : "PASS",
            confidence: masterBot ? masterBot.confidence : 0,
            reason: masterBot ? masterBot.reason : "분석 대기 중",
            status: "pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Pipeline JSON 업데이트
        let dailyData: any = await PipelineFileManager.loadBatchResult(db, gameCode, dateStr);
        if (!dailyData) {
            dailyData = { gameId: gameCode, date: dateStr, totalRounds: 0, rounds: [], stats: {} };
        }

        const roundDetail = {
            round,
            result: result,
            resultOriginal: newData.resultOriginal || "",
            botResults: botResults.map(r => ({
                bot_id: r.bot_id,
                prediction: r.prediction,
                confidence: r.confidence,
                is_hit: r.prediction === result
            }))
        };

        const existingIdx = dailyData.rounds.findIndex((r: any) => r.round === round);
        if (existingIdx >= 0) dailyData.rounds[existingIdx] = roundDetail;
        else {
            dailyData.rounds.push(roundDetail);
            dailyData.totalRounds++;
        }

        botResults.forEach(r => {
            if (!dailyData.stats[r.bot_id]) dailyData.stats[r.bot_id] = { total: 0, hits: 0, rate: 0 };
            dailyData.stats[r.bot_id].total++;
            if (r.prediction === result) dailyData.stats[r.bot_id].hits++;
            dailyData.stats[r.bot_id].rate = parseFloat(((dailyData.stats[r.bot_id].hits / dailyData.stats[r.bot_id].total) * 100).toFixed(1));
        });

        await PipelineFileManager.saveBatchResult(db, gameCode, dateStr, dailyData);
        await PipelineFileManager.updateBatchSummary(gameCode, [dailyData]);

        // 분석 로그 저장
        await db.collection("ai_bots_step_log").doc(`${nextDocId}_realtime`).set({
            type: "realtime_production",
            gameCode,
            dateStr,
            round: nextRound,
            botResults: botResults,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Predictor] ${gameCode} 분석 및 예측 완료: ${nextRound}회차용`);
    } catch (err) {
        console.error(`[Predictor] 분석 중 오류:`, err);
    }
}

/**
 * [Main] 서버 실행기
 */
async function main() {
    console.log("==================================================");
    console.log("   AlphaPick 통합 백엔드 서버 (Windows Standalone)  ");
    console.log("==================================================");

    // 1. Predictor 리스너 설정 (실시간 결과 감시)
    console.log("[System] Predictor 실시간 리스너 작동 시작...");
    db.collectionGroup("rounds").where("updatedAt", ">", new Date())
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    const doc = change.doc;
                    const data = doc.data();
                    if (data.result && !data.is_hit_checked) { // 중복 실행 방지 플래그 (옵션)
                        // 경로에서 파라미터 추출: games/{yearGameCode}/result/{dateStr}/rounds/{roundStr}
                        // doc.ref.path: games/2026_bubble_ladder/result/20260212/rounds/001
                        const parts = doc.ref.path.split("/");
                        if (parts.length >= 6) {
                            const yearGameCode = parts[1];
                            const dateStr = parts[3];
                            const roundStr = parts[5];
                            const gameCode = yearGameCode.split("_").slice(1).join("_");

                            runPredictor(gameCode, yearGameCode, dateStr, roundStr, data);
                        }
                    }
                }
            });
        }, (error) => {
            console.error("[Predictor] 리스너 치명적 오류:", error);
        });

    // 2. Collector 루프 시작 (3분 주기)
    console.log("[System] Collector 3분 주기 수집기 작동 시작...");
    await collectResults(); // 시작 시 즉시 실행
    setInterval(async () => {
        await collectResults();
    }, 3 * 60 * 1000);
}

main().catch(console.error);
