
// Mock Interfaces to avoid imports
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

// Paste Gen_BOT02 code here (slightly modified to remove exports/imports)
class Gen_BOT02_Pongdang implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_02";
        const ROLLING_WINDOW = 120;
        const RAW_WINDOW = 25;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for Pongdang
        const analyzePongdang = (seq: string[], checker: (s: string) => boolean, label: string) => {
            // Calculate Flip Count
            let flips = 0;
            let maxStr = 0;
            let curStr = 0;
            let lastVal = false;

            if (seq.length > 0) lastVal = checker(seq[0]);

            // Streak calc inside loop
            let currentStreakVal = checker(seq[0]);
            curStr = 1;

            for (let i = 1; i < seq.length; i++) {
                const val = checker(seq[i]);
                if (val !== lastVal) flips++;
                lastVal = val;

                // Streak Logic
                if (val === currentStreakVal) {
                    curStr++;
                } else {
                    if (curStr > maxStr) maxStr = curStr;
                    curStr = 1;
                    currentStreakVal = val;
                }
            }
            if (curStr > maxStr) maxStr = curStr;

            const flipRate = seq.length > 1 ? flips / (seq.length - 1) : 0;
            const isPongdang = flipRate > 0.6; // 60% is pretty high alternation

            return {
                flips,
                rate: (flipRate * 100).toFixed(1),
                maxStr,
                curStr: curStr,
                status: isPongdang ? "High Alternation (Pongdang)" : "Streaky/Choppy"
            };
        };

        const dirs = rollingData.map(r => r.includes('L') ? 'L' : 'R');
        const lines = rollingData.map(r => r.includes('3') ? '3' : '4');
        const oes = rollingData.map(r => r.includes('O') ? 'O' : 'E');

        const statD = analyzePongdang(dirs, (s: string) => s === 'L', "Direction L/R");
        const statL = analyzePongdang(lines, (s: string) => s === '3', "Line 3/4");
        const statO = analyzePongdang(oes, (s: string) => s === 'O', "Odd/Even O/E");

        const totalMoves = rollingData.length > 0 ? rollingData.length - 1 : 0;

        const summaryText = `Pongdang Pattern Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Flip Rate: ${statD.flips}/${totalMoves} (${statD.rate}%)
- Max Streak: ${statD.maxStr}
- Current Streak: ${statD.curStr}
- Status: ${statD.status}

[Line 3/4]
- Flip Rate: ${statL.flips}/${totalMoves} (${statL.rate}%)
- Max Streak: ${statL.maxStr}
- Current Streak: ${statL.curStr}
- Status: ${statL.status}

[Odd/Even O/E]
- Flip Rate: ${statO.flips}/${totalMoves} (${statO.rate}%)
- Max Streak: ${statO.maxStr}
- Current Streak: ${statO.curStr}
- Status: ${statO.status}

Focus: Identify if any component is in a high-tension alternating state (Pongdang).`;

        // Macro
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

// Test harness
const generateMockData = () => {
    // Generate 150 rounds
    const rounds = [];
    for (let i = 0; i < 150; i++) {
        // Direction: Perfect Pongdang L,R,L,R...
        let dir = i % 2 === 0 ? 'L' : 'R';
        // Line: Long Streak 3,3,3,3... then 4,4,4...
        let line = i < 50 ? '3' : (i < 100 ? '4' : '3');
        // OE: Randomish but alternating end
        let oe = i % 3 === 0 ? 'O' : 'E';

        rounds.push(`${dir}${line}${oe}`);
    }
    return rounds;
};

const runTest = () => {
    const generator = new Gen_BOT02_Pongdang();
    const mockData = generateMockData();
    const result = generator.generate(mockData);

    console.log("=== Bot 02 Output Analysis ===");
    console.log("Bot ID:", result.botId);
    console.log("\n[Layer 1: Macro Stats]");
    console.log(JSON.stringify(result.layer1_macro, null, 2));
    console.log("\n[Layer 2: Summary Text]");
    console.log(result.layer2_rolling.summary_text);
    console.log("\n[Sample Raw Data (Last 5)]");
    console.log(result.layer3_raw.slice(-5));
};

runTest();
