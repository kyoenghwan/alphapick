
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

// Paste Gen_BOT04 code here (modified removing exports/imports)
class Gen_BOT04_ZScore implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_04";
        const ROLLING_WINDOW = 240;
        const RAW_WINDOW = 40;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Z-Score
        const calcZStats = (windowData: string[], checker: (s: string) => boolean, label: string) => {
            const count = windowData.filter(checker).length;
            const mean = windowData.length * 0.5; // Assuming 50/50 fair game
            const stdDev = Math.sqrt(windowData.length * 0.5 * 0.5);
            const z = (count - mean) / stdDev;

            let interpretation = "Normal";
            if (z > 2.0) interpretation = `Extreme ${label} Overload (Reversion Likely)`;
            else if (z < -2.0) interpretation = `Extreme ${label} Deficit (Reversion Likely)`;

            return { count, z: z.toFixed(2), interp: interpretation };
        };

        const zD = calcZStats(rollingData, r => r.includes('L'), 'Left');
        const zL = calcZStats(rollingData, r => r.includes('3'), '3-Line');
        const zO = calcZStats(rollingData, r => r.includes('O'), 'Odd');

        const summaryText = `Z-Score Deviation Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Z-Score: ${zD.z} (L-Count: ${zD.count})
- Status: ${zD.interp}

[Line 3/4]
- Z-Score: ${zL.z} (3-Count: ${zL.count})
- Status: ${zL.interp}

[Odd/Even O/E]
- Z-Score: ${zO.z} (Odd-Count: ${zO.count})
- Status: ${zO.interp}

Focus: Identify statistical extremes (>2.0 sigma) suggesting mean reversion.`;

        const total = allRounds.length;
        const overallL = allRounds.filter(r => r.includes('L')).length;
        const line3Count = allRounds.filter(r => r.includes('3')).length;
        const oddCount = allRounds.filter(r => r.includes('O')).length;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((overallL / total * 100).toFixed(1)) : 0,
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
    const rounds = [];
    const window = 300;
    for (let i = 0; i < window; i++) {
        // Direction: Skewed L (to create +Z)
        // Prob L = 70%
        let dir = Math.random() < 0.7 ? 'L' : 'R';

        // Line: Skewed 4 (to create -Z for 3)
        // Prob 3 = 30%
        let line = Math.random() < 0.3 ? '3' : '4';

        // OE: Balanced
        let oe = Math.random() < 0.5 ? 'O' : 'E';

        rounds.push(`${dir}${line}${oe}`);
    }
    return rounds;
};

const runTest = () => {
    const generator = new Gen_BOT04_ZScore();
    const mockData = generateMockData();
    const result = generator.generate(mockData);

    console.log("=== Bot 04 Output Analysis ===");
    console.log("Bot ID:", result.botId);
    console.log("\n[Layer 1: Macro Stats]");
    console.log(JSON.stringify(result.layer1_macro, null, 2));
    console.log("\n[Layer 2: Summary Text]");
    console.log(result.layer2_rolling.summary_text);
    console.log("\n[Sample Raw Data (Last 5)]");
    console.log(result.layer3_raw.slice(-5));
};

runTest();
