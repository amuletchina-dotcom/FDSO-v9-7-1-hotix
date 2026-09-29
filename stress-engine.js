
const ASTMStress = (() => {
  // ASTM E1300 Annex A2 constants, SI units.
  const K = 2.86e-53;     // N^-7 m^12
  const M = 7;
  const N_DUR = 16;
  const E_MPA = 71700;
  const NU = 0.22;
  const PB_LIMIT = 0.008;
  const B_TARGET = -Math.log(1 - PB_LIMIT);

  const RCSS = { AN:0, HS:24.0, FT:69.0 }; // MPa, ASTM A2.2
  const NOMINALS = Object.keys(ASTM.min).map(Number).sort((a,b)=>a-b);

  function principal(sx, sy, txy) {
    const avg = 0.5 * (sx + sy);
    const rad = Math.sqrt((0.5*(sx-sy))**2 + txy**2);
    return { max: avg + rad, min: avg - rad };
  }

  function cFactor(r) {
    const x = Math.max(-1, Math.min(1, r));
    return -0.005*x**6 + 0.022*x**5 + 0.055*x**4
      - 0.039*x**3 - 0.031*x**2 + 0.06*x + 0.8;
  }

  function x1Deflection(widthMm, heightMm, tMm, qKPa) {
    const z = ASTMDeflection.x1FourSide({
      a: Math.max(widthMm,heightMm),
      b: Math.min(widthMm,heightMm),
      t: tMm,
      q: qKPa
    });
    if (z?.ok && Number.isFinite(z.w)) return z.w;

    // Small-load fallback: simply-supported plate approximation.
    // It is used only to keep the nonlinear stress model continuous below
    // Appendix X1's logarithmic usable range; calibration to the ASTM NFL
    // chart is performed separately for each geometry.
    const short = Math.min(widthMm,heightMm);
    const ar = Math.max(widthMm,heightMm)/short;
    const arUsed = Math.min(ar,5);
    const alpha = 0.00406 * (1 + 0.15*(arUsed-1)/(arUsed+1));
    const qPa = qKPa*1000;
    const aM = short/1000;
    const tM = tMm/1000;
    const EPa = E_MPA*1e6;
    const D = EPa*tM**3/(12*(1-NU**2));
    return alpha*qPa*aM**4/D*1000;
  }

  function rawStressCells({width,height,t,q,grid=21}) {
    const a = Number(width);
    const b = Number(height);
    const tt = Number(t);
    const qq = Number(q);
    if (!(a>0 && b>0 && tt>0 && qq>0)) return null;

    const w0 = x1Deflection(a,b,tt,qq);
    if (!(w0>=0)) return null;

    const areaCell = (a/1000)*(b/1000)/(grid*grid);
    const cells = [];
    let maxSurface = 0;

    // Ritz-type nonlinear plate field:
    // w = w0 sin(pi x/a) sin(pi y/b)
    // bending curvature + geometric membrane strain terms are both included.
    for (let i=0;i<grid;i++) {
      const x = (i+0.5)/grid*a;
      const sxn = Math.sin(Math.PI*x/a);
      const cx = Math.cos(Math.PI*x/a);

      for (let j=0;j<grid;j++) {
        const y = (j+0.5)/grid*b;
        const syn = Math.sin(Math.PI*y/b);
        const cy = Math.cos(Math.PI*y/b);

        const w = w0*sxn*syn;
        const wx = w0*(Math.PI/a)*cx*syn;
        const wy = w0*(Math.PI/b)*sxn*cy;
        const wxx = -w0*(Math.PI/a)**2*sxn*syn;
        const wyy = -w0*(Math.PI/b)**2*sxn*syn;
        const wxy = w0*(Math.PI/a)*(Math.PI/b)*cx*cy;

        // geometric membrane strains (dimensionless; mm/mm)
        const exm = 0.5*wx*wx;
        const eym = 0.5*wy*wy;
        const gxym = wx*wy;

        const sxm = E_MPA/(1-NU**2)*(exm + NU*eym);
        const sym = E_MPA/(1-NU**2)*(eym + NU*exm);
        const txym = E_MPA/(2*(1+NU))*gxym;

        // surface bending stresses, z = +/- t/2
        const z = tt/2;
        const sxb = -E_MPA*z/(1-NU**2)*(wxx + NU*wyy);
        const syb = -E_MPA*z/(1-NU**2)*(wyy + NU*wxx);
        const txyb = -E_MPA*z/(1+NU)*wxy;

        for (const face of [1,-1]) {
          const p = principal(
            sxm + face*sxb,
            sym + face*syb,
            txym + face*txyb
          );
          maxSurface = Math.max(maxSurface,p.max);
          cells.push({smax:p.max,smin:p.min,area:areaCell});
        }
      }
    }
    return {cells,maxSurface,w0,grid};
  }

  function breakageFromCells(cells, type, durationSec=3, scale=1) {
    const rcss = RCSS[type] ?? 0;
    let sum = 0;
    let maxStress = 0;

    for (const c of cells) {
      const smax = c.smax*scale;
      const smin = c.smin*scale;
      maxStress = Math.max(maxStress,smax);

      const effMax = smax - rcss;
      if (!(effMax>0)) continue;

      const effMin = smin - rcss;
      const r = effMin/effMax;
      const ci = cFactor(r);

      // ASTM A2.2 uses SI stress in Pa with k = 2.86e-53 N^-7 m^12.
      const stressPa = effMax*1e6;
      sum += ci * (durationSec/60)**(1/N_DUR) * stressPa**M * c.area;
    }

    const B = K*sum;
    const Pb = 1 - Math.exp(-B);
    return {Pb,B,maxStress,rcss};
  }

  function nearestNominalByMinimum(tMm) {
    let best = NOMINALS[0], err = Infinity;
    for (const n of NOMINALS) {
      const e = Math.abs((ASTM.min[n] ?? n) - tMm);
      if (e < err) {err=e; best=n;}
    }
    return best;
  }

  function calibrationScale({width,height,t}) {
    const nominal = nearestNominalByMinimum(t);
    const tref = ASTM.min[nominal] ?? nominal;
    const ref = NFLEngine.calculate({
      kind:"mono",
      support:"4",
      designation:nominal,
      width,
      height,
      supportedEdges:"lr",
      oneSupportedEdge:"left"
    });
    if (!ref?.ok || !(ref.nfl>0)) {
      return {ok:false,error:"Unable to establish ASTM A2.1 NFL-chart calibration point."};
    }

    const raw = rawStressCells({width,height,t:tref,q:ref.nfl,grid:21});
    if (!raw) return {ok:false,error:"Unable to generate nonlinear plate stress field."};

    const b0 = breakageFromCells(raw.cells,"AN",3,1).B;
    if (!(b0>0)) return {ok:false,error:"A2.1 calibration produced an invalid breakage integral."};

    // For AN, RCSS = 0 and A2.2 has m=7, so a uniform stress scale changes
    // B by scale^7. Choose the scale so the reference NFL point gives Pb=0.008,
    // exactly matching A2.1's required verification condition.
    const scale = (B_TARGET/b0)**(1/M);

    return {
      ok:true,scale,referenceNFL:ref.nfl,referenceNominal:nominal,
      referenceThickness:tref,referenceFigure:ref.figure,
      verificationPb:breakageFromCells(raw.cells,"AN",3,scale).Pb
    };
  }

  function analyzePly({width,height,effectiveThickness,q,type,durationSec=3}) {
    const t = Number(effectiveThickness);
    const load = Number(q);
    if (!(t>0 && load>0)) return {ok:false,error:"Invalid effective thickness or load."};

    const cal = calibrationScale({width,height,t});
    if (!cal.ok) return cal;

    const raw = rawStressCells({width,height,t,q:load,grid:21});
    if (!raw) return {ok:false,error:"Nonlinear plate stress field could not be generated."};

    const br = breakageFromCells(raw.cells,type,durationSec,cal.scale);
    return {
      ok:true,
      method:"ASTM E1300 A2.1 calibrated nonlinear two-way plate model + A2.2 Weibull",
      maxSurfaceStress:br.maxStress,
      Pb:br.Pb,
      B:br.B,
      pass:br.Pb <= PB_LIMIT,
      limit:PB_LIMIT,
      rcss:br.rcss,
      effectiveThickness:t,
      load,
      centerDeflection:raw.w0,
      calibration:cal
    };
  }


  function analyzeTwoSideEngineering(r, totalDesignLoad, assembly, duration) {
    if (!r?.input || r.input.kind !== "lam") {
      return {applicable:false, reason:"Not laminated glass."};
    }
    if (duration !== "short") {
      return {applicable:false, reason:"Two-side engineering surface stress is enabled for 3-second wind load only."};
    }
    if (assembly === "igu") {
      return {applicable:false, reason:"Two-side laminated IG stress requires a dedicated IG load-apportionment method."};
    }

    const x9 = r.input.x9;
    const L = Number(r.unsupported);
    const q = Number(totalDesignLoad);
    if (!x9 || !(L > 0) || !(q > 0)) {
      return {applicable:false, reason:"X9 effective thickness, span, or design pressure is unavailable."};
    }

    // One-way simply-supported strip under uniform pressure.
    // Unit-width maximum bending moment: M = q L^2 / 8.
    // Surface bending stress: sigma = 6 M / t_eff^2.
    // q[kPa] = q/1000 N/mm^2.
    const qNmm2 = q / 1000;
    const M = qNmm2 * L * L / 8;
    const stress = t => 6 * M / (t * t);

    return {
      applicable:true,
      ok:true,
      engineering:true,
      strictASTM:false,
      method:"Engineering two-side one-way simply-supported strip + ASTM X9 effective stress thickness",
      span:L,
      q,
      exterior:{
        effectiveThickness:x9.h1efSigma,
        maxSurfaceStress:stress(x9.h1efSigma),
        type:r.input.p1type
      },
      interior:{
        effectiveThickness:x9.h2efSigma,
        maxSurfaceStress:stress(x9.h2efSigma),
        type:r.input.p2type
      },
      note:"Numerical engineering stress only. It is outside ASTM E1300 6.3.2 four-side analytical scope, so no ASTM A2 PASS/FAIL is assigned."
    };
  }

  function analyzeLaminated(r, totalDesignLoad, assembly, support, duration) {
    if (!r?.input || r.input.kind!=="lam") {
      return {applicable:false,reason:"Not laminated glass."};
    }
    if (support==="2") {
      return analyzeTwoSideEngineering(r,totalDesignLoad,assembly,duration);
    }
    if (support!=="4") {
      return {applicable:false,reason:"ASTM E1300 6.3.2 analytical laminated procedure is enabled here only for four-side simply supported glazing."};
    }
    if (duration!=="short") {
      return {applicable:false,reason:"A2 stress solver in this release is validated for the 3-second wind-load case only."};
    }
    if (assembly==="igu") {
      return {applicable:false,reason:"Strict ASTM IG analytical stress requires ideal-gas load apportionment per 6.3.3; basic LSF is not substituted in this stress module."};
    }
    const x9 = r.input.x9;
    if (!x9) return {applicable:false,reason:"ASTM X9 effective stress thickness is unavailable."};

    const q = Number(totalDesignLoad);
    const width = Number(document.getElementById("width")?.value);
    const height = Number(document.getElementById("height")?.value);

    const exterior = analyzePly({
      width,height,effectiveThickness:x9.h1efSigma,q,
      type:r.input.p1type,durationSec:3
    });
    const interior = analyzePly({
      width,height,effectiveThickness:x9.h2efSigma,q,
      type:r.input.p2type,durationSec:3
    });

    const ok = exterior.ok && interior.ok;
    return {
      applicable:true,ok,
      exterior,interior,
      pass: ok && exterior.pass && interior.pass,
      method:"ASTM E1300 6.3.2 / Annex A2 with Appendix X9 effective stress thickness",
      note:"Each ply is checked independently. A2.1 verification is enforced by calibrating the nonlinear plate model to the ASTM Annex A1 NFL point at Pb = 0.008 for the same geometry."
    };
  }

  return {
    analyzeLaminated,
    analyzeTwoSideEngineering,
    analyzePly,
    PB_LIMIT,
    RCSS
  };
})();
