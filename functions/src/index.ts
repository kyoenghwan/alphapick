// 에뮬레이터 환경변수 제거 (가장 먼저 수행)
if (process.env.FUNCTIONS_EMULATOR === "true") {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
}

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as scheduler from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as puppeteer from "puppeteer";
import { FieldValue } from "firebase-admin/firestore";
import { analyzeGameDays, runAiSimulation, getAiPromptPreview as getAiPromptPreviewInternal, getGeminiApiKey, getGeminiResponse } from "./ai-manager";
import { BotManager } from "./bots/botManager";
import { PipelineFileManager } from "./pipeline/PipelineFileManager";
import { DataFetcher } from "./pipeline/01_data_fetch/DataFetcher";
import { SingleBotExecutor } from "./pipeline/SingleBotExecutor";
import { SummaryGenerator } from "./pipeline/02_summary_gen/SummaryGenerator";
import { PromptGenerator } from "./pipeline/03_prompt_gen/PromptGenerator";
import { IPipelineSummary } from "./pipeline/types";

let db: any;


// Firebase Admin 지연 초기화 함수
export async function getDb(): Promise<admin.firestore.Firestore> {
  if (db) return db;

  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  logger.info("Initializing Firebase Admin...");
  const projectId = "alphapick-a9b9e";

  try {
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      logger.info("Emulator detected. Connecting to Production Firestore...");
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

      const serviceAccount = require("../serviceAccountKey.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
        storageBucket: "alphapick-a9b9e.firebasestorage.app"
      });
    } else {
      admin.initializeApp({
        storageBucket: "alphapick-a9b9e.firebasestorage.app"
      });
    }
    db = admin.firestore();
    return db;
  } catch (error) {
    logger.error("Database initialization failed:", error);
    // Fallback for local emulator if production connection fails
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: projectId });
    }
    db = admin.firestore();
    return db;
  }
}


/**
 * [배치 1] 데이터 수집기 (Collector)
 * 3분마다 실행되어 최신 게임 결과를 추출하고 Firestore에 저장합니다.
 */
export const collectGameResults = scheduler.onSchedule(
  {
    schedule: "every 3 minutes",
    timeoutSeconds: 60,
    memory: "1GiB", // 브라우저 사용을 위해 넉넉하게 할당
  },
  async () => {
    logger.info("모든 게임 결과 수집기(Collector) 시작");

    const db = await getDb();
    const activeGamesSnap = await db.collection("categories").where("isActive", "==", true).get();
    const activeGames = activeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    logger.info(`활성 게임 수: ${activeGames.length}`);

    if (activeGames.length === 0) {
      logger.info("활성화된 게임이 없습니다. 작업을 종료합니다.");
      return;
    }

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      });
      // browser is now launched
    } catch (launchError: any) {
      logger.error("[Collector] Puppeteer 실행 실패:", launchError);
      throw launchError;
    }

    if (!browser) return;

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

          const extractData = async () => {
            return await page.evaluate(() => {
              const getByX = (path: string) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;
              const h3 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3');
              const roundMatch = h3?.textContent?.trim().match(/-?\s*(\d+)\s*$/);
              const round = roundMatch ? parseInt(roundMatch[1], 10) : null;

              const s1 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[1]');
              const s2 = getByX('//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[2]');
              // s3 is actually the 3rd result icon
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
          };

          let data = await extractData();
          if (!data.round || !data.converted) {
            await new Promise(r => setTimeout(r, 3000));
            await page.reload({ waitUntil: "networkidle2" });
            data = await extractData();
          }

          if (data.round && data.converted) {
            const { round, converted, original } = data;
            const today = new Date();
            const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
            const roundStr = String(round).padStart(3, "0");

            const yearGameCode = `${today.getFullYear()}_${gameCode}`;
            const gameRef = db.collection("games").doc(yearGameCode).collection("result").doc(dateStr).collection("rounds").doc(roundStr);

            // 결과 저장 (이 작업이 분석 트리거를 발생시킴)
            await gameRef.set({
              result: converted,
              resultOriginal: original,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            logger.info(`[Collector] 수집 완료: ${gameCode} - ${round}회차 (${converted})`);
          }
        } catch (gameError) {
          logger.error(`[Collector] ${gameCode} 수집 중 오류:`, gameError);
        }
      }
    } finally {
      if (browser) await browser.close();
    }
  }
);

/**
 * [배치 2] AI 분석기 (Predictor)
 * 새로운 게임 결과가 Firestore에 저장되면 트리거되어 다음 회차를 분석합니다.
 */
