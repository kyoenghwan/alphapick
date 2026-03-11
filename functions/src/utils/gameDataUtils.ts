import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * 30일치 게임 데이터를 가져오는 로직 (외부에서 재사용 가능)
 */
export async function fetchHistoricalGameData(db: admin.firestore.Firestore, gameId: string, dateStr: string): Promise<any[]> {
    // 30일 계산
    const targetDate = new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8))
    );
    const startDate = new Date(targetDate);
    startDate.setDate(targetDate.getDate() - 30);

    const formatYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${y}${m}${day}`;
    };

    const startDateStr = formatYMD(startDate);
    const startYear = startDate.getFullYear().toString();
    const endYear = targetDate.getFullYear().toString();

    // Fetch IDs
    const fetchDateIds = async (year: string) => {
        const query = db.collection("games").doc(`${year}_${gameId}`).collection("counts")
            .where("__name__", ">=", startDateStr)
            .where("__name__", "<=", dateStr);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.id);
    };

    const dateList = [
        ...(await fetchDateIds(endYear)),
        ...(startYear !== endYear ? await fetchDateIds(startYear) : [])
    ].sort((a, b) => b.localeCompare(a));

    // Fetch Results
    return await Promise.all(dateList.map(async (date) => {
        try {
            const yearOfDate = date.substring(0, 4);
            const roundsSnapshot = await db.collection("games")
                .doc(`${yearOfDate}_${gameId}`)
                .collection("result")
                .doc(date)
                .collection("rounds")
                .orderBy("round", "asc")
                .select("result")
                .get();

            const allResults = roundsSnapshot.docs
                .map(doc => (doc.data() as any).result)
                .filter(r => !!r && typeof r === 'string')
                .map((res: string) => res.replace(/X/g, 'E').replace(/Even/g, 'E').replace(/Odd/g, 'O'));

            const sequence = allResults.length > 100
                ? allResults.slice(-100).join(",")
                : allResults.join(",");

            // rawArray 포함
            return { date, results: sequence, count: allResults.length, rawArray: allResults };
        } catch (err: any) {
            logger.error(`Error fetching results for ${date}:`, err);
            return { date, results: "", count: 0, rawArray: [] };
        }
    }));
}
