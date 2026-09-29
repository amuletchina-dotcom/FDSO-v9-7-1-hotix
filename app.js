
function fmt(v,d=2) {
  return Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "—";
}


const $ = id => document.getElementById(id);
let latest = {outer:null, inner:null};
let selected = "outer";
let evidenceMode = "nfl";
let plotMeta = {};

function initEmployeeLogin() {
  const saved = localStorage.getItem("glassEmployee");
  if (saved) {
    $("staffName").textContent = saved;
    $("loginOverlay").classList.add("hidden");
  } else {
    $("loginOverlay").classList.remove("hidden");
  }

  $("loginBtn").addEventListener("click", () => {
    const name = $("employeeLogin").value;
    if (!name) return;
    localStorage.setItem("glassEmployee", name);
    $("staffName").textContent = name;
    $("loginOverlay").classList.add("hidden");
  });

  $("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("glassEmployee");
    $("employeeLogin").value = "";
    $("loginOverlay").classList.remove("hidden");
  });
}

function options(arr, suffix=" mm") {
  return arr.map(v => `<option value="${v}">${v}${suffix}</option>`).join("");
}


function glassColorOptions() {
  return ["Clear","Green Tinted","Grey Tinted","Low Iron"]
    .map(v=>`<option value="${v}">${v}</option>`).join("");
}
function interlayerThicknessOptions() {
  return options([0.38,0.76,1.14,1.52,2.28,2.66,3.04]);
}
function liteFields(p) {
  return `
    <div class="grid2">
      <label>Construction
        <select id="${p}kind">
          <option value="mono">Monolithic</option>
          <option value="lam">Laminated</option>
        </select>
      </label>
      <label id="${p}monoTypeBox">Glass type
        <select id="${p}type">
          <option value="AN">AN — Annealed</option>
          <option value="HS">HS — Heat Strengthened</option>
          <option value="FT" selected>FT — Fully Tempered</option>
        </select>
      </label>
      <label id="${p}monoBox">Nominal thickness
        <select id="${p}th">${options([4,5,6,8,10,12,15,19])}</select>
      </label>
      <label id="${p}monoColorBox">Glass appearance
        <select id="${p}color">${glassColorOptions()}</select>
      </label>
    </div>

    <div id="${p}lamBox" class="hidden">
      <div class="grid3 lamPlyGrid">
        <label>Ply 1 thickness
          <select id="${p}p1">${options([4,5,6,8,10,12,15,19])}</select>
        </label>
        <label>Ply 1 type
          <select id="${p}p1type">
            <option value="AN">AN</option>
            <option value="HS">HS</option>
            <option value="FT" selected>FT</option>
          </select>
        </label>
        <label>Ply 1 appearance
          <select id="${p}p1color">${glassColorOptions()}</select>
        </label>

        <label>Interlayer material
          <select id="${p}interlayerMaterial">
            <option value="PVB" selected>PVB</option>
            <option value="SGP">SGP</option>
          </select>
        </label>

        <label id="${p}layer1TypeBox">Interlayer Layer 1 type
          <select id="${p}layer1Type">
            <option value="Clear PVB" selected>Clear PVB</option>
            <option value="Color PVB">Color PVB</option>
            <option value="Acoustic PVB">Acoustic PVB</option>
            <option value="100% UV Transmittance PVB">100% UV Transmittance PVB</option>
            <option value="Frosted PVB">Frosted PVB</option>
          </select>
        </label>
        <label>Interlayer Layer 1 thickness
          <select id="${p}layer1Thickness">${interlayerThicknessOptions()}</select>
        </label>

        <label id="${p}layer2TypeBox">Interlayer Layer 2 type
          <select id="${p}layer2Type">
            <option value="Clear PVB" selected>Clear PVB</option>
            <option value="Color PVB">Color PVB</option>
            <option value="Acoustic PVB">Acoustic PVB</option>
            <option value="100% UV Transmittance PVB">100% UV Transmittance PVB</option>
            <option value="Frosted PVB">Frosted PVB</option>
          </select>
        </label>
        <label>Interlayer Layer 2 thickness
          <select id="${p}layer2Thickness"><option value="0">0.00</option>${interlayerThicknessOptions()}</select>
        </label>

        <div class="derived interlayerRule">
          PVB and SGP cannot be mixed. The selected material applies to both interlayer layers.
        </div>

        <label>Interlayer Shear Modulus G
          <select id="${p}gMode">
            <option value="default" selected>Use default wind-load value</option>
            <option value="custom">Custom G</option>
          </select>
        </label>
        <label id="${p}gCustomBox" class="hidden">Custom G (MPa)
          <input id="${p}gCustom" type="number" min="0.001" step="0.01" value="0.40">
        </label>
        <div id="${p}gInfo" class="derived" style="grid-column:1/-1"></div>

        <label>Ply 2 thickness
          <select id="${p}p2">${options([4,5,6,8,10,12,15,19])}</select>
        </label>
        <label>Ply 2 type
          <select id="${p}p2type">
            <option value="AN">AN</option>
            <option value="HS">HS</option>
            <option value="FT" selected>FT</option>
          </select>
        </label>
        <label>Ply 2 appearance
          <select id="${p}p2color">${glassColorOptions()}</select>
        </label>
      </div>
      <div class="derived">ASTM designation: <b id="${p}des">—</b></div>

      <label class="gtfClassBox">ASTM GTF Classification
        <select id="${p}gtfClass">
          <option value="review" selected>ASTM Mixed-Ply Review</option>
          <option value="weakest">Project conservative — weakest ply</option>
          <option value="AN">User selected — AN</option>
          <option value="HS">User selected — HS</option>
          <option value="FT">User selected — FT</option>
        </select>
      </label>
      <div id="${p}typeNote" class="typeNote"></div>
    </div>`;
}

function coatingEntries() {
  const count = Number($("coatingLayers")?.value || 0);
  if (count === 0) return [];
  const list = [];
  const c1 = ($("coating1Code")?.value || "").trim();
  const s1 = Number($("coating1Surface")?.value || 0);
  if (c1 && s1) list.push({code:c1, surface:s1});
  if (count === 2) {
    const c2 = ($("coating2Code")?.value || "").trim();
    const s2 = Number($("coating2Surface")?.value || 0);
    if (c2 && s2) list.push({code:c2, surface:s2});
  }
  return list;
}

function coatingTextForSurface(surfaceNo) {
  const hits = coatingEntries().filter(x => x.surface === surfaceNo);
  return hits.length ? ` (${hits.map(x=>x.code).join(" / ")})#${surfaceNo}` : "";
}


function glassSegments(prefix, startSurface) {
  const kind = $(`${prefix}kind`).value;
  const segs = [];
  if (kind === "mono") {
    const ann = coatingTextForSurface(startSurface) || coatingTextForSurface(startSurface+1);
    segs.push({
      text:`${$(`${prefix}th`).value} mm ${$(`${prefix}type`).value} · ${$(`${prefix}color`).value}${ann}`,
      nextSurface:startSurface+2
    });
    return segs;
  }

  const ann1 = coatingTextForSurface(startSurface) || coatingTextForSurface(startSurface+1);
  const ann2 = coatingTextForSurface(startSurface+2) || coatingTextForSurface(startSurface+3);
  const material=$(`${prefix}interlayerMaterial`).value;
  const layer1Name = material==="PVB" ? $(`${prefix}layer1Type`).value : "SGP";
  const layer2Name = material==="PVB" ? $(`${prefix}layer2Type`).value : "SGP";

  segs.push({text:`${$(`${prefix}p1`).value} mm ${$(`${prefix}p1type`).value} · ${$(`${prefix}p1color`).value}${ann1}`, nextSurface:startSurface+2});
  segs.push({text:`${$(`${prefix}layer1Thickness`).value} mm ${layer1Name}`, interlayer:true, nextSurface:startSurface+2});
  if (Number($(`${prefix}layer2Thickness`).value) > 0) {
    segs.push({text:`${$(`${prefix}layer2Thickness`).value} mm ${layer2Name}`, interlayer:true, nextSurface:startSurface+2});
  }
  segs.push({text:`${$(`${prefix}p2`).value} mm ${$(`${prefix}p2type`).value} · ${$(`${prefix}p2color`).value}${ann2}`, nextSurface:startSurface+4});
  return segs;
}

function overallStructureText() {
  let parts = [];
  let surface = 1;

  if ($("assembly").value === "single" || $("assembly").value === "laminatedOnly") {
    const segs = glassSegments("i", surface);
    parts.push(...segs.map(x=>x.text));
    return parts.join(" + ");
  }

  const outerSegs = glassSegments("o", surface);
  parts.push(...outerSegs.map(x=>x.text));
  surface = outerSegs[outerSegs.length-1].nextSurface;

  parts.push(`${$("airgap").value} mm Air Gap`);

  const innerSegs = glassSegments("i", surface);
  parts.push(...innerSegs.map(x=>x.text));

  return parts.join(" + ");
}

function updateStructurePreview() {
  const el=$("structurePreview");
  if (!el) return;
  el.innerHTML=`<span>Overall glass structure</span><b>${overallStructureText()}</b>`;
}

