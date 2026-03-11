import * as admin from "firebase-admin";
import { fetchHistoricalGameData } from "../../utils/gameDataUtils";
import { PipelineFileManager } from "../PipelineFileManager";
import { IPipelineGameData } from "../types";

/**
 * [Step 1] 데이터 준비 프로그램
 * - 30일치 데이터 다운로드
 * - 정렬 (Oldest -> Newest: 분석 로직용 표준)
 * - JSON 저장
 */
export class DataFetcher {
    private db: admin.firestore.Firestore;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    /**
     * 실행 함수
     * @param gameId 게임 ID (예: "powerball")
     * @param dateStr 기준 날짜 (예: "20250115")
     */
    async run(gameId: string, dateStr: string, force: boolean = false): Promise<{ savedPath: string; logs: string[] }> {
        const logs: string[] = [];
        const addLog = (msg: string) => {
            console.log(msg);
            logs.push(msg);
        };

        const runId = `${gameId}_${dateStr}`;
        const year = dateStr.substring(0, 4);
        const collectionId = `${year}_${gameId}`;

        addLog(`[Step 1] Fetching 30 days of data for ${gameId} / ${dateStr}... (Force: ${force})`);

        // [Opt] 기존 데이터 확인 (PipelineFileManager 경로 규칙 준수)
        if (!force) {
            const existingDoc = await this.db.collection("ai_bots_step_log")
                .doc(collectionId)
                .collection("daily_data")
                .doc(dateStr)
                .get();

            if (existingDoc.exists) {
                const data = existingDoc.data();
                // 스토리지 경로가 있다면 이미 마이그레이션 된 것
                if (data?.storagePath) {
                    addLog(`[Step 1] Data already exists with Storage Path for ${dateStr}. Skipping fetch.`);
                    return { savedPath: runId, logs };
                }
                // 레거시 데이터만 있다면 재수집 진행 (storagePath가 없으므로)
            }
        }

        const data = await this.internalFetch(gameId, dateStr);
        addLog(`fetched ${data.datasetInfo.totalCount} rounds of history.`);

        // 4. Firestore에 저장
        // originalData는 Day Object Array이므로, 이를 평탄화(Flat)하여 PipelineFileManager에 전달해야 함.
        const flatRounds: any[] = [];
        if (data.originalData && Array.isArray(data.originalData)) {
            data.originalData.forEach((day: any) => {
                if (day.rawArray && Array.isArray(day.rawArray)) {
                    day.rawArray.forEach((res: string, idx: number) => {
                        flatRounds.push({
                            date: day.date,
                            round: idx + 1, // 정확한 회차 번호는 아니지만 순서 유지를 위해
                            result: res
                        });
                    });
                }
            });
        }

        const savedPath = await PipelineFileManager.saveStep1(this.db, gameId, dateStr, flatRounds);

        addLog(`[Step 1] Complete. Data saved to Firestore Path: ${savedPath}`);
        return { savedPath: runId, logs }; // Return runId as the identifier reference
    }

    /**
     * 파일 저장 없이 데이터만 메모리로 가져오는 내부 함수
     * Step 2~5 디버깅 실행 시 사용됨
     */
    async internalFetch(gameId: string, dateStr: string): Promise<IPipelineGameData> {
        // 1. 데이터 가져오기 (fetchHistoricalGameData는 보통 내림차순 반환)
        const rawHistory = await fetchHistoricalGameData(this.db, gameId, dateStr);

        // 2. 데이터 정제 및 정렬
        // 로직 분석(이동평균 등)을 위해 시간순(과거->최신) 정렬이 필수입니다.
        const sortedHistory = [...rawHistory].sort((a, b) => a.date.localeCompare(b.date));

        // 3. 전체 라운드 병합
        let allRounds: string[] = [];
        sortedHistory.forEach(day => {
            if (day.rawArray && Array.isArray(day.rawArray)) {
                allRounds = allRounds.concat(day.rawArray);
            }
        });

        // 메타데이터 생성
        return {
            timestamp: Date.now(),
            gameId,
            targetDate: dateStr,
            allRounds: allRounds,
            datasetInfo: {
                startDate: sortedHistory[0]?.date || "Unknown",
                endDate: sortedHistory[sortedHistory.length - 1]?.date || "Unknown",
                totalCount: allRounds.length
            },
            originalData: sortedHistory // 30일치 데일리 객체 배열 (rawArray 포함)
        };
    }
}
