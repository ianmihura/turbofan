import fs from 'fs';

/**
 * Generates an HTML report with a Chart.js visualization of the latency data.
 * 
 * @param {string} title 
 * @param {Float64Array} coldData 
 * @param {Float64Array} warmData 
 * @param {Float64Array|null} deoptData
 * @param {string} fileName 
 */
export function generateHtmlReport(title, coldData, warmData, deoptData = null, fileName = 'report.html') {
    // Filter outliers: requests above 30k nanosec are not related to the logic, maybe GC or other housekeeping task
    const filter = (arr) => arr ? JSON.stringify(Array.from(arr).filter(v => v <= 30_000)) : 'null';

    const coldJson = filter(coldData);
    const warmJson = filter(warmData);
    const deoptJson = filter(deoptData);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom"></script>
    <style>
        body {
            background-color: #0f172a;
            color: #f8fafc;
            font-family: 'Inter', -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            width: 90%;
            max-width: 1200px;
            background: #1e293b;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        h1 {
            color: #38bdf8;
            margin-bottom: 0.5rem;
        }
        p {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .chart-container {
            position: relative;
            height: 60vh;
            width: 100%;
        }
        .stats-container {
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        .stats-row {
            background: #334155;
            padding: 1.5rem;
            border-radius: 1rem;
        }
        .stats-row h2 {
            margin-top: 0;
            font-size: 1.25rem;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
        }
        .stat-card {
            text-align: left;
        }
        .stat-value {
            font-size: 1.25rem;
            font-weight: bold;
            display: block;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
        }
        .highlight { color: #4ade80; }
        .row-cold { color: #fca5a5; }
        .row-hot { color: #4ade80; }
        .row-deopt { color: #f59e0b; }
        
        .actions {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 1rem;
        }
        .btn {
            background: #334155;
            color: #38bdf8;
            border: 1px solid #38bdf8;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .btn:hover {
            background: #38bdf8;
            color: #0f172a;
        }

        footer {
            padding-top: 3rem;
            padding-bottom: 1rem;
            text-align: center;
            font-size: 0.75rem;
            color: #64748b;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            letter-spacing: 0.1em;
        }
        footer a {
            transition: color 0.2s;
            text-decoration: none;
            color: inherit;
        }
        footer a:hover {
            color: #60a5fa;
        }
        .footer-github {
            text-decoration: underline;
            text-decoration-color: #334155;
            text-underline-offset: 4px;
        }
        
        .repo-link {
            color: #38bdf8;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }
        .repo-link:hover {
            border-bottom-color: #38bdf8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p>
            V8 TurboFan JIT Optimization Analysis (Latency in Nanoseconds) 
            </p>
            <a href="https://github.com/ianmihura/turbofan" target="_blank" class="repo-link">github.com/ianmihura/turbofan</a>
        
        <div class="actions">
            <button class="btn" onclick="resetChartZoom()">Reset Zoom</button>
        </div>

        <div class="chart-container">
            <canvas id="latencyChart"></canvas>
        </div>

        <div class="stats-container" id="stats-mount">
            <!-- Stats populated by JS -->
        </div>
    </div>

    <footer class="pt-12 text-center text-xs text-slate-500 font-mono tracking-widest pb-4">
        <p>
            Made by <a href="https://ianmihura.github.io" target="_blank"
                class="hover:text-blue-400 transition-colors duration-200">Ian Mihura</a>
            — <a href="https://github.com/ianmihura" target="_blank"
                class="hover:text-blue-400 transition-colors duration-200 underline decoration-slate-700 underline-offset-4 footer-github">GitHub</a>
        </p>
    </footer>

    <script>
        const cold = ${coldJson};
        const warm = ${warmJson};
        const deopt = ${deoptJson};

        const ctx = document.getElementById('latencyChart').getContext('2d');
        
        const displayLimit = 20100;
        const labels = Array.from({length: Math.min(cold.length, displayLimit)}, (_, i) => i + 1);

        const datasets = [
            {
                label: 'Cold Start (Unoptimized)',
                data: cold.slice(0, displayLimit),
                borderColor: '#fca5a5',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            },
            {
                label: 'Warm Start (Optimized)',
                data: warm.slice(0, displayLimit),
                borderColor: '#4ade80',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            },
            {
                label: 'Deoptimized Start (Volatile Shapes)',
                data: deopt.slice(0, displayLimit),
                borderColor: '#0b69f5ff',
                borderWidth: 2,
                pointRadius: 0,
                showLine: true,
                tension: 0.1
            }
        ];

        const chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Latency (ns)', color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', maxTicksLimit: 20 },
                        title: { display: true, text: 'Transaction Index', color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } },
                    tooltip: { mode: 'index', intersect: false },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            drag: { enabled: true },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: 'ctrl',
                        }
                    }
                }
            }
        });

        window.resetChartZoom = () => chartInstance.resetZoom();

        function calculateBreakdown(arr) {
            if (!arr) return null;
            const f100 = arr.slice(0, 100);
            const next = arr.slice(100, 10100);

            const f100Sum = f100.reduce((a, b) => a + b, 0);
            const nextSum = next.reduce((a, b) => a + b, 0);

            const f100Min = Math.min(...f100);
            const nextMin = Math.min(...next);

            const speedup = (100 * f100Min / nextMin - 100).toFixed(2);

            return {
                f100: { min: f100Min, avg: (f100Sum / f100.length).toFixed(2) },
                next: { min: nextMin, avg: (nextSum / next.length).toFixed(2) },
                speedup
            };
        }

        function renderRow(label, stats, cssClass) {
            if (!stats) return '';
            return \`
                <div class="stats-row \${cssClass}">
                    <h2 class="\${cssClass}">\${label} Execution Details</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-label">First 100</span>
                            <span class="stat-value">Min: \${stats.f100.min}ns</span>
                            <span class="stat-value">Avg: \${stats.f100.avg}ns</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Loop (Next 10k)</span>
                            <span class="stat-value">Min: \${stats.next.min}ns</span>
                            <span class="stat-value">Avg: \${stats.next.avg}ns</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Efficiency</span>
                            <span class="stat-value">\${stats.speedup}% Faster</span>
                        </div>
                    </div>
                </div>
            \`;
        }

        const mount = document.getElementById('stats-mount');
        let htmlRows = renderRow('Cold Start', calculateBreakdown(cold), 'row-cold');
        htmlRows += renderRow('Warm Start', calculateBreakdown(warm), 'row-hot');
        if (deopt) htmlRows += renderRow('Deoptimized Run', calculateBreakdown(deopt), 'row-deopt');
        
        mount.innerHTML = htmlRows;
    </script>
</body>
</html>
  `;

    fs.writeFileSync(fileName, html);
    console.log(`\n  [Report] Visual report generated at: ${fileName}`);
}