function coatingUI() {
  const count = Number($("coatingLayers").value);
  const none = count === 0;
  const two = count === 2;

  $("coating1CodeBox").classList.toggle("hidden", none);
  $("coating1SurfaceBox").classList.toggle("hidden", none);
  $("coating2CodeBox").classList.toggle("hidden", !two);
  $("coating2SurfaceBox").classList.toggle("hidden", !two);

  updateStructurePreview();
}

async function init() {
  initEmployeeLogin();
  $("outerFields").innerHTML = liteFields("o");
  $("innerFields").innerHTML = liteFields("i");

  for (const p of ["o","i"]) {
    $(`${p}th`).value = 6;
    $(`${p}p1`).value = 6;
    $(`${p}p2`).value = 6;
    $(`${p}layer1Thickness`).value = .76;
    $(`${p}layer2Thickness`).value = .76;
    $(`${p}type`).value = "FT";
    $(`${p}p1type`).value = "FT";
    $(`${p}p2type`).value = "FT";
    $(`${p}gtfClass`).value = "review";
    $(`${p}color`).value = "Clear";
    $(`${p}p1color`).value = "Clear";
    $(`${p}p2color`).value = "Clear";
    $(`${p}interlayerMaterial`).value = "PVB";
    $(`${p}gMode`).value = "default";
    $(`${p}gCustom`).value = "0.40";
    updateInterlayerTypeOptions(p);
    $(`${p}layer1Type`).value = "Clear PVB";
    $(`${p}layer2Type`).value = "Clear PVB";

    [`${p}kind`,`${p}type`,`${p}th`,`${p}color`,`${p}p1`,`${p}p1type`,`${p}p1color`,`${p}p2`,`${p}p2type`,`${p}p2color`,`${p}interlayerMaterial`,`${p}layer1Type`,`${p}layer1Thickness`,`${p}layer2Type`,`${p}layer2Thickness`,`${p}gMode`,`${p}gCustom`,`${p}gtfClass`]
      .forEach(id => $(id).addEventListener("change", () => {
        liteUI(p);
        updateStructurePreview();
        if (!$("results").classList.contains("hidden")) calculateAll();
      }));
    liteUI(p);
  }

  ["assembly","airgap","support","duration","deflectionCriterion","coatingLayers","coating1Surface","coating2Surface"].forEach(id => $(id).addEventListener("change", () => {
    if (id === "assembly") assemblyUI();
    if (id === "coatingLayers") coatingUI();
    if (id === "airgap" || id === "coating1Surface" || id === "coating2Surface") updateStructurePreview();
    if (id === "support") supportUI();
    if (id === "deflectionCriterion") deflectionCriterionUI();
    if (!$("results").classList.contains("hidden")) calculateAll();
  }));

  $("customDeflectionLimit").addEventListener("change", () => {
    if (!$("results").classList.contains("hidden")) calculateAll();
  });

  ["coating1Code","coating2Code"].forEach(id => $(id).addEventListener("input", updateStructurePreview));

  ["threeFreeEdge","supportedEdges","oneSupportedEdge","width","height"].forEach(id => $(id).addEventListener("change", () => {
    supportUI();
    if (!$("results").classList.contains("hidden")) calculateAll();
  }));

  $("calc").addEventListener("click", calculateAll);
  $("generateReport").addEventListener("click", () => ReportEngine.generate(latest));
  $("showOuter").addEventListener("click", () => selectLite("outer"));
  $("showInner").addEventListener("click", () => selectLite("inner"));
  $("evNFL").addEventListener("click", () => setEvidence("nfl"));
  $("evGTF").addEventListener("click", () => setEvidence("gtf"));
  $("evLSF").addEventListener("click", () => setEvidence("lsf"));
  $("evDEF").addEventListener("click", () => setEvidence("def"));

  $("example1").addEventListener("click", () => {
    $("assembly").value = "single";
    $("duration").value = "short";
    $("width").value = 1200;
    $("height").value = 1500;
    $("support").value = "4";
    $("ikind").value = "mono";
    $("itype").value = "AN";
    $("ith").value = 6;
    assemblyUI(); supportUI(); liteUI("i");
    calculateAll(); selectLite("inner");
  });

  $("example2").addEventListener("click", () => {
    $("assembly").value = "igu";
    $("duration").value = "short";
    $("width").value = 2000;
    $("height").value = 2800;
    $("support").value = "4";
    for (const p of ["o","i"]) {
      $(`${p}kind`).value = "mono";
      $(`${p}type`).value = "FT";
      $(`${p}p1type`).value = "FT";
      $(`${p}p2type`).value = "FT";
      $(`${p}th`).value = 6;
      liteUI(p);
    }
    assemblyUI(); supportUI();
    calculateAll(); selectLite("outer");
  });

  try {
    plotMeta = await fetch("plot-meta.json").then(r => r.json());
  } catch (e) {
    console.warn("plot-meta.json not loaded", e);
  }

  DPTWind.init();
  deflectionCriterionUI();
  coatingUI();
  updateStructurePreview();
  $("dptUsedPressure").addEventListener("change", () => {
    if (!$("results").classList.contains("hidden")) calculateAll();
  });
  $("dptUseSuggested").addEventListener("click", () => {
    setTimeout(() => {
      if (!$("results").classList.contains("hidden")) calculateAll();
    }, 0);
  });
  assemblyUI();
  supportUI();
}



function defaultShearModulus(material) {
  // Wind-load defaults at 50°C / 3 s.
  // PVB: ASTM E1300 Appendix X8 reference value.
  // SGP: Kuraray SentryGlas Xtra published value for 50°C / 3 s.
  return material === "SGP" ? 12.7 : 0.40;
}

function interlayerG(p) {
  const material = $(`${p}interlayerMaterial`).value;
  const mode = $(`${p}gMode`)?.value || "default";
  const defaultG = defaultShearModulus(material);

  if (mode === "custom") {
    const custom = Number($(`${p}gCustom`)?.value);
    if (Number.isFinite(custom) && custom > 0) {
      return {value:custom, source:"Custom manufacturer / engineer input", material};
    }
  }

  return {
    value:defaultG,
    source: material === "SGP"
      ? "Kuraray SentryGlas Xtra — 50°C / 3 s"
      : "ASTM E1300 Appendix X8 PVB reference — 50°C / 3 s",
    material
  };
}

function x9EffectiveThickness(p) {
  if ($(`${p}kind`).value !== "lam") return null;

  const h1Nom = Number($(`${p}p1`).value);
  const h2Nom = Number($(`${p}p2`).value);
  const h1 = ASTM.min[h1Nom] || h1Nom;
  const h2 = ASTM.min[h2Nom] || h2Nom;
  const hv = Number($(`${p}layer1Thickness`).value) + Number($(`${p}layer2Thickness`).value);
  const a = Math.min(Number($("width").value), Number($("height").value));
  const E = 71700; // MPa
  const g = interlayerG(p);
  const G = g.value;

  if (![h1,h2,hv,a,G].every(v => Number.isFinite(v) && v > 0)) return null;

  // ASTM E1300 Appendix X9, Eq. X9.1–X9.8.
  const hs = 0.5 * (h1 + h2) + hv;
  const hs1 = hs * h1 / (h1 + h2);
  const hs2 = hs * h2 / (h1 + h2);
  const Is = h1 * hs2 * hs2 + h2 * hs1 * hs1;
  const gamma = 1 / (1 + 9.6 * E * Is * hv / (G * hs * hs * a * a));
  const hefW = Math.cbrt(h1**3 + h2**3 + 12 * gamma * Is);
  const h1efSigma = Math.sqrt((hefW**3) / (h1 + 2 * gamma * hs2));
  const h2efSigma = Math.sqrt((hefW**3) / (h2 + 2 * gamma * hs1));

  return {
    h1Nom,h2Nom,h1,h2,hv,a,E,G,
    gSource:g.source,
    gamma,hs,hs1,hs2,Is,hefW,h1efSigma,h2efSigma
  };
}

function conservativeAllowableSurfaceStress(type) {
  // ASTM E1300 Appendix X6 conservative 3 s values (MPa).
  return {AN:23.3, HS:46.6, FT:93.1}[type] ?? null;
}

function updateInterlayerTypeOptions(p) {
  const material=$(`${p}interlayerMaterial`).value;
  const types = material === "PVB"
    ? ["Clear PVB","Color PVB","Acoustic PVB","100% UV Transmittance PVB","Frosted PVB"]
    : ["SGP"];
  for (const id of [`${p}layer1Type`,`${p}layer2Type`]) {
    const el=$(id);
    const previous=el.value;
    el.innerHTML=types.map(v=>`<option value="${v}">${v}</option>`).join("");
    el.value=types.includes(previous)?previous:types[0];
  }
}


