# Turbofan: Zero-Jitter V8 Performance Benchmarking

A high-performance demonstration of Node.js V8's JIT optimization lifecycle. This repository provides a Proof-of-Concept (PoC) for achieving "Zero-Jitter" execution in latency-critical environments, such as capital markets and high-frequency trading.

## 🎯 The Problem
In modern trading systems, millisecond-level deoptimizations are costly. When Node.js starts, it operates in an interpreted mode (cold). As functions are called, the **TurboFan** compiler generates optimized machine code. However, any deviation in data shape (hidden class mismatch) or an unexpected null value triggers a "deoptimization," causing latency spikes exactly when market volume is highest.

## 🚀 The Solution
This project implements **Synthetic Hot-Path Pre-loading**. By warming up the engine with dummy data that mimics real-world objects, we force TurboFan to compile critical paths *before* the first real transaction arrives.

## 🏗 Architecture

The system is organized into several key modules:

-   **`src/validator.js`**: The core business logic. A high-performance order validator that performs input validation, notional calculations, and risk-score simulations.
-   **`src/warmup.js`**: A utility that leverages V8 intrinsics (`%GetOptimizationStatus`) to monitor and explain the engine's optimization state in human-readable terms.
-   **`src/reporter.js`**: Generates a rich, interactive HTML report using **Chart.js** and **Zoom.js**, visualizing the latency of every transaction across different execution states.
-   **`src/index.js`**: The experiment orchestrator. It runs three distinct scenarios:
    1.  **Cold Start**: Standard execution without prior optimization.
    2.  **Warm Start**: Optimized execution after a pre-market warmup lap.
    3.  **Deoptimized**: A "Deopt Storm" simulation where volatile object shapes break the JIT contract.

## 🛠 Getting Started

### Prerequisites
- **Node.js**: v16+ recommended.
- **V8 Natives**: This project uses the `--allow-natives-syntax` flag to interact with the engine's internals.

### Installation
```bash
# Clone the repository
git clone https://github.com/ianmihura/turbofan.git
cd turbofan
```

### Running the Benchmark
Execute the suite and generate the performance report:
```bash
npm start
```

## 📊 Understanding the Results

After execution, open `latency_report.html` in your browser.

-   **Cold Path (Red)**: Shows the "learning curve" of JIT optimization where initial calls are significantly slower.
-   **Hot Path (Green)**: Demonstrates the flat, consistent (zero-jitter) latency achieved through the warmup lap.
-   **Deopt Path (Blue)**: Visualizes the performance penalty and "jitter" when hidden classes fluctuate, forcing V8 back to the interpreter.

### Key Metrics Captured:
*   **Min/Avg Latency**: Captured using high-precision `process.hrtime.bigint()` nanosecond measurements.
*   **Efficiency Gain**: Calculated as the percentage speedup achieved by the JIT compiler.

## 🧪 Interaction & Analysis

This repository is designed for experimentation. You can interact with the benchmark by:
-   **Tuning the Warmup**: Modify the iteration count in `src/index.js` to see how many calls it takes for TurboFan to "kick in."
-   **Breaking the Contract**: Add new fields to the `order` object in the deopt branch of `src/index.js` to observe how hidden class changes impact performance.
-   **Analyzing the Code**: Inspect `src/validator.js` to see how monomorphic object shapes and `TypedArrays` (like `Float64Array`) contribute to memory efficiency and speed.

## 📄 License
MIT
