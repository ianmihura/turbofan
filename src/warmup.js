const OPT_BITS = {
  kIsFunction: 1 << 0,          // 1
  kNeverOptimized: 1 << 1,      // 2
  kAlwaysOptimized: 1 << 2,     // 4
  kMaybeDeoptimized: 1 << 3,    // 8
  kOptimized: 1 << 4,           // 16
  kOptimizedByTurboFan: 1 << 5, // 32
  kInterpreted: 1 << 6,         // 64
  kMarkedForOptimization: 1 << 7, // 128
  kMarkedForConcurrentOptimization: 1 << 8, // 256
  kOptimizingConcurrently: 1 << 9, // 512
  kExecuting: 1 << 10,          // 1024
  kTopmostFrameIsTurboFanned: 1 << 11 // 2048
};

/**
 * Returns a human-readable string describing the V8 optimization status.
 * Requires node --allow-natives-syntax.
 * 
 * @param {Function} fn 
 */
export function analyzeFunctionStatus(fn) {
  try {
    // eslint-disable-next-line no-undef
    const status = % GetOptimizationStatus(fn);

    const active = [];
    for (const [name, bit] of Object.entries(OPT_BITS)) {
      if (status & bit) active.push(name.replace(/^k/, ''));
    }

    return `Status (${status}): [${active.join(', ') || 'Cold/Interpreted'}]`;
  } catch (e) {
    return "Unknown - (Run with --allow-natives-syntax)";
  }
}

/**
 * Warms up a function by calling it repeatedly with dummy data.
 * 
 * @param {Function} targetFn 
 * @param {Array<any>} args 
 * @param {number} iterations 
 */
export function warmup(targetFn, getArgs, iterations = 10000, isPrinting = false) {
  if (isPrinting) console.log(`\n--- Warmup Phase: ${iterations} iterations ---`);

  for (let i = 0; i < iterations; i++) {
    targetFn(getArgs());

    // Check status at intervals
    if (isPrinting) {
      if (i === 100 || i === 1000 || i === 5000 || i === iterations - 1) {
        console.log(`Iteration ${i}: ${analyzeFunctionStatus(targetFn)}`);
      }
    }
  }

  // Final check
  if (isPrinting) console.log(`Final Warmup Status: ${analyzeFunctionStatus(targetFn)}`);
}
