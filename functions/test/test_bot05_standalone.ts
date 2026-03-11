
// Mock Interfaces
interface IPipelineSummary {
    botId: string;
    layer1_macro: {
        today_l_prob: number;
        today_3_prob: number;
        today_o_prob: number;
    };
    layer2_rolling: {
        summary_text: string;
    };
    layer3_raw: string[];
}
interface IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary;
}

// Paste Gen_BOT05 code here
class Gen_BOT05_KNN implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_05";
        const RAW_WINDOW = 20;
        const rawData = allRounds.slice(-RAW_WINDOW);

        const findKNN = (targetSeq: string[], pool: string[], outputLabel: string) => {
            const K = 3;
            const patternLen = 5;
            if (pool.length < patternLen + 1) return { prob: "0", count: 0, next: "None" };

            const currentPattern = targetSeq.slice(-patternLen).join("");
            const history = allRounds.slice(0, -RAW_WINDOW);

            const foundNexts: string[] = [];
            for (let i = 0; i < history.length - patternLen; i++) {
                const slice = history.slice(i, i + patternLen).join("");
                if (slice === currentPattern) {
                    foundNexts.push(history[i + patternLen]);
                }
            }

            const recentMatches = foundNexts.slice(-K);
            if (recentMatches.length === 0) return { prob: "0", count: 0, next: "None" };

            const hitCount = recentMatches.filter(x => x === outputLabel).length;
            const prob = (hitCount / recentMatches.length * 100).toFixed(0);
            return { prob, count: recentMatches.length, next: hitCount > recentMatches.length / 2 ? outputLabel : "Opposite" };
        };

        const seqD = allRounds.map(r => r.includes('L') ? 'L' : 'R');
        const seqL = allRounds.map(r => r.includes('3') ? '3' : '4');
        const seqO = allRounds.map(r => r.includes('O') ? 'O' : 'E');

        const knnD = findKNN(seqD.slice(-RAW_WINDOW), seqD, 'L');
        const knnL = findKNN(seqL.slice(-RAW_WINDOW), seqL, '3');
        const knnO = findKNN(seqO.slice(-RAW_WINDOW), seqO, 'O');

        const summaryText = `KNN Pattern Matching (Pattern Len=5):
[Direction L/R]
- Similar Patterns Found: ${knnD.count}
- Next Prediction: L=${knnD.prob}% (Bias: ${knnD.next})

[Line 3/4]
- Similar Patterns Found: ${knnL.count}
- Next Prediction: 3=${knnL.prob}% (Bias: ${knnL.next})

[Odd/Even O/E]
- Similar Patterns Found: ${knnO.count}
- Next Prediction: Odd=${knnO.prob}% (Bias: ${knnO.next})

Focus: Historical recurrence of the exact current sequence (5-step).`;

        const total = allRounds.length;
        const lCount = allRounds.filter(r => r.includes('L')).length;
        const line3Count = allRounds.filter(r => r.includes('3')).length;
        const oddCount = allRounds.filter(r => r.includes('O')).length;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((lCount / total * 100).toFixed(1)) : 0,
                today_3_prob: total > 0 ? parseFloat((line3Count / total * 100).toFixed(1)) : 0,
                today_o_prob: total > 0 ? parseFloat((oddCount / total * 100).toFixed(1)) : 0
            },
            layer2_rolling: { summary_text: summaryText },
            layer3_raw: rawData
        };
    }
}

// Test Harness
const generateMockData = () => {
    // Generate data with repetitive 5-step patterns
    // Pattern: L, L, R, R, L -> NEXT is ALWAYS 'L'
    const pattern = ["L", "L", "R", "R", "L"];
    const rounds = [];

    // Fill history with pattern + next=L
    for (let i = 0; i < 40; i++) {
        pattern.forEach(p => rounds.push(`${p}3O`)); // Base pattern
        rounds.push(`L3O`); // The next outcome we want to train it on
    }

    // Now append the query pattern at the end: L, L, R, R, L
    pattern.forEach(p => rounds.push(`${p}3O`));

    return rounds;
};

const runTest = () => {
    const generator = new Gen_BOT05_KNN();
    const mockData = generateMockData();
    const result = generator.generate(mockData);

    console.log("=== Bot 05 Output Analysis ===");
    console.log("Bot ID:", result.botId);
    console.log("\n[Layer 1: Macro Stats]");
    console.log(JSON.stringify(result.layer1_macro, null, 2));
    console.log("\n[Layer 2: Summary Text]");
    console.log(result.layer2_rolling.summary_text);
    console.log("\n[Sample Raw Data (Last 5)]");
    console.log(result.layer3_raw.slice(-5));
};

runTest();
