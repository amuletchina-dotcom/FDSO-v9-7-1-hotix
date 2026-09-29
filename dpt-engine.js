
const DPTWind = (() => {
  const groups = {
    "1":  {v50:25, tf:1.00},
    "2":  {v50:27, tf:1.00},
    "3":  {v50:29, tf:1.00},
    "4A": {v50:25, tf:1.20},
    "4B": {v50:25, tf:1.08}
  };

  // DPT 1311-50 Appendix A, Table A-1 (76 provinces).
  // Province exceptions: Tak, Nakhon Si Thammarat, Surat Thani.
  const provinces = [
    ["Bangkok","กรุงเทพมหานคร","1"],["Amnat Charoen","อำนาจเจริญ","2"],
    ["Ang Thong","อ่างทอง","1"],["Bueng Kan","บึงกาฬ",null], // not in 2007 76-province table
    ["Buriram","บุรีรัมย์","1"],["Chachoengsao","ฉะเชิงเทรา","1"],
    ["Chai Nat","ชัยนาท","1"],["Chaiyaphum","ชัยภูมิ","1"],["Chanthaburi","จันทบุรี","1"],
    ["Chiang Mai","เชียงใหม่","3"],["Chiang Rai","เชียงราย","3"],["Chonburi","ชลบุรี","1"],
    ["Chumphon","ชุมพร","4A"],["Kalasin","กาฬสินธุ์","1"],["Kamphaeng Phet","กำแพงเพชร","1"],
    ["Kanchanaburi","กาญจนบุรี","1"],["Khon Kaen","ขอนแก่น","1"],["Krabi","กระบี่","4B"],
    ["Lampang","ลำปาง","2"],["Lamphun","ลำพูน","2"],["Loei","เลย","1"],
    ["Lop Buri","ลพบุรี","1"],["Mae Hong Son","แม่ฮ่องสอน","3"],["Maha Sarakham","มหาสารคาม","1"],
    ["Mukdahan","มุกดาหาร","2"],["Nakhon Nayok","นครนายก","1"],["Nakhon Pathom","นครปฐม","1"],
    ["Nakhon Phanom","นครพนม","2"],["Nakhon Ratchasima","นครราชสีมา","1"],
    ["Nakhon Sawan","นครสวรรค์","1"],["Nakhon Si Thammarat","นครศรีธรรมราช","SPECIAL_NST"],
    ["Nan","น่าน","2"],["Narathiwat","นราธิวาส","4A"],["Nong Bua Lamphu","หนองบัวลำภู","1"],
    ["Nong Khai","หนองคาย","2"],["Nonthaburi","นนทบุรี","1"],["Pathum Thani","ปทุมธานี","1"],
    ["Pattani","ปัตตานี","4A"],["Phang Nga","พังงา","4B"],["Phatthalung","พัทลุง","4A"],
    ["Phayao","พะเยา","3"],["Phetchabun","เพชรบูรณ์","1"],["Phetchaburi","เพชรบุรี","4B"],
    ["Phichit","พิจิตร","1"],["Phitsanulok","พิษณุโลก","1"],["Phrae","แพร่","2"],
    ["Phuket","ภูเก็ต","4B"],["Prachin Buri","ปราจีนบุรี","1"],
    ["Prachuap Khiri Khan","ประจวบคีรีขันธ์","4A"],["Ranong","ระนอง","4B"],
    ["Ratchaburi","ราชบุรี","1"],["Rayong","ระยอง","1"],["Roi Et","ร้อยเอ็ด","1"],
    ["Sa Kaeo","สระแก้ว","1"],["Sakon Nakhon","สกลนคร","1"],["Samut Prakan","สมุทรปราการ","1"],
    ["Samut Sakhon","สมุทรสาคร","1"],["Samut Songkhram","สมุทรสงคราม","1"],
    ["Saraburi","สระบุรี","1"],["Satun","สตูล","4B"],["Sing Buri","สิงห์บุรี","1"],
    ["Sisaket","ศรีสะเกษ","1"],["Songkhla","สงขลา","4A"],["Sukhothai","สุโขทัย","1"],
    ["Suphan Buri","สุพรรณบุรี","1"],["Surat Thani","สุราษฎร์ธานี","SPECIAL_SURAT"],
    ["Surin","สุรินทร์","1"],["Tak","ตาก","SPECIAL_TAK"],["Trang","ตรัง","4B"],
    ["Trat","ตราด","1"],["Ubon Ratchathani","อุบลราชธานี","2"],["Udon Thani","อุดรธานี","1"],
    ["Uthai Thani","อุทัยธานี","1"],["Uttaradit","อุตรดิตถ์","1"],["Yala","ยะลา","4A"],
    ["Yasothon","ยโสธร","2"],["Ayutthaya","พระนครศรีอยุธยา","1"]
  ].filter(x => x[0] !== "Bueng Kan"); // DPT 1311-50 predates Bueng Kan province.

  const special = {
    SPECIAL_TAK: {
      defaultGroup:"2",
      areas:[
        {value:"umphang", label:"Umphang / อุ้มผาง", group:"1"},
        {value:"other", label:"Other areas / บริเวณอื่นๆ", group:"2"}
      ]
    },
    SPECIAL_NST: {
      defaultGroup:"4B",
      areas:[
        {value:"east", label:"Mueang, Khanom, Sichon, Tha Sala, Phipun, Phrom Khiri, Lan Saka, Ron Phibun, Pak Phanang, Chian Yai, Hua Sai, Cha-uat", group:"4A"},
        {value:"other", label:"Other areas / บริเวณอื่น", group:"4B"}
      ]
    },
    SPECIAL_SURAT: {
      defaultGroup:"4B",
      areas:[
        {value:"east", label:"Mueang, Tha Chana, Chaiya, Tha Chang, Khiri Rat Nikhom, Phunphin, Kanchanadit, Don Sak, Ban Na Doem, Ban Na San, Ko Samui, Ko Pha-ngan", group:"4A"},
        {value:"other", label:"Other areas / บริเวณอื่นๆ", group:"4B"}
      ]
    }
  };

  const importance = {
    low:{label:"Low / น้อย", strength:0.80},
    normal:{label:"Normal / ปกติ", strength:1.00},
    high:{label:"High / มาก", strength:1.15},
    veryhigh:{label:"Very High / สูงมาก", strength:1.15}
  };

  const openingCases = {
    "1":{label:"Case 1 — very tight / openings <0.1%", min:-0.15, max:0.00},
    "2":{label:"Case 2 — normal building / uneven leakage", min:-0.45, max:0.30},
    "3":{label:"Case 3 — large openings", min:-0.70, max:0.70}
  };

  let manualEdited = false;
  let last = null;

  const $d = id => document.getElementById(id);

  function provinceOptions(){
    return provinces
      .slice()
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([en,th])=>`<option value="${en}">${en} / ${th}</option>`)
      .join("");
  }

  function provinceRow(name){
    return provinces.find(x=>x[0]===name);
  }

  function resolveGroup(){
    const p = provinceRow($d("dptProvince").value);
    if (!p) return null;
    if (!String(p[2]).startsWith("SPECIAL_")) return p[2];
    const spec = special[p[2]];
    const area = spec.areas.find(x=>x.value===$d("dptDistrict").value);
    return area ? area.group : spec.defaultGroup;
  }

  function updateDistrict(){
    const p = provinceRow($d("dptProvince").value);
    const box = $d("dptDistrictBox");
    const sel = $d("dptDistrict");
    if (!p || !String(p[2]).startsWith("SPECIAL_")) {
      box.classList.add("hidden");
      sel.innerHTML = "";
      return;
    }
    const spec = special[p[2]];
    sel.innerHTML = spec.areas.map(x=>`<option value="${x.value}">${x.label}</option>`).join("");
    box.classList.remove("hidden");
  }

  function ceSimple(z, terrain){
    z = Math.max(Number(z)||0.1,0.1);
    if (terrain==="A") return Math.max(0.9, Math.pow(z/10,0.2));
    return Math.max(0.7, 0.7*Math.pow(z/12,0.3));
  }

  function calculate(){
    const province = $d("dptProvince").value;
    const group = resolveGroup();
    const gd = groups[group];
    const z = Math.max(0.1, Number($d("dptHeight").value)||0.1);
    const limit = $d("dptLimit").value;
    const imp = $d("dptImportance").value;
    const useTF = $d("dptUseTF").checked;
    const tfUsed = (limit==="strength" && useTF) ? gd.tf : 1.0;
    const V = limit==="service" ? gd.v50 : gd.v50*tfUsed;
    const Iw = limit==="service" ? 0.75 : importance[imp].strength;
    const q = 0.5 * 1.25 * V * V / 1000; // kPa

    let terrainSelected = $d("dptTerrain").value;
    let terrainUsed = terrainSelected;
    let terrainForced = false;

    // DPT 2.4.1 exception: <=80m and V=TF*V50 <=25 m/s -> Terrain A only.
    if (limit==="strength" && z<=80 && V<=25) {
      terrainUsed = "A";
      terrainForced = terrainSelected !== "A";
    }

    const Ce = ceSimple(z,terrainUsed);
    const Cg = 2.5;  // small cladding/window, DPT 2.5.1(b)
    const Cgi = 2.0; // DPT 2.5.2 default
    const facade = $d("dptFacade").value;
    const Cp = facade==="windward" ? 0.8 : facade==="leeward" ? -0.5 : Number($d("dptCustomCp").value)||0;
    const op = openingCases[$d("dptOpening").value];

    const base = Iw*q*Ce;
    const pext = base*Cg*Cp;
    const pi1 = base*Cgi*op.min;
    const pi2 = base*Cgi*op.max;
    const net1 = pext - pi1;
    const net2 = pext - pi2;
    const candidate = Math.abs(net1)>=Math.abs(net2) ? net1 : net2;
    const suggested = Math.abs(candidate);

    last = {
      province, group, v50:gd.v50, tf:gd.tf, tfUsed, V, Iw, q, z,
      terrainSelected, terrainUsed, terrainForced, Ce, Cg, Cgi, Cp,
      opening:$d("dptOpening").value, cpiMin:op.min, cpiMax:op.max,
      pext, net1, net2, governingNet:candidate, suggested, limit, useTF
    };

    render(last);

    if (!manualEdited || !$d("dptUsedPressure").value) {
      $d("dptUsedPressure").value = suggested.toFixed(2);
      setStatus(false);
    }
    return last;
  }

  function setStatus(manual){
    const el = $d("dptOverrideStatus");
    el.textContent = manual ? "MANUAL OVERRIDE" : "AUTO — DPT suggested";
    el.classList.toggle("manual",manual);
  }

  function render(r){
    $d("dptSuggested").textContent = `${r.suggested.toFixed(2)} kPa`;
    $d("dptGroup").textContent = r.group;
    $d("dptV50").textContent = `${r.v50.toFixed(0)} m/s`;
    $d("dptTF").textContent = `${r.tf.toFixed(2)}${r.tfUsed!==1 ? " (used)" : ""}`;
    $d("dptVref").textContent = `${r.V.toFixed(2)} m/s`;
    $d("dptQ").textContent = `${r.q.toFixed(3)} kPa`;
    $d("dptCe").textContent = `${r.Ce.toFixed(3)} (${r.terrainUsed})`;
    $d("dptIw").textContent = r.Iw.toFixed(2);

    const tfNote = (r.group==="4A" || r.group==="4B")
      ? `<div><b>Typhoon factor:</b> DPT Appendix A gives TF ${r.tf.toFixed(2)} for Group ${r.group}. The standard notes TF is required for “Very High” importance buildings; for other buildings its use is at the structural designer’s discretion. This calculator defaults to ON as a conservative project setting.</div>`
      : "";

    const terrNote = r.terrainForced
      ? `<div class="dptWarn"><b>Terrain changed to A by DPT simple-method exception:</b> height ≤80 m and reference wind speed V ≤25 m/s.</div>`
      : "";

    $d("dptEvidence").innerHTML = `
      <div class="dptEvidenceGrid">
        <div><span>Location</span><b>${r.province}</b></div>
        <div class="hlDpt"><span>DPT Group</span><b>${r.group}</b></div>
        <div><span>V50</span><b>${r.v50.toFixed(0)} m/s</b></div>
        <div><span>Reference V used</span><b>${r.V.toFixed(2)} m/s</b></div>
        <div><span>q = ½ρV²</span><b>${r.q.toFixed(3)} kPa</b></div>
        <div><span>Ce</span><b>${r.Ce.toFixed(3)}</b></div>
        <div><span>Iw</span><b>${r.Iw.toFixed(2)}</b></div>
        <div><span>Cg / Cgi</span><b>${r.Cg.toFixed(1)} / ${r.Cgi.toFixed(1)}</b></div>
        <div><span>Cp</span><b>${r.Cp.toFixed(2)}</b></div>
        <div><span>Cpi range</span><b>${r.cpiMin.toFixed(2)} to ${r.cpiMax.toFixed(2)}</b></div>
      </div>
      <div class="formulaBox">
        <b>DPT simple method:</b> p<sub>external</sub> = Iw × q × Ce × Cg × Cp<br>
        p<sub>internal</sub> = Iw × q × Ce × Cgi × Cpi<br>
        Net pressure checked at both ends of the selected Cpi range; governing absolute value = <b>${r.suggested.toFixed(2)} kPa</b>.
      </div>
      ${tfNote}
      ${terrNote}
      <div class="dptCaveat">
        <b>Preliminary glass/cladding pressure.</b> Cp depends on building geometry, wind direction and facade position. 
        For low-rise local edge/corner zones or project-specific geometry, use the appropriate DPT Appendix B coefficient or manually override the final design pressure.
      </div>`;
  }

  function init(){
    if (!$d("dptProvince")) return;
    $d("dptProvince").innerHTML = provinceOptions();
    $d("dptProvince").value = "Bangkok";
    updateDistrict();

    ["dptProvince","dptDistrict","dptHeight","dptTerrain","dptLimit","dptImportance",
     "dptFacade","dptCustomCp","dptOpening"].forEach(id=>{
      const el=$d(id);
      if (!el) return;
      el.addEventListener("change",()=>{
        if (id==="dptProvince") updateDistrict();
        $d("dptCustomCpBox").classList.toggle("hidden",$d("dptFacade").value!=="custom");
        calculate();
      });
    });

    $d("dptUseTF").addEventListener("change",calculate);
    $d("dptCalc").addEventListener("click",calculate);
    $d("dptUseSuggested").addEventListener("click",()=>{
      const r=calculate();
      $d("dptUsedPressure").value=r.suggested.toFixed(2);
      manualEdited=false;
      setStatus(false);
    });
    $d("dptUsedPressure").addEventListener("input",()=>{
      manualEdited=true;
      setStatus(true);
    });

    calculate();
  }

  function getUsedPressure(){
    return Number($d("dptUsedPressure")?.value)||null;
  }

  return {init,calculate,getUsedPressure,getLast:()=>last,groups,provinces};
})();
