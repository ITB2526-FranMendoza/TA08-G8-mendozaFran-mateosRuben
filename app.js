/* ============================================================
   ITB · Calculadora d'Estalvi Energètic — app.js
   TA08 · CFGS ASIX G8 · Mendoza & Mateos · 2025
   ============================================================
   ESTRATÈGIES:
   A) Tendències Temporals: slider ±20% + varMensual() ±5%
   B) Cicles Estacionals: coeficients reals per mes
      - Agost = mínim elèctric/aigua (sistemes guardia)
      - Agost = 0 ABSOLUT per consumibles i neteja (centre TANCAT)
      - Juliol = 0 consumibles (sense alumnes, sense compres)
      - Juliol = PIC limpieza (neteja general fi de curs) — DADES REALS
      - Desembre/Gener reduïts (Nadal ~2 setmanes)
      - Març o Abril reduïts (Setmana Santa ~1 setmana)
      - Juny lleugerament reduït (última setmana només profes)
   C) Categories de Despesa: valors constants ±3%
   ============================================================ */

'use strict';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─────────────────────────────────────────
// ESTRATÈGIA B — Coeficients estacionals
// ─────────────────────────────────────────

// ELECTRICITAT
// Agosto: ~15% — servidors, alarmes, refrigeració mínima dels racks
// Juliol: activitat baixa (~55%) — gestió administrativa, sense aules
const ESTAC_ELEC = [
  0.72,  // 0  Enero     — Navidad 2 semanas (-28%)
  1.15,  // 1  Febrero   — Invierno pleno, máx calefacción
  1.00,  // 2  Marzo     — Semana Santa (~-12% del mes)
  0.98,  // 3  Abril     — Semana Santa (~-12% del mes, alternado)
  0.92,  // 4  Mayo      — Primavera, menos calefacción
  0.82,  // 5  Junio     — Calor, AC. Última semana solo profes (-15%)
  0.55,  // 6  Julio     — Solo gestión administrativa, sin alumnos
  0.15,  // 7  Agosto    — MÍNIMO: servidores guardia, alarmas, refrigeración racks
  0.95,  // 8  Septiembre— Inicio curso (parcial)
  1.05,  // 9  Octubre   — Actividad plena
  1.18,  // 10 Noviembre — Frío, calefacción
  0.68   // 11 Diciembre — Navidad 2 semanas (-32%)
];

// AGUA
// Agosto: ~5% — riego jardí/patis i sistemes contra incendis (manteniment obligatori)
// Juliol: ~30% — personal administratiu, neteja fi de curs
const ESTAC_AGUA = [
  0.70,  // 0  Enero     — Navidad parcial + frío (menos actividad)
  0.90,  // 1  Febrero   — Normal invierno
  0.88,  // 2  Marzo     — Semana Santa (-12%)
  0.88,  // 3  Abril     — Semana Santa (-12%)
  1.00,  // 4  Mayo      — Actividad normal
  0.95,  // 5  Junio     — Última semana -25% (solo profes)
  0.30,  // 6  Julio     — Personal admin + limpieza fin curso
  0.05,  // 7  Agosto    — MÍNIMO: riego jardín + mantenimiento sistemas (obligatorio)
  0.90,  // 8  Septiembre— Inicio parcial
  1.05,  // 9  Octubre   — Actividad plena
  1.00,  // 10 Noviembre — Normal
  0.65   // 11 Diciembre — Navidad 2 semanas
];

// Días lectivos reales por mes (alumnos presentes)
// Agosto = 0 días lectivos con alumnos, pero usamos días de guardia para agua/elec
const DIAS_LECTIVOS = [18, 19, 18, 18, 19, 15, 0, 0, 14, 21, 19, 10];
// Para agua/elec en agosto usamos días base mínimos (coef ya ajusta)
const DIAS_BASE_AGOSTO = 31; // días del mes para consumo mínimo de sistemas

// CONSUMIBLES
// Juliol = 0.25: profes al centre (reunions, memòries, preparació curs) → compres mínimes
// Agost = 0: centre TANCAT, personal 0, compres 0
const ESTAC_CONS = [
  0.85,  // 0  Enero     — Navidad (-15%), inicio 2.º trimestre
  0.95,  // 1  Febrero   — Normal
  1.10,  // 2  Marzo     — Evaluaciones (SS ~-12%, pero compras altas)
  1.20,  // 3  Abril     — Evaluaciones finales 2.º trimestre
  1.15,  // 4  Mayo      — Preparación fin de curso
  0.75,  // 5  Junio     — Última semana sin alumnos (-25%)
  0.25,  // 6  Julio     — Solo profes (reuniones, memorias, preparación): compras mínimas ~30€
  0.00,  // 7  Agosto    — CERRADO. 0€ absoluto
  1.40,  // 8  Septiembre— PICO: inicio curso, compra masiva material
  1.10,  // 9  Octubre   — Normal actividad plena
  1.00,  // 10 Noviembre — Normal
  0.50   // 11 Diciembre — Navidad 2 semanas
];

