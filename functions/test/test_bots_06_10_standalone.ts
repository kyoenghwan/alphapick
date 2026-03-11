
// Mock Interfaces
interface IPipelineSummary { botId: string; layer1_macro: any; layer2_rolling: { summary_text: string }; layer3_raw: string[]; }
interface IBotSummaryGenerator { generate(allRounds: string[]): IPipelineSummary; }

// --- PASTE BOT CLASSES (Simplified/Copied) ---

// [BOT_06] Bayes
class Gen_BOT06_Bayes implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_06";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 60;
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);
        const calcBayes = (totalRounds: string[], rolling: string[], checker: (s: string) => boolean, label: string) => {
            const prior = totalRounds.length > 0 ? totalRounds.filter(checker).length / totalRounds.length : 0.5;
            const evidence = rolling.length > 0 ? rolling.filter(checker).length / rolling.length : 0.5;
            const posterior = (prior * 0.7) + (evidence * 0.3);
            const shift = Math.abs(evidence - prior);
            let interp = "Stable";
            if (shift > 0.05) interp = `Shifting ${evidence > prior ? 'Up' : 'Down'}`;
            return { prior: (prior * 100).toFixed(1), evidence: (evidence * 100).toFixed(1), post: (posterior * 100).toFixed(1), interp };
        };
        const bayesD = calcBayes(allRounds, rollingData, r => r.includes('L'), 'Left');
        const bayesL = calcBayes(allRounds, rollingData, r => r.includes('3'), '3-Line');
        const bayesO = calcBayes(allRounds, rollingData, r => r.includes('O'), 'Odd');
        const summaryText = `Bayesian Trend Update (Prior=Global, Evidence=Last ${ROLLING_WINDOW}):
[Direction L/R]
- Prior: ${bayesD.prior}% -> Evidence: ${bayesD.evidence}%
- Posterior: ${bayesD.post}% (${bayesD.interp})

[Line 3/4]
- Prior: ${bayesL.prior}% -> Evidence: ${bayesL.evidence}%
- Posterior: ${bayesL.post}% (${bayesL.interp})

[Odd/Even O/E]
- Prior: ${bayesO.prior}% -> Evidence: ${bayesO.evidence}%
- Posterior: ${bayesO.post}% (${bayesO.interp})

Focus: How recent evidence shifts the long-term prior belief.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_07] Deviation
class Gen_BOT07_Deviation implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_07";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 100;
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);
        const calcDev = (recent: string[], total: string[], checker: (s: string) => boolean, label: string) => {
            const recentRate = recent.filter(checker).length / recent.length;
            const totalRate = total.filter(checker).length / total.length;
            const GAP = (totalRate - recentRate) * 100;
            return { recent: (recentRate * 100).toFixed(1), total: (totalRate * 100).toFixed(1), gap: GAP.toFixed(1), dir: GAP > 0 ? `Under-supplied (Expect ${label})` : `Over-supplied (Expect Opposite)` };
        };
        const devD = calcDev(rollingData, allRounds, r => r.includes('L'), 'L');
        const devL = calcDev(rollingData, allRounds, r => r.includes('3'), '3');
        const devO = calcDev(rollingData, allRounds, r => r.includes('O'), 'Odd');
        const summaryText = `Deviation Analysis (Global vs Last ${ROLLING_WINDOW}):
[Direction L/R]
- Global L: ${devD.total}% vs Recent L: ${devD.recent}%
- Gap: ${devD.gap}% -> ${devD.dir}

[Line 3/4]
- Global 3: ${devL.total}% vs Recent 3: ${devL.recent}%
- Gap: ${devL.gap}% -> ${devL.dir}

[Odd/Even O/E]
- Global Odd: ${devO.total}% vs Recent Odd: ${devO.recent}%
- Gap: ${devO.gap}% -> ${devO.dir}