export const onGameResultWrite = onDocumentWritten(
  {
    document: "games/{yearGameCode}/result/{dateStr}/rounds/{roundStr}",
    timeoutSeconds: 120,
    memory: "1GiB",
  },
  async (event) => {
    const newData = event.data?.after.data();
    if (!newData || !newData.result) return;

    const { yearGameCode, dateStr, roundStr } = event.params;
    const round = parseInt(roundStr);
    const result = newData.result;

    // yearGameCode에서 gameCode 분리 (예: 2026_bubble_ladder -> bubble_ladder)
    const gameCode = yearGameCode.split("_").slice(1).join("_");

    logger.info(`[Predictor] 분석 트리거 실행: ${gameCode}, ${round}회차 결과=${result}`);

    const db = await getDb();

    // 1. 적중 여부 확인 (Round N)
    const predRef = db.collection("predictions").doc(`${gameCode}_${dateStr}_${round}`);
    const predSnap = await predRef.get();
    const prediction = predSnap.exists ? predSnap.data()?.prediction : null;
    const isHit = prediction ? (prediction === result) : null;

    // 결과 문서에 적중 여부 업데이트
    await event.data?.after.ref.set({ is_hit: isHit }, { merge: true });

    // 2. 다음 회차 분석 (Round N + 1)
    const configSnap = await db.collection("settings").doc("ai_config").get();
    const config = configSnap.exists ? configSnap.data() : null;

    if (!config || config.is_enabled === false || !config.gemini_api_key) {
      logger.info("[Predictor] AI 설정이 비활성화되어 있거나 API 키가 없습니다.");
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

    try {
      const botManager = new BotManager(db, config.gemini_api_key);
      const gameData = await botManager.generateTestGameData(gameCode, dateStr);
      const botResults = await botManager.runAllBots(gameData, activeGroups);

      const nextRound = round + 1;
      const nextDocId = `${gameCode}_${dateStr}_${nextRound}`;
      const masterBot = botResults.find(r => r.bot_id === "BOT_20");

      // 예측값 저장 (Firestore)
      await db.collection("predictions").doc(nextDocId).set({
        round: nextRound,
        gameCode,
        prediction: masterBot ? masterBot.prediction : "PASS",
        confidence: masterBot ? masterBot.confidence : 0,
        reason: masterBot ? masterBot.reason : "분석 대기 중",
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // JSON 저장소(Pipeline) 업데이트
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

      // 봇별 승률 갱신
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

      logger.info(`[Predictor] ${gameCode} 분석 및 예측 완료: ${nextRound}회차용`);
    } catch (err) {
      logger.error(`[Predictor] 분석 중 오류:`, err);
    }
  }
);


export const migrateHistoricalData = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
},
  async (req, res) => {
    // CORS 처리
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // 1. 요청 메서드 및 파라미터 검증
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { date, gameCode, headless = true } = req.body;

    if (!date || !/^\d{8}$/.test(date)) {
      res.status(400).json({ error: "날짜 형식이 올바르지 않습니다. YYYYMMDD 형식이어야 합니다." });
      return;
    }

    if (!gameCode) {
      res.status(400).json({ error: "게임 코드(gameCode)가 필요합니다." });
      return;
    }

    let browser = null;
    let collectedCount = 0;

    try {
      // @ts-ignore - access internal settings for debugging
      const dbSettings = (db as any)._settings || {};
      logger.info(`마이그레이션 시작: ${date} (Target Project: ${dbSettings.projectId}, Host: ${dbSettings.host || 'Default Production'})`);
      console.log("DEBUG: Function started for date:", date);

      // 2. Puppeteer 브라우저 실행
      // headless 옵션을 요청 파라미터에 따라 설정합니다. false일 경우 로컬 에뮬레이터에서 브라우저 창이 뜹니다.
      const launchOptions = {
        headless: headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      };

      console.log("DEBUG: Launching Puppeteer with options:", JSON.stringify(launchOptions));
      browser = await puppeteer.launch(launchOptions);
      console.log("DEBUG: Browser launched successfully");


      const year = date.substring(0, 4);
      const dateStr = date;

      // [강제 실행 모드] 기존 데이터 유무와 상관없이 마이그레이션을 수행합니다.
      // 변경된 경로: games/{year}_{gameCode}/counts/{dateStr}
      const countRef = db.collection("games").doc(`${year}_${gameCode}`).collection("counts").doc(dateStr);
      const countDoc = await countRef.get();

      // 3. (제거됨: 중복 실행 방지)

      // 기존에 실행된 browser 인스턴스를 계속 사용합니다.
      // 3. (이미 상단에서 브라우저가 실행되었습니다)

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();

      // 화면 크기를 설정하여 요소가 렌더링되도록 함
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      // 게임 코드별 URL 매핑
      const urlMap: { [key: string]: string } = {
        "bubble_ladder": "bubble_ladder3",
        "eos_powerball_5m": "eosball5m",
        "dh_powerball": "powerball"
      };

      const bepickCode = urlMap[gameCode] || gameCode;
      const fullUrl = `https://bepick.net/main.p#/game/daily/${bepickCode}/${date}`;

      logger.info(`페이지 접속 시도: ${fullUrl} (Game: ${gameCode})`);
      // networkidle2는 타임아웃 발생 가능성이 높습니다.
      await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      logger.info(`[Scraper] 페이지 로딩 완료 (domcontentloaded) - URL: ${page.url()}`);

      // 안정적인 로딩을 위해 잠시 대기
      await new Promise(r => setTimeout(r, 2000));

      // 0. 팝업 닫기 시도 (사용자 제공 XPath)
      try {
        const popupClosed = await page.evaluate(() => {
          const getElementByXPath = (xpath: string): Element | null => {
            const result = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            return result.singleNodeValue as Element | null;
          };
          const closeBtn = getElementByXPath('//*[@id="popup_layer"]/div/span');
          if (closeBtn) {
            (closeBtn as HTMLElement).click();
            return true;
          }
          return false;
        });
        if (popupClosed) {
          logger.info("방해 팝업을 닫았습니다.");
          await new Promise(r => setTimeout(r, 1000)); // 팝업 닫힘 애니메이션 대기
        }
      } catch (e) {
        logger.warn("팝업 닫기 시도 중 오류 (무시됨):", e);
      }
      const currentUrl = page.url();
      const pageTitle = await page.title();
      logger.info(`접속 후 상태: URL=${currentUrl}, Title=${pageTitle}`);


      // 1. Iframe 찾기 및 데이터 로딩 대기
      let frame: puppeteer.Frame | puppeteer.Page | null = null;
      try {
        await page.waitForSelector('iframe', { timeout: 10000 });
        // 모든 프레임을 순회하며 데이터 테이블이 있는 프레임을 찾습니다.
        for (const f of page.frames()) {
          try {
            const table = await f.$('#dt_list');
            if (table) {
              frame = f;
              break;
            }
          } catch (e) { /* ignore errors from frames that don't have the element */ }
        }

        if (!frame) {
          logger.warn("데이터 테이블이 있는 Iframe을 찾지 못했습니다. 메인 프레임에서 재시도합니다.");
          // Iframe이 없을 수도 있으므로 메인 페이지도 확인
          try {
            const table = await page.$('#dt_list');
            if (table) frame = page;
          } catch (e) { /* ignore errors from main page not having the element */ }
        }

        if (!frame) {
          throw new Error("데이터 테이블(#dt_list)을 포함하는 프레임을 찾을 수 없습니다.");
        }

        // 프레임 내에서 테이블 데이터 로딩 대기
        await frame.waitForSelector('#dt_list tbody tr', { timeout: 10000 });

      } catch (e) {
        logger.warn("1차 로딩 실패. 새로고침 후 재시도합니다.");

        await page.reload({ waitUntil: "networkidle2" });
        if (page.url() !== fullUrl) {
          await page.goto(fullUrl, { waitUntil: "networkidle2" });
        }

        // 재시도 로직 (동일하게 프레임 탐색)
        frame = null; // Reset frame for retry
        try {
          await page.waitForSelector('iframe', { timeout: 10000 });
          for (const f of page.frames()) {
            const table = await f.$('#dt_list');
            if (table) { frame = f; break; }
          }
          if (!frame && await page.$('#dt_list')) frame = page;

          if (frame) {
            await frame.waitForSelector('#dt_list tbody tr', { timeout: 10000 });
          } else {
            throw new Error("재시도 실패: 프레임을 찾을 수 없습니다.");
          }
        } catch (retryError) {
          logger.error("2차 로딩 실패.");
          const html = await page.content();
          logger.error(`로딩 실패 시점 메인 HTML 일부: ${html.substring(0, 500)}`);
          throw new Error("페이지에서 데이터를 찾을 수 없습니다 (2회 시도 실패).");
        }
      }

      await new Promise(r => setTimeout(r, 2000));

      // 5. "더보기" 버튼 로직 (프레임 컨텍스트 사용)
      let moreButtonExists = true;
      let clickCount = 0;
      let previousRowCount = 0;

      while (moreButtonExists && clickCount < 100) {
        try {
          // 현재 행 개수 확인
          const currentRowCount = await frame.evaluate(() => document.querySelectorAll('#dt_list tbody tr').length);
          logger.info(`[Scraper] More Click #${clickCount + 1}: Current Rows = ${currentRowCount}`);

          // 행 개수가 늘어나지 않았으면 종료 (단, 첫 클릭은 제외하거나 최소 대기 필요)
          if (clickCount > 0 && currentRowCount <= previousRowCount) {
            logger.info(`[Scraper] No new rows loaded after click. Stopping 'More' loop.`);
            moreButtonExists = false;
            break;
          }
          previousRowCount = currentRowCount;

          const clicked = await frame.evaluate(() => {
            const getElementByXPath = (xpath: string): Element | null => {
              const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              );
              return result.singleNodeValue as Element | null;
            };

            const moreBtn = (document.querySelector('#dt_more') || getElementByXPath('//*[@id="dt_more"]')) as HTMLElement;
            if (moreBtn && moreBtn.offsetParent !== null && !moreBtn.classList.contains('disabled')) {
              moreBtn.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            clickCount++;
            await new Promise(r => setTimeout(r, 1500)); // 로딩 대기 시간 약간 상향
          } else {
            logger.info("[Scraper] More button not found or hidden.");
            moreButtonExists = false;
          }
        } catch (error) {
          logger.error("[Scraper] Error in More loop:", error);
          moreButtonExists = false;
        }
      }

      // 6. 모든 행 데이터 추출 (프레임 컨텍스트 사용)
      const allRoundsData = await frame.evaluate(() => {
        const rows = document.querySelectorAll('#dt_list tbody tr');
        const results: any[] = [];

        rows.forEach(row => {
          const roundElem = row.querySelector('td:nth-child(1) strong');
          const dirElem = row.querySelector('td:nth-child(3) span');
          const numElem = row.querySelector('td:nth-child(4) span');
          const oeElem = row.querySelector('td:nth-child(5) span');

          if (roundElem && dirElem && numElem && oeElem) {
            const getPseudoContent = (el: Element) => {
              const styles = window.getComputedStyle(el, "::after");
              return styles.content.replace(/^["']|["']$/g, "");
            };

            const dateElem = row.querySelector('td:first-child .date span.time');
            const timeElem = row.querySelector('td:nth-child(2) .date span.time');

            const round = parseInt(roundElem.textContent || "0");
            const date = dateElem?.textContent?.trim() || "";
            const time = timeElem?.textContent?.trim() || "";

            results.push({
              round,
              date,
              time,
              direction: getPseudoContent(dirElem),
              number: getPseudoContent(numElem).replace(/[^0-9]/g, ""),
              oddEven: getPseudoContent(oeElem),
            });
          }
        });
        return results;
      });

      logger.info(`추출된 데이터 개수: ${allRoundsData.length}`);
      if (allRoundsData.length > 0) {
        logger.info(`데이터 상세 예시 - 회차: ${allRoundsData[0].round}, 날짜: ${allRoundsData[0].date}, 시간: ${allRoundsData[0].time}`);
      }

      if (allRoundsData.length === 0) {
        throw new Error("페이지에서 데이터를 찾을 수 없습니다.");
      }

      // 7. Firestore 초기화 및 저장
      if (!countDoc.exists) {
        const initBatch = db.batch();
        initBatch.set(countRef, {
          total_collected: 0,
          total_hits: 0,
          win_rate: 0,
          max_loss_streak: 0,
          loss_streak_distribution: {},
          last_updated: FieldValue.serverTimestamp(),
        });
        await initBatch.commit();
      }

      const resultRef = db.collection("games").doc(`${year}_${gameCode}`).collection("result").doc(dateStr).collection("rounds");
      let batch = db.batch();
      let batchCount = 0;

      for (const data of allRoundsData) {
        const dirCode = data.direction.includes("우") ? "R" : "L";
        const oeCode = data.oddEven.includes("홀") ? "O" : "X";
        const converted = `${dirCode}${data.number}${oeCode}`;

        const docRef = resultRef.doc(String(data.round).padStart(3, "0"));
        // 디버그 로그: 저장하려는 경로 확인
        if (batchCount === 0) {
          console.log(`[Target DB Check] Writing to: games/${year}_${gameCode}/result/${dateStr}/rounds (Data: ${converted})`);
        }

        batch.set(docRef, {
          round: data.round,
          date: data.date,
          time: data.time,
          result: converted,
          resultOriginal: `${data.direction}${data.number}${data.oddEven}`,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        batchCount++;
        collectedCount++;
        if (batchCount >= 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
      if (batchCount > 0) await batch.commit();

      // 최종 통계 업데이트
      await countRef.set({
        total_collected: collectedCount,
        last_updated: FieldValue.serverTimestamp(),
      }, { merge: true });

      await browser.close();
      res.status(200).json({ success: true, collected: collectedCount });

    } catch (error: any) {
      logger.error("마이그레이션 실패:", error);
      if (browser) await browser.close();
      res.status(500).json({ error: error.message, date });
    }
  }
);

/**
 * [AI Pick Manager] 날짜별 데이터 상태 리포트 조회
 */
export const getAiAnalysisReport = onRequest({
  timeoutSeconds: 60,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const { gameId, year, startDate, endDate } = req.body;
    logger.info(`Report request received: ${gameId}, ${year}, ${startDate} ~ ${endDate}`);

    if (!gameId || !year) {
      logger.warn("Missing gameId or year");
      res.status(400).json({ error: "gameId와 year가 필요합니다." });
      return;
    }

    const db = await getDb();
    const report = await analyzeGameDays(db, gameId, year, startDate, endDate);
    logger.info(`Report generated successfully with ${report.length} items`);
    res.status(200).json({ success: true, report });
  } catch (error: any) {
    logger.error("Report fetch error details:", {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(200).json({
      success: false,
      message: error.message,
      details: "Check Firebase logs for more info"
    });
  }
});

/**
 * [AI Pick Manager] 시뮬레이션 시작
 */
export const startAiSimulation = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB",
  cors: true,
}, async (req, res) => {
  try {
    const { gameId, date, startRound, endRound } = req.body;
    if (!gameId || !date) {
      res.status(400).json({ error: "gameId와 date가 필요합니다." });
      return;
    }

    const db = await getDb();
    const result = await runAiSimulation(db, gameId, date, startRound, endRound);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Simulation error:", error);
    res.status(200).json({ success: false, message: error.message });
  }
});
export const getAiPromptPreview = onRequest({
  cors: true,
}, async (req, res) => {
  try {
    const { gameId, date, startRound, endRound } = req.body;
    if (!gameId || !date) {
      res.status(400).json({ error: "gameId와 date가 필요합니다." });
      return;
    }

    const db = await getDb();
    const result = await getAiPromptPreviewInternal(db, gameId, date, startRound, endRound);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Preview error:", error);
    res.status(200).json({ success: false, message: error.message });
  }
});


/**
 * [Admin Page] 봇 테스트용 게임 데이터 생성
 * - Step 1 로직을 재사용하여 데이터 생성 후 반환
 */
export const generateBotTestGameData = onRequest({
  timeoutSeconds: 60,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const { gameId, date, dateStr: legacyDateStr } = req.body;
    // dateStr가 없으면 date를 사용 (호환성)
    const dateStr = date || legacyDateStr;

    if (!gameId || !dateStr) {
      res.status(400).json({ error: "gameId and date (or dateStr) are required." });
      return;
    }

    const db = await getDb();
    const fetcher = new DataFetcher(db);

    // Step 1 실행 (파일로 저장됨) -> 로그도 함께 반환됨
    const result = await fetcher.run(gameId, dateStr);
    const { savedPath, logs } = result;

    // 저장된 데이터를 로드해서 반환 (Storage 또는 Firestore)
    // savedPath는 runId 또는 경로일 수 있음. loadStep1이 처리함.
    const gameData = await PipelineFileManager.loadStep1(db, gameId, dateStr);

    res.status(200).json({ success: true, gameData, logs, savedPath });

  } catch (error: any) {
    logger.error("generateBotTestGameData error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const runBotTest = onRequest({
  timeoutSeconds: 60,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const { botId, gameData, savedPath } = req.body;

    if (!botId) {
      throw new Error("botId is required.");
    }

    let targetGameData = gameData;

    // 대용량 데이터 처리를 위해 파일 경로로 전달받은 경우 서버에서 직접 읽음
    if (savedPath) {
      const fs = require("fs");
      if (fs.existsSync(savedPath)) {
        const content = fs.readFileSync(savedPath, "utf-8");
        targetGameData = JSON.parse(content);
      }
    }

    if (!targetGameData) {
      throw new Error("gameData or valid savedPath is required.");
    }

    const db = await getDb();
    const apiKey = await getGeminiApiKey(db);
    if (!apiKey) throw new Error("Gemini API Key not found.");

    const executor = new SingleBotExecutor();
    const result = await executor.run(botId, targetGameData, apiKey);

    res.status(200).json({ success: true, result });

  } catch (error: any) {
    logger.error("runBotTest error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * [Admin Bot Test] Single Endpoint for Multi-Step Process
 */
export const runBotTestStep = onRequest({
  timeoutSeconds: 120,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  try {
    const { step, gameId, date, botId, prompt, round } = req.body;
    logger.info(`[runBotTestStep] Step ${step} requested. Game: ${gameId}, Date: ${date}, Bot: ${botId}, Round: ${round || "ALL"}`);

    const db = await getDb();

    // --- Step 1: Fetch & Inspect ---
    if (step === 1) {
      const fetcher = new DataFetcher(db);
      const result = await fetcher.run(gameId, date);
      res.status(200).json({ success: true, result });
      return;
    }

    // --- Step 2: Generate Stats ---
    if (step === 2) {
      const generator = new SummaryGenerator();
      const runId = `${gameId}_${date}`;
      await generator.run(db, runId, botId, round); // Pass targetRound

      // Load the generated summary from Firestore to return to frontend
      const runDoc = await db.collection("ai_bots_step_log").doc(runId).get();
      if (!runDoc.exists) {
        throw new Error("Run document not found after generation.");
      }
      const summaries = runDoc.data()?.step2_summary as IPipelineSummary[];

      res.status(200).json({
        success: true,
        result: {
          savedPath: runId, // Return runId as the identifier reference
          message: "Step 2 Complete. Summaries Generated (Firestore).",
          summaryCount: summaries?.length || 0,
          raw: summaries // Send full summaries for inspection
        }
      });
      return;
    }

    // --- Step 3: Run Bot Algo ---
    if (step === 3) {
      if (!botId) throw new Error("botId is required for Step 3");

      const runId = `${gameId}_${date}`;
      const allRoundsRaw = await PipelineFileManager.loadStep1(db, gameId, date);

      // [Time Travel Filtering]
      // [Time Travel Filtering]
      let filteredRounds = allRoundsRaw;
      if (round) {
        filteredRounds = allRoundsRaw.filter(r => {
          if (r.date === date) return r.round < round;
          return true;
        });
        logger.info(`[Step 3] Sliced data for ${date} up to Round ${round}. Count: ${filteredRounds.length}`);
      }
      const allRounds = filteredRounds;

      const executor = new SingleBotExecutor();
      const summary = executor.generateSummary(botId, allRounds.map(r => r.result).filter(r => r));

      // [New] Save Step 3 Result -> Prompts Subcollection
      await db.collection("ai_bots_step_log").doc(runId).collection("prompts").doc(botId).set({
        step3_execution: {
          summary,
          executedAt: new Date()
        }
      }, { merge: true });

      res.status(200).json({ success: true, result: summary });
      return;
    }

    // --- Step 4: Construct Prompt ---
    if (step === 4) {
      if (!botId) throw new Error("botId is required for Step 4");

      const runId = `${gameId}_${date}`;
      // We need summaries. 
      // We can re-generate or load from Step 2 file.
      // Let's re-generate for simplicity and statelessness.
      const allRoundsRaw = await PipelineFileManager.loadStep1(db, gameId, date);

      // [Time Travel Filtering]
      let filteredRounds = allRoundsRaw;
      if (round) {
        filteredRounds = allRoundsRaw.filter(r => {
          if (r.date === date) return r.round < round;
          return true;
        });
        logger.info(`[Step 4] Sliced data for ${date} up to Round ${round}. Count: ${filteredRounds.length}`);
      }
      const allRounds = filteredRounds;
      const executor = new SingleBotExecutor();
      const summary = executor.generateSummary(botId, allRounds.map(r => r.result).filter(r => r));

      const botNum = parseInt(botId.split('_')[1]);
      let promptText = "";

      // Accessing PromptGenerator static methods
      if (botNum <= 5) {
        promptText = PromptGenerator.getSTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw, round);
      } else if (botNum <= 10) {
        promptText = PromptGenerator.getMTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw, round);
      } else {
        promptText = PromptGenerator.getLTPromptTemplate(botId, summary.layer1_macro, summary.layer2_rolling, summary.layer3_raw, round);
      }

      // [New] Save Step 4 Result -> Prompts Subcollection
      await db.collection("ai_bots_step_log").doc(runId).collection("prompts").doc(botId).set({
        step4_prompt: {
          promptText,
          generatedAt: new Date()
        }
      }, { merge: true });

      res.status(200).json({ success: true, result: { promptText } });
      return;
    }

    // --- Step 5: Execute AI ---
    if (step === 5) {
      if (!prompt) throw new Error("prompt is required for Step 5");

      const runId = `${gameId}_${date}`;
      const apiKey = await getGeminiApiKey(db);
      if (!apiKey) throw new Error("Gemini API Key not found");

      // Use user-selected model or default to 2.5 Flash
      const targetModel = req.body.modelName || "gemini-2.5-flash";
      logger.info(`[Step 5] Executing AI with Model: ${targetModel}`);

      const aiResponseText = await getGeminiResponse(apiKey, "You are a professional lottery analyst AI.", prompt, targetModel);

      // Parse result
      let parsedResult: any = null;
      try {
        let cleared = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstBrace = cleared.indexOf('{');
        const lastBrace = cleared.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          cleared = cleared.substring(firstBrace, lastBrace + 1);
        }
        parsedResult = JSON.parse(cleared);
      } catch (e) {
        logger.warn("Failed to parse AI JSON", e);
      }

      // [Safe Extraction] Extract real confidence value from reason text (e.g. "is 55.65%")
      let calculatedConfidence = parsedResult?.confidence || 0;
      if (parsedResult?.reason) {
        const match = parsedResult.reason.match(/is\s+(\d+(\.\d+)?)%/);
        if (match && match[1]) {
          calculatedConfidence = parseFloat(match[1]);
        }
      }

      // [New] Save Step 5 Result -> Prompts Subcollection
      await db.collection("ai_bots_step_log").doc(runId).collection("prompts").doc(botId).set({
        step5_result: {
          rawResponse: aiResponseText,
          parsedResult,
          calculated_confidence: calculatedConfidence,
          executedAt: new Date()
        }
      }, { merge: true });

      res.status(200).json({
        success: true,
        result: {
          rawResponse: aiResponseText,
          parsedResult
        }
      });
      return;
    }

    throw new Error("Invalid Step");

  } catch (error: any) {
    logger.error(`runBotTestStep Error (Step ${req.body.step}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- New API: Run Parallel Batch Test ---
const cors = require("cors");
const corsHandler = cors({ origin: true });

export const runBatchTest = onRequest({ timeoutSeconds: 540, memory: "1GiB" }, async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { gameId, date, startDate, endDate, round, group } = req.body;
      const startTime = Date.now();

      // Target Date or Range
      // If startDate/endDate provided, use them. Else fall back to 'date' as single day range.
      const sDateStr = startDate || date;
      const eDateStr = endDate || date;

      if (!gameId || !sDateStr || !group) {
        throw new Error("Missing required fields: gameId, date (or startDate/endDate), group");
      }

      // Parse Dates
      const startDt = new Date(
        parseInt(sDateStr.substring(0, 4)),
        parseInt(sDateStr.substring(4, 6)) - 1,
        parseInt(sDateStr.substring(6, 8))
      );
      const endDt = new Date(
        parseInt(eDateStr.substring(0, 4)),
        parseInt(eDateStr.substring(4, 6)) - 1,
        parseInt(eDateStr.substring(6, 8))
      );

      // Validate Range
      const dayDiff = (endDt.getTime() - startDt.getTime()) / (1000 * 3600 * 24);
      if (dayDiff < 0) throw new Error("EndDate must be after StartDate");
      if (dayDiff > 100) throw new Error("Date range too large. Max 100 days allowed for Batch Test.");

      const db = await getDb();

      // [New] Check Cumulative History & Auto-Backfill
      const existingHistory = await PipelineFileManager.loadCumulativeBatchResult(gameId, 1);
      let usingStartDt = new Date(startDt);

      if (existingHistory.length === 0) {
        logger.info("[Batch Test] First run detected. Will pre-warm cache from DB.");
        // usingStartDt remains as User Input Start Date.
        // We will fetch older data for cache, but NOT simulate/save it.
      }
      // API Key check removed as it is not used in Local Batch test

      // 1. Identify Target Bots
      let targetBots: string[] = [];
      if (group === "ST") targetBots = ["BOT_01", "BOT_02", "BOT_03", "BOT_04", "BOT_05"];
      else if (group === "MT") targetBots = ["BOT_06", "BOT_07", "BOT_08", "BOT_09", "BOT_10"];
      else if (group === "LT") targetBots = ["BOT_11", "BOT_12", "BOT_13", "BOT_14", "BOT_15"];
      else if (group === "LOCAL_15") targetBots = Array.from({ length: 15 }, (_, i) => `BOT_${String(i + 1).padStart(2, '0')}`);
      else if (group === "ALL_20") targetBots = Array.from({ length: 20 }, (_, i) => `BOT_${String(i + 1).padStart(2, '0')}`);
      else throw new Error("Invalid Group.");

      logger.info(`[Batch Test] Starting ${group} Group for ${sDateStr} ~ ${eDateStr} (Round: ${round || "ALL"})`);

      // Initialize Stats (Shared across all dates to maintain Streak state)
      const stats: any = {};
      targetBots.forEach(botId => {
        stats[botId] = {
          total: 0, win: 0, loss: 0, pass: 0,
          winRate: 0, currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0, history: []
        };
      });

      const { LocalBotExecutor } = require("./pipeline/05_execution/LocalBotExecutor");
      const executor = new SingleBotExecutor();

      // --- SINGLE ROUND MODE (Round > 0) ---
      if (round > 0) {
        const y = startDt.getFullYear();
        const m = String(startDt.getMonth() + 1).padStart(2, '0');
        const d = String(startDt.getDate()).padStart(2, '0');
        const currentDateStr = `${y}${m}${d}`;

        let allRoundsRaw: any[] = [];
        try {
          allRoundsRaw = await PipelineFileManager.loadStep1(db, gameId, currentDateStr);
        } catch (e) {
          // Auto-fetch logic for single round
          try {
            const fetcher = new DataFetcher(db);
            await fetcher.run(gameId, currentDateStr, true);
            allRoundsRaw = await PipelineFileManager.loadStep1(db, gameId, currentDateStr);
          } catch (fetchErr: any) {
            throw new Error(`Failed to load data for ${currentDateStr}: ${fetchErr.message}`);
          }
        }

        const filteredRounds = allRoundsRaw.filter(r => r.round < round);
        const results = await Promise.all(targetBots.map(async (botId) => {
          const botStartTime = Date.now();
          try {
            const summary = executor.generateSummary(botId, filteredRounds.map(r => r.result).filter(r => r));
            const parsedResult = LocalBotExecutor.execute(botId, summary);
            return {
              botId, success: true, prediction: parsedResult?.prediction || "Pass",
              confidence: parsedResult?.confidence || 0, reason: parsedResult?.reason || "No Reason",
              executionTime: Date.now() - botStartTime, timings: { start: botStartTime, end: Date.now() }
            };
          } catch (err: any) {
            return { botId, success: false, error: err.message };
          }
        }));

        res.status(200).json({
          success: true, group, type: "SINGLE_ROUND",
          durationMs: Date.now() - startTime, results
        });
        return;
      }

      // --- BATCH MODE (Full Date Range Loop) ---
      // --- BATCH MODE (Full Date Range Loop) ---
      // [Optimization] Load ALL required data (History + Test Range) ONCE into memory.
      // 1. Calculate Fetch Range: [BatchStart - 35 days] to [BatchEnd]
      // We add extra buffer (35 days) to ensure we have full 30 days context for the first test day.
      const BATCH_HISTORY_DAYS = 35;
      const fetchStartDt = new Date(usingStartDt);
      fetchStartDt.setDate(fetchStartDt.getDate() - BATCH_HISTORY_DAYS);

      const formatYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
      };
      const fetchStartStr = formatYMD(fetchStartDt);
      const endDateStr = formatYMD(endDt);

      logger.info(`[Batch Optimization] Fetching Global Data from ${fetchStartStr} to ${endDateStr}`);

      // Helper to fetch all rounds for a given date range from Firestore
      const fetchRoundsForDateRange = async (db: any, gameId: string, start: string, end: string) => {
        const allRounds: { date: string, round: number, result: string }[] = [];
        const current = new Date(
          parseInt(start.substring(0, 4)),
          parseInt(start.substring(4, 6)) - 1,
          parseInt(start.substring(6, 8))
        );
        const endD = new Date(
          parseInt(end.substring(0, 4)),
          parseInt(end.substring(4, 6)) - 1,
          parseInt(end.substring(6, 8))
        );

        while (current <= endD) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, '0');
          const d = String(current.getDate()).padStart(2, '0');
          const dateStr = `${y}${m}${d}`;

          try {
            const q = db.collection("games").doc(`${y}_${gameId}`).collection("result")
              .doc(dateStr).collection("rounds").orderBy("round");
            const snap = await q.get();
            snap.docs.forEach((doc: any) => {
              const data = doc.data();
              // Normalize result
              let res = data.result;
              if (res) res = res.replace(/X/g, 'E').replace(/Even/g, 'E').replace(/Odd/g, 'O');
              allRounds.push({ date: dateStr, round: data.round, result: res });
            });
          } catch (e: any) {
            logger.warn(`Failed to fetch rounds for ${dateStr}: ${e.message}`);
          }
          current.setDate(current.getDate() + 1);
        }
        return allRounds.filter(r => r.result); // Filter out any rounds without a result
      };

      // 2. Fetch All Raw Data (Firestore Optimized)
      const globalRounds = await fetchRoundsForDateRange(db, gameId, fetchStartStr, endDateStr);
      logger.info(`[Batch Optimization] Loaded ${globalRounds.length} total rounds into RAM for the entire simulation range.`);

      // 3. Create a map for quick lookup of rounds by date
      const roundsByDate: { [date: string]: { date: string, round: number, result: string }[] } = {};
      globalRounds.forEach(r => {
        if (!roundsByDate[r.date]) {
          roundsByDate[r.date] = [];
        }
        roundsByDate[r.date].push(r);
      });
      // Sort rounds within each day by round number
      Object.values(roundsByDate).forEach(dayRounds => dayRounds.sort((a, b) => a.round - b.round));

      // RE-PLANNING IMPLEMENTATION BLOCK:
      // Since I cannot easily write a complex "Download 365 files in parallel" logic in one replace block without risking bugs,
      // I will implement a Hybrid Loop that is Optimized:
      // Loop is inevitable, but we will maintain `rollingHistory` (Cache) to avoid re-fetching overlap.
      // 1. Init `rollingCache` = Last 30 days of rounds.
      // 2. Loop Day D:
      //    - Fetch Day D data (1 file/DB call).
      //    - Combine `rollingCache` + `Day D`.
      //    - Run Sim.
      //    - Update `rollingCache`: Remove Day (D-30), Add Day D.
      // This is "Sliding Window" exactly.
      // It reduces fetch from "30 days per day" to "1 day per day". (30x speedup).

      // Revised Implementation below:

      let totalRoundsProcessed = 0;
      // const accumulatedResults: any[] = []; // Removed for sequential saving
      const loopDate = new Date(usingStartDt);
      const simulationStats = stats;

      // [Optimization] Pre-warm the cache with 30 days PRIOR to startDt
      logger.info("[Batch Optimization] Pre-warming history cache...");
      let contextCache: { date: string, round: number, result: string }[] = []; // Stores { date, result, round }

      // Populate initial contextCache from globalRounds for dates before startDt
      const startDateTargetStr = formatYMD(startDt);

      globalRounds.forEach(r => {
        if (r.date < startDateTargetStr) {
          contextCache.push(r);
        }
      });
      // Ensure contextCache doesn't grow indefinitely, keep only the last ~30 days
      if (contextCache.length > 14500) { // 30 days * 480 rounds/day = 14400
        contextCache = contextCache.slice(-14500);
      }

      logger.info(`[Batch Optimization] Cache initialized with ${contextCache.length} rounds.`);

      while (loopDate <= endDt) {
        const y = loopDate.getFullYear();
        const m = String(loopDate.getMonth() + 1).padStart(2, '0');
        const d = String(loopDate.getDate()).padStart(2, '0');
        const currentDateStr = `${y}${m}${d}`;

        logger.info(`[Batch Simulation] Processing Date: ${currentDateStr} (Cache Size: ${contextCache.length})`);

        // 1. Get Today's Data from pre-fetched globalRounds
        const dayRounds = roundsByDate[currentDateStr] || [];

        if (dayRounds.length === 0) {
          logger.warn(`No data for ${currentDateStr}, skipping.`);
          loopDate.setDate(loopDate.getDate() + 1);
          continue;
        }

        // [Refactor] Storage-based Saving (Accumulate in Memory)
        const dailyPredictions: any = {};

        for (const r of dayRounds) {
          if (!r.result) continue;

          const currentRoundPredictions: any = {};

          for (const botId of targetBots) {
            try {
              // Context is Cache (Past) 
              // We need to pass ONLY the result strings to generateSummary
              // Filter cache to be strict 30 days?
              // The cache grows indefinitely in this loop. We should slice it to last ~8640 rounds (30 days) to match LIVE logic.
              // Max rounds = 30 * 480 = 14400.
              // 480 rounds/day context
              const validContext = contextCache.slice(-14500).map(c => c.result); // slight buffer

              const summary = executor.generateSummary(botId, validContext);
              const pred = LocalBotExecutor.execute(botId, summary);

              let isWin = false;
              if (pred.prediction === "PASS") {
                simulationStats[botId].pass++;
                simulationStats[botId].history.push(0);
              } else {
                const cleanTarget = r.result.replace(/Even/g, "E").replace(/Odd/g, "O").replace(/X/g, "E");
                const cleanPred = pred.prediction.replace(/Even/g, "E").replace(/Odd/g, "O").replace(/X/g, "E");

                if (cleanPred.length === 3 && cleanTarget.length === 3) {
                  let matchCount = 0;
                  if (cleanPred[0] === cleanTarget[0]) matchCount++;
                  if (cleanPred[1] === cleanTarget[1]) matchCount++;
                  if (cleanPred[2] === cleanTarget[2]) matchCount++;
                  isWin = matchCount >= 2;
                } else {
                  isWin = cleanTarget.includes(cleanPred);
                }

                simulationStats[botId].total++;
                if (isWin) {
                  simulationStats[botId].win++;
                  simulationStats[botId].history.push(1);
                  if (simulationStats[botId].currentStreak > 0) simulationStats[botId].currentStreak++;
                  else simulationStats[botId].currentStreak = 1;
                  if (simulationStats[botId].currentStreak > simulationStats[botId].maxWinStreak) simulationStats[botId].maxWinStreak = simulationStats[botId].currentStreak;
                } else {
                  simulationStats[botId].loss++;
                  simulationStats[botId].history.push(-1);
                  if (simulationStats[botId].currentStreak < 0) simulationStats[botId].currentStreak--;
                  else simulationStats[botId].currentStreak = -1;
                  if (Math.abs(simulationStats[botId].currentStreak) > simulationStats[botId].maxLossStreak) simulationStats[botId].maxLossStreak = Math.abs(simulationStats[botId].currentStreak);
                }
              }

              if (!currentRoundPredictions[botId]) {
                currentRoundPredictions[botId] = {
                  ...pred,
                  is_win: pred.prediction === "PASS" ? false : isWin,
                  result: pred.prediction === "PASS" ? "PASS" : (isWin ? "WIN" : "LOSS"),
                  streak: simulationStats[botId].currentStreak,
                  profit_unit: pred.prediction === "PASS" ? 0 : (isWin ? 1 : -1)
                };
              }
              if (simulationStats[botId].history.length > 50) simulationStats[botId].history.shift();

            } catch (e) { }
          }

          // Update Cache
          contextCache.push(r);

          // Accumulate for Storage
          // Accumulate for Storage
          dailyPredictions[r.round] = {
            target: r.result.replace(/Even/g, "E").replace(/Odd/g, "O").replace(/X/g, "E"),
            predictions: currentRoundPredictions
          };
        }

        // Create Day Result
        const dayResult = {
          date: currentDateStr,
          totalRounds: dayRounds.length,
          stats: JSON.parse(JSON.stringify(simulationStats)), // Snapshot
          rounds: dailyPredictions
        };

        // [Refactor] Split Storage Save
        // 1. Save Daily Detail File
        await PipelineFileManager.saveDailyBatchResult(gameId, currentDateStr, dayResult);

        // 2. Update Summary File
        const summaryItem = {
          date: currentDateStr,
          totalRounds: dayRounds.length,
          stats: JSON.parse(JSON.stringify(simulationStats))
        };
        await PipelineFileManager.updateBatchSummary(gameId, [summaryItem]);

        totalRoundsProcessed += dayRounds.length;
        loopDate.setDate(loopDate.getDate() + 1);
      }

      // Auto-save is done sequentially inside the loop now.

      // Final Win Rate Calc
      targetBots.forEach(botId => {
        const s = stats[botId];
        s.winRate = s.total > 0 ? parseFloat(((s.win / s.total) * 100).toFixed(2)) : 0;
      });

      res.status(200).json({
        success: true,
        group,
        type: "FULL_SIMULATION",
        totalRoundsProcessed,
        durationMs: Date.now() - startTime,
        stats
      });

      // [New] Save Summary to Firestore (CQRS)
      try {
        await db.collection("batch_summaries").doc(gameId).set({
          lastRun: admin.firestore.FieldValue.serverTimestamp(),
          runGroup: group,
          stats: stats
        }, { merge: true });
        logger.info(`[Batch Test] Saved Summary Stats to Firestore: batch_summaries/${gameId}`);
      } catch (e: any) {
        logger.error(`[Batch Test] Failed to save summary stats: ${e.message}`);
      }

    } catch (error: any) {
      logger.error("runBatchTest Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

/**
 * [Dashboard API] Fetch detailed history for a specific bot and date range.
 * Used for the Bot Analysis & Simulation Dashboard.
 */
export const getBotHistory = onRequest({ timeoutSeconds: 540, memory: "512MiB" }, async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { gameId, botId, startDate, endDate } = req.body;
      if (!gameId || !botId || !startDate || !endDate) {
        throw new Error("Missing required fields: gameId, botId, startDate, endDate");
      }

      // const db = await getDb(); // Unused

      const start = new Date(
        parseInt(startDate.substring(0, 4)),
        parseInt(startDate.substring(4, 6)) - 1,
        parseInt(startDate.substring(6, 8))
      );
      const end = new Date(
        parseInt(endDate.substring(0, 4)),
        parseInt(endDate.substring(4, 6)) - 1,
        parseInt(endDate.substring(6, 8))
      );

      // [Refactor] Load from Split Storage (Daily Files)
      const history = await PipelineFileManager.loadDailyBatchResults(gameId, start, end);

      const result = {
        botId,
        gameId,
        period: `${startDate} ~ ${endDate}`,
        totalDays: history.length,
        history: history.map((day: any) => ({
          date: day.date,
          totalRounds: day.totalRounds,
          stats: day.stats[botId] || { win: 0, loss: 0, pass: 0, total: 0, winRate: 0 },
          rounds: day.rounds
        }))
      };

      res.status(200).json({ success: true, ...result });

    } catch (error: any) {
      logger.error("getBotHistory Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});