// LIMPIEZA
// Agost = 0: centre TANCAT, NO hi ha personal de neteja contractat
// Juliol = PIC (1.40): neteja general fi de curs — CONFIRMAT per factures reals
// Juny: factura real jun'24 (454,72€ ITB Leaks) = lleugerament per sota de la base
const ESTAC_LIMP = [
  0.80,  // 0  Enero     — Navidad 2 semanas reducido
  0.90,  // 1  Febrero   — Normal
  0.90,  // 2  Marzo     — Semana Santa (-10%)
  0.90,  // 3  Abril     — Semana Santa (-10%)
  1.00,  // 4  Mayo      — Normal (factura may'24: 454,72€ ≈ 0.90×507)
  0.85,  // 5  Junio     — Última semana solo profes (-15%) (factura jun'24: 750,26€ ≈ 1.48×507... pero incluye material limpieza extra)
  1.40,  // 6  Julio     — PICO: limpieza general fin de curso (sin alumnos, limpieza profunda)
  0.00,  // 7  Agosto    — CERRADO. 0€ — no hay contrato de limpieza en agosto
  1.15,  // 8  Septiembre— Preparación inicio curso
  1.05,  // 9  Octubre   — Normal
  1.05,  // 10 Noviembre — Normal
  0.70   // 11 Diciembre — Navidad 2 semanas
];

// ─────────────────────────────────────────
// ESTRATÈGIA C — Categories de Despesa
// ─────────────────────────────────────────
const CATEGORIAS_DESPESA = {
  mantenimiento: {
    base: 326, fluctuacion: 0.03,
    label: 'Mantenimiento',
    descripcion: 'Preventivo y correctivo: AACC, instalaciones eléctricas, obra civil',
    fuente: 'AACC 348€ + Ferro/Fusta 1.013€ + QGP 2.548€ ÷ 12 mesos',
    color: '#bc8cff'
  },
  telecomunicaciones: {
    base: 68, fluctuacion: 0,
    label: 'Telecomunicaciones',
    descripcion: 'Contratos fijos: DIGI 30€/mes + O2 38€/mes',
    fuente: 'Factura DIGI mai\'24 (30€) + Factura O2 mar\'24 (38€)',
    color: '#58a6ff'
  },
  residuos: {
    base: 50, fluctuacion: 0.03,
    label: 'Residuos / RAEE',
    descripcion: 'Gestión de residuos, escombros y recogida especial RAEE',
    fuente: 'Estimación basada en actividad del centre i obres 2024',
    color: '#e3b341'
  }
};

// Ahorros por indicador (checkboxes)
const AHORROS = {
  elec: { 'chk-elec-1': 15, 'chk-elec-2': 10, 'chk-elec-3': 8 },
  agua: { 'chk-agua-1': 15, 'chk-agua-2': 12, 'chk-agua-3': 8 },
  cons: { 'chk-cons-1': 20, 'chk-cons-2': 8,  'chk-cons-3': 5 },
  limp: { 'chk-limp-1': 25, 'chk-limp-2': 10, 'chk-limp-3': 5 }
};

// Resultados guardados para resumen global
const resultadosGlobales = { elec: null, agua: null, cons: null, limp: null, categ: null };
const charts = {};


// ─────────────────────────────────────────
// ESTRATÈGIA A — Variabilitat mensual
// ─────────────────────────────────────────
function varMensual() {
  return 1 + (Math.random() * 0.10 - 0.05); // ±5%
}
function varCategoria(f) {
  return f === 0 ? 1 : 1 + (Math.random() * f * 2 - f);
}


// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

['elec','agua','cons','limp'].forEach(id => {
  const sel = document.getElementById(`${id}-tipo`);
  if (sel) sel.addEventListener('change', () => {
    const rng = document.getElementById(`${id}-custom-range`);
    if (rng) rng.classList.toggle('hidden', sel.value !== 'custom');
  });
});

document.getElementById('elec-tendencia')?.addEventListener('input', e => {
  const v = parseInt(e.target.value);
  document.getElementById('elec-tend-val').textContent = (v >= 0 ? '+' : '') + v + '%';
});
document.getElementById('cons-tendencia')?.addEventListener('input', e => {
  const v = parseInt(e.target.value);
  document.getElementById('cons-tend-val').textContent = (v >= 0 ? '+' : '') + v + '%';
});


// ─────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────
function getRango(tipo, prefix) {
  if (tipo === 'anyo')  return { inicio: 0, fin: 11 };
  if (tipo === 'curso') return { inicio: 8, fin: 5 };
  return {
    inicio: parseInt(document.getElementById(`${prefix}-mes-inicio`).value),
    fin:    parseInt(document.getElementById(`${prefix}-mes-fin`).value)
  };
}

function expandirMeses(inicio, fin) {
  const meses = []; let m = inicio;
  while (true) {
    meses.push(m);
    if (m === fin) break;
    m = (m + 1) % 12;
    if (meses.length > 12) break;
  }
  return meses;
}

function fmt(num, d = 0) {
  return num.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtEur(num) {
  return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function etiq(tipo, ini, fin, n) {
  if (tipo === 'anyo')  return '12 meses (año completo)';
  if (tipo === 'curso') return '10 meses (sep–jun)';
  return `${n} meses (${MESES[ini]}–${MESES[fin]})`;
}

function crearChart(id, labels, datasets, tipo = 'bar', unidad = '') {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: tipo, data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8b949e', font: { family: 'DM Sans', size: 12 } } },
        tooltip: {
          backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1,
          titleColor: '#e6edf3', bodyColor: '#8b949e',
          callbacks: { label: c => ' ' + fmt(c.parsed.y, 1) + (unidad ? ' ' + unidad : '') }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(48,54,61,0.5)' }, ticks: { color: '#8b949e', font: { family: 'Space Mono', size: 11 } } },
        y: { grid: { color: 'rgba(48,54,61,0.5)' }, ticks: { color: '#8b949e', font: { family: 'DM Sans', size: 11 } } }
      }
    }
  });
}

