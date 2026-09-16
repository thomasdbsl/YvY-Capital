let chartSequence = 0;

const chartGeometry = { width: 640, height: 270, left: 58, right: 624, top: 16, bottom: 218 };

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function sharedDomain(primary, secondary) {
  const values = [...primary, ...(secondary || [])].map(Number).filter(Number.isFinite);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const padding = Math.max(range * 0.08, 0.5);
  return range === 0 ? [minimum - 1, maximum + 1] : [minimum - padding, maximum + padding];
}

function chartPoints(values, domain) {
  const [minimum, maximum] = domain;
  const range = maximum - minimum || 1;
  const { left, right, top, bottom } = chartGeometry;
  return values.map((rawValue, index) => {
    const value = Number(rawValue);
    const x = left + (index / Math.max(1, values.length - 1)) * (right - left);
    const y = bottom - ((value - minimum) / range) * (bottom - top);
    return [x, y];
  });
}

function pathFrom(points) {
  return points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

function tickIndexes(length, maximumTicks) {
  const count = Math.min(length, maximumTicks);
  if (count <= 1) return [0];
  return [...new Set(Array.from({ length: count }, (_, index) => Math.round(index * (length - 1) / (count - 1))))];
}

function dateLabel(value, spanDays) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const options = spanDays > 220
    ? { month: "short", year: "2-digit", timeZone: "UTC" }
    : { day: "2-digit", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function indexLabel(value) {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function tooltipPoints(points, values, dates, seriesLabel) {
  return points.map(([x, y], index) => `<circle class="chart-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6"><title>${escapeXml(dates[index] || `Observation ${index + 1}`)} · ${escapeXml(seriesLabel)}: ${Number(values[index]).toFixed(2)}</title></circle>`).join("");
}

export function lineChart(primary, secondary, label, primaryLabel = "Fund", secondaryLabel = "Benchmark", dates = []) {
  if (!primary || primary.length < 2) return `<div class="state-panel"><div class="state-panel-inner"><div class="state-icon">N/A</div><h2>Series unavailable</h2><p>There are not enough validated observations for this selection.</p></div></div>`;
  const comparableSecondary = secondary?.length === primary.length ? secondary : null;
  const domain = sharedDomain(primary, comparableSecondary);
  const primaryPoints = chartPoints(primary, domain);
  const secondaryPoints = comparableSecondary ? chartPoints(comparableSecondary, domain) : [];
  const primaryPath = pathFrom(primaryPoints);
  const secondaryPath = secondaryPoints.length ? pathFrom(secondaryPoints) : "";
  const areaPath = `${primaryPath} L${chartGeometry.right},${chartGeometry.bottom} L${chartGeometry.left},${chartGeometry.bottom} Z`;
  const yTicks = Array.from({ length: 5 }, (_, index) => domain[0] + (domain[1] - domain[0]) * index / 4);
  const normalizedDates = primary.map((_, index) => dates[index] || String(index + 1));
  const startDate = new Date(`${normalizedDates[0]}T00:00:00Z`);
  const endDate = new Date(`${normalizedDates.at(-1)}T00:00:00Z`);
  const spanDays = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) ? 0 : Math.round((endDate - startDate) / 86400000);
  const maximumDateTicks = typeof window !== "undefined" && window.innerWidth < 520 ? 3 : 6;
  const xTicks = tickIndexes(primary.length, maximumDateTicks);
  const gradientId = `chart-area-${++chartSequence}`;
  const grid = yTicks.map((value) => {
    const y = chartGeometry.bottom - ((value - domain[0]) / (domain[1] - domain[0])) * (chartGeometry.bottom - chartGeometry.top);
    return `<line class="grid-line" x1="${chartGeometry.left}" y1="${y.toFixed(2)}" x2="${chartGeometry.right}" y2="${y.toFixed(2)}"/><text class="axis-tick" x="${chartGeometry.left - 10}" y="${(y + 4).toFixed(2)}" text-anchor="end">${indexLabel(value)}</text>`;
  }).join("");
  const dateTicks = xTicks.map((index) => {
    const x = primaryPoints[index][0];
    return `<line class="axis-tick-mark" x1="${x.toFixed(2)}" y1="${chartGeometry.bottom}" x2="${x.toFixed(2)}" y2="${chartGeometry.bottom + 5}"/><text class="axis-tick" x="${x.toFixed(2)}" y="${chartGeometry.bottom + 19}" text-anchor="middle">${escapeXml(dateLabel(normalizedDates[index], spanDays))}</text>`;
  }).join("");
  return `
    <div class="chart-wrap">
      <svg class="line-chart" viewBox="0 0 ${chartGeometry.width} ${chartGeometry.height}" role="img" aria-label="${escapeXml(label)}">
        <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79569b" stop-opacity=".22"/><stop offset="1" stop-color="#79569b" stop-opacity="0"/></linearGradient></defs>
        <g class="axis-y">${grid}<line class="axis-line" x1="${chartGeometry.left}" y1="${chartGeometry.top}" x2="${chartGeometry.left}" y2="${chartGeometry.bottom}"/><text class="axis-label" transform="translate(15 ${(chartGeometry.top + chartGeometry.bottom) / 2}) rotate(-90)" text-anchor="middle">Performance Index</text></g>
        <g class="axis-x"><line class="axis-line" x1="${chartGeometry.left}" y1="${chartGeometry.bottom}" x2="${chartGeometry.right}" y2="${chartGeometry.bottom}"/>${dateTicks}<text class="axis-label" x="${(chartGeometry.left + chartGeometry.right) / 2}" y="${chartGeometry.height - 4}" text-anchor="middle">Date</text></g>
        <path class="area" style="fill:url(#${gradientId})" d="${areaPath}"/>
        ${secondaryPath ? `<path class="secondary-line" d="${secondaryPath}"/>` : ""}
        <path class="primary-line" d="${primaryPath}"/>
        <g class="chart-tooltips">${tooltipPoints(primaryPoints, primary, normalizedDates, primaryLabel)}${secondaryPath ? tooltipPoints(secondaryPoints, comparableSecondary, normalizedDates, secondaryLabel) : ""}</g>
      </svg>
      <div class="chart-legend"><span class="legend-key">${escapeXml(primaryLabel)}</span>${secondaryPath ? `<span class="legend-key secondary">${escapeXml(secondaryLabel)}</span>` : ""}</div>
    </div>`;
}

export function miniBars(values, label) {
  const max = Math.max(...values, 1);
  return `<div class="mini-bars" role="img" aria-label="${escapeXml(label)}" style="display:flex;height:8rem;align-items:end;gap:.45rem">${values.map((value, index) => `<span style="height:${Math.max(8, (value / max) * 100)}%;flex:1;border-radius:.35rem .35rem .15rem .15rem;background:${index === values.length - 1 ? "var(--violet-700)" : "var(--violet-200)"}"></span>`).join("")}</div>`;
}

export function donutGradient(allocation) {
  const colors = ["#4b3267", "#765590", "#a98bbc", "#c8b4d5", "#8d878f", "#d8d2ce"];
  const positiveTotal = allocation.reduce((sum, item) => sum + Math.max(0, Number(item.weight)), 0) || 1;
  let cursor = 0;
  const stops = allocation.map((item, index) => {
    const start = cursor;
    cursor += Math.max(0, Number(item.weight)) / positiveTotal * 100;
    return `${colors[index % colors.length]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  });
  return { gradient: stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#d8d2ce 0 100%)", colors };
}
