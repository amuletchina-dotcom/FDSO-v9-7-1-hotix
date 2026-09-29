
const ReportEngine = (() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = (v,d=2) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "—";

  function statusClass(s){ return String(s||"REVIEW").toLowerCase(); }

  function barChart(title, rows, maxOverride=null) {
    const vals = rows.flatMap(r => [Number(r.value)||0, Number(r.limit)||0]);
    const max = maxOverride || Math.max(1,...vals)*1.12;
    const W=720,H=95+rows.length*68,left=175,right=35,plot=W-left-right;
    const rowSvg = rows.map((r,i)=>{
      const y=58+i*68;
      const vw=Math.max(0,Math.min(plot,(Number(r.value)||0)/max*plot));
      const lw=Math.max(0,Math.min(plot,(Number(r.limit)||0)/max*plot));
      return `
        <text x="10" y="${y+19}" font-size="14" font-weight="700">${esc(r.label)}</text>
        <rect x="${left}" y="${y}" width="${plot}" height="19" rx="5" fill="#eef2f6"/>
        <rect x="${left}" y="${y}" width="${vw}" height="19" rx="5" fill="#175cd3"/>
        <line x1="${left+lw}" y1="${y-5}" x2="${left+lw}" y2="${y+25}" stroke="#d92d20" stroke-width="3"/>
        <text x="${left+Math.min(vw+7,plot-5)}" y="${y+15}" font-size="12" fill="#175cd3">${fmt(r.value,2)} ${esc(r.unit||"")}</text>
        <text x="${left+Math.min(lw+7,plot-5)}" y="${y+38}" font-size="11" fill="#b42318">limit ${fmt(r.limit,2)} ${esc(r.unit||"")}</text>`;
    }).join("");
    return `<div class="reportChart"><h3>${esc(title)}</h3><svg viewBox="0 0 ${W} ${H}" role="img">${rowSvg}</svg></div>`;
  }

  function windChart(dpt, used){
    if(!dpt) return "";
    const vals=[
      {label:"Reference q", value:dpt.q},
      {label:"|External p|", value:Math.abs(dpt.pext)},
      {label:"Suggested net", value:dpt.suggested},
      {label:"Design pressure used", value:used}
    ];
    const max=Math.max(1,...vals.map(x=>x.value))*1.15;
    const W=720,H=345,left=170,right=40,plot=W-left-right;
    const rows=vals.map((r,i)=>{
      const y=60+i*62,w=r.value/max*plot;
      return `<text x="10" y="${y+16}" font-size="14" font-weight="700">${esc(r.label)}</text>
      <rect x="${left}" y="${y}" width="${plot}" height="20" rx="5" fill="#eef2f6"/>
      <rect x="${left}" y="${y}" width="${w}" height="20" rx="5" fill="#067647"/>
      <text x="${left+Math.min(w+8,plot-8)}" y="${y+16}" font-size="12">${fmt(r.value,3)} kPa</text>`;
    }).join("");
    return `<div class="reportChart"><h3>DPT wind pressure build-up</h3><svg viewBox="0 0 ${W} ${H}" role="img">${rows}</svg></div>`;
  }

  function liteTable(r, used){
    const d=r.deflection||{};
    return `
      <section class="liteBlock">
        <h3>${esc(r.name)} Lite — ${esc(r.finalStatus)}</h3>
        <table>
          <tr><th>Glass structure</th><td>${esc(r.desc)}</td></tr>
          ${r.input.kind==="lam" ? `
          <tr><th>Interlayer material</th><td>${esc(r.input.interlayerMaterial)} only · PVB/SGP mixing prohibited</td></tr>
          <tr><th>Interlayer Layer 1</th><td>${esc(r.input.layer1Type)} · ${fmt(r.input.layer1Thickness,2)} mm</td></tr>
          ${
            !(r.input.interlayerMaterial==="PVB" &&
              r.input.layer1Type==="Clear PVB" &&
              r.input.layer2Type==="Clear PVB" &&
              Number(r.input.layer2Thickness)===0)
              ? `<tr><th>Interlayer Layer 2</th><td>${esc(r.input.layer2Type)} · ${fmt(r.input.layer2Thickness,2)} mm</td></tr>`
              : ""
          }
          <tr><th>Interlayer shear modulus G</th><td>${fmt(r.input.shearModulusG,2)} MPa · ${esc(r.input.shearModulusSource||"—")}</td></tr>
          <tr><th>ASTM X9 shear transfer Γ</th><td>${r.input.x9 ? fmt(r.input.x9.gamma,3) : "—"}</td></tr>
          <tr><th>X9 effective thickness h<sub>ef,w</sub></th><td>${r.input.x9 ? fmt(r.input.x9.hefW,2)+" mm" : "—"}</td></tr>
          <tr><th>Exterior Ply h<sub>1,ef,σ</sub></th><td>${r.input.x9 ? fmt(r.input.x9.h1efSigma,2)+" mm" : "—"}</td></tr>
          <tr><th>Interior Ply h<sub>2,ef,σ</sub></th><td>${r.input.x9 ? fmt(r.input.x9.h2efSigma,2)+" mm" : "—"}</td></tr>
          ${
            r.stressAnalysis?.applicable && r.stressAnalysis?.ok
              ? (r.stressAnalysis.engineering
                  ? `<tr><th>Exterior Ply engineering surface stress</th><td>${fmt(r.stressAnalysis.exterior.maxSurfaceStress,2)} MPa</td></tr>
                     <tr><th>Interior Ply engineering surface stress</th><td>${fmt(r.stressAnalysis.interior.maxSurfaceStress,2)} MPa</td></tr>
                     <tr><th>Stress method</th><td>Engineering two-side one-way simply-supported strip using ASTM X9 effective stress thickness.</td></tr>
                     <tr><th>ASTM analytical status</th><td><b class="REVIEW">REVIEW</b> · Numerical engineering stress is outside ASTM E1300 6.3.2 four-side analytical scope and is not an ASTM A2 PASS/FAIL.</td></tr>`
                  : `<tr><th>Exterior Ply max surface tensile stress</th><td>${fmt(r.stressAnalysis.exterior.maxSurfaceStress,2)} MPa</td></tr>
                     <tr><th>Exterior Ply probability of breakage Pb</th><td>${r.stressAnalysis.exterior.Pb.toExponential(3)} · <b class="${r.stressAnalysis.exterior.pass?"pass":"fail"}">${r.stressAnalysis.exterior.pass?"PASS":"FAIL"}</b></td></tr>
                     <tr><th>Interior Ply max surface tensile stress</th><td>${fmt(r.stressAnalysis.interior.maxSurfaceStress,2)} MPa</td></tr>
                     <tr><th>Interior Ply probability of breakage Pb</th><td>${r.stressAnalysis.interior.Pb.toExponential(3)} · <b class="${r.stressAnalysis.interior.pass?"pass":"fail"}">${r.stressAnalysis.interior.pass?"PASS":"FAIL"}</b></td></tr>
                     <tr><th>ASTM analytical surface-stress check</th><td><b class="${statusClass(r.stressStatus)}">${esc(r.stressStatus)}</b> · ${esc(r.stressReason)}</td></tr>
                     <tr><th>A2.1 stress method verification</th><td>Nonlinear two-way plate field calibrated to the corresponding ASTM Annex A1 NFL point at Pb = 0.008 for the same panel geometry.</td></tr>`)
              : `<tr><th>Surface stress analysis</th><td><b class="REVIEW">REVIEW</b> · ${esc(r.stressAnalysis?.reason||"ASTM A2 analytical stress result unavailable.")}</td></tr>`
          }` : ""}
          <tr><th>ASTM figure</th><td>Fig. A1.${esc(r.figure)}</td></tr>
          <tr><th>Dimensions</th><td>${Math.round(r.geom.long)} × ${Math.round(r.geom.short)} mm · AR ${fmt(r.geom.ar,2)}</td></tr>
          <tr><th>NFL</th><td>${r.ok?fmt(r.nfl,2)+" kPa":"REVIEW"}</td></tr>
          <tr><th>GTF</th><td>${r.gtfReview?"REVIEW":fmt(r.gtf,2)}</td></tr>
          <tr><th>GTF classification basis</th><td>${
            r.input.gtfClassSource==="astm-mixed-review"
              ? "ASTM REVIEW — mixed laminated ply heat treatments are not explicitly assigned a Table 1 Basic Procedure category"
              : r.input.gtfClassSource==="project-weakest"
                ? `Project conservative rule — weakest ply governs (${esc(r.type)})`
                : r.input.gtfClassSource==="user"
                  ? `User-selected classification (${esc(r.type)})`
                  : `Automatic (${esc(r.type||"—")})`
          }</td></tr>
          <tr><th>LSF</th><td>${r.lsf==null?"N/A":fmt(r.lsf,3)}</td></tr>
          <tr><th>Load Resistance LR</th><td>${r.lr==null?"—":fmt(r.lr,2)+" kPa"} · <b class="${statusClass(r.strengthStatus)}">${esc(r.strengthStatus)}</b></td></tr>
          <tr><th>Strength check</th><td>${esc(r.strengthReason)}</td></tr>
          <tr><th>Applied load to lite</th><td>${fmt(d.appliedLoad,3)} kPa</td></tr>
          <tr><th>Maximum deflection</th><td>${d.ok?fmt(d.w,1)+" mm":"REVIEW"}</td></tr>
          <tr><th>Deflection criterion</th><td>${esc(r.deflectionLimit?.label)}${r.deflectionLimit?.limit!=null?" · "+fmt(r.deflectionLimit.limit,1)+" mm":""}</td></tr>
          <tr><th>Deflection check</th><td><b class="${statusClass(r.deflectionStatus)}">${esc(r.deflectionStatus)}</b> · ${esc(r.deflectionReason)}</td></tr>
          <tr><th>Deflection method</th><td>${esc(d.method||"—")}</td></tr>
        </table>
      </section>`;
  }

  function finalStatus(arr){
    if(arr.some(r=>r.finalStatus==="FAIL")) return "FAIL";
    if(arr.some(r=>r.finalStatus==="REVIEW")) return "REVIEW";
    return "PASS";
  }

  function generate(latest){
    const arr=[latest.outer,latest.inner].filter(Boolean);
    if(!arr.length){ alert("Please calculate ASTM results first."); return; }

    const employee=localStorage.getItem("glassEmployee")||"—";
    const dpt=DPTWind.getLast();
    const used=DPTWind.getUsedPressure();
    const final=finalStatus(arr);
    const project=document.getElementById("projectName")?.value||"";
    const client=document.getElementById("clientName")?.value||"";
    const ref=document.getElementById("reportRef")?.value||"";
    const panelCode=document.getElementById("panelCode")?.value||"";
    const floor=document.getElementById("floor")?.value||"";
    const coatingLayers=Number(document.getElementById("coatingLayers")?.value||1);
    const coating1Code=document.getElementById("coating1Code")?.value||"";
    const coating1Surface=document.getElementById("coating1Surface")?.value||"";
    const coating2Code=document.getElementById("coating2Code")?.value||"";
    const coating2Surface=document.getElementById("coating2Surface")?.value||"";
    const airgap=document.getElementById("airgap")?.value||"";
    const overallStructure=(typeof overallStructureText==="function")?overallStructureText():"";
    const assembly=document.getElementById("assembly")?.selectedOptions?.[0]?.textContent||"";
    const support=document.getElementById("support")?.selectedOptions?.[0]?.textContent||"";
    const duration=document.getElementById("duration")?.selectedOptions?.[0]?.textContent||"";
    const criterion=document.getElementById("deflectionCriterion")?.selectedOptions?.[0]?.textContent||"";
    const width=document.getElementById("width")?.value;
    const height=document.getElementById("height")?.value;
    const dt=new Date();
    const stamp=dt.toLocaleString();

    // Default report filename:
    // CS ECO_Project Name_Panel Code_DDMMYYYY_HHMM
    const safeFilePart = v => String(v || "")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/^\.+|\.+$/g, "") || "NA";

    const day=String(dt.getDate()).padStart(2,"0");
    const month=String(dt.getMonth()+1).padStart(2,"0");
    const year=String(dt.getFullYear());
    const hour=String(dt.getHours()).padStart(2,"0");
    const minute=String(dt.getMinutes()).padStart(2,"0");

    const reportId=`CS ECO_${safeFilePart(project)}_${safeFilePart(panelCode)}_${day}${month}${year}_${hour}${minute}`;

    const strengthRows=arr.map(r=>({label:`${r.name} Lite`,value:r.lr||0,limit:used,unit:"kPa"}));
    const deflRows=arr.filter(r=>r.deflection?.ok && r.deflectionLimit?.limit!=null)
                      .map(r=>({label:`${r.name} Lite`,value:r.deflection.w,limit:r.deflectionLimit.limit,unit:"mm"}));

    const chartImgs=arr.map(r=>{
      if(!r.figure) return `<div class="sourceChart"><h4>${esc(r.name)} Lite · ASTM Figure</h4><div class="note">No ASTM source figure is available for this selection.</div></div>`;
      const src=new URL(`A1_${String(r.figure).padStart(2,"0")}.png`, location.href).href;
      const nflText=r.ok?`${fmt(r.nfl,2)} kPa`:"REVIEW";
      return `<div class="sourceChart">
        <h4>${esc(r.name)} Lite · ASTM Fig. A1.${r.figure}</h4>
        <div class="chartImageWrap">
          <img src="${src}" alt="ASTM Fig. A1.${r.figure}">
          <div class="nflHighlight">NFL<br><b>${nflText}</b></div>
        </div>
        <div class="small">Highlighted NFL result used by this report: <b>${nflText}</b></div>
      </div>`;
    }).join("");

    const report = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${esc(reportId)} Facade Design and Structural Optimization Report</title>
      <style>
      @page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,system-ui,sans-serif;color:#101828;margin:0;background:#fff;font-size:11px;line-height:1.45}
      .top{border-bottom:4px solid #175cd3;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px}.brand{font-weight:900;color:#175cd3;letter-spacing:.08em}.title{font-size:23px;font-weight:900;margin:3px 0}.meta{text-align:right;color:#475467}
      h2{font-size:15px;border-bottom:1px solid #d0d5dd;padding-bottom:5px;margin-top:18px}h3{font-size:13px;margin:8px 0}h4{font-size:11px;margin:6px 0}
      table{width:100%;border-collapse:collapse;margin:7px 0 12px}th,td{border:1px solid #d0d5dd;padding:6px 7px;text-align:left;vertical-align:top}th{background:#f2f4f7;width:33%}
      .overallStructure{margin:10px 0 14px;padding:12px 14px;border:2px solid #175cd3;border-radius:10px;background:#eff8ff}.overallStructure span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#175cd3}.overallStructure b{display:block;margin-top:4px;font-size:16px}.final{padding:12px 14px;border:2px solid;border-radius:10px;margin:12px 0}.final.PASS{border-color:#12b76a;background:#ecfdf3}.final.FAIL{border-color:#f04438;background:#fef3f2}.final.REVIEW{border-color:#f79009;background:#fffaeb}.final strong{font-size:27px}
      .pass,.PASS{color:#067647}.fail,.FAIL{color:#b42318}.review,.REVIEW{color:#b54708}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reportChart{break-inside:avoid;border:1px solid #e4e7ec;border-radius:9px;padding:8px;margin:10px 0}.reportChart svg{width:100%;height:auto}
      .liteBlock{break-inside:avoid}.sourceCharts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sourceChart{break-inside:avoid}.sourceChart img{width:100%;border:1px solid #d0d5dd}.chartImageWrap{position:relative}.nflHighlight{position:absolute;right:8px;top:8px;background:#fff3cd;border:3px solid #f79009;border-radius:9px;padding:7px 10px;text-align:center;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.18)}.nflHighlight b{font-size:16px;color:#b54708}
      .note{padding:8px;background:#fffaeb;border:1px solid #fedf89;border-radius:8px}.actions{position:sticky;top:0;background:#fff;padding:8px 0;border-bottom:1px solid #e4e7ec;margin-bottom:12px}.actions button{padding:8px 12px;border:0;border-radius:7px;background:#175cd3;color:#fff;font-weight:700;margin-right:6px}.small{color:#667085;font-size:9.5px}
      @media print{
        .actions{display:none}
        .sourceCharts{grid-template-columns:1fr 1fr;gap:6px}
        .sourceChart img{max-height:90mm;object-fit:contain}
        .reportChart{padding:5px;margin:5px 0}
        h2{margin-top:9px;margin-bottom:4px}
        h3{margin:5px 0}
        table{margin:3px 0 6px}
        th,td{padding:4px 5px}
        .note{padding:5px}
        .basisNotes{break-before:avoid;page-break-before:avoid;break-inside:avoid}
        a{color:inherit;text-decoration:none}
      }
      @media(max-width:700px){.grid2,.sourceCharts{grid-template-columns:1fr}.top{display:block}.meta{text-align:left;margin-top:8px}}
      </style></head><body>
      <div class="actions"><button onclick="returnToCalculator()">← Return to Calculator</button><button onclick="window.print()">Print / Save PDF</button><button onclick="downloadHtml()">Download HTML</button></div>
      <div class="top"><div><div class="brand">CS ECO GLASS</div><div class="title">Facade Design and Structural Optimization Report</div><div>Thailand DPT + ASTM E1300</div></div><div class="meta"><b>${esc(reportId)}</b><br>${esc(stamp)}<br>Prepared by: <b>${esc(employee)}</b></div></div>

      <table><tr><th>Project</th><td>${esc(project||"—")}</td><th>Client</th><td>${esc(client||"—")}</td></tr>
      <tr><th>Reference</th><td>${esc(ref||"—")}</td><th>Panel Code</th><td>${esc(panelCode||"—")}</td></tr>
      <tr><th>Floor</th><td>${esc(floor||"—")}</td><th>Coating Layer(s)</th><td>${coatingLayers}</td></tr>
      <tr><th>Coating 1</th><td>${esc(coating1Code||"—")} ${coating1Code?`· #${esc(coating1Surface)}`:""}</td>
          <th>Coating 2</th><td>${coatingLayers===2 ? `${esc(coating2Code||"—")} ${coating2Code?`· #${esc(coating2Surface)}`:""}` : "N/A"}</td></tr>
      <tr><th>Panel size</th><td>${esc(width)} × ${esc(height)} mm</td><th>Air Gap</th><td>${assembly.includes("Double")?esc(airgap)+" mm":"N/A"}</td></tr>
      <tr><th>Assembly</th><td>${esc(assembly)}</td><th>Support</th><td>${esc(support)}</td></tr>
      <tr><th>Load duration</th><td>${esc(duration)}</td><th>Deflection criterion</th><td>${esc(criterion)}</td></tr></table>
      <div class="overallStructure"><span>OVERALL GLASS STRUCTURE</span><b>${esc(overallStructure||"—")}</b></div>

      <div class="final ${final}"><div>FINAL RESULT</div><strong>${final}</strong><div>Design Wind Pressure Used: <b>${fmt(used,2)} kPa</b></div></div>

      <h2>1. DPT Wind Design</h2>
      ${dpt?`<table>
        <tr><th>Location</th><td>${esc(dpt.province)}</td><th>DPT Group</th><td>${esc(dpt.group)}</td></tr>
        <tr><th>Installation height</th><td>${fmt(dpt.z,1)} m</td><th>Terrain used</th><td>${esc(dpt.terrainUsed)}</td></tr>
        <tr><th>V50</th><td>${fmt(dpt.v50,0)} m/s</td><th>TF / V used</th><td>${fmt(dpt.tf,2)} / ${fmt(dpt.V,2)} m/s</td></tr>
        <tr><th>q</th><td>${fmt(dpt.q,3)} kPa</td><th>Ce / Iw</th><td>${fmt(dpt.Ce,3)} / ${fmt(dpt.Iw,2)}</td></tr>
        <tr><th>Cg / Cgi</th><td>${fmt(dpt.Cg,2)} / ${fmt(dpt.Cgi,2)}</td><th>Cp / Cpi</th><td>${fmt(dpt.Cp,2)} / ${fmt(dpt.cpiMin,2)} to ${fmt(dpt.cpiMax,2)}</td></tr>
        <tr><th>DPT suggested pressure</th><td>${fmt(dpt.suggested,2)} kPa</td><th>Pressure used</th><td><b>${fmt(used,2)} kPa</b></td></tr>
      </table>${windChart(dpt,used)}`:"<p>DPT calculation not available.</p>"}

      <h2>2. ASTM E1300 Strength & Deflection</h2>
      ${arr.map(r=>liteTable(r,used)).join("")}

      <h2>3. Engineering Charts</h2>
      ${barChart("Load resistance vs design pressure", strengthRows)}
      ${deflRows.length?barChart("Calculated deflection vs allowable limit",deflRows):'<div class="note">Deflection comparison chart unavailable because one or more lites require REVIEW or no numeric allowable limit is selected.</div>'}

      <h2>4. ASTM Source Figures</h2>
      <div class="sourceCharts">${chartImgs}</div>

      <section class="basisNotes">
      <h2>5. Basis & Notes</h2>
      <div class="note">
      <b>Wind:</b> DPT มยผ.1311-50 simple-method pre-check. The final Design Wind Pressure Used may be manually overridden by the user.<br>
      <b>Strength:</b> PASS when ASTM Load Resistance LR ≥ Design Wind Pressure Used; FAIL when LR is lower. For a laminated lite with mixed heat-treatment plies, ASTM Table 1 does not explicitly assign a Basic Procedure GTF category; the report therefore shows REVIEW unless a project conservative weakest-ply rule or user classification is explicitly selected.<br>
      <b>Laminated interlayers:</b> PVB and SGP are not permitted to be mixed in this software. Both interlayer layers use the same selected material.<br>
      <b>Interlayer shear modulus:</b> default wind-load values are PVB G = 0.40 MPa (ASTM E1300 Appendix X8 reference, 50°C / 3 s) and SGP G = 12.7 MPa (Kuraray SentryGlas Xtra, 50°C / 3 s). Custom G may be entered when manufacturer-specific data is available.<br>
      <b>ASTM X9:</b> Γ, h<sub>ef,w</sub>, h<sub>1,ef,σ</sub>, and h<sub>2,ef,σ</sub> are calculated from the selected/default G and laminate geometry.<br>
      <b>Surface stress:</b> V9.4 implements a four-side laminated-glass analytical stress check for 3-second wind load using Appendix X9 effective stress thickness, a nonlinear two-way bending + membrane plate field, and Annex A2.2 Weibull probability of breakage. The A2.1 verification condition is enforced by calibration to the corresponding Annex A1 NFL point at Pb = 0.008.<br>
      <b>Scope:</b> strict ASTM A2 analytical surface-stress output is enabled for single laminated / Laminated Only, four-side simply supported, short-duration wind. For two-side support, V9.5 additionally reports numerical engineering stress and, when needed, an engineering deflection fallback using a one-way simply-supported strip model with ASTM X9 effective thickness. These two-side engineering values are explicitly outside ASTM E1300 6.3.2 four-side analytical scope. IG analytical stress remains REVIEW until ideal-gas load apportionment per 6.3.3 is implemented.<br>
      <b>Deflection:</b> the selected Thailand Typical criterion is a project criterion: allowable = min(short dimension / 90, 20 mm). ASTM E1300 itself requires deflection review and does not establish this as a universal glass limit.<br>
      <b>Review:</b> any configuration outside the implemented/digitized calculation range is reported as REVIEW rather than extrapolated.
      </div>
      <p class="small">Generated by CS ECO GLASS internal calculation tool V9.6.1. This report records the inputs and implemented calculation logic at the time of generation and should be reviewed against project-specific specifications and authority requirements.</p>
      </section>
      <script>
      function returnToCalculator(){if(window.opener&&!window.opener.closed){window.opener.focus();window.close();}else{history.back();}}
      function downloadHtml(){const b=new Blob([document.documentElement.outerHTML],{type:"text/html"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="${esc(reportId)}.html";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
      <\/script></body></html>`;

    const w=window.open("","_blank");
    if(!w){ alert("Popup blocked. Please allow popups for this site."); return; }
    w.document.open(); w.document.write(report); w.document.close();
  }

  return {generate};
})();