function lamDesignationDetail(p) {
  const p1 = Number($(`${p}p1`).value);
  const p2 = Number($(`${p}p2`).value);
  const layer1 = Number($(`${p}layer1Thickness`).value);
  const layer2 = Number($(`${p}layer2Thickness`).value);
  const interlayerNominal = layer1 + layer2;
  const t1 = ASTM.min[p1] || p1;
  const t2 = ASTM.min[p2] || p2;
  const interlayer = Math.min(interlayerNominal, 1.52);
  const total = t1 + interlayer + t2;
  return {p1,p2,layer1,layer2,interlayerNominal,t1,t2,interlayer,total};
}

function liteUI(p) {
  const lam = $(`${p}kind`).value === "lam";
  $(`${p}monoBox`).classList.toggle("hidden", lam);
  $(`${p}monoTypeBox`).classList.toggle("hidden", lam);
  $(`${p}monoColorBox`).classList.toggle("hidden", lam);
  $(`${p}lamBox`).classList.toggle("hidden", !lam);

  if (lam) {
    updateInterlayerTypeOptions(p);

    const gMode = $(`${p}gMode`).value;
    $(`${p}gCustomBox`).classList.toggle("hidden", gMode !== "custom");
    if (gMode === "default") {
      $(`${p}gCustom`).value = defaultShearModulus($(`${p}interlayerMaterial`).value).toFixed(2);
    }
    const gNow = interlayerG(p);
    $(`${p}gInfo`).innerHTML =
      `<b>G = ${gNow.value.toFixed(2)} MPa</b> · ${gNow.source}` +
      `<br>ASTM X9 wind-load basis: 50°C / 3 s.`;

    const info = lamDesignationDetail(p);
    const d = NFLEngine.lamDesignation($(`${p}p1`).value,info.interlayerNominal,$(`${p}p2`).value);
    $(`${p}des`).textContent = d ? `${d} mm` : "Not covered";

    const calcId = `${p}desCalc`;
    let calc = $(calcId);
    if (!calc) {
      calc = document.createElement("div");
      calc.id = calcId;
      calc.className = "designationCalc";
      $(`${p}des`).parentElement.appendChild(calc);
    }
    calc.innerHTML =
      `<span>ASTM minimum-thickness calculation:</span><br>` +
      `${info.p1} mm nominal → <b>${info.t1.toFixed(2)} mm min</b>` +
      ` &nbsp;+&nbsp; Interlayer nominal <b>${info.interlayerNominal.toFixed(2)} mm</b>` +
      ` (ASTM designation uses max <b>${info.interlayer.toFixed(2)} mm</b>)` +
      ` &nbsp;+&nbsp; ${info.p2} mm nominal → <b>${info.t2.toFixed(2)} mm min</b>` +
      `<br>Total used for designation = <b>${info.total.toFixed(2)} mm</b>`;

    const t1 = $(`${p}p1type`).value;
    const t2 = $(`${p}p2type`).value;
    const cls = $(`${p}gtfClass`).value;
    const note = $(`${p}typeNote`);

    const rank = {AN:0, HS:1, FT:2};
    const weakest = rank[t1] <= rank[t2] ? t1 : t2;

    if (t1 === t2) {
      note.innerHTML =
        `ASTM GTF classification: <b>${t1}</b> because both laminated plies have the same heat treatment.`;
      note.classList.remove("warnType");
    } else if (cls === "weakest") {
      note.innerHTML =
        `<b>Project conservative mixed-ply rule: ${weakest}</b>. ` +
        `Actual laminated plies are ${t1} + interlayer + ${t2}. ` +
        `The software uses the weakest ply category for ASTM Table 1 GTF. ` +
        `<b>This is a project conservative rule, not an explicit ASTM E1300 mixed-ply Basic Procedure rule.</b>`;
      note.classList.add("warnType");
    } else if (["AN","HS","FT"].includes(cls)) {
      note.innerHTML =
        `<b>User-selected GTF classification: ${cls}</b>. ` +
        `Actual laminated plies are ${t1} + interlayer + ${t2}. ` +
        `This is a user override for ASTM Table 1 lookup and should be justified by the design professional.`;
      note.classList.add("warnType");
    } else {
      note.innerHTML =
        `<b>ASTM REVIEW — mixed laminated ply heat treatments (${t1} + interlayer + ${t2}).</b> ` +
        `ASTM E1300 Table 1 provides AN / HS / FT categories for a laminated lite but does not explicitly assign a Basic Procedure GTF category for mixed-ply heat treatments. ` +
        `Select “Project conservative — weakest ply” only if you want to apply the office conservative rule.`;
      note.classList.add("warnType");
    }

    const material = $(`${p}interlayerMaterial`).value;
    note.innerHTML +=
      `<br><b>Interlayer Layer 1:</b> ${$(`${p}layer1Type`).value} · ${$(`${p}layer1Thickness`).value} mm`;
    if (Number($(`${p}layer2Thickness`).value) > 0) {
      note.innerHTML += `<br><b>Interlayer Layer 2:</b> ${$(`${p}layer2Type`).value} · ${$(`${p}layer2Thickness`).value} mm`;
    }
    note.innerHTML += `<br><b>Material rule:</b> ${material} only — PVB/SGP mixing is prohibited.`;
    if (material === "SGP") {
      note.innerHTML += `<br><span>Use ASTM laminated calculation only where SGP is accepted as demonstrated equivalent for the project.</span>`;
    }
    const x9 = x9EffectiveThickness(p);
    if (x9) {
      note.innerHTML +=
        `<br><b>ASTM X9:</b> Γ = ${x9.gamma.toFixed(3)}` +
        ` · h<sub>ef,w</sub> = ${x9.hefW.toFixed(2)} mm` +
        ` · h<sub>1,ef,σ</sub> = ${x9.h1efSigma.toFixed(2)} mm` +
        ` · h<sub>2,ef,σ</sub> = ${x9.h2efSigma.toFixed(2)} mm`;
    }
    note.innerHTML +=
      `<br><b>Surface stress:</b> ASTM A2 analytical calculation is available after Calculate for four-side single laminated glass under 3-second wind load.`;
  }
}

function supportUI() {
  const s = $("support").value;
  $("threeEdgeBox").classList.toggle("hidden", s !== "3");
  $("edgeBox").classList.toggle("hidden", s !== "2");
  $("oneEdgeBox").classList.toggle("hidden", s !== "1");

  const info = $("twoSideSpanInfo");
  if (info && s === "2") {
    const supported = $("supportedEdges").value;
    const span = NFLEngine.twoSideUnsupportedSpan(
      supported,
      Number($("width").value),
      Number($("height").value)
    );
    const label = supported === "tb"
      ? "Top / Bottom supported → effective unsupported span = Height"
      : "Left / Right supported → effective unsupported span = Width";
    info.innerHTML = `<b>${label}: ${Math.round(span)} mm</b>`;
  }
}


function assemblyUI() {
  const mode = $("assembly").value;
  const singleLike = mode === "single" || mode === "laminatedOnly";
  $("airgapBox").classList.toggle("hidden", singleLike);
  $("outerCard").classList.toggle("hidden", singleLike);
  $("showOuter").classList.toggle("hidden", singleLike);
  $("evLSF").disabled = singleLike;
  $("evDEF").disabled = false;

  if (mode === "laminatedOnly") {
    $("ikind").value = "lam";
    $("ikind").disabled = true;
    liteUI("i");
    selected = "inner";
  } else {
    $("ikind").disabled = false;
    if (singleLike) selected = "inner";
  }
  updateStructurePreview();
}

function liteInput(p) {
  const kind = $(`${p}kind`).value;
  const interlayerTotal = kind === "lam"
    ? Number($(`${p}layer1Thickness`).value) + Number($(`${p}layer2Thickness`).value)
    : 0;
  const designation = kind === "mono"
    ? Number($(`${p}th`).value)
    : NFLEngine.lamDesignation($(`${p}p1`).value,interlayerTotal,$(`${p}p2`).value);

  const p1type = $(`${p}p1type`).value;
  const p2type = $(`${p}p2type`).value;
  const monoType = $(`${p}type`).value;
  const gtfClass = kind === "lam" ? $(`${p}gtfClass`).value : monoType;

  let effectiveType = monoType;
  let gtfClassSource = "monolithic";
  let gtfReviewRequired = false;

  if (kind === "lam") {
    const rank = {AN:0, HS:1, FT:2};
    const weakest = rank[p1type] <= rank[p2type] ? p1type : p2type;

    if (p1type === p2type) {
      // Same ply treatment: ASTM Table 1 category is unambiguous.
      effectiveType = p1type;
      gtfClassSource = "same-ply-auto";
    } else if (gtfClass === "weakest") {
      // Project conservative rule explicitly selected by user.
      effectiveType = weakest;
      gtfClassSource = "project-weakest";
    } else if (["AN","HS","FT"].includes(gtfClass)) {
      // Explicit user override.
      effectiveType = gtfClass;
      gtfClassSource = "user";
    } else {
      // ASTM E1300 Table 1 does not explicitly assign a GTF category
      // to a laminated lite with mixed heat-treatment plies.
      effectiveType = null;
      gtfClassSource = "astm-mixed-review";
      gtfReviewRequired = true;
    }
  }

  const gData = kind === "lam" ? interlayerG(p) : null;
  const x9 = kind === "lam" ? x9EffectiveThickness(p) : null;

  return {
    kind,
    designation,
    type:effectiveType,
    monoType,
    p1type,
    p2type,
    gtfClass,
    gtfClassSource,
    gtfReviewRequired,
    mixedPlyTypes:kind === "lam" && p1type !== p2type,
    thickness:Number($(`${p}th`).value),
    color:$(`${p}color`).value,
    p1:Number($(`${p}p1`).value),
    p1color:$(`${p}p1color`).value,
    p2:Number($(`${p}p2`).value),
    p2color:$(`${p}p2color`).value,
    interlayerMaterial:$(`${p}interlayerMaterial`).value,
    layer1Type:$(`${p}layer1Type`).value,
    layer1Thickness:Number($(`${p}layer1Thickness`).value),
    layer2Type:$(`${p}layer2Type`).value,
    layer2Thickness:Number($(`${p}layer2Thickness`).value),
    interlayerTotal,
    shearModulusG:gData?.value ?? null,
    shearModulusSource:gData?.source ?? null,
    x9
  };
}

