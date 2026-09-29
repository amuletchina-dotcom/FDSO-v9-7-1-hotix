/* V9.7.1 Batch Minimum Passing Glass Finder
 * Reads FDSO-BUL-v2.xlsx, recalculates DPT wind pressure from each row height,
 * searches minimum passing glass, previews results, and exports FDSO-BRT-v2 output.
 */
(() => {
  const $b = id => document.getElementById(id);
  const THICKNESSES = [4,5,6,8,10,12,15,19];
  const HEAT_ORDER = ["AN","HS","FT"];
  let batchRows = [];
  let batchResults = [];
  let loadedFileName = "";

  function n(v, d=2) { return Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "—"; }
  function norm(s) { return String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function setStatus(msg, bad=false) {
    const el = $b("batchStatus");
    if (!el) return;
    el.textContent = msg;
    el.style.color = bad ? "#b42318" : "";
    el.style.fontWeight = bad ? "700" : "";
  }

  function requireXLSX() {
    if (typeof XLSX === "undefined") throw new Error("Excel library did not load. Refresh the page and try again.");
  }

  function findHeaderRow(aoa) {
    for (let i=0; i<Math.min(30, aoa.length); i++) {
      const row = (aoa[i] || []).map(norm);
      const hasPanel = row.some(x => x === "panelid" || x === "panel" || x === "glassid");
      const hasWidth = row.some(x => x === "widthmm" || x === "width");
      const hasHeight = row.some(x => x === "heightmm" || x === "height");
      const hasInstall = row.some(x => x.includes("installationheight") || x === "installheightm" || x === "heightm");
      if (hasPanel && hasWidth && hasHeight && hasInstall) return i;
    }
    return -1;
  }

  function colIndex(headers, aliases) {
    const ns = headers.map(norm);
    for (const a of aliases) {
      const idx = ns.indexOf(norm(a));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function parseUpload(arrayBuffer) {
    requireXLSX();
    const wb = XLSX.read(arrayBuffer, {type:"array", cellDates:false});
    if (!wb.SheetNames || !wb.SheetNames.length) throw new Error("Workbook has no readable worksheet.");
    const sheetName = wb.SheetNames.includes("Batch_Input") ? "Batch_Input" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Worksheet '${sheetName}' could not be read.`);
    const aoa = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:""});
    const hr = findHeaderRow(aoa);
    if (hr < 0) throw new Error("Could not find the FDSO-BUL-v2 header row.");
    const h = aoa[hr];
    const cPanel = colIndex(h,["Panel ID","Panel"]);
    const cPos = colIndex(h,["Position / Floor","Position","Floor"]);
    const cW = colIndex(h,["Width (mm)","Width"]);
    const cH = colIndex(h,["Height (mm)","Height"]);
    const cZ = colIndex(h,["Installation Height (m)","Installation Height","Install Height (m)"]);
    if ([cPanel,cW,cH,cZ].some(i=>i<0)) throw new Error("Required columns are missing. Use FDSO-BUL-v2.xlsx.");

    const out = [];
    for (let i=hr+1; i<aoa.length; i++) {
      const r = aoa[i] || [];
      const panel = String(r[cPanel] ?? "").trim();
      const width = Number(r[cW]);
      const height = Number(r[cH]);
      const z = Number(r[cZ]);
      if (!panel && !width && !height && !z) continue;
      if (!panel) throw new Error(`Row ${i+1}: Panel ID is blank.`);
      if (!(width > 0)) throw new Error(`Row ${i+1} (${panel}): Width must be greater than 0.`);
      if (!(height > 0)) throw new Error(`Row ${i+1} (${panel}): Height must be greater than 0.`);
      if (!(z > 0)) throw new Error(`Row ${i+1} (${panel}): Installation Height must be greater than 0.`);
      out.push({panel, position:cPos>=0 ? String(r[cPos] ?? "").trim() : "", width, height, z, sourceRow:i+1});
    }
    if (!out.length) throw new Error("No glass rows found in the upload file.");
    return out;
  }

  function snapshotUI() {
    const ids = ["width","height","dptHeight","dptUsedPressure","assembly","airgap"];
    for (const p of ["o","i"]) ids.push(`${p}kind`,`${p}type`,`${p}th`,`${p}p1`,`${p}p2`,`${p}p1type`,`${p}p2type`,`${p}gtfClass`);
    const obj = {};
    ids.forEach(id=>{ const el=$b(id); if (el) obj[id]=el.value; });
    return obj;
  }

  function restoreUI(s) {
    Object.entries(s).forEach(([id,v])=>{ const el=$b(id); if (el) el.value=v; });
    try { assemblyUI(); supportUI(); liteUI("o"); liteUI("i"); DPTWind.calculate(); } catch(e) { console.warn(e); }
  }

  function setMono(prefix, t, heat) {
    $b(`${prefix}kind`).value = "mono";
    $b(`${prefix}th`).value = String(t);
    $b(`${prefix}type`).value = heat;
  }

  function setLam(prefix, p1, p2, heat) {
    $b(`${prefix}kind`).value = "lam";
    $b(`${prefix}p1`).value = String(p1);
    $b(`${prefix}p2`).value = String(p2);
    $b(`${prefix}p1type`).value = heat;
    $b(`${prefix}p2type`).value = heat;
    $b(`${prefix}gtfClass`).value = "review"; // same-ply types auto-classify; no mixed override needed
  }

  function interlayerLabel(prefix) {
    const mat = $b(`${prefix}interlayerMaterial`)?.value || "PVB";
    const a = Number($b(`${prefix}layer1Thickness`)?.value || 0);
    const b = Number($b(`${prefix}layer2Thickness`)?.value || 0);
    return `${(a+b).toFixed(2).replace(/0+$/,"").replace(/\.$/,"")} ${mat}`;
  }

  function runCurrentCandidate() {
    latest.inner = calculateOne("i","Inner");
    latest.outer = ($b("assembly").value === "single" || $b("assembly").value === "laminatedOnly") ? null : calculateOne("o","Outer");
    addFactors();
    const usedDesignLoad = DPTWind.getUsedPressure();
    [latest.outer,latest.inner].filter(Boolean).forEach(r => {
      if (r.ok && r.gtf != null && !r.outsideRange && !r.outsideDimension && !r.chartUnsupported) {
        r.lr = (r.lsf == null) ? r.nfl * r.gtf : r.nfl * r.gtf / r.lsf;
      } else {
        r.lr = null;
      }
      r.deflection = ASTMDeflection.calcLite(r, usedDesignLoad, r.lsf, $b("assembly").value);
      r.stressAnalysis = ASTMStress.analyzeLaminated(r, usedDesignLoad, $b("assembly").value, $b("support").value, $b("duration").value);
      evaluateLite(r, usedDesignLoad);
      if (r.outsideRange || r.outsideDimension || r.chartUnsupported) {
        r.strengthStatus = "REVIEW";
        r.finalStatus = "REVIEW";
      }
    });
    return [latest.outer,latest.inner].filter(Boolean);
  }

  function finderPass(arr) {
    return arr.length > 0 && arr.every(r =>
      r.ok && !r.outsideRange && !r.outsideDimension && !r.chartUnsupported &&
      r.strengthStatus === "PASS" && r.deflectionStatus === "PASS" &&
      r.stressStatus !== "FAIL"
    );
  }

  function utilization(r, pressure) {
    const su = Number.isFinite(r.lr) && r.lr > 0 ? pressure/r.lr : Infinity;
    const du = r.deflection?.ok && Number.isFinite(r.deflection?.w) && Number.isFinite(r.deflectionLimit?.limit) && r.deflectionLimit.limit>0
      ? r.deflection.w/r.deflectionLimit.limit : Infinity;
    return {su,du,max:Math.max(su,du), governs:du>su?"Deflection":"Strength"};
  }

  function summarize(arr, structure, glassType, pressure, wind, panelRow, optionLabel="") {
    const valid = arr.filter(Boolean);
    const pass = finderPass(valid);
    let gov = {max:-Infinity, governs:"Strength", name:""};
    valid.forEach(r=>{
      const u = utilization(r, pressure);
      if (u.max > gov.max) gov = {...u, name:r.name};
    });
    const igu = valid.length === 2;
    const f = v => Number.isFinite(v) ? v : null;
    const combined = (key, digits=2) => igu
      ? `O ${n(valid[0][key],digits)} / I ${n(valid[1][key],digits)}`
      : f(valid[0]?.[key]);
    const combinedDefl = igu
      ? `O ${n(valid[0]?.deflection?.w,1)} / I ${n(valid[1]?.deflection?.w,1)}`
      : f(valid[0]?.deflection?.w);
    const combinedLimit = igu
      ? `O ${n(valid[0]?.deflectionLimit?.limit,1)} / I ${n(valid[1]?.deflectionLimit?.limit,1)}`
      : f(valid[0]?.deflectionLimit?.limit);
    const figure = igu
      ? `O A1.${valid[0]?.figure ?? "—"} / I A1.${valid[1]?.figure ?? "—"}`
      : `A1.${valid[0]?.figure ?? "—"}`;
    const gtf = igu ? `O ${n(valid[0]?.gtf,2)} / I ${n(valid[1]?.gtf,2)}` : f(valid[0]?.gtf);
    const lsf = igu ? `O ${n(valid[0]?.lsf,3)} / I ${n(valid[1]?.lsf,3)}` : null;
    const lr = igu ? `O ${n(valid[0]?.lr,2)} / I ${n(valid[1]?.lr,2)}` : f(valid[0]?.lr);
    const nfl = combined("nfl",2);
    const ratios = valid.map(r=>Number.isFinite(r.lr)&&r.lr>0?r.lr/pressure:null).filter(Number.isFinite);
    const ratio = ratios.length ? Math.min(...ratios) : null;
    const defStatus = valid.every(r=>r.deflectionStatus==="PASS") ? "PASS" : valid.some(r=>r.deflectionStatus==="FAIL") ? "FAIL" : "REVIEW";
    const finalResult = pass ? "PASS" : "FAIL";
    const governing = igu ? `${gov.name} ${gov.governs}` : gov.governs;
    return {
      panel:panelRow.panel, position:panelRow.position, width:panelRow.width, height:panelRow.height, z:panelRow.z,
      Ce:wind.Ce, pressure, windMode:wind.limit === "service" ? "Serviceability" : "Strength", windResult:"OK",
      structure, glassType:optionLabel ? `${glassType} ${optionLabel}` : glassType, governing,
      figure, nfl, gtf, lsf, lr, ratio, actualDeflection:combinedDefl, allowableDeflection:combinedLimit,
      deflectionStatus:defStatus, overall:finalResult,
      _arr:valid
    };
  }

  function lamPairs() {
    const pairs=[];
    for (let i=0;i<THICKNESSES.length;i++) for (let j=i;j<THICKNESSES.length;j++) {
      const a=THICKNESSES[i], b=THICKNESSES[j];
      if (Math.abs(a-b) <= 2) pairs.push([a,b]);
    }
    return pairs.sort((x,y)=>(x[0]+x[1])-(y[0]+y[1]) || Math.max(...x)-Math.max(...y) || x[0]-y[0]);
  }

  function findMono(panelRow, heat, optionLabel) {
    let last=null;
    for (const t of THICKNESSES) {
      setMono("i",t,heat);
      const arr=runCurrentCandidate();
      const s=summarize(arr, `${t} mm ${heat}`, "Monolithic", DPTWind.getUsedPressure(), DPTWind.getLast(), panelRow, optionLabel);
      last=s;
      if (s.overall === "PASS") return s;
    }
    if (last) {
      last.structure = `NO PASS — up to ${THICKNESSES.at(-1)} mm ${heat}`;
      last.overall="FAIL";
    }
    return last;
  }

  function findLaminated(panelRow) {
    const pairs=lamPairs();
    let last=null;
    for (const heat of HEAT_ORDER) {
      for (const [a,b] of pairs) {
        setLam("i",a,b,heat);
        const arr=runCurrentCandidate();
        const s=summarize(arr, `${a} ${heat} + ${interlayerLabel("i")} + ${b} ${heat}`, "Laminated", DPTWind.getUsedPressure(), DPTWind.getLast(), panelRow);
        last=s;
        if (s.overall === "PASS") return s;
      }
    }
    if (last) {
      last.structure = `NO PASS — strongest standard search reached ${THICKNESSES.at(-1)} FT + ${interlayerLabel("i")} + ${THICKNESSES.at(-1)} FT`;
      last.overall="FAIL";
    }
    return last;
  }

  function sortedMonoPairs() {
    const p=[];
    for (const a of THICKNESSES) for (const b of THICKNESSES) p.push([a,b]);
    return p.sort((x,y)=>(x[0]+x[1])-(y[0]+y[1]) || Math.max(...x)-Math.max(...y) || x[0]-y[0]);
  }

  function findIGU(panelRow, mode) {
    if ($b("support").value !== "4") {
      return {panel:panelRow.panel,position:panelRow.position,width:panelRow.width,height:panelRow.height,z:panelRow.z,
        Ce:DPTWind.getLast()?.Ce,pressure:DPTWind.getUsedPressure(),windMode:"—",windResult:"OK",
        structure:"IGU finder requires four-side continuous support",glassType:"IGU",governing:"ASTM Basic Procedure",
        figure:"—",nfl:null,gtf:null,lsf:null,lr:null,ratio:null,actualDeflection:null,allowableDeflection:null,
        deflectionStatus:"REVIEW",overall:"FAIL",_arr:[]};
    }
    const mp=sortedMonoPairs();
    const lp=lamPairs();
    let last=null;
    for (const heat of HEAT_ORDER) {
      let candidates=[];
      if (mode === "mono-mono") {
        candidates = mp.map(([o,i])=>({oKind:"mono",iKind:"mono",o,i,total:o+i}));
      } else if (mode === "lam-mono") {
        for (const [a,b] of lp) for (const i of THICKNESSES) candidates.push({oKind:"lam",iKind:"mono",a,b,i,total:a+b+i});
      } else {
        for (const o of THICKNESSES) for (const [a,b] of lp) candidates.push({oKind:"mono",iKind:"lam",o,a,b,total:o+a+b});
      }
      candidates.sort((x,y)=>x.total-y.total);
      for (const c of candidates) {
        let structure="";
        if (mode === "mono-mono") {
          setMono("o",c.o,heat); setMono("i",c.i,heat);
          structure=`${c.o} mm ${heat} + ${$b("airgap").value}A + ${c.i} mm ${heat}`;
        } else if (mode === "lam-mono") {
          setLam("o",c.a,c.b,heat); setMono("i",c.i,heat);
          structure=`${c.a} ${heat} + ${interlayerLabel("o")} + ${c.b} ${heat} + ${$b("airgap").value}A + ${c.i} mm ${heat}`;
        } else {
          setMono("o",c.o,heat); setLam("i",c.a,c.b,heat);
          structure=`${c.o} mm ${heat} + ${$b("airgap").value}A + ${c.a} ${heat} + ${interlayerLabel("i")} + ${c.b} ${heat}`;
        }
        const arr=runCurrentCandidate();
        const s=summarize(arr, structure, "IGU", DPTWind.getUsedPressure(), DPTWind.getLast(), panelRow);
        last=s;
        if (s.overall === "PASS") return s;
      }
    }
    if (last) { last.structure = `NO PASS — no standard candidate passed for selected IGU structure`; last.overall="FAIL"; }
    return last;
  }

  function processPanel(row) {
    $b("width").value = row.width;
    $b("height").value = row.height;
    $b("dptHeight").value = row.z;
    const wind = DPTWind.calculate();
    $b("dptUsedPressure").value = wind.suggested.toFixed(4);

    const assembly=$b("assembly").value;
    if (assembly === "single") {
      return [findMono(row,"AN","AN option"), findMono(row,"FT","FT option")].filter(Boolean);
    }
    if (assembly === "laminatedOnly") return [findLaminated(row)].filter(Boolean);
    return [findIGU(row, $b("batchIguStructure").value)].filter(Boolean);
  }

  function renderPreview(results) {
    const el=$b("batchPreview");
    if (!el) return;
    if (!results.length) { el.innerHTML=""; return; }
    el.innerHTML = `<div style="overflow:auto;margin-top:16px"><table class="batchTable"><thead><tr>`+
      `<th>Panel</th><th>Height m</th><th>Wind kPa</th><th>Recommended Minimum Structure</th><th>NFL</th><th>GTF</th><th>LSF</th><th>LR</th><th>Deflection</th><th>Governing</th><th>Result</th></tr></thead><tbody>`+
      results.map(r=>`<tr><td>${r.panel}</td><td>${n(r.z,1)}</td><td>${n(r.pressure,2)}</td><td>${r.structure}</td>`+
        `<td>${typeof r.nfl==="number"?n(r.nfl,2):(r.nfl??"—")}</td><td>${typeof r.gtf==="number"?n(r.gtf,2):(r.gtf??"—")}</td>`+
        `<td>${r.lsf??"—"}</td><td>${typeof r.lr==="number"?n(r.lr,2):(r.lr??"—")}</td>`+
        `<td>${typeof r.actualDeflection==="number"?n(r.actualDeflection,1):(r.actualDeflection??"—")}</td><td>${r.governing}</td>`+
        `<td><span class="statusBadge ${String(r.overall).toLowerCase()}">${r.overall}</span></td></tr>`).join("")+
      `</tbody></table></div>`;
  }

  function exportRows() {
    return batchResults.map(r=>[
      r.panel,r.position,r.width,r.height,r.z,
      Number(r.Ce),Number(r.pressure),r.windMode,r.windResult,
      r.structure,r.glassType,r.governing,
      r.figure,r.nfl,r.gtf,r.lsf,r.lr,r.ratio,
      r.actualDeflection,r.allowableDeflection,r.deflectionStatus,r.overall
    ]);
  }

  async function exportResults() {
    try {
      requireXLSX();
      if (!batchResults.length) throw new Error("Run the batch finder before exporting.");
      const resp = await fetch("FDSO-BRT-v2.xlsx", {cache:"no-store"});
      if (!resp.ok) throw new Error("Could not load FDSO-BRT-v2.xlsx from the site root.");
      const ab = await resp.arrayBuffer();
      const wb = XLSX.read(ab,{type:"array",cellStyles:true});
      const sname = wb.SheetNames.includes("Batch_Results") ? "Batch_Results" : wb.SheetNames[0];
      const ws = wb.Sheets[sname];
      if (!ws) throw new Error(`Result template worksheet '${sname}' is missing.`);

      // Clear prior/sample output rows while keeping the template/header intact.
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:V200");
      for (let R=4; R<=Math.max(range.e.r, 250); R++) {
        for (let C=0; C<22; C++) delete ws[XLSX.utils.encode_cell({r:R,c:C})];
      }
      XLSX.utils.sheet_add_aoa(ws, exportRows(), {origin:"A5"});
      const endRow = 4 + batchResults.length;
      ws["!ref"] = `A1:V${endRow}`;

      XLSX.writeFile(wb, "FDSO-BRT-v2-Results.xlsx", {compression:true, cellStyles:true});
      setStatus(`Exported ${batchResults.length} result row(s) successfully.`);
    } catch (e) {
      console.error(e);
      setStatus(`Export error: ${e.message}`, true);
    }
  }

  async function runBatch() {
    if (!batchRows.length) return;
    if ($b("deflectionCriterion")?.value === "review") {
      setStatus("Select a numerical deflection criterion before batch finding; the result must compare actual deflection with an allowable limit.", true);
      return;
    }
    const snap=snapshotUI();
    batchResults=[];
    $b("batchRun").disabled=true;
    $b("batchExport").disabled=true;
    try {
      for (let i=0;i<batchRows.length;i++) {
        setStatus(`Calculating ${i+1}/${batchRows.length}: ${batchRows[i].panel} ...`);
        await new Promise(requestAnimationFrame);
        const rows=processPanel(batchRows[i]);
        batchResults.push(...rows);
      }
      renderPreview(batchResults);
      $b("batchExport").disabled = batchResults.length===0;
      const failed=batchResults.filter(r=>r.overall!=="PASS").length;
      setStatus(`Completed ${batchRows.length} panel(s), ${batchResults.length} result row(s). ${failed ? failed+" result(s) did not find a standard automatic PASS; numerical evidence is still included." : "All result rows PASS."}`);
    } catch(e) {
      console.error(e);
      setStatus(`Batch calculation error: ${e.message}`, true);
    } finally {
      restoreUI(snap);
      $b("batchRun").disabled = batchRows.length===0;
    }
  }

  function updateIGUBox() {
    const box=$b("batchIguStructureBox");
    if (box) box.classList.toggle("hidden", $b("assembly").value !== "igu");
  }

  function initBatch() {
    const file=$b("batchFile");
    if (!file) return;
    updateIGUBox();
    $b("assembly").addEventListener("change", updateIGUBox);
    file.addEventListener("change", async ev=>{
      try {
        requireXLSX();
        const f=ev.target.files?.[0];
        if (!f) return;
        loadedFileName=f.name;
        batchRows=parseUpload(await f.arrayBuffer());
        batchResults=[];
        $b("batchRun").disabled=false;
        $b("batchExport").disabled=true;
        renderPreview([]);
        setStatus(`Loaded ${batchRows.length} panel(s) from ${loadedFileName}. Design wind pressure will be calculated from each row's Installation Height.`);
      } catch(e) {
        console.error(e);
        batchRows=[]; batchResults=[];
        $b("batchRun").disabled=true; $b("batchExport").disabled=true;
        setStatus(`Upload error: ${e.message}`, true);
      }
    });
    $b("batchRun").addEventListener("click", runBatch);
    $b("batchExport").addEventListener("click", exportResults);
    $b("batchDownloadTemplate").addEventListener("click", ()=>{
      const a=document.createElement("a");
      a.href="FDSO-BUL-v2.xlsx"; a.download="FDSO-BUL-v2.xlsx"; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBatch);
  else initBatch();
})();