function colorElec(i) { return [10,11,0,1].includes(i)?'#79c0ff':i===7?'#555':i===6?'#ffa657':'#3fb950'; }
function colorAgua(i) { return i===7?'#444':[5,6].includes(i)?'#39c5cf':'#58a6ff'; }
function colorCons(i) { return i===7?'#3d3d3d':i===6?'#6e7681':[8,2,3].includes(i)?'#e3b341':'#bc8cff'; }
function colorLimp(i) { return i===7?'#3d3d3d':i===6?'#f78166':'#3fb950'; }

function pillsEstrategias(...pills) {
  const cls = { A:'strat-a', B:'strat-b', C:'strat-c' };
  return `<div class="strat-badge">${pills.map(p=>`<span class="strat-pill ${cls[p.t]}">${p.txt}</span>`).join('')}</div>`;
}

function actualizarResumenGlobal() {
  const datos = [
    { key:'elec',  label:'Electricidad',      color:'#3fb950' },
    { key:'agua',  label:'Agua',               color:'#39c5cf' },
    { key:'cons',  label:'Consumibles',        color:'#e3b341' },
    { key:'limp',  label:'Limpieza',           color:'#f78166' },
    { key:'categ', label:'Mant.+Telecom+Res.', color:'#bc8cff' },
  ];
  let total = 0;
  const labels = [], values = [], colors = [];
  datos.forEach(d => {
    if (resultadosGlobales[d.key]) {
      labels.push(d.label);
      values.push(parseFloat(resultadosGlobales[d.key].total.toFixed(2)));
      colors.push(d.color);
      total += resultadosGlobales[d.key].total;
    }
  });
  document.getElementById('sum-total').textContent = total > 0 ? fmtEur(total) : '—';
  if (values.length > 0) {
    crearChart('chart-resumen', labels, [{ label:'Coste estimado (€)', data:values, backgroundColor:colors, borderRadius:8, borderSkipped:false }], 'bar', '€');
  }
  // Actualizar proyección cronograma si ya existe la función
  if (typeof crearChartCronograma === 'function') setTimeout(crearChartCronograma, 50);
}


// ─────────────────────────────────────────
// APLICAR AHORRO (Checkboxes integrados)
// ─────────────────────────────────────────
function aplicarAhorro(indicador) {
  const ahorrosInd = AHORROS[indicador];
  let totalAhorro = 0;
  Object.entries(ahorrosInd).forEach(([id, pct]) => {
    if (document.getElementById(id)?.checked) totalAhorro += pct;
  });
  totalAhorro = Math.min(totalAhorro, 30);

  const display = document.getElementById(`${indicador}-saving-display`);
  if (display) {
    display.innerHTML = `Ahorro: <strong style="color:${totalAhorro>=30?'var(--accent)':'var(--accent4)'}">${totalAhorro}%</strong>
      ${totalAhorro >= 30 ? '<span class="objetivo-ok">✅ −30% alcanzado</span>' : ''}`;
  }

  const res = resultadosGlobales[indicador];
  const applyDiv = document.getElementById(`apply-${indicador}`);
  if (res && applyDiv && totalAhorro > 0) {
    const totalActual = res.total;
    const totalConAhorro = totalActual * (1 - totalAhorro / 100);
    const ahorroEuros = totalActual - totalConAhorro;
    applyDiv.innerHTML = `
      <div class="apply-result-box">
        <div class="apply-row"><span>💶 Coste actual calculado</span><strong>${fmtEur(totalActual)}</strong></div>
        <div class="apply-row apply-row-saving"><span>✅ Con medidas aplicadas (−${totalAhorro}%)</span><strong style="color:var(--accent)">${fmtEur(totalConAhorro)}</strong></div>
        <div class="apply-row"><span>💰 Ahorro estimado anual</span><strong style="color:var(--accent4)">${fmtEur(ahorroEuros)}</strong></div>
      </div>`;
  } else if (applyDiv && totalAhorro > 0) {
    applyDiv.innerHTML = `<div class="apply-result-box apply-hint">⚠️ Pulsa "Calcular" para ver el ahorro en euros.</div>`;
  } else if (applyDiv) {
    applyDiv.innerHTML = '';
  }
}


// ─────────────────────────────────────────
// APLICAR TODAS LAS MEDIDAS (botón global)
// ─────────────────────────────────────────
function aplicarTodas() {
  const todosIds = [
    'chk-elec-1','chk-elec-2','chk-elec-3',
    'chk-agua-1','chk-agua-2','chk-agua-3',
    'chk-cons-1','chk-cons-2','chk-cons-3',
    'chk-limp-1','chk-limp-2','chk-limp-3'
  ];
  todosIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  ['elec','agua','cons','limp'].forEach(ind => aplicarAhorro(ind));

  const btnAll = document.getElementById('btn-apply-all');
  const btnRem = document.getElementById('btn-remove-all');
  if (btnAll) btnAll.style.display = 'none';
  if (btnRem) btnRem.style.display = 'inline-flex';
}