function calculateOne(p, name) {
  const x = liteInput(p);
  let r;
  if (x.kind === "mono" && x.designation === 15) {
    r = {
      ok:false,
      chartUnsupported:true,
      figure:null,
      geom:NFLEngine.geom ? NFLEngine.geom(Number($("width").value),Number($("height").value)) : {long:Math.max(Number($("width").value),Number($("height").value)),short:Math.min(Number($("width").value),Number($("height").value)),ar:Math.max(Number($("width").value),Number($("height").value))/Math.min(Number($("width").value),Number($("height").value))},
      designation:15,
      kind:"mono",
      error:"15 mm is selectable as a project glass thickness, but ASTM E1300-16 Annex A1 / Table 4 does not provide a 15 mm nominal monolithic designation. Automatic ASTM NFL is REVIEW."
    };
  } else {
    r = NFLEngine.calculate({
    kind:x.kind,
    support:$("support").value,
    designation:x.designation,
    width:Number($("width").value),
    height:Number($("height").value),
    supportedEdges:$("supportedEdges").value,
    oneSupportedEdge:$("oneSupportedEdge").value
    });
  }

  r.name = name;
  r.input = x;
  r.type = x.type;
  r.desc = x.kind === "mono"
    ? `${x.designation} mm ${x.monoType} · ${x.color}`
    : `${x.p1} mm ${x.p1type} · ${x.p1color} + ${x.layer1Thickness} mm ${x.layer1Type}` +
      `${x.layer2Thickness > 0 ? ` + ${x.layer2Thickness} mm ${x.layer2Type}` : ""}` +
      ` + ${x.p2} mm ${x.p2type} · ${x.p2color} · ASTM designation ${x.designation} mm`;
  return r;
}

function addFactors() {
  const duration = $("duration").value;
  const single = $("assembly").value === "single" || $("assembly").value === "laminatedOnly";

  if (single) {
    if (latest.inner.type && !latest.inner.input.gtfReviewRequired) {
      latest.inner.gtf = ASTMFactors.gtfSingle(latest.inner.type,duration);
      latest.inner.gtfTable = 1;
      latest.inner.gtfReview = false;
    } else {
      latest.inner.gtf = null;
      latest.inner.gtfTable = 1;
      latest.inner.gtfReview = true;
    }
    latest.inner.lsf = null;
    return;
  }

  const canAutoGTF =
    !!latest.outer.type && !!latest.inner.type &&
    !latest.outer.input.gtfReviewRequired &&
    !latest.inner.input.gtfReviewRequired;
  if (canAutoGTF) {
    const g = ASTMFactors.gtfIGU(latest.outer.type,latest.inner.type,duration);
    latest.outer.gtf = g.gtf1;
    latest.inner.gtf = g.gtf2;
    latest.outer.gtfTable = latest.inner.gtfTable = g.table;
    latest.outer.gtfReview = latest.inner.gtfReview = false;
  } else {
    latest.outer.gtf = latest.inner.gtf = null;
    latest.outer.gtfTable = latest.inner.gtfTable = (duration === "long" ? 3 : 2);
    latest.outer.gtfReview = latest.inner.gtfReview = true;
  }

  const ls = ASTMFactors.lsfIGU(latest.outer.input,latest.inner.input,duration);
  latest.outer.lsf = ls.lsf1;
  latest.inner.lsf = ls.lsf2;
  latest.outer.lsfInfo = latest.inner.lsfInfo = ls;
}

function resultKPI(r) {
  if (r.ok) return r.nfl.toFixed(2) + " kPa";
  if (r.outsideRange) return r.direction==="below" ? `< ${r.qmin.toFixed(2)} kPa` : `> ${r.qmax.toFixed(2)} kPa`;
  if (r.chartUnsupported) return "NOT COVERED";
  if (r.outsideDimension) return "OUTSIDE RANGE";
  return "MANUAL";
}


function deflectionCriterionUI() {
  $("customDeflectionBox").classList.toggle(
    "hidden",
    $("deflectionCriterion").value !== "custom"
  );
}

function getDeflectionLimit(r) {
  const criterion = $("deflectionCriterion").value;
  const L = Number(r.geom.short);

  if (criterion === "review") {
    return {mode:"review", label:"ASTM E1300 — Review only", limit:null};
  }
  if (criterion === "thai90") {
    const ratioLimit = L / 90;
    const limit = Math.min(ratioLimit, 20);
    return {
      mode:"limit",
      label:"Thailand Typical — L/90 & max 20 mm",
      limit,
      detail:`min(${L.toFixed(0)}/90 = ${ratioLimit.toFixed(1)} mm, 20 mm)`
    };
  }
  if (criterion === "l60") {
    return {mode:"limit", label:"L/60", limit:L/60, detail:`${L.toFixed(0)}/60`};
  }
  if (criterion === "l100") {
    return {mode:"limit", label:"L/100", limit:L/100, detail:`${L.toFixed(0)}/100`};
  }
  const custom = Number($("customDeflectionLimit").value);
  return {mode:"limit", label:`Custom ${custom.toFixed(1)} mm`, limit:custom, detail:"User-defined limit"};
}

function evaluateLite(r, usedDesignLoad) {
  // Strength: ASTM basic LR compared with specified design load.
  // If a two-side NFL value is extrapolated beyond the printed ASTM chart,
  // show the numerical estimate but never issue an automatic PASS/FAIL.
  if (r.extrapolated) {
    r.strengthStatus = "REVIEW";
    r.strengthReason = `Two-side NFL estimate = ${r.nfl.toFixed(2)} kPa is outside the printed ASTM Fig. A1.${r.figure} range; LR is shown for reference only.`;
  } else if (r.lr == null || !Number.isFinite(r.lr)) {
    r.strengthStatus = "REVIEW";
    r.strengthReason = "Load Resistance is not available for automatic judgement.";
  } else if (r.lr >= usedDesignLoad) {
    r.strengthStatus = "PASS";
    r.strengthReason = `${r.lr.toFixed(2)} kPa ≥ ${usedDesignLoad.toFixed(2)} kPa`;
  } else {
    r.strengthStatus = "FAIL";
    r.strengthReason = `${r.lr.toFixed(2)} kPa < ${usedDesignLoad.toFixed(2)} kPa`;
  }

  const lim = getDeflectionLimit(r);
  r.deflectionLimit = lim;

  if (lim.mode === "review") {
    r.deflectionStatus = "REVIEW";
    r.deflectionReason = "No numerical allowable-deflection limit selected.";
  } else if (!r.deflection?.ok || !Number.isFinite(r.deflection.w)) {
    r.deflectionStatus = "REVIEW";
    r.deflectionReason = "Automatic numerical deflection is not available for this configuration.";
  } else if (r.deflection.w <= lim.limit) {
    r.deflectionStatus = "PASS";
    r.deflectionReason = `${r.deflection.w.toFixed(1)} mm ≤ ${lim.limit.toFixed(1)} mm`;
  } else {
    r.deflectionStatus = "FAIL";
    r.deflectionReason = `${r.deflection.w.toFixed(1)} mm > ${lim.limit.toFixed(1)} mm`;
  }

  // ASTM analytical surface-stress status (laminated four-side single glazing).
  const sa = r.stressAnalysis;
  if (sa?.applicable) {
    if (!sa.ok) {
      r.stressStatus = "REVIEW";
      r.stressReason = "Surface-stress calculation could not be completed.";
    } else if (sa.engineering && !sa.strictASTM) {
      r.stressStatus = "REVIEW";
      r.stressReason =
        `Engineering numerical stress — Exterior ${sa.exterior.maxSurfaceStress.toFixed(2)} MPa · ` +
        `Interior ${sa.interior.maxSurfaceStress.toFixed(2)} MPa. Outside ASTM E1300 6.3.2 four-side analytical scope.`;
    } else if (sa.pass) {
      r.stressStatus = "PASS";
      r.stressReason = `Exterior Pb=${sa.exterior.Pb.toExponential(2)}, Interior Pb=${sa.interior.Pb.toExponential(2)} ≤ 0.008`;
    } else {
      r.stressStatus = "FAIL";
      const bad = [];
      if (!sa.exterior.pass) bad.push(`Exterior Pb=${sa.exterior.Pb.toExponential(2)}`);
      if (!sa.interior.pass) bad.push(`Interior Pb=${sa.interior.Pb.toExponential(2)}`);
      r.stressReason = bad.join(" · ") + " > 0.008";
    }
  } else if (r.input.kind === "lam") {
    r.stressStatus = "REVIEW";
    r.stressReason = sa?.reason || "ASTM analytical surface-stress calculation is not applicable to this configuration.";
  } else {
    r.stressStatus = null;
    r.stressReason = null;
  }

  if (r.strengthStatus === "FAIL" || r.deflectionStatus === "FAIL" || r.stressStatus === "FAIL") {
    r.finalStatus = "FAIL";
  } else if (r.strengthStatus === "REVIEW" || r.deflectionStatus === "REVIEW" ||
             (r.stressStatus === "REVIEW" && sa?.applicable)) {
    r.finalStatus = "REVIEW";
  } else {
    r.finalStatus = "PASS";
  }
}

