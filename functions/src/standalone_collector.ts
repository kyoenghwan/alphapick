import * as admin from "firebase-admin";
import * as puppeteer from "puppeteer";

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
 * 게임 결과 수집 로직
 */
async function collectResults() {
    console.log(`[${new Date().toLocaleString()}] 수집 사이클 시작...`);

    try {
        const activeGamesSnap = await db.collection("categories").where("isActive", "==", true).get();
        const activeGames = activeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`활성 게임 수: ${activeGames.length}`);

        if (activeGames.length === 0) {
            console.log("활성화된 게임이 없습니다.");
            return;
        }

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
                    console.log(`[${gameCode}] 수집 중: https://bepick.net/live/${bepickCode}`);
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

                        await gameRef.set({
                            result: converted,
                            resultOriginal: original,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        console.log(`[Collector] 성공: ${gameCode} - ${round}회차 (${converted})`);
                    } else {
                        console.log(`[Collector] 데이터 없음: ${gameCode}`);
                    }
                } catch (gameError) {
                    console.error(`[Collector] ${gameCode} 오류:`, gameError);
                }
            }
        } finally {
            await browser.close();
        }
    } catch (error) {
        console.error("수집 사이클 중 치명적 오류:", error);
    }
}

// 2. 메인 루프 실행 (3분 주기)
const INTERVAL = 3 * 60 * 1000; // 3분

async function main() {
    console.log("========================================");
    console.log("   AlphaPick 독립 실행형 수집기 시작   ");
    console.log("========================================");

    // 시작 시 즉시 한 번 실행
    await collectResults();

    // 3분마다 반복
    setInterval(async () => {
        await collectResults();
    }, INTERVAL);
}

main().catch(console.error);
