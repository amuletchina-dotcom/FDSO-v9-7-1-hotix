
const ASTMFactors = (() => {
  const singleGTF = {
    short: {AN:1.0, HS:2.0, FT:4.0},
    long:  {AN:0.43, HS:1.3, FT:3.0}
  };

  // ASTM E1300 Table 2: Double IGU, short-duration load.
  // Matrix indexed [Lite 1 type][Lite 2 type] => [GTF1, GTF2].
  const iguShort = {
    AN:{AN:[0.9,0.9], HS:[1.0,1.9], FT:[1.0,3.8]},
    HS:{AN:[1.9,1.0], HS:[1.8,1.8], FT:[1.9,3.8]},
    FT:{AN:[3.8,1.0], HS:[3.8,1.9], FT:[3.6,3.6]}
  };

  // ASTM E1300 Table 3: Double IGU, long-duration load.
  const iguLong = {
    AN:{AN:[0.39,0.39], HS:[0.43,1.25], FT:[0.43,2.85]},
    HS:{AN:[1.25,0.43], HS:[1.17,1.17], FT:[1.25,2.85]},
    FT:{AN:[2.85,0.43], HS:[2.85,1.25], FT:[2.71,2.71]}
  };

  function gtfSingle(type, duration) {
    return singleGTF[duration][type];
  }

  function gtfIGU(type1, type2, duration) {
    const table = duration === "long" ? iguLong : iguShort;
    const v = table[type1][type2];
    return {gtf1:v[0], gtf2:v[1], table:duration === "long" ? 3 : 2};
  }

  function minimum(nominal) {
    const n = Number(nominal);
    return ASTM.min[n] ?? n;
  }

  // Appendix X3 stiffness basis.
  // Monolithic: minimum thickness^3.
  // Laminated short duration: monolithic-like; use sum of minimum glass-ply thicknesses, cubed.
  // Laminated long duration: layered; sum the individual glass-ply thickness cubes.
  function stiffness(lite, duration) {
    if (lite.kind === "mono") {
      const t = minimum(lite.thickness);
      return {
        stiffness:Math.pow(t,3),
        basis:`${t.toFixed(2)}³`,
        detail:`${lite.thickness} mm nominal → ${t.toFixed(2)} mm minimum`
      };
    }

    const a = minimum(lite.p1);
    const b = minimum(lite.p2);
    if (duration === "short") {
      const t = a + b;
      return {
        stiffness:Math.pow(t,3),
        basis:`(${a.toFixed(2)} + ${b.toFixed(2)})³`,
        detail:`Laminated short-duration monolithic-like basis: (${a.toFixed(2)} + ${b.toFixed(2)}) mm`
      };
    }
    return {
      stiffness:Math.pow(a,3)+Math.pow(b,3),
      basis:`${a.toFixed(2)}³ + ${b.toFixed(2)}³`,
      detail:`Laminated long-duration layered basis: ${a.toFixed(2)}³ + ${b.toFixed(2)}³`
    };
  }

  function lsfIGU(lite1, lite2, duration) {
    const s1 = stiffness(lite1,duration);
    const s2 = stiffness(lite2,duration);
    const total = s1.stiffness + s2.stiffness;
    return {
      lsf1:s1.stiffness/total,
      lsf2:s2.stiffness/total,
      s1, s2,
      source:(duration === "long" && (lite1.kind === "lam" || lite2.kind === "lam"))
        ? "ASTM Table 6 / Appendix X3 layered basis"
        : "ASTM Table 5 / Appendix X3 stiffness basis"
    };
  }

  function gtfTableData(duration) {
    return duration === "long" ? iguLong : iguShort;
  }

  return {singleGTF, iguShort, iguLong, gtfSingle, gtfIGU, lsfIGU, stiffness, gtfTableData};
})();
