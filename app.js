const setup = {
  scopeHeightM: 0.059,
  ballisticCoefficientG1: 0.305,
  bulletWeightKg: 0.011,
  defaultZeroM: 100,
  defaultSpeedMs: 740,
  distancesM: [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
    800, 850, 900, 950, 1000,
  ],
};

const constants = {
  gravity: 9.80665,
  feetPerMeter: 3.2808399,
  metersPerFoot: 0.3048,
  maxSimulationTimeS: 4,
  timeStepS: 0.001,
};

// Standard G1 retardation coefficients from the GNU exterior ballistics model.
const g1Segments = [
  { minFps: 4230, a: 1.477404177730177e-4, m: 1.9565 },
  { minFps: 3680, a: 1.920339268755614e-4, m: 1.925 },
  { minFps: 3450, a: 2.894751026819746e-4, m: 1.875 },
  { minFps: 3295, a: 4.349905111115636e-4, m: 1.825 },
  { minFps: 3130, a: 6.520421871892662e-4, m: 1.775 },
  { minFps: 2960, a: 9.748073694078696e-4, m: 1.725 },
  { minFps: 2830, a: 1.453721560187286e-3, m: 1.675 },
  { minFps: 2680, a: 2.162887202930376e-3, m: 1.625 },
  { minFps: 2460, a: 3.209559783129881e-3, m: 1.575 },
  { minFps: 2225, a: 3.904368218691249e-3, m: 1.55 },
  { minFps: 2015, a: 3.222942271262336e-3, m: 1.575 },
  { minFps: 1890, a: 2.203329542297809e-3, m: 1.625 },
  { minFps: 1810, a: 1.511001028891904e-3, m: 1.675 },
  { minFps: 1730, a: 8.609957592468259e-4, m: 1.75 },
  { minFps: 1595, a: 4.086146797305117e-4, m: 1.85 },
  { minFps: 1520, a: 1.954473210037398e-4, m: 1.95 },
  { minFps: 1420, a: 5.431896266462351e-5, m: 2.125 },
  { minFps: 1360, a: 8.847742581674416e-6, m: 2.375 },
  { minFps: 1315, a: 1.456922328720298e-6, m: 2.625 },
  { minFps: 1280, a: 2.419485191895565e-7, m: 2.875 },
  { minFps: 1220, a: 1.657956321067612e-8, m: 3.25 },
  { minFps: 1185, a: 4.745469537157371e-10, m: 3.75 },
  { minFps: 1150, a: 1.379746590025088e-11, m: 4.25 },
  { minFps: 1100, a: 4.070157961147882e-13, m: 4.75 },
  { minFps: 1060, a: 2.938236954847331e-14, m: 5.125 },
  { minFps: 1025, a: 1.228597370774746e-14, m: 5.25 },
  { minFps: 980, a: 2.916938264100495e-14, m: 5.125 },
  { minFps: 945, a: 3.855099424807451e-13, m: 4.75 },
  { minFps: 905, a: 1.185097045689854e-11, m: 4.25 },
  { minFps: 860, a: 3.566129470974951e-10, m: 3.75 },
  { minFps: 810, a: 1.045513263966272e-8, m: 3.25 },
  { minFps: 780, a: 1.291159200846216e-7, m: 2.875 },
  { minFps: 750, a: 6.824429329105383e-7, m: 2.625 },
  { minFps: 700, a: 3.569169672385163e-6, m: 2.375 },
  { minFps: 640, a: 1.839015095899579e-5, m: 2.125 },
  { minFps: 600, a: 5.71117468873424e-5, m: 1.950 },
  { minFps: 550, a: 9.226557091973427e-5, m: 1.875 },
  { minFps: 250, a: 9.337991957131389e-5, m: 1.875 },
  { minFps: 100, a: 7.225247327590413e-5, m: 1.925 },
  { minFps: 65, a: 5.792684957074546e-5, m: 1.975 },
  { minFps: 0, a: 5.206214107320588e-5, m: 2.000 },
];

const elements = {
  form: document.querySelector("#calculator-form"),
  zeroDistance: document.querySelector("#zero-distance"),
  muzzleSpeed: document.querySelector("#muzzle-speed"),
  targetDistance: document.querySelector("#target-distance"),
  targetResult: document.querySelector("#target-result"),
  errorMessage: document.querySelector("#error-message"),
  resultsBody: document.querySelector("#results-body"),
  caption: document.querySelector("#table-caption"),
  exportPdfButton: document.querySelector("#export-pdf-button"),
  resetButton: document.querySelector("#reset-button"),
};

let currentRows = [];
let currentZeroDistanceM = setup.defaultZeroM;
let currentSpeedMs = setup.defaultSpeedMs;

function g1Retardation(velocityFps) {
  const segment = g1Segments.find((entry) => velocityFps >= entry.minFps) ?? g1Segments[g1Segments.length - 1];
  return segment.a * Math.pow(velocityFps, segment.m);
}

