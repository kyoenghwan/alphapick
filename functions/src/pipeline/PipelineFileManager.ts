import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export class PipelineFileManager {
    // 로컬 테스트용 경로. Cloud Functions 배포 시에는 /tmp 만 쓰기가 가능하므로 주의 필요.
    // 사용자가 "정해진 위치"를 원했으므로, 프로젝트 루트 근처의 data 폴더 혹은 temp를 사용.
    // 여기서는 안전하게 os.tmpdir()을 사용하거나, 로컬 실행을 가정하고 functions/data 폴더를 사용.

    private static get BaseDir(): string {
        // Cloud Functions 환경 감지 (간단히)
        const isCloud = process.env.FUNCTION_TARGET !== undefined;
        if (isCloud) {
            return os.tmpdir();
        }
        // 로컬 개발 환경: functions/data
        const localPath = path.join(process.cwd(), 'data');
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }
        return localPath;
    }


    static async saveStep1(db: FirebaseFirestore.Firestore, gameId: string, targetDate: string, allRounds: any[]): Promise<string> {
        const year = targetDate.substring(0, 4);
        const collectionId = `${year}_${gameId}`;
        const storagePath = `step1_raw/${year}_${gameId}/${targetDate}.json`;
        const directoryPrefix = `step1_raw/${collectionId}/`;

        console.log(`[PipelineFileManager] Saving ${allRounds.length} rounds. Raw -> Storage, Meta -> Firestore.`);

        const bucket = admin.storage().bucket();

        // [Cleanup Policy] Delete files for other dates in this game/year to save space
        try {
            const [files] = await bucket.getFiles({ prefix: directoryPrefix });
            if (files.length > 0) {
                console.log(`[PipelineFileManager] Found ${files.length} existing files. Cleaning up others...`);
                const cleanupPromises = files.map(file => {
                    if (file.name !== storagePath) {
                        console.log(`[PipelineFileManager] Deleting old file: ${file.name}`);
                        return file.delete();
                    }
                    return Promise.resolve();
                });
                await Promise.all(cleanupPromises);
            }
        } catch (error) {
            console.warn("[PipelineFileManager] Cleanup warning:", error);
            // Non-blocking error
        }

        // 1. Save Raw Data to Cloud Storage
        const file = bucket.file(storagePath);
        const uuid = require('crypto').randomUUID();
        await file.save(JSON.stringify(allRounds), {
            contentType: "application/json",
            resumable: false,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: uuid
                }
            }
        });

        // 2. Save Metadata to Firestore
        const docRef = db.collection("ai_bots_step_log").doc(collectionId).collection("daily_data").doc(targetDate);
        await docRef.set({
            storagePath: storagePath,
            totalRounds: allRounds.length,
            updatedAt: FieldValue.serverTimestamp(),
            // Store a sample for quick preview (optional, e.g. last 5 rounds)
            preview: allRounds.slice(-5)
        });

        console.log(`[PipelineFileManager] Saved. Storage: ${storagePath}, Firestore: ${docRef.path}`);
        return docRef.path;
    }

    static async loadStep1(db: FirebaseFirestore.Firestore, gameId: string, targetDate: string): Promise<any[]> {
        const year = targetDate.substring(0, 4);
        const collectionId = `${year}_${gameId}`;
        const docRef = db.collection("ai_bots_step_log").doc(collectionId).collection("daily_data").doc(targetDate);

        console.log(`[PipelineFileManager] Loading Metadata from ${docRef.path}`);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            console.warn(`[PipelineFileManager] No data found at ${docRef.path}`);
            throw new Error(`No data found for ${gameId} on ${targetDate}`);
        }

        const data = snapshot.data();

        // Backward Compatibility: If 'rounds' exists in Firestore doc, use it
        // [MODIFIED] Disable legacy load to force migration to Cloud Storage
        /*
        if (data?.rounds && Array.isArray(data.rounds) && data.rounds.length > 0) {
            console.log(`[PipelineFileManager] Loaded ${data.rounds.length} rounds from Firestore (Legacy).`);
            return this.sortRounds(data.rounds);
        }
        */

        // Load from Storage
        if (data?.storagePath) {
            console.log(`[PipelineFileManager] Downloading raw data from Storage: ${data.storagePath}`);
            const bucket = admin.storage().bucket();
            const file = bucket.file(data.storagePath);
            try {
                const [content] = await file.download();
                const allRounds = JSON.parse(content.toString());
                console.log(`[PipelineFileManager] Downloaded & Parsed ${allRounds.length} rounds.`);
                return this.sortRounds(allRounds);
            } catch (error: any) {
                if (error.code === 404 || error.message?.includes("No such object")) {
                    console.warn(`[PipelineFileManager] Storage file found in metadata but missing in bucket: ${data.storagePath}. Cleaning up metadata...`);
                    // 메타데이터가 잘못되었으므로 삭제하여 동기화
                    await docRef.delete();
                    throw new Error(`No data found for ${gameId} on ${targetDate} (File missing in Storage)`);
                }
                throw error;
            }
        }

        throw new Error(`No data found for ${gameId} on ${targetDate} (Storage path missing)`);

        return [];
    }

    private static sortRounds(rounds: any[]): any[] {
        return rounds.sort((a: any, b: any) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.round - b.round;
        });
    }


    /**
     * [New] Save Batch Test Results to Cloud Storage (JSON)
     * Replaces the expensive Firestore writes in runBatchTest.
     */
    static async saveBatchResult(db: FirebaseFirestore.Firestore, gameId: string, targetDate: string, resultData: any): Promise<string> {
        const year = targetDate.substring(0, 4);
        const collectionId = `${year}_${gameId}`;
        const storagePath = `batch_results/${collectionId}/${targetDate}.json`;

        console.log(`[PipelineFileManager] Saving Batch Result for ${targetDate}. Rounds: ${resultData.totalRounds}`);

        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        const uuid = require('crypto').randomUUID();

        // 1. Save JSON to Storage
        await file.save(JSON.stringify(resultData), {
            contentType: "application/json",
            resumable: false,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: uuid
                }
            }
        });

        // 2. Save Metadata to Firestore (Lightweight)
        const docRef = db.collection("batch_test_meta").doc(collectionId).collection("daily_results").doc(targetDate);
        await docRef.set({
            storagePath: storagePath,
            totalRounds: resultData.totalRounds,
            bots: Object.keys(resultData.stats || {}),
            updatedAt: FieldValue.serverTimestamp(),
            isBatch: true
        });

        console.log(`[PipelineFileManager] Batch Saved. Storage: ${storagePath}`);
        return storagePath;
    }

    /**
     * [New] Load Batch Test Results from Cloud Storage
     * Used by getBotHistory API.
     */
    static async loadBatchResult(db: FirebaseFirestore.Firestore, gameId: string, targetDate: string): Promise<any> {
        const year = targetDate.substring(0, 4);
        const collectionId = `${year}_${gameId}`;
        const storagePath = `batch_results/${collectionId}/${targetDate}.json`;

        console.log(`[PipelineFileManager] Loading Batch Result from ${storagePath}`);

        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        try {
            const [exists] = await file.exists();
            if (!exists) {
                console.warn(`[PipelineFileManager] Batch file not found: ${storagePath}`);
                return null;
            }

            const [content] = await file.download();
            const json = JSON.parse(content.toString());
            return json;
        } catch (e: any) {
            console.error(`[PipelineFileManager] Error loading batch result: ${e.message}`);
            return null;
        }
    }

    /**
     * [New] Append Batch Test Results to Cumulative JSON
     * Maintains a single history file per game: batch_results/{gameId}_history.json
     */
    static async appendBatchResult(gameId: string, newResults: any[]): Promise<void> {
        const storagePath = `batch_results/${gameId}_history.json`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        console.log(`[PipelineFileManager] Appending ${newResults.length} days to ${storagePath}`);

        let history: any[] = [];
        try {
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                history = JSON.parse(content.toString());
            } else {
                console.log(`[PipelineFileManager] No existing history file. Creating new.`);
            }
        } catch (e: any) {
            console.warn(`[PipelineFileManager] Error reading existing file (creating new): ${e.message}`);
        }

        // Merge logic: Remove duplicates by date if re-running
        // efficient way: make a map of existing history
        const historyMap = new Map();
        history.forEach(item => {
            if (item.date) historyMap.set(item.date, item);
        });

        // Upsert new results
        newResults.forEach(item => {
            if (item.date) historyMap.set(item.date, item);
        });

        // Convert back to array and sort by date
        const updatedHistory = Array.from(historyMap.values()).sort((a: any, b: any) => {
            return a.date.localeCompare(b.date);
        });

        // Save
        const uuid = require('crypto').randomUUID();
        await file.save(JSON.stringify(updatedHistory), {
            contentType: "application/json",
            resumable: false,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: uuid
                }
            }
        });

        console.log(`[PipelineFileManager] Saved Cumulative History. Total Days: ${updatedHistory.length}`);
    }

    /**
     * [New] Load Cumulative Batch Results (Sliced)
     * Efficiently reads the tail of the history file.
     * Note: Cloud Storage doesn't support "partial download" easily without byte ranges. 
     * For JSON, we usually download the file. If it gets huge (MBs), it's still fast within Google Cloud.
     */
    static async loadCumulativeBatchResult(gameId: string, daysToLoad: number = 30): Promise<any[]> {
        const storagePath = `batch_results/${gameId}_summary.json`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        try {
            const [exists] = await file.exists();
            if (!exists) return [];

            const [content] = await file.download();
            const history = JSON.parse(content.toString()) as any[];

            if (daysToLoad <= 0) return history;
            return history.slice(-daysToLoad);
        } catch (e: any) {
            console.error(`[PipelineFileManager] Error loading history: ${e.message}`);
            return [];
        }
    }

    // Legacy File methods kept for backward compatibility if needed, or can be removed.
    static saveJson(filename: string, data: any): string {
        const filePath = path.join(this.BaseDir, filename);
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return filePath;
    }

    static async saveDailyBatchResult(gameId: string, date: string, data: any): Promise<void> {
        const storagePath = `batch_results/${gameId}_${date}.json`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        await file.save(JSON.stringify(data), {
            contentType: "application/json",
            resumable: false
        });
        console.log(`[PipelineFileManager] Saved Daily Detail: ${storagePath}`);
    }

    static async updateBatchSummary(gameId: string, newSummaries: any[]): Promise<void> {
        const storagePath = `batch_results/${gameId}_summary.json`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        let summaryList: any[] = [];
        try {
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                summaryList = JSON.parse(content.toString()) as any[];
            }
        } catch (e) { }

        // Merge logic
        const map = new Map();
        summaryList.forEach(item => map.set(item.date, item));
        newSummaries.forEach(item => map.set(item.date, item)); // Update/Upsert

        const updatedList = Array.from(map.values()).sort((a: any, b: any) => a.date.localeCompare(b.date));

        await file.save(JSON.stringify(updatedList), {
            contentType: "application/json",
            resumable: false
        });
        console.log(`[PipelineFileManager] Updated Summary File. Total Days: ${updatedList.length}`);
    }

    static async loadDailyBatchResults(gameId: string, startDate: Date, endDate: Date): Promise<any[]> {
        const results: any[] = [];
        const bucket = admin.storage().bucket();
        const promises: Promise<void>[] = [];

        const loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            const y = loopDate.getFullYear();
            const m = String(loopDate.getMonth() + 1).padStart(2, '0');
            const d = String(loopDate.getDate()).padStart(2, '0');
            const dateStr = `${y}${m}${d}`;
            const storagePath = `batch_results/${gameId}_${dateStr}.json`;

            promises.push((async () => {
                try {
                    const file = bucket.file(storagePath);
                    const [exists] = await file.exists();
                    if (exists) {
                        const [content] = await file.download();
                        const data = JSON.parse(content.toString());
                        results.push(data);
                    }
                } catch (e) {
                    console.warn(`[PipelineFileManager] Failed to load ${storagePath}`, e);
                }
            })());

            loopDate.setDate(loopDate.getDate() + 1);
        }

        await Promise.all(promises);
        return results.sort((a, b) => a.date.localeCompare(b.date));
    }

    static loadJson<T>(filename: string): T {
        const filePath = path.join(this.BaseDir, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as T;
    }
}