function statusBadge(status) {
  return `<span class="statusBadge ${status.toLowerCase()}">${status}</span>`;
}

function renderFinalResult(arr, usedDesignLoad) {
  const hasFail = arr.some(r => r.finalStatus === "FAIL");
  const hasReview = arr.some(r => r.finalStatus === "REVIEW");
  const finalStatus = hasFail ? "FAIL" : hasReview ? "REVIEW" : "PASS";

  const strengthFail = arr.find(r => r.strengthStatus === "FAIL");
  const deflFail = arr.find(r => r.deflectionStatus === "FAIL");
  const strengthReview = arr.find(r => r.strengthStatus === "REVIEW");
  const deflReview = arr.find(r => r.deflectionStatus === "REVIEW");

  let reason = "";
  if (strengthFail) reason = `${strengthFail.name} Lite strength is insufficient.`;
  else if (deflFail) reason = `${deflFail.name} Lite deflection exceeds the selected limit.`;
  else if (strengthReview) reason = `${strengthReview.name} Lite strength requires review.`;
  else if (deflReview) reason = `${deflReview.name} Lite deflection requires review.`;
  else reason = "All automatic strength and deflection checks pass.";

  $("finalResult").innerHTML = `
    <div class="finalResult ${finalStatus.toLowerCase()}">
      <div class="finalTop">
        <div>
          <span class="finalLabel">FINAL RESULT</span>
          <strong>${finalStatus}</strong>
        </div>
        <div class="finalPressure">
          <span>Design Wind Pressure Used</span>
          <b>${usedDesignLoad.toFixed(2)} kPa</b>
        </div>
      </div>
      <div class="finalReason">${reason}</div>
      <div class="finalChecks">
        ${arr.map(r => `
          <div class="finalLite">
            <b>${r.name} Lite</b>
            <div><span>Strength</span>${statusBadge(r.strengthStatus)}<small>${r.strengthReason}</small></div>
            <div><span>Deflection</span>${statusBadge(r.deflectionStatus)}<small>${r.deflectionReason}</small></div>
            ${r.input.kind==="lam" ? `<div><span>Surface Stress</span>${statusBadge(r.stressStatus||"REVIEW")}<small>${r.stressReason||"—"}</small></div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>`;
}

function calculateAll() {
  latest.inner = calculateOne("i","Inner");
  latest.outer = ($("assembly").value === "single" || $("assembly").value === "laminatedOnly") ? null : calculateOne("o","Outer");
  addFactors();

  // Load resistance and deflection
  const usedDesignLoad = DPTWind.getUsedPressure();
  [latest.outer,latest.inner].filter(Boolean).forEach(r => {
    if (r.ok && r.gtf != null) {
      r.lr = (r.lsf == null)
        ? r.nfl * r.gtf
        : r.nfl * r.gtf / r.lsf;
    } else {
      r.lr = null;
    }

    r.deflection = ASTMDeflection.calcLite(
      r,
      usedDesignLoad,
      r.lsf,
      $("assembly").value
    );

    r.stressAnalysis = ASTMStress.analyzeLaminated(
      r,
      usedDesignLoad,
      $("assembly").value,
      $("support").value,
      $("duration").value
    );

    evaluateLite(r, usedDesignLoad);
  });

  const arr = [latest.outer,latest.inner].filter(Boolean);
  renderFinalResult(arr, usedDesignLoad);
  const iguInvalid = $("assembly").value === "igu" && $("support").value !== "4";

  $("resultCards").innerHTML = arr.map(r => `
    <div class="resultCard" data-name="${r.name.toLowerCase()}">
      <b>${r.name} Lite</b>
      <div class="metrics metrics4">
        <div><span>NFL</span><strong>${resultKPI(r)}</strong></div>
        <div><span>GTF</span><strong>${r.gtfReview ? "REVIEW" : Number(r.gtf).toFixed(2)}</strong></div>
        <div><span>LSF</span><strong>${r.lsf == null ? "N/A" : r.lsf.toFixed(3)}</strong></div>
        <div><span>Deflection</span><strong>${r.deflection?.ok ? `${r.deflection.w.toFixed(1)} mm` : "REVIEW"}</strong></div>
      </div>
      <div class="row"><span>Glass</span><b>${r.desc}</b></div>
      ${r.input.kind === "lam" ? `<div class="row"><span>ASTM GTF classification</span><b>${
        `${r.type} (${
          r.input.gtfClassSource === "user" ? "user selected" :
          r.input.gtfClassSource === "project-weakest" ? "project conservative · weakest ply" :
          r.input.gtfClassSource === "astm-mixed-review" ? "ASTM REVIEW · mixed plies" :
          "automatic"
        })`
      }</b></div>` : ""}
      <div class="row"><span>NFL source</span><b>Fig. A1.${r.figure}${r.digitized ? " · digitized contour interpolation" : ""}</b></div>
      ${r.qBracket ? `<div class="row"><span>NFL interpolation</span><b>Between ${fmt(r.qBracket[0],2)} and ${fmt(r.qBracket[1],2)} kPa contours · AR ${fmt(r.ar,2)}</b></div>` : ""}
      <div class="row"><span>GTF source</span><b>${
        r.gtfReview
          ? `ASTM Table ${r.gtfTable} — REVIEW: mixed laminated ply type not explicitly assigned`
          : r.input.gtfClassSource === "project-weakest"
            ? `ASTM Table ${r.gtfTable} + project conservative weakest-ply rule`
            : r.input.gtfClassSource === "user"
              ? `ASTM Table ${r.gtfTable} + user-selected classification`
              : `ASTM Table ${r.gtfTable}`
      }</b></div>
      <div class="row"><span>LSF source</span><b>${r.lsf == null ? "Single lite — N/A" : r.lsfInfo.source}</b></div>
      <div class="row"><span>Design pressure used</span><b>${usedDesignLoad?.toFixed(2) ?? "—"} kPa</b></div>
      <div class="row"><span>Applied load to lite</span><b>${r.deflection?.appliedLoad?.toFixed(3) ?? "—"} kPa</b></div>
      <div class="row"><span>LR</span><b>${r.lr == null ? "—" : r.lr.toFixed(2) + " kPa"} ${statusBadge(r.strengthStatus)}</b></div>
      <div class="row"><span>Strength check</span><b>${r.strengthReason}</b></div>
      <div class="row"><span>Deflection limit</span><b>${r.deflectionLimit.limit == null ? r.deflectionLimit.label : `${r.deflectionLimit.limit.toFixed(1)} mm · ${r.deflectionLimit.label}`}</b></div>
      <div class="row"><span>Deflection check</span><b>${statusBadge(r.deflectionStatus)} ${r.deflectionReason}</b></div>
      <div class="row"><span>Deflection source</span><b>${r.deflection?.method ?? "—"}</b></div>
      ${r.deflection?.engineeringFallback ? `<div class="row"><span>Deflection source status</span><b>Engineering fallback — outside digitized ASTM lower-chart range</b></div>` : ""}
      ${r.input.kind === "lam" ? `
        <div class="row"><span>Interlayer shear modulus G</span><b>${fmt(r.input.shearModulusG,2)} MPa</b></div>
        <div class="row"><span>G source</span><b>${r.input.shearModulusSource || "—"}</b></div>
        <div class="row"><span>ASTM X9 shear transfer Γ</span><b>${r.input.x9 ? fmt(r.input.x9.gamma,3) : "—"}</b></div>
        <div class="row"><span>X9 effective thickness — deflection h<sub>ef,w</sub></span><b>${r.input.x9 ? fmt(r.input.x9.hefW,2)+" mm" : "—"}</b></div>
        <div class="row"><span>Exterior Ply h<sub>1,ef,σ</sub></span><b>${r.input.x9 ? fmt(r.input.x9.h1efSigma,2)+" mm" : "—"}</b></div>
        <div class="row"><span>Interior Ply h<sub>2,ef,σ</sub></span><b>${r.input.x9 ? fmt(r.input.x9.h2efSigma,2)+" mm" : "—"}</b></div>
        <div class="row"><span>Exterior Ply allowable surface stress (X6, 3 s)</span><b>${fmt(conservativeAllowableSurfaceStress(r.input.p1type),1)} MPa</b></div>
        <div class="row"><span>Interior Ply allowable surface stress (X6, 3 s)</span><b>${fmt(conservativeAllowableSurfaceStress(r.input.p2type),1)} MPa</b></div>
        ${r.stressAnalysis?.applicable && r.stressAnalysis?.ok ? (
          r.stressAnalysis.engineering ? `
            <div class="row"><span>Exterior Ply engineering surface stress</span><b>${fmt(r.stressAnalysis.exterior.maxSurfaceStress,2)} MPa</b></div>
            <div class="row"><span>Interior Ply engineering surface stress</span><b>${fmt(r.stressAnalysis.interior.maxSurfaceStress,2)} MPa</b></div>
            <div class="row"><span>Stress method</span><b>Two-side one-way simply-supported strip + ASTM X9 effective stress thickness</b></div>
            <div class="row"><span>ASTM analytical status</span><b>REVIEW — numerical engineering result, outside E1300 6.3.2 four-side scope</b></div>`
          : `
            <div class="row"><span>Exterior Ply max surface tensile stress</span><b>${fmt(r.stressAnalysis.exterior.maxSurfaceStress,2)} MPa</b></div>
            <div class="row"><span>Exterior Ply Pb</span><b>${r.stressAnalysis.exterior.Pb.toExponential(3)} · ${r.stressAnalysis.exterior.pass ? "PASS" : "FAIL"}</b></div>
            <div class="row"><span>Interior Ply max surface tensile stress</span><b>${fmt(r.stressAnalysis.interior.maxSurfaceStress,2)} MPa</b></div>
            <div class="row"><span>Interior Ply Pb</span><b>${r.stressAnalysis.interior.Pb.toExponential(3)} · ${r.stressAnalysis.interior.pass ? "PASS" : "FAIL"}</b></div>
            <div class="row"><span>ASTM analytical surface stress</span><b>${r.stressStatus}</b></div>
            <div class="row"><span>A2.1 verification</span><b>NFL-chart calibrated to Pb = 0.008</b></div>`
        ) : `<div class="row"><span>ASTM analytical surface stress</span><b>REVIEW — ${r.stressAnalysis?.reason || "not available"}</b></div>`}` : ""}
      <div class="row"><span>Long × Short</span><b>${Math.round(r.geom.long)} × ${Math.round(r.geom.short)} mm</b></div>
      <div class="row"><span>AR</span><b>${r.geom.ar.toFixed(2)}</b></div>
      ${r.threeSide && r.deflection?.threeGeom ? `<div class="row"><span>Free edge / AR</span><b>${Math.round(r.deflection.threeGeom.freeEdge)} mm / ${r.deflection.threeGeom.ar.toFixed(2)}</b></div>` : ""}
      ${r.twoSide ? `<div class="row"><span>Effective unsupported span</span><b>${Math.round(r.unsupported)} mm · ${r.supportedEdges==="tb" ? "Height" : "Width"}</b></div>` : ""}
      ${r.oneEdge ? `<div class="row"><span>Unsupported edge</span><b>${Math.round(r.unsupported)} mm</b></div>` : ""}
      ${r.extrapolated ? `<div class="warn"><b>ASTM CHART EXTRAPOLATION — REVIEW:</b> Numerical NFL/LR is shown from the digitized A1.${r.figure} chart-line relation, but the point is outside the printed chart pressure range. Do not treat this as an automatic ASTM PASS.</div>` : ""}
      ${r.oneEdge ? `<div class="row"><span>Supported edge</span><b>${({left:"Left",right:"Right",top:"Top",bottom:"Bottom"})[r.oneSupportedEdge]}</b></div>` : ""}
      ${iguInvalid ? `<div class="warn">ASTM IGU basic procedure: four-side continuous support required. NFL shown per individual lite chart; IGU use is outside the basic procedure.</div>` : ""}
    </div>`).join("");

  $("results").classList.remove("hidden");
  $("viewer").classList.remove("hidden");
  if ($("assembly").value === "single" || $("assembly").value === "laminatedOnly") selected = "inner";
  showEvidence();
}

function selectLite(v) {
  selected = v;
  showEvidence();
}

function setEvidence(mode) {
  if (mode === "lsf" && ($("assembly").value === "single" || $("assembly").value === "laminatedOnly")) return;
  evidenceMode = mode;
  ["NFL","GTF","LSF","DEF"].forEach(x => {
    const key = x === "DEF" ? "def" : x.toLowerCase();
    $(`ev${x}`).classList.toggle("evidenceActive", mode === key);
  });
  showEvidence();
}

function showEvidence() {
  const r = latest[selected];
  if (!r) return;

  document.querySelectorAll(".resultCard").forEach(x =>
    x.classList.toggle("active",x.dataset.name === selected));

  if (evidenceMode === "nfl") showNFL(r);
  else if (evidenceMode === "gtf") showGTF(r);
  else if (evidenceMode === "lsf") showLSF(r);
  else showDeflection(r);
}

function showNFL(r) {
  $("nflEvidence").classList.remove("hidden");
  $("tableEvidence").classList.add("hidden");
  $("chartSubtitle").textContent = `${r.name} · ${r.desc} · ASTM Fig. A1.${r.figure}`;

  const img = $("chartImg");
  img.onload = () => drawOverlay(r,img);
  img.src = `A1_${String(r.figure).padStart(2,"0")}.png`;

  if (r.chartUnsupported) {
    $("chartNote").innerHTML = `<b>NOT COVERED BY ASTM FIG. A1.${r.figure}</b>. ${r.designation} mm does not have a line on this chart.`;
  } else if (r.outsideDimension) {
    $("chartNote").innerHTML = `<b>OUTSIDE ASTM FIG. A1.${r.figure} DIMENSION RANGE</b>. Unsupported-edge length = ${Math.round(r.unsupported)} mm.`;
  } else if (r.outsideRange) {
    const limitText = r.direction === "below" ? `below ${r.qmin.toFixed(2)} kPa` : `above ${r.qmax.toFixed(2)} kPa`;
    const estimate = Number.isFinite(r.nfl) ? ` Estimated NFL = <b>${r.nfl.toFixed(2)} kPa</b>.` : "";
    $("chartNote").innerHTML = `<b>OUTSIDE PRINTED ASTM CHART RANGE</b> (${limitText}).${estimate} Chart-line extrapolation is provided for engineering review only; automatic ASTM PASS is disabled.`;
  } else if (!r.ok) {
    $("chartNote").innerHTML = `<b>${r.error}</b> Original ASTM figure shown for manual review.`;
  } else {
    $("chartNote").innerHTML = `<b>NFL = ${r.nfl.toFixed(2)} kPa</b>${r.digitized ? " · digitized directly from the ASTM figure by constant-aspect-ratio contour interpolation." : ""} Green = selected/interpolated contour; blue = geometry guide; red = selected result point.`;
  }
}

function showGTF(r) {
  $("nflEvidence").classList.add("hidden");
  $("tableEvidence").classList.remove("hidden");
  const duration = $("duration").value;
  const single = $("assembly").value === "single" || $("assembly").value === "laminatedOnly";
  $("chartSubtitle").textContent = `${r.name} · GTF evidence · ASTM Table ${r.gtfTable}`;

  if (single) {
    const rows = ["AN","HS","FT"].map(t => `
      <tr class="${t===r.type ? "hlrow":""}">
        <td>${t}</td>
        <td class="${t===r.type && duration==="short" ? "hlcell":""}">${ASTMFactors.singleGTF.short[t]}</td>
        <td class="${t===r.type && duration==="long" ? "hlcell":""}">${ASTMFactors.singleGTF.long[t]}</td>
      </tr>`).join("");
    $("tableEvidence").innerHTML = `
      <div class="tableTitle">ASTM Table 1 — Glass Type Factors for Single Monolithic / Laminated Lite</div>
      <table class="astmTable"><thead><tr><th>Glass type</th><th>Short 3 s</th><th>Long 30 days</th></tr></thead><tbody>${rows}</tbody></table>`;

    if (r.gtfReview) {
      $("chartNote").innerHTML =
        `<b>GTF = REVIEW</b>. Classification is unavailable.`;
    } else {
      let clsNote = "";
      if (r.input.kind === "lam" && r.input.gtfClassSource === "user") {
        clsNote = ` User-selected laminated-lite ASTM GTF classification = ${r.type}.`;
      } else if (r.input.kind === "lam" && r.input.gtfClassSource === "auto-weakest") {
        clsNote = ` Auto conservative classification = ${r.type} because the weakest ply governs. This is a project rule, not an explicit ASTM E1300-16 mixed-ply rule.`;
      }
      $("chartNote").innerHTML = `<b>GTF = ${r.gtf.toFixed(2)}</b>. Highlighted cell = ${r.type}, ${duration==="short" ? "Short Duration" : "Long Duration"}.${clsNote}`;
    }
    return;
  }

  const types = ["AN","HS","FT"];
  const data = ASTMFactors.gtfTableData(duration);
  const canHighlight = !latest.outer.gtfReview && !latest.inner.gtfReview;
  const rows = types.map(t1 => `
    <tr>
      <th>${t1}</th>
      ${types.map(t2 => {
        const v=data[t1][t2];
        const hit=canHighlight && t1===latest.outer.type && t2===latest.inner.type;
        return `<td class="${hit?"hlcell":""}">${v[0].toFixed(2)} / ${v[1].toFixed(2)}</td>`;
      }).join("")}
    </tr>`).join("");

  $("tableEvidence").innerHTML = `
    <div class="tableTitle">ASTM Table ${r.gtfTable} — Double IGU GTF (${duration==="short" ? "Short Duration" : "Long Duration"})</div>
    <div class="axisNote">Rows = Outer / Lite 1 type; Columns = Inner / Lite 2 type. Cell = GTF1 / GTF2.</div>
    <table class="astmTable"><thead><tr><th>Lite 1 \\ Lite 2</th>${types.map(t=>`<th>${t}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;

  if (!canHighlight) {
    const mixed = [latest.outer,latest.inner]
      .filter(x => x.input.mixedPlyTypes)
      .map(x => `${x.name}: ${x.input.p1type} + PVB + ${x.input.p2type}`)
      .join("; ");
    $("chartNote").innerHTML =
      `<b>GTF = REVIEW</b>. ${mixed}. ASTM E1300-16 Tables 2–3 classify each lite as AN / HS / FT, but the supplied standard does not explicitly define the table category for a laminated lite with mixed ply heat treatments. No GTF has been guessed.`;
  } else {
    const notes = [latest.outer, latest.inner]
      .filter(x => x.input.kind === "lam")
      .map(x => {
        if (x.input.gtfClassSource === "user") return `${x.name}=${x.type} (user selected)`;
        if (x.input.gtfClassSource === "auto-weakest") return `${x.name}=${x.type} (auto weakest-ply rule)`;
        return "";
      })
      .filter(Boolean)
      .join("; ");
    $("chartNote").innerHTML =
      `<b>${latest.outer.type} / ${latest.inner.type}</b> highlighted → ` +
      `Outer GTF = <b>${latest.outer.gtf.toFixed(2)}</b>, Inner GTF = <b>${latest.inner.gtf.toFixed(2)}</b>.` +
      (notes ? ` ${notes}.` : "");
  }
}

function showLSF(r) {
  $("nflEvidence").classList.add("hidden");
  $("tableEvidence").classList.remove("hidden");

  if ($("assembly").value === "single") {
    $("tableEvidence").innerHTML = `<div class="notice">LSF is not applicable to a single lite.</div>`;
    $("chartNote").innerHTML = `<b>LSF = N/A</b> for single glazing because there is no IGU load sharing.`;
    return;
  }

  const ls = r.lsfInfo;
  $("chartSubtitle").textContent = `IGU · LSF evidence · ${ls.source}`;

  $("tableEvidence").innerHTML = `
    <div class="tableTitle">${ls.source}</div>
    <table class="astmTable">
      <thead><tr><th></th><th>Outer / Lite 1</th><th>Inner / Lite 2</th></tr></thead>
      <tbody>
        <tr><th>Construction</th><td>${latest.outer.desc}</td><td>${latest.inner.desc}</td></tr>
        <tr><th>Stiffness basis</th><td class="${selected==="outer"?"hlcell":""}">${ls.s1.basis}</td><td class="${selected==="inner"?"hlcell":""}">${ls.s2.basis}</td></tr>
        <tr><th>LSF</th><td class="${selected==="outer"?"hlcell":""}">${ls.lsf1.toFixed(3)}</td><td class="${selected==="inner"?"hlcell":""}">${ls.lsf2.toFixed(3)}</td></tr>
      </tbody>
    </table>
    <div class="formulaBox">
      LSF₁ = K₁ / (K₁ + K₂) &nbsp;&nbsp; | &nbsp;&nbsp; LSF₂ = K₂ / (K₁ + K₂)<br>
      <span>${ls.s1.detail}</span><br><span>${ls.s2.detail}</span>
    </div>`;

  $("chartNote").innerHTML =
    `<b>Outer LSF = ${ls.lsf1.toFixed(3)}</b> · <b>Inner LSF = ${ls.lsf2.toFixed(3)}</b>. ` +
    `Highlighted column = ${r.name} lite.`;
}


function showDeflection(r) {
  $("nflEvidence").classList.add("hidden");
  $("tableEvidence").classList.remove("hidden");

  const d = r.deflection;
  $("chartSubtitle").textContent = `${r.name} · Deflection · ${d.method}`;

  if (d.ok) {
    const chartMode = !!d.chartDigitized;
    $("tableEvidence").innerHTML = `
      <div class="tableTitle">${chartMode ? d.method : "ASTM E1300 Appendix X1 — Approximate Center Deflection"}</div>
      <table class="astmTable">
        <tbody>
          <tr><th>Design pressure used</th><td>${d.totalDesignLoad.toFixed(3)} kPa</td></tr>
          <tr><th>Applied load to this lite q</th><td class="hlcell">${d.appliedLoad.toFixed(3)} kPa</td></tr>
          ${chartMode ? `
          <tr><th>ASTM lower chart</th><td>Fig. A1.${d.chartFigure}</td></tr>
          <tr><th>Chart variable</th><td>Load × L⁴ = ${d.X.toFixed(4)} kN·m²</td></tr>
          ${d.threeGeom ? `<tr><th>Free edge L / AR</th><td>${d.threeGeom.freeEdge.toFixed(0)} mm / ${d.threeGeom.ar.toFixed(3)}</td></tr>` : `<tr><th>Unsupported edge L</th><td>${d.unsupported.toFixed(0)} mm</td></tr>`}
          <tr><th>Thickness basis</th><td>${d.minimumThickness.toFixed(2)} mm minimum/designation basis</td></tr>
          ` : `
          <tr><th>Long dimension a</th><td>${d.long.toFixed(0)} mm</td></tr>
          <tr><th>Short dimension b</th><td>${d.short.toFixed(0)} mm</td></tr>
          <tr><th>Aspect ratio a/b</th><td>${d.ar.toFixed(3)}${d.ar>5 ? " → 5.000 used" : ""}</td></tr>
          <tr><th>Thickness t used</th><td>${d.minimumThickness.toFixed(2)} mm minimum thickness</td></tr>
          <tr><th>E</th><td>71.7 × 10⁶ kPa</td></tr>
          <tr><th>x</th><td>${d.x.toFixed(4)}</td></tr>
          `}
          <tr><th>Maximum deflection w</th><td class="hlcell"><b>${d.w.toFixed(1)} mm</b> (ASTM X1 says round to nearest mm)</td></tr>
          <tr><th>Selected allowable criterion</th><td>${r.deflectionLimit.label}</td></tr>
          <tr><th>Allowable deflection</th><td>${r.deflectionLimit.limit == null ? "Review only" : r.deflectionLimit.limit.toFixed(1) + " mm"}</td></tr>
          <tr><th>Deflection result</th><td>${statusBadge(r.deflectionStatus)} ${r.deflectionReason}</td></tr>
        </tbody>
      </table>
      <div class="formulaBox">
        ${chartMode
          ? `ASTM Annex A1 lower-chart digitized interpolation.<br>Input uses the specified design pressure and the chart's required unsupported/free-edge geometry.`
          : `w = t × exp(r₀ + r₁x + r₂x²)<br>x = ln{ln[q(ab)² / Et⁴]}<br>r₀ = ${d.r0.toFixed(4)}, r₁ = ${d.r1.toFixed(4)}, r₂ = ${d.r2.toFixed(4)}`}
      </div>`;
    $("chartNote").innerHTML =
      `<b>Maximum deflection ≈ ${d.w.toFixed(1)} mm</b> at the ${d.location}. ` +
      `${d.assembly==="igu" ? `This V8.1 basic estimate apportions the selected design pressure using the current LSF (${r.lsf.toFixed(3)}), giving ${d.appliedLoad.toFixed(3)} kPa on this lite. ` : ""}` +
      `${d.caution ? "ASTM X1 cautions use at pressures below about one-third of lite design capacity. " : ""}` +
      `ASTM E1300 requires glass deflection to be reviewed; it does not itself set an aesthetic deflection limit.`;
  } else {
    $("tableEvidence").innerHTML = `
      <div class="tableTitle">${d.method}</div>
      <div class="notice">
        <b>Numerical deflection: REVIEW</b><br>
        Applied load to this lite = ${Number(d.appliedLoad||0).toFixed(3)} kPa.<br>
        ${d.note || d.error || ""}
      </div>`;

    $("chartNote").innerHTML =
      `<b>Deflection requires review.</b> ${d.note || d.error || ""}`;
  }
}

function drawOverlay(r, img) {
  const c = $("overlay");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;

  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  if (!r.ok && !r.outsideRange && !r.outsideDimension) return;

  if (r.oneEdge) {
    // Fig. A1.28 / A1.44 are log-log charts: x = load (kPa),
    // y = unsupported-edge length (mm), selected thickness line q = C/L^2.
    const isMono = r.figure === 28;
    const b = isMono ? [81,656,61,464] : [99,655,70,460];
    const qmin = isMono ? 0.25 : 0.20;
    const qmax = 10.0;
    const Lmin = isMono ? 260 : 200;
    const Lmax = 3000;
    const [x0,x1,y0,y1] = b;

    const X = q => x0 +
      (Math.log10(q)-Math.log10(qmin)) /
      (Math.log10(qmax)-Math.log10(qmin)) * (x1-x0);

    const Y = L => y1 -
      (Math.log10(L)-Math.log10(Lmin)) /
      (Math.log10(Lmax)-Math.log10(Lmin)) * (y1-y0);

    // Green: selected ASTM thickness/designation line.
    ctx.save();
    ctx.strokeStyle = "#067647";
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(6,118,71,.25)";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    let started = false;

    for (let L=Lmin; L<=Lmax; L*=1.008) {
      const q = r.C / Math.pow(L,2);
      if (q >= qmin && q <= qmax) {
        if (!started) {
          ctx.moveTo(X(q),Y(L));
          started = true;
        } else {
          ctx.lineTo(X(q),Y(L));
        }
      }
    }
    if (started) ctx.stroke();
    ctx.restore();

    // If unsupported length itself is outside printed y-range, do not fake a point.
    if (r.outsideDimension) return;

    // If load intersection lies outside printed x-range, show only the dimension guide.
    if (r.outsideRange) {
      ctx.save();
      ctx.strokeStyle = "#175cd3";
      ctx.lineWidth = 3;
      ctx.setLineDash([10,7]);
      ctx.beginPath();
      ctx.moveTo(x0,Y(r.unsupported));
      ctx.lineTo(x1,Y(r.unsupported));
      ctx.stroke();
      ctx.restore();

      const label = r.direction === "below"
        ? `< ${r.qmin.toFixed(2)} kPa`
        : `> ${r.qmax.toFixed(2)} kPa`;

      ctx.font = "bold 22px system-ui";
      const tw = ctx.measureText(label).width;
      const xx = 12;
      const yy = Math.max(32,Y(r.unsupported)-12);

      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillRect(xx-7,yy-23,tw+14,31);
      ctx.strokeStyle = "#d92d20";
      ctx.lineWidth = 2;
      ctx.strokeRect(xx-7,yy-23,tw+14,31);
      ctx.fillStyle = "#d92d20";
      ctx.fillText(label,xx,yy);
      return;
    }

    // Blue guides to intersection.
    ctx.save();
    ctx.strokeStyle = "#175cd3";
    ctx.lineWidth = 3;
    ctx.setLineDash([10,7]);
    ctx.beginPath();
    ctx.moveTo(x0,Y(r.unsupported));
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(r.raw),y1);
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.restore();

    // Red intersection.
    ctx.beginPath();
    ctx.arc(X(r.raw),Y(r.unsupported),10,0,Math.PI*2);
    ctx.fillStyle = "#d92d20";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    const label = `${r.nfl.toFixed(2)} kPa`;
    ctx.font = "bold 22px system-ui";
    const tw = ctx.measureText(label).width;
    const xx = Math.min(c.width-tw-24,X(r.raw)+12);
    const yy = Math.max(30,Y(r.unsupported)-12);

    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillRect(xx-7,yy-23,tw+14,31);
    ctx.strokeStyle = "#d92d20";
    ctx.lineWidth = 2;
    ctx.strokeRect(xx-7,yy-23,tw+14,31);
    ctx.fillStyle = "#d92d20";
    ctx.fillText(label,xx,yy);
    return;
  }

  if (r.twoSide) {
    const b = r.figure === 27 ? [78,654,61,463] : [87,657,69,469];
    const qmin = r.figure === 27 ? .25 : .20;
    const qmax = r.figure === 27 ? 10 : 8;
    const Lmin = r.figure === 27 ? 260 : 200;
    const Lmax = r.figure === 27 ? 3500 : 3000;

    const [x0,x1,y0,y1] = b;

    const X = q => x0 +
      (Math.log10(q)-Math.log10(qmin)) /
      (Math.log10(qmax)-Math.log10(qmin)) * (x1-x0);

    const Y = L => y1 -
      (Math.log10(L)-Math.log10(Lmin)) /
      (Math.log10(Lmax)-Math.log10(Lmin)) * (y1-y0);

    // Green: selected thickness line
    ctx.save();
    ctx.strokeStyle = "#067647";
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(6,118,71,.25)";
    ctx.shadowBlur = 5;
    ctx.beginPath();

    let started = false;
    for (let L=Lmin; L<=Lmax; L*=1.01) {
      const q = r.C / Math.pow(L,4);
      if (q >= qmin && q <= qmax) {
        if (!started) {
          ctx.moveTo(X(q),Y(L));
          started = true;
        } else {
          ctx.lineTo(X(q),Y(L));
        }
      }
    }
    if (started) ctx.stroke();
    ctx.restore();

    // For an out-of-range point, keep the selected thickness line highlighted,
    // but do not draw a fake ASTM intersection beyond the printed chart.
    if (r.outsideRange) {
      ctx.save();
      ctx.strokeStyle = "#175cd3";
      ctx.lineWidth = 3;
      ctx.setLineDash([10,7]);
      ctx.beginPath();
      ctx.moveTo(x0, Y(r.unsupported));
      ctx.lineTo(x1, Y(r.unsupported));
      ctx.stroke();
      ctx.restore();

      const label = r.direction === "below"
        ? `< ${r.qmin.toFixed(2)} kPa`
        : `> ${r.qmax.toFixed(2)} kPa`;

      ctx.font = "bold 22px system-ui";
      const tw = ctx.measureText(label).width;
      const xx = 12;
      const yy = Math.max(32, Y(r.unsupported) - 12);

      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillRect(xx-7,yy-23,tw+14,31);
      ctx.strokeStyle = "#d92d20";
      ctx.lineWidth = 2;
      ctx.strokeRect(xx-7,yy-23,tw+14,31);
      ctx.fillStyle = "#d92d20";
      ctx.fillText(label,xx,yy);
      return;
    }

    // Blue guides
    ctx.save();
    ctx.strokeStyle = "#175cd3";
    ctx.lineWidth = 3;
    ctx.setLineDash([10,7]);

    ctx.beginPath();
    ctx.moveTo(x0,Y(r.unsupported));
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(r.raw),y1);
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.restore();

    // Red intersection
    ctx.beginPath();
    ctx.arc(X(r.raw),Y(r.unsupported),10,0,Math.PI*2);
    ctx.fillStyle = "#d92d20";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // Label
    const label = `${r.nfl.toFixed(2)} kPa`;
    ctx.font = "bold 22px system-ui";
    const tw = ctx.measureText(label).width;

    const xx = Math.min(c.width - tw - 24, X(r.raw) + 12);
    const yy = Math.max(30, Y(r.unsupported) - 12);

    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillRect(xx-7,yy-23,tw+14,31);
    ctx.strokeStyle = "#d92d20";
    ctx.lineWidth = 2;
    ctx.strokeRect(xx-7,yy-23,tw+14,31);
    ctx.fillStyle = "#d92d20";
    ctx.fillText(label,xx,yy);
    return;
  }

  const meta = plotMeta[`A1.${r.figure}`];
  if (!meta || !meta.bounds || !meta.xmax || !meta.ymax) return;

  const [x0,x1,y0,y1] = meta.bounds;
  const W=x1-x0, H=y1-y0;
  const sx=x=>x0+x/meta.xmax*W;
  const sy=y=>y1-y/meta.ymax*H;

  const long=r.geom.long, short=r.geom.short;

  ctx.save();
  ctx.strokeStyle="#175cd3";
  ctx.lineWidth=4;
  ctx.setLineDash([12,8]);
  ctx.beginPath();
  const maxx=Math.min(meta.xmax,r.geom.ar*meta.ymax);
  ctx.moveTo(sx(0),sy(0));
  ctx.lineTo(sx(maxx),sy(maxx/r.geom.ar));
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle="#067647";
  ctx.lineWidth=6;
  ctx.beginPath();
  let started=false;

  for(let x=Math.max(50,meta.xmax*.015);x<=meta.xmax;x+=meta.xmax/260){
    const y=NFLEngine.contourY(r.kind,r.designation,r.nfl,x);
    if(isFinite(y)&&y>=0&&y<=meta.ymax&&y<=x){
      if(!started){ctx.moveTo(sx(x),sy(y));started=true}
      else ctx.lineTo(sx(x),sy(y));
    }
  }

  if(started)ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(sx(long),sy(short),10,0,Math.PI*2);
  ctx.fillStyle="#d92d20";
  ctx.fill();
  ctx.lineWidth=4;
  ctx.strokeStyle="#fff";
  ctx.stroke();
}


init();