function dragAccelerationMs(velocityMs) {
  if (velocityMs <= 0) {
    return 0;
  }

  const velocityFps = velocityMs * constants.feetPerMeter;
  const retardationFps2 = g1Retardation(velocityFps) / setup.ballisticCoefficientG1;
  return retardationFps2 * constants.metersPerFoot;
}

function interpolateAtRange(previous, current, targetX) {
  const span = current.x - previous.x;
  const ratio = span === 0 ? 0 : (targetX - previous.x) / span;

  return {
    x: targetX,
    y: previous.y + (current.y - previous.y) * ratio,
    vx: previous.vx + (current.vx - previous.vx) * ratio,
    vy: previous.vy + (current.vy - previous.vy) * ratio,
    time: previous.time + (current.time - previous.time) * ratio,
  };
}

function simulateTrajectory(angleRad, speedMs, targetRangesM) {
  const sortedRanges = [...targetRangesM].sort((a, b) => a - b);
  const results = new Map();
  let rangeIndex = 0;
  let state = {
    x: 0,
    y: -setup.scopeHeightM,
    vx: Math.cos(angleRad) * speedMs,
    vy: Math.sin(angleRad) * speedMs,
    time: 0,
  };

  while (state.time < constants.maxSimulationTimeS && rangeIndex < sortedRanges.length) {
    const previous = { ...state };
    const speed = Math.hypot(state.vx, state.vy);
    const drag = dragAccelerationMs(speed);
    const ax = speed === 0 ? 0 : -(drag * state.vx) / speed;
    const ay = speed === 0 ? -constants.gravity : -constants.gravity - (drag * state.vy) / speed;

    state.vx += ax * constants.timeStepS;
    state.vy += ay * constants.timeStepS;
    state.x += state.vx * constants.timeStepS;
    state.y += state.vy * constants.timeStepS;
    state.time += constants.timeStepS;

    while (rangeIndex < sortedRanges.length && previous.x <= sortedRanges[rangeIndex] && state.x >= sortedRanges[rangeIndex]) {
      const target = sortedRanges[rangeIndex];
      results.set(target, interpolateAtRange(previous, state, target));
      rangeIndex += 1;
    }
  }

  return results;
}

function heightAtRange(angleRad, speedMs, rangeM) {
  return simulateTrajectory(angleRad, speedMs, [rangeM]).get(rangeM)?.y ?? Number.NaN;
}

