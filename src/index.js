import { validateOrder, createOrder } from './validator.js';
import { warmup, analyzeFunctionStatus } from './warmup.js';
import { generateHtmlReport } from './reporter.js';

const TOTAL_TRADES = 10_100; // 100 initial + 10_000 next

/**
 * Runs a performance test and returns the captured latency results.
 * 
 * @param {boolean} withWarmup 
 * @param {boolean} withDeopt
 * @returns {Float64Array}
 */
function run(withWarmup = false, withDeopt = false) {
  const LATENCY_HISTORY = new Float64Array(TOTAL_TRADES);
  const label = withDeopt ? 'DEOPTIMIZED RUN' : (withWarmup ? 'WITH WARMUP' : 'COLD');
  console.log(`\n\n=== Running Experiment (${label}) ===`);

  for (let i = 0; i < 100; i++) {
    // De-optimize function in every run
    validateOrder(false);
  }

  if (withWarmup) {
    // Warm up the validator with 1M calls of clean data.
    warmup(validateOrder, () => createOrder("/GC", 250.00, 10, "BUY"), 1_000_000, false);
    // Turn on printing to function optimization progress (warmup last param).
  }

  console.log(`  V8 optimization status before start: ${analyzeFunctionStatus(validateOrder)}`);
  console.log(`  Executing validation on ${TOTAL_TRADES} mock trades...`);

  for (let i = 0; i < TOTAL_TRADES; i++) {
    let order;
    if (withDeopt && i > 0 && i % 100 === 0) { // TurboFan will optimize this branch away
      // Inject a different object shape to provoke deoptimization: trying out different object shapes
      // order = { symbol: null, price: null, ghost: true };
      order = { symbol: 999, price: "free", volume: -1, side: "POLY", ghost: true };
      // order = ['adsf', 'rewqw']
      // order = false
    } else {
      // Hot path
      order = createOrder(Math.random() > 0.1 ? "/GC" : "/SI", 250.00 + (Math.random() * 10), Math.floor(Math.random() * 100), "BUY");
    }

    const start = process.hrtime.bigint();
    validateOrder(order); // Comment this out to see what is the limit of optimization (optimize it all away).
    const end = process.hrtime.bigint();

    LATENCY_HISTORY[i] = Number(end - start);
  }

  // Analyze results
  const first100 = LATENCY_HISTORY.slice(0, 100);
  const nextSegment = LATENCY_HISTORY.slice(100, 10_100);

  const avgFirst100 = first100.reduce((a, b) => a + b, 0) / 100;
  const avgNext = nextSegment.reduce((a, b) => a + b, 0) / 10_000;

  const minFirst100 = Math.min(...first100);
  const minNext = Math.min(...nextSegment);

  console.log("\n  --- Performance Metrics (Latency in ns) ---");
  console.log(`  First 100 trades:   \n    Min: ${minFirst100}ns\n    Avg: ${avgFirst100.toFixed(2)}ns`);
  console.log(`  Loop Segment: \n    Min: ${minNext}ns\n    Avg: ${avgNext.toFixed(2)}ns`);

  const speedup = (100 * minFirst100 / minNext - 100).toFixed(2);
  console.log(`  Speedup during execution: ${speedup}% faster.`);

  return LATENCY_HISTORY;
}

function main() {
  // 1. Cold Start
  const coldResults = run(false, false);

  // 2. Pure Optimized (Warm)
  const warmResults = run(true, false);

  // 3. Deoptimized (Broken contract)
  const deoptResults = run(true, true);

  // Generate Interactive HTML Report
  generateHtmlReport(
    "V8 TurboFan: Optimization vs. Deoptimization",
    coldResults,
    warmResults,
    deoptResults,
    'latency_report.html'
  );

  console.log("\nPOC Finished. Open latency_report.html to view the multi-path benchmark.");
}

main();
