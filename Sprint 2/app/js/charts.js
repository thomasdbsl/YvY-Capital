function points(values, width = 640, height = 220, padding = 16) {
  const numbers = values.map(Number);
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  const range = maximum - minimum || 1;
  return numbers.map((value, index) => {
    const x = padding + (index / Math.max(1, numbers.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - minimum) / range) * (height - padding * 2);
    return [x, y];
  });
}

function pathFrom(values) {
  return points(values).map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export function lineChart(primary, secondary, label) {
  const primaryPath = pathFrom(primary);
  const secondaryPath = secondary ? pathFrom(secondary) : "";
  const areaPath = `${primaryPath} L624,220 L16,220 Z`;
  return `
    <div class="chart-wrap">
      <svg class="line-chart" viewBox="0 0 640 230" role="img" aria-label="${label}">
        <defs><linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79569b" stop-opacity=".22"/><stop offset="1" stop-color="#79569b" stop-opacity="0"/></linearGradient></defs>
        <path class="grid-line" d="M16 55H624 M16 110H624 M16 165H624 M16 220H624"/>
        <path class="area" d="${areaPath}"/>
        ${secondaryPath ? `<path class="secondary-line" d="${secondaryPath}"/>` : ""}
        <path class="primary-line" d="${primaryPath}"/>
      </svg>
      <div class="chart-legend"><span class="legend-key">FUND_01</span>${secondaryPath ? '<span class="legend-key secondary">Reference synthetique</span>' : ""}</div>
    </div>`;
}

export function miniBars(values, label) {
  const max = Math.max(...values, 1);
  return `<div class="mini-bars" role="img" aria-label="${label}" style="display:flex;height:8rem;align-items:end;gap:.45rem">${values.map((value, index) => `<span style="height:${Math.max(8, (value / max) * 100)}%;flex:1;border-radius:.35rem .35rem .15rem .15rem;background:${index === values.length - 1 ? "var(--violet-700)" : "var(--violet-200)"}"></span>`).join("")}</div>`;
}

export function donutGradient(allocation) {
  const colors = ["#4b3267", "#765590", "#a98bbc", "#c8b4d5", "#8d878f", "#d8d2ce"];
  let cursor = 0;
  const stops = allocation.map((item, index) => {
    const start = cursor;
    cursor += item.weight * 100;
    return `${colors[index]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  });
  return { gradient: `conic-gradient(${stops.join(",")})`, colors };
}