Focus: Balancing 'Law of Totals' - bet on what is currently missing.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_08] Cycle
class Gen_BOT08_Cycle implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_08";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 80;
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);
        const analyzeCycle = (seq: number[]) => {
            let waveState = "Flat";
            if (seq.length > 5) {
                const recent = seq.slice(-5);
                const avg1 = recent.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
                const avg2 = recent.slice(3, 5).reduce((a, b) => a + b, 0) / 2;
                if (avg2 > avg1) waveState = "Rising"; else if (avg2 < avg1) waveState = "Falling";
            }
            return waveState;
        };
        const numD = rollingData.map(r => r.includes('L') ? 1 : 0);
        const numL = rollingData.map(r => r.includes('3') ? 1 : 0);
        const numO = rollingData.map(r => r.includes('O') ? 1 : 0);
        const summaryText = `Cycle Wave Analysis (Last ${ROLLING_WINDOW}):
[Direction L/R]
- Current Wave Phase: ${analyzeCycle(numD)}

[Line 3/4]
- Current Wave Phase: ${analyzeCycle(numL)}

[Odd/Even O/E]
- Current Wave Phase: ${analyzeCycle(numO)}

Focus: Identify if we are on the rising edge or falling edge of a probability wave.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_09] Trend
class Gen_BOT09_Trend implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_09";
        const ROLLING_WINDOW = 480;
        const RAW_WINDOW = 100;
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);
        const calcTrend = (nums: number[]) => {
            const shortLen = 7, longLen = 25;
            if (nums.length < longLen) return { maS: 0, maL: 0, signal: "No Data" };
            const maShort = nums.slice(-shortLen).reduce((a, b) => a + b, 0) / shortLen;
            const maLong = nums.slice(-longLen).reduce((a, b) => a + b, 0) / longLen;
            const gap = maShort - maLong;
            let signal = "Neutral";
            if (gap > 0.1) signal = "Strong Up-Trend (Golden Cross)";
            else if (gap < -0.1) signal = "Strong Down-Trend (Dead Cross)";
            else signal = "Sideways / Choppy";
            return { maS: maShort.toFixed(2), maL: maLong.toFixed(2), signal };
        };
        const summaryText = `Trend Cross Analysis (MA7 vs MA25):
[Direction L/R]
- Signal: ${calcTrend(rollingData.map(r => r.includes('L') ? 1 : 0)).signal}

[Line 3/4]
- Signal: ${calcTrend(rollingData.map(r => r.includes('3') ? 1 : 0)).signal}

[Odd/Even O/E]
- Signal: ${calcTrend(rollingData.map(r => r.includes('O') ? 1 : 0)).signal}

Focus: Golden Cross (Short > Long) vs Dead Cross (Short < Long).`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_10] Pattern (Placeholder in actual code, confirmed in reading)
class Gen_BOT10_Pattern implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_10";
        const RAW_WINDOW = 20;
        const rawData = allRounds.slice(-RAW_WINDOW);
        const checkStreakReversal = (seq: string[], checker: (s: string) => boolean) => {
            let curStr = 0;
            let currentVal = false;
            if (seq.length > 0) {
                currentVal = checker(seq[seq.length - 1]);
                for (let i = seq.length - 1; i >= 0; i--) {
                    if (checker(seq[i]) === currentVal) curStr++; else break;
                }
            }
            return { curStr, prob: "50.0" }; // Logic Mock
        };
        const patD = checkStreakReversal(allRounds, r => r.includes('L'));
        const summaryText = `Pattern Success Rate Analysis:
[Direction L/R]
- Current Streak: ${patD.curStr}
- Reversal Prob: ${patD.prob}%

[Line 3/4]
... (Other Components similar)

Focus: Validating if 'Streak Reversal' betting system is currently profitable.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// --- TEST RUNNER ---
const generateData = () => {
    const rounds = [];
    // Generate 500 rounds
    // Phase 1 (0-300): L dominant (70%)
    // Phase 2 (300-500): R dominant (70%) -> To creating 'Shifting' in Bayes and Cross in Trend
    for (let i = 0; i < 300; i++) rounds.push((Math.random() < 0.7 ? 'L' : 'R') + '3O');
    for (let i = 300; i < 500; i++) rounds.push((Math.random() < 0.3 ? 'L' : 'R') + '3O');
    return rounds;
};

const run = () => {
    const data = generateData();
    console.log("=== Running BOTS 06-10 Verification ===");

    [new Gen_BOT06_Bayes(), new Gen_BOT07_Deviation(), new Gen_BOT08_Cycle(), new Gen_BOT09_Trend(), new Gen_BOT10_Pattern()].forEach(bot => {
        const res = bot.generate(data);
        console.log(`\n--- ${res.botId} ---`);
        console.log(res.layer2_rolling.summary_text);
    });
};

run();