function findZeroAngle(speedMs, zeroDistanceM) {
  let low = -0.05;
  let high = 0.05;

  for (let attempts = 0; attempts < 8; attempts += 1) {
    const lowHeight = heightAtRange(low, speedMs, zeroDistanceM);
    const highHeight = heightAtRange(high, speedMs, zeroDistanceM);

    if (Number.isFinite(lowHeight) && Number.isFinite(highHeight) && lowHeight <= 0 && highHeight >= 0) {
      break;
    }

    low *= 1.8;
    high *= 1.8;
  }

  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    const midHeight = heightAtRange(mid, speedMs, zeroDistanceM);

    if (midHeight > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

function createResultRow(distanceM, sample) {
  const velocityMs = Math.hypot(sample.vx, sample.vy);
  const dropM = sample.y;
  const holdMrad = (-dropM / distanceM) * 1000;
  const clicks = holdMrad / 0.1;
  const energyJ = 0.5 * setup.bulletWeightKg * velocityMs ** 2;

  return {
    distanceM,
    dropCm: dropM * 100,
    holdMrad,
    clicks,
    velocityMs,
    timeS: sample.time,
    energyJ,
  };
}

function calculateRowsForDistances(distancesM, zeroDistanceM, speedMs) {
  const targetRanges = Array.from(new Set([...distancesM, zeroDistanceM])).sort((a, b) => a - b);
  const zeroAngle = findZeroAngle(speedMs, zeroDistanceM);
  const trajectory = simulateTrajectory(zeroAngle, speedMs, targetRanges);

  return distancesM.map((distanceM) => {
    const sample = trajectory.get(distanceM);
    if (!sample) {
      throw new Error(`Could not calculate trajectory at ${distanceM} m.`);
    }

    return createResultRow(distanceM, sample);
  });
}

function calculateTable(zeroDistanceM, speedMs) {
  return calculateRowsForDistances(setup.distancesM, zeroDistanceM, speedMs);
}

function validateInputs(zeroDistanceM, speedMs) {
  if (!Number.isFinite(zeroDistanceM) || zeroDistanceM < 25 || zeroDistanceM > 1000) {
    return "Zero distance must be between 25 m and 1000 m.";
  }

  if (!Number.isFinite(speedMs) || speedMs < 100 || speedMs > 1500) {
    return "Speed must be between 100 m/s and 1500 m/s.";
  }

  return "";
}

function validateTargetDistance(distanceM) {
  if (!Number.isFinite(distanceM) || distanceM < 25 || distanceM > 1000) {
    return "Target distance must be between 25 m and 1000 m.";
  }

  return "";
}

function formatSigned(value, digits = 1) {
  const formatted = Math.abs(value) < 0.0005 ? 0 : value;
  return `${formatted > 0 ? "+" : ""}${formatted.toFixed(digits)}`;
}

function renderTable(rows, zeroDistanceM, speedMs) {
  currentRows = rows;
  currentZeroDistanceM = zeroDistanceM;
  currentSpeedMs = speedMs;

  elements.resultsBody.innerHTML = rows
    .map((row) => {
      const isZeroRow = Math.abs(row.distanceM - zeroDistanceM) < 0.001;

      return `
        <tr class="${isZeroRow ? "zero-row" : ""}">
          <td>${row.distanceM} m</td>
          <td>${formatSigned(row.dropCm, 1)} cm</td>
          <td>${formatSigned(row.holdMrad, 2)} MRAD</td>
          <td>${formatSigned(row.clicks, 1)}</td>
          <td>${row.velocityMs.toFixed(0)} m/s</td>
          <td>${row.timeS.toFixed(3)} s</td>
          <td>${row.energyJ.toFixed(0)} J</td>
        </tr>
      `;
    })
    .join("");

  elements.caption.textContent = `Calculated for a ${zeroDistanceM.toFixed(0)} m zero and ${speedMs.toFixed(0)} m/s speed.`;
}

function renderTargetResult(row) {
  elements.targetResult.innerHTML = `
    <span>${formatSigned(row.clicks, 1)} clicks (${formatSigned(row.holdMrad, 2)} MRAD)</span>
    <small>${row.distanceM.toFixed(0)} m: ${formatSigned(row.dropCm, 1)} cm drop</small>
  `;
}

function createPdfRowsMarkup(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td class="dist">${row.distanceM}m</td>
          <td class="clk">${formatSigned(row.clicks, 0)}</td>
        </tr>
      `,
    )
    .join("");
}

function exportPdfA5() {
  const exportDistances = Array.from({ length: 12 }, (_, index) => (index + 1) * 25);
  const exportRows = calculateRowsForDistances(exportDistances, currentZeroDistanceM, currentSpeedMs);
  if (exportRows.length === 0) {
    showError("No rows available to export.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showError("Allow pop-ups to export the PDF.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Ballistic Stock Card</title>
        <style>
          @page {
            size: A5 portrait;
            margin: 6mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #111;
            font-family: Arial, sans-serif;
            font-size: calc(6pt + 4px);
          }

          .stock-card {
            width: 40mm;
            height: 60mm;
            margin-left: 3mm;
            padding: 1.4mm;
            overflow: hidden;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          tbody tr td {
            padding: 0.55mm 0.35mm;
            white-space: nowrap;
            font-size: calc(5.1pt + 4px);
            border-bottom: 0.15mm solid #d6d6d6;
          }

          tbody tr:last-child td {
            border-bottom: none;
          }

          td.dist {
            width: 34%;
            padding-right: 0.15mm;
            text-align: left;
          }

          td.clk {
            width: 66%;
            padding-left: 0.15mm;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <main class="stock-card">
          <table>
            <tbody>
              ${createPdfRowsMarkup(exportRows)}
            </tbody>
          </table>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.hidden = !message;
}

function showTargetPlaceholder(message) {
  elements.targetResult.innerHTML = `<span>${message}</span>`;
}

function recalculate() {
  const zeroDistanceM = Number(elements.zeroDistance.value);
  const speedMs = Number(elements.muzzleSpeed.value);
  const targetDistanceM = Number(elements.targetDistance.value);
  const validationMessage = validateInputs(zeroDistanceM, speedMs);
  const targetValidationMessage = validateTargetDistance(targetDistanceM);

  if (validationMessage) {
    showError(validationMessage);
    showTargetPlaceholder("Enter valid zero and speed.");
    return;
  }

  if (targetValidationMessage) {
    showError(targetValidationMessage);
    showTargetPlaceholder("Enter a valid target distance.");
    return;
  }

  try {
    const rows = calculateTable(zeroDistanceM, speedMs);
    const [targetRow] = calculateRowsForDistances([targetDistanceM], zeroDistanceM, speedMs);
    renderTable(rows, zeroDistanceM, speedMs);
    renderTargetResult(targetRow);
    showError("");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Could not calculate this setup.");
    showTargetPlaceholder("Could not calculate target distance.");
  }
}

elements.form.addEventListener("input", recalculate);
elements.exportPdfButton.addEventListener("click", exportPdfA5);
elements.resetButton.addEventListener("click", () => {
  elements.zeroDistance.value = setup.defaultZeroM;
  elements.muzzleSpeed.value = setup.defaultSpeedMs;
  elements.targetDistance.value = 300;
  recalculate();
});

recalculate();