function quitarTodas() {
  const todosIds = [
    'chk-elec-1','chk-elec-2','chk-elec-3',
    'chk-agua-1','chk-agua-2','chk-agua-3',
    'chk-cons-1','chk-cons-2','chk-cons-3',
    'chk-limp-1','chk-limp-2','chk-limp-3'
  ];
  todosIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  ['elec','agua','cons','limp'].forEach(ind => aplicarAhorro(ind));

  const btnAll = document.getElementById('btn-apply-all');
  const btnRem = document.getElementById('btn-remove-all');
  if (btnAll) btnAll.style.display = 'inline-flex';
  if (btnRem) btnRem.style.display = 'none';
}


// ─────────────────────────────────────────
// CÁLCULOS 1 y 2 — ELECTRICIDAD
// ─────────────────────────────────────────
function calcularElectricidad() {
  const base     = parseFloat(document.getElementById('elec-base').value)   || 4200;
  const precio   = parseFloat(document.getElementById('elec-precio').value) || 0.18;
  const tipo     = document.getElementById('elec-tipo').value;
  const tend     = parseInt(document.getElementById('elec-tendencia').value) / 100;
  const { inicio, fin } = getRango(tipo, 'elec');
  const mesesR = expandirMeses(inicio, fin);

  let totalKwh = 0;
  const dataMeses = mesesR.map(m => {
    // Agosto = mínimo (15% — guardia), no 0
    const kwh = base * ESTAC_ELEC[m] * (1 + tend) * varMensual();
    totalKwh += kwh;
    return { mes: MESES[m], m, kwh };
  });

  const totalEur = totalKwh * precio;
  const label = etiq(tipo, inicio, fin, mesesR.length);
  const maxM = dataMeses.reduce((a,b) => a.kwh > b.kwh ? a : b);
  const minNoZero = dataMeses.filter(d=>d.kwh>50).reduce((a,b) => a.kwh < b.kwh ? a : b, dataMeses.filter(d=>d.kwh>50)[0]);

  resultadosGlobales.elec = { total: totalEur };
  document.getElementById('sum-elec').textContent = fmtEur(totalEur);
  actualizarResumenGlobal();

  document.getElementById('elec-resultado').innerHTML = `
    <div class="result-content">
      <div class="result-header"><span>⚡</span><h4>Consumo Eléctrico — ${label}</h4></div>
      <div class="result-big">
        <span class="big-number">${fmt(totalKwh,0)} kWh</span>
        <span class="big-label">Consumo total estimado</span>
        <span class="big-cost">${fmtEur(totalEur)}</span>
      </div>
      ${pillsEstrategias(
        {t:'A',txt:`Estrategia A — Tendencia ${tend>=0?'+':''}${(tend*100).toFixed(0)}%/año · Variabilidad ±5%`},
        {t:'B',txt:'Estrategia B — Invierno ×1.15 (feb), Agosto mínimo 15% (guardia), Navidad ×0.70'}
      )}
      <div class="result-info">
        <div class="result-info-row"><span>📊 Base mensual</span><strong>${fmt(base,0)} kWh/mes</strong></div>
        <div class="result-info-row"><span>📈 Tendencia aplicada</span><strong style="color:${tend>=0?'var(--accent3)':'var(--accent)'}">${tend>=0?'+':''}${(tend*100).toFixed(0)}%/año</strong></div>
        <div class="result-info-row"><span>🔥 Mes más alto</span><strong style="color:#79c0ff">${maxM.mes} — ${fmt(maxM.kwh,0)} kWh</strong></div>
        <div class="result-info-row"><span>📉 Mes más bajo (activo)</span><strong style="color:#ffa657">${minNoZero?.mes||'—'} — ${fmt(minNoZero?.kwh||0,0)} kWh</strong></div>
        <div class="result-info-row"><span>🔒 Agosto (guardia)</span><strong style="color:#888">${fmt(base*0.15,0)} kWh — Servidores + alarmas + refrigeración</strong></div>
        <div class="result-info-row"><span>💶 Precio kWh</span><strong>${precio} €/kWh</strong></div>
      </div>
      <table class="result-table">
        <thead><tr><th>Mes</th><th class="col-num">kWh</th><th class="col-num">Coste</th><th class="col-num">Coef.</th></tr></thead>
        <tbody>${dataMeses.map(d=>{
          const cls=[10,11,0,1].includes(d.m)?'winter':d.m===7?'closed':[5,6].includes(d.m)?'summer':'';
          return `<tr><td class="${cls}">${d.mes}${d.m===7?' 🔒':''}</td>
            <td class="col-num ${cls}">${fmt(d.kwh,0)}</td>
            <td class="col-num ${d.m===7?'closed':'highlight'}">${fmtEur(d.kwh*precio)}</td>
            <td class="col-num" style="color:var(--text-muted)">${ESTAC_ELEC[d.m].toFixed(2)}×</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  // Gráfico usa exactamente los mismos valores que la tabla (dataMeses)
  const chartDataElec = MESES.map((_,i) => {
    const found = dataMeses.find(d => d.m === i);
    return found ? Math.round(found.kwh) : 0;
  });
  crearChart('chart-elec', MESES.map(m=>m.substring(0,3)), [{
    label:'kWh estimado', data:chartDataElec,
    backgroundColor:MESES.map((_,i)=>colorElec(i)), borderRadius:6, borderSkipped:false
  }], 'bar', 'kWh');

  aplicarAhorro('elec');
}


// ─────────────────────────────────────────
// CÁLCULOS 3 y 4 — AGUA
// ─────────────────────────────────────────
function calcularAgua() {
  const baseDia = parseFloat(document.getElementById('agua-base').value)   || 5000;
  const precio  = parseFloat(document.getElementById('agua-precio').value) || 4.05;
  const tipo    = document.getElementById('agua-tipo').value;
  const efic    = document.getElementById('agua-estacional').value === 'eficiente' ? 0.85 : 1.0;
  const { inicio, fin } = getRango(tipo, 'agua');
  const mesesR = expandirMeses(inicio, fin);

  let totalLitros = 0;
  const dataMeses = mesesR.map(m => {
    let litros;
    if (m === 7) {
      // Agosto: consumo mínimo fijo por riego y sistemas (no depende de días lectivos)
      litros = baseDia * ESTAC_AGUA[m] * efic * varMensual(); // ~5% del base
    } else {
      const dias = DIAS_LECTIVOS[m] || (m === 6 ? 5 : 0); // julio: ~5 días efectivos personal
      litros = baseDia * ESTAC_AGUA[m] * efic * Math.max(dias, m===6?5:0) * varMensual();
    }
    totalLitros += litros;
    return { mes: MESES[m], m, litros };
  });

  const totalM3  = totalLitros / 1000;
  const totalEur = totalM3 * precio;
  const label = etiq(tipo, inicio, fin, mesesR.length);
  const maxM = dataMeses.reduce((a,b) => a.litros > b.litros ? a : b);
  const minNoZero = dataMeses.filter(d=>d.litros>0).reduce((a,b)=>a.litros<b.litros?a:b, dataMeses.filter(d=>d.litros>0)[0]);

  resultadosGlobales.agua = { total: totalEur };
  document.getElementById('sum-agua').textContent = fmtEur(totalEur);
  actualizarResumenGlobal();

  document.getElementById('agua-resultado').innerHTML = `
    <div class="result-content">
      <div class="result-header"><span>💧</span><h4>Consumo de Agua — ${label}</h4></div>
      <div class="result-big" style="background:rgba(57,197,207,.08);border-color:rgba(57,197,207,.3)">
        <span class="big-number" style="color:var(--accent-water)">${fmt(totalM3,1)} m³</span>
        <span class="big-label">= ${fmt(totalLitros,0)} litros totales</span>
        <span class="big-cost">${fmtEur(totalEur)}</span>
      </div>
      ${pillsEstrategias(
        {t:'A',txt:'Estrategia A — Variabilidad mensual ±5%'},
        {t:'B',txt:'Estrategia B — Agosto mínimo 5% (riego+sistemas), Navidad/SS reducidos'}
      )}
      <div class="result-info">
        <div class="result-info-row"><span>🚰 Base diaria</span><strong>${fmt(baseDia,0)} L/día lectivo</strong></div>
        <div class="result-info-row"><span>♻️ Eficiencia aplicada</span><strong style="color:${efic<1?'var(--accent)':'var(--accent3)'}">${efic<1?'Sí (−15%)':'No'}</strong></div>
        <div class="result-info-row"><span>📈 Mes pico</span><strong style="color:var(--accent-water)">${maxM.mes} — ${fmt(maxM.litros/1000,1)} m³</strong></div>
        <div class="result-info-row"><span>📉 Mes mínimo (activo)</span><strong>${minNoZero?.mes||'—'} — ${fmt((minNoZero?.litros||0)/1000,1)} m³</strong></div>
        <div class="result-info-row"><span>🔒 Agosto (mínimo)</span><strong style="color:#888">Riego jardín + mantenimiento sistemas (obligatorio)</strong></div>
        <div class="result-info-row"><span>💶 Precio m³</span><strong>${precio} €/m³</strong></div>
      </div>
      <table class="result-table">
        <thead><tr><th>Mes</th><th class="col-num">Litros</th><th class="col-num">m³</th><th class="col-num">Coste</th></tr></thead>
        <tbody>${dataMeses.map(d=>`<tr>
          <td>${d.mes}${d.m===7?' 🔒':''}</td>
          <td class="col-num">${fmt(d.litros,0)}</td>
          <td class="col-num" style="color:${d.m===7?'#888':'var(--accent-water)'}">${fmt(d.litros/1000,2)}</td>
          <td class="col-num ${d.m===7?'closed':'highlight'}">${fmtEur(d.litros/1000*precio)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // Gráfico usa exactamente los mismos valores que la tabla (dataMeses)
  const chartDataAgua = MESES.map((_,i) => {
    const found = dataMeses.find(d => d.m === i);
    return found ? parseFloat((found.litros/1000).toFixed(2)) : 0;
  });
  crearChart('chart-agua', MESES.map(m=>m.substring(0,3)), [{
    label:'m³ estimados', data:chartDataAgua,
    backgroundColor:MESES.map((_,i)=>colorAgua(i)), borderRadius:6, borderSkipped:false
  }], 'bar', 'm³');

  aplicarAhorro('agua');
}


// ─────────────────────────────────────────
// CÁLCULOS 5 y 6 — CONSUMIBLES
// ─────────────────────────────────────────
function calcularConsumibles() {
  const base = parseFloat(document.getElementById('cons-base').value) || 120;
  const tipo = document.getElementById('cons-tipo').value;
  const tend = parseInt(document.getElementById('cons-tendencia').value) / 100;
  const { inicio, fin } = getRango(tipo, 'cons');
  const mesesR = expandirMeses(inicio, fin);

  let totalEur = 0;
  const dataMeses = mesesR.map(m => {
    const gasto = ESTAC_CONS[m] > 0 ? base * ESTAC_CONS[m] * (1 + tend) * varMensual() : 0;
    totalEur += gasto;
    return { mes: MESES[m], m, gasto };
  });

  const label = etiq(tipo, inicio, fin, mesesR.length);
  const maxM = dataMeses.reduce((a,b) => a.gasto > b.gasto ? a : b);
  const minNoZero = dataMeses.filter(d=>d.gasto>0).reduce((a,b)=>a.gasto<b.gasto?a:b, dataMeses.filter(d=>d.gasto>0)[0]);

  resultadosGlobales.cons = { total: totalEur };
  document.getElementById('sum-cons').textContent = fmtEur(totalEur);
  actualizarResumenGlobal();

  document.getElementById('cons-resultado').innerHTML = `
    <div class="result-content">
      <div class="result-header"><span>📦</span><h4>Consumibles — ${label}</h4></div>
      <div class="result-big" style="background:rgba(227,179,65,.08);border-color:rgba(227,179,65,.3)">
        <span class="big-number" style="color:var(--accent4)">${fmtEur(totalEur)}</span>
        <span class="big-label">Papel A4 · Marcadores · Borradores · Recambios</span>
      </div>
      ${pillsEstrategias(
        {t:'A',txt:`Estrategia A — Tendencia ${tend>=0?'+':''}${(tend*100).toFixed(0)}% · Variabilidad ±5%`},
        {t:'B',txt:'Estrategia B — Agosto y julio 0€ (cerrado/sin alumnos), pico sep (inicio curso)'}
      )}
      <div class="result-info">
        <div class="result-info-row"><span>📊 Base mensual</span><strong>120 €/mes (Lyreco 2024)</strong></div>
        <div class="result-info-row"><span>📈 Tendencia</span><strong style="color:${tend>=0?'var(--accent3)':'var(--accent)'}">${tend>=0?'+':''}${(tend*100).toFixed(0)}%/año</strong></div>
        <div class="result-info-row"><span>🏫 Mes más alto</span><strong style="color:var(--accent4)">${maxM.mes} — ${fmtEur(maxM.gasto)}</strong></div>
        <div class="result-info-row"><span>📉 Mes más bajo (activo)</span><strong>${minNoZero?.mes||'—'} — ${fmtEur(minNoZero?.gasto||0)}</strong></div>
        <div class="result-info-row"><span>🚫 Julio y Agosto</span><strong style="color:#6e7681">0,00 € — sin alumnos / centro cerrado</strong></div>
      </div>
      <table class="result-table">
        <thead><tr><th>Mes</th><th class="col-num">Gasto</th><th class="col-num">Coef.</th><th class="col-num">% total</th></tr></thead>
        <tbody>${dataMeses.map(d=>`<tr>
          <td>${d.mes}${(d.m===7||d.m===6)?' 🚫':''}</td>
          <td class="col-num ${(d.m===7||d.m===6)?'closed':'highlight'}">${fmtEur(d.gasto)}</td>
          <td class="col-num" style="color:var(--text-muted)">${ESTAC_CONS[d.m].toFixed(2)}×</td>
          <td class="col-num" style="color:var(--accent4)">${totalEur>0?((d.gasto/totalEur)*100).toFixed(1):'0.0'}%</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // Gráfico usa exactamente los mismos valores que la tabla (dataMeses)
  const chartDataCons = MESES.map((_,i) => {
    const found = dataMeses.find(d => d.m === i);
    return found ? parseFloat(found.gasto.toFixed(2)) : 0;
  });
  crearChart('chart-cons', MESES.map(m=>m.substring(0,3)), [{
    label:'Gasto mensual (€)', data:chartDataCons,
    backgroundColor:MESES.map((_,i)=>colorCons(i)), borderRadius:6, borderSkipped:false
  }], 'bar', '€');

  aplicarAhorro('cons');
}


// ─────────────────────────────────────────
// CÁLCULOS 7 y 8 — LIMPIEZA
// ─────────────────────────────────────────
function calcularLimpieza() {
  const base      = parseFloat(document.getElementById('limp-base').value) || 507;
  const tipo      = document.getElementById('limp-tipo').value;
  const actividad = document.getElementById('limp-actividad').value;
  const multAct   = actividad === 'alta' ? 1.15 : 1.0;
  const { inicio, fin } = getRango(tipo, 'limp');
  const mesesR = expandirMeses(inicio, fin);

  let totalEur = 0;
  const dataMeses = mesesR.map(m => {
    const gasto = ESTAC_LIMP[m] > 0 ? base * ESTAC_LIMP[m] * multAct * varMensual() : 0;
    totalEur += gasto;
    return { mes: MESES[m], m, gasto };
  });

  const label = etiq(tipo, inicio, fin, mesesR.length);
  const maxM = dataMeses.reduce((a,b) => a.gasto > b.gasto ? a : b);
  const minNoZero = dataMeses.filter(d=>d.gasto>0).reduce((a,b)=>a.gasto<b.gasto?a:b, dataMeses.filter(d=>d.gasto>0)[0]);

  resultadosGlobales.limp = { total: totalEur };
  document.getElementById('sum-limp').textContent = fmtEur(totalEur);
  actualizarResumenGlobal();

  document.getElementById('limp-resultado').innerHTML = `
    <div class="result-content">
      <div class="result-header"><span>🧹</span><h4>Limpieza — ${label}</h4></div>
      <div class="result-big" style="background:rgba(247,129,102,.08);border-color:rgba(247,129,102,.3)">
        <span class="big-number" style="color:var(--accent3)">${fmtEur(totalEur)}</span>
        <span class="big-label">Papel WC · Secamanos · Jabón · Bolsas basura</span>
      </div>
      ${pillsEstrategias(
        {t:'A',txt:'Estrategia A — Variabilidad mensual ±5%'},
        {t:'B',txt:'Estrategia B — Agosto 0€ (cerrado), pico julio (limpieza fin curso)'}
      )}
      <div class="result-info">
        <div class="result-info-row"><span>📊 Base mensual real</span><strong>507 €/mes (oct+nov'24 ÷ 2)</strong></div>
        <div class="result-info-row"><span>👥 Nivel actividad</span><strong style="color:${actividad==='alta'?'var(--accent3)':'var(--accent)'}">${actividad==='alta'?'Alta (+15%)':'Normal'}</strong></div>
        <div class="result-info-row"><span>📈 Mes más alto (fin curso)</span><strong style="color:var(--accent3)">${maxM.mes} — ${fmtEur(maxM.gasto)}</strong></div>
        <div class="result-info-row"><span>📉 Mes más bajo (activo)</span><strong>${minNoZero?.mes||'—'} — ${fmtEur(minNoZero?.gasto||0)}</strong></div>
        <div class="result-info-row"><span>🚫 Agosto</span><strong style="color:#6e7681">0,00 € — sin personal de limpieza (centro cerrado)</strong></div>
      </div>
      <table class="result-table">
        <thead><tr><th>Mes</th><th class="col-num">Gasto</th><th class="col-num">Coef.</th><th class="col-num">% total</th></tr></thead>
        <tbody>${dataMeses.map(d=>`<tr>
          <td>${d.mes}${d.m===7?' 🚫':d.m===6?' 📈':''}</td>
          <td class="col-num ${d.m===7?'closed':d.m===6?'summer':'highlight'}">${fmtEur(d.gasto)}</td>
          <td class="col-num" style="color:var(--text-muted)">${ESTAC_LIMP[d.m].toFixed(2)}×</td>
          <td class="col-num" style="color:var(--accent4)">${totalEur>0?((d.gasto/totalEur)*100).toFixed(1):'0.0'}%</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // Gráfico usa exactamente los mismos valores que la tabla (dataMeses)
  const chartDataLimp = MESES.map((_,i) => {
    const found = dataMeses.find(d => d.m === i);
    return found ? parseFloat(found.gasto.toFixed(2)) : 0;
  });
  crearChart('chart-limp', MESES.map(m=>m.substring(0,3)), [{
    label:'Gasto mensual (€)', data:chartDataLimp,
    backgroundColor:MESES.map((_,i)=>colorLimp(i)), borderRadius:6, borderSkipped:false
  }], 'bar', '€');

  aplicarAhorro('limp');
}


// ─────────────────────────────────────────
// ESTRATEGIA C — Categories de Despesa
// ─────────────────────────────────────────
function calcularCategories() {
  const numMeses = parseInt(document.getElementById('categ-meses').value) || 12;
  let totalGlobal = 0;

  const rows = Object.entries(CATEGORIAS_DESPESA).map(([,cat]) => {
    let totalCat = 0;
    for (let i = 0; i < numMeses; i++) totalCat += cat.base * varCategoria(cat.fluctuacion);
    totalGlobal += totalCat;
    return { cat, totalCat };
  });

  resultadosGlobales.categ = { total: totalGlobal };
  document.getElementById('sum-categ').textContent = fmtEur(totalGlobal);
  actualizarResumenGlobal();

  document.getElementById('categ-resultado').innerHTML = `
    <div class="result-content">
      <div class="result-header"><span>🔧</span><h4>Gastos Fijos — ${numMeses} meses</h4></div>
      <div class="result-big" style="background:rgba(188,140,255,.08);border-color:rgba(188,140,255,.3)">
        <span class="big-number" style="color:#bc8cff">${fmtEur(totalGlobal)}</span>
        <span class="big-label">Total mantenimiento + telecomunicaciones + residuos</span>
      </div>
      ${pillsEstrategias({t:'C',txt:'Estrategia C — Valores constantes con fluctuación pequeña ±3% (mantenimiento) y 0% (telecom)'})}
      <div class="categ-explain">
        <p>Costes <strong>previsibles e independientes de la estación</strong>. La fluctuación ±3% simula pequeños imprevistos.
        <strong>Telecomunicaciones tiene 0%</strong> de fluctuación porque es un precio contractual fijo.</p>
      </div>
      <div class="categ-list">
        ${rows.map(({cat,totalCat})=>`
          <div class="categ-card">
            <div class="categ-header">
              <div class="categ-dot" style="background:${cat.color}"></div>
              <div style="flex:1"><strong>${cat.label}</strong><p class="categ-desc">${cat.descripcion}</p><p class="categ-fuente">📂 ${cat.fuente}</p></div>
              <div class="categ-total" style="color:${cat.color}">${fmtEur(totalCat)}</div>
            </div>
            <div class="categ-detail">
              <div class="categ-row-info"><span>Base mensual:</span><strong>${fmtEur(cat.base)}/mes</strong></div>
              <div class="categ-row-info"><span>Fluctuación:</span><strong style="color:${cat.fluctuacion===0?'var(--accent)':'var(--accent4)'}">${cat.fluctuacion===0?'0% — precio fijo contractual':`±${(cat.fluctuacion*100).toFixed(0)}% — imprevistos`}</strong></div>
              <div class="categ-row-info"><span>Total ${numMeses} meses:</span><strong style="color:${cat.color}">${fmtEur(totalCat)}</strong></div>
            </div>
          </div>`).join('')}
      </div>
      <div class="categ-total-row"><span>💶 TOTAL ${numMeses} MESES</span><strong style="color:#bc8cff">${fmtEur(totalGlobal)}</strong></div>
    </div>`;

  const labs = MESES.slice(0, numMeses).map(m=>m.substring(0,3));
  const datasets = Object.entries(CATEGORIAS_DESPESA).map(([,cat])=>({
    label: cat.label,
    data: Array.from({length:numMeses},()=>cat.base*varCategoria(cat.fluctuacion)),
    backgroundColor: cat.color, borderRadius:4, borderSkipped:false
  }));
  crearChart('chart-categ', labs, datasets, 'bar', '€');
  const ch = charts['chart-categ'];
  if (ch) { ch.options.scales.x.stacked=true; ch.options.scales.y.stacked=true; ch.update(); }
}


// ─────────────────────────────────────────
// INICIALIZACIÓN AUTOMÁTICA AL CARGAR
// ─────────────────────────────────────────
window.addEventListener('load', () => {
  const labs = MESES.map(m=>m.substring(0,3));

  // Gráficos base
  crearChart('chart-elec', labs, [{label:'kWh estimado (base 4.200)', data:MESES.map((_,i)=>4200*ESTAC_ELEC[i]), backgroundColor:MESES.map((_,i)=>colorElec(i)), borderRadius:6, borderSkipped:false}], 'bar', 'kWh');
  crearChart('chart-agua', labs, [{label:'m³ estimados', data:MESES.map((_,i)=>{
    if (i===7) return parseFloat(((5000*ESTAC_AGUA[7]*DIAS_BASE_AGOSTO)/1000).toFixed(1)); // Agosto: riego mínimo
    if (i===6) return parseFloat(((5000*ESTAC_AGUA[6]*20)/1000).toFixed(1));               // Julio: personal admin
    return parseFloat(((5000*ESTAC_AGUA[i]*(DIAS_LECTIVOS[i]||0))/1000).toFixed(1));
  }), backgroundColor:MESES.map((_,i)=>colorAgua(i)), borderRadius:6, borderSkipped:false}], 'bar', 'm³');
  crearChart('chart-cons', labs, [{label:'Gasto mensual (€)', data:MESES.map((_,i)=>parseFloat((120*ESTAC_CONS[i]).toFixed(2))), backgroundColor:MESES.map((_,i)=>colorCons(i)), borderRadius:6, borderSkipped:false}], 'bar', '€');
  crearChart('chart-limp', labs, [{label:'Gasto mensual (€)', data:MESES.map((_,i)=>507*ESTAC_LIMP[i]), backgroundColor:MESES.map((_,i)=>colorLimp(i)), borderRadius:6, borderSkipped:false}], 'bar', '€');
  crearChart('chart-categ', labs, Object.entries(CATEGORIAS_DESPESA).map(([,cat])=>({label:cat.label, data:MESES.map(()=>cat.base), backgroundColor:cat.color, borderRadius:4, borderSkipped:false})), 'bar', '€');

  // CÁLCULO AUTOMÁTICO AL ENTRAR
  calcularElectricidad();
  calcularAgua();
  calcularConsumibles();
  calcularLimpieza();
  calcularCategories();

  // Cronograma chart inicial
  crearChartCronograma();
});


// ─────────────────────────────────────────
// CRONOGRAMA — Proyección 4 años
// ─────────────────────────────────────────
function crearChartCronograma() {
  const total = Object.values(resultadosGlobales)
    .filter(Boolean)
    .reduce((s, r) => s + (r.total || 0), 0);

  const base = total > 0 ? total : 8000; // fallback estimado si no hay cálculos
  const años = ['2025 (base)', '2026 (Año 1 −10%)', '2027 (Año 2 −20%)', '2028 (Año 3 −30%)'];
  const values = [base, base * 0.90, base * 0.80, base * 0.70];
  const colors = ['#8b949e', '#e3b341', '#f78166', '#3fb950'];

  crearChart('chart-crono', años, [{
    label: 'Coste anual estimado (€)',
    data: values,
    backgroundColor: colors,
    borderRadius: 8,
    borderSkipped: false
  }], 'bar', '€');
}


