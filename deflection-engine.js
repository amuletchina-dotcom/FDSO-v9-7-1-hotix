
const ASTMDeflection = (() => {
  const E = 71.7e6; // kPa, ASTM E1300 Appendix X1

  // ASTM Table 4 minimum thicknesses, also exposed as ASTM.min in this app.
  const minT = ASTM.min;

  function interp1(points, x, logX=false, logY=false) {
    if (!points?.length) return null;
    const P = points.slice().sort((a,b)=>a[0]-b[0]);
    if (x < P[0][0] || x > P[P.length-1][0]) return null;
    for (let i=0;i<P.length-1;i++) {
      const [x1,y1]=P[i], [x2,y2]=P[i+1];
      if (x>=x1 && x<=x2) {
        let X=x, X1=x1, X2=x2, Y1=y1, Y2=y2;
        if (logX) { X=Math.log(x); X1=Math.log(x1); X2=Math.log(x2); }
        if (logY) { Y1=Math.log(y1); Y2=Math.log(y2); }
        const f=(X-X1)/(X2-X1);
        let y=Y1+f*(Y2-Y1);
        if (logY) y=Math.exp(y);
        return y;
      }
    }
    return P[P.length-1][1];
  }

  function interpCurves(curves, ar, x, opts={}) {
    const keys = Object.keys(curves).map(Number).sort((a,b)=>a-b);
    if (ar < keys[0]) return null;
    // ASTM 3-side charts show AR=0.5, 0.75, 1.0, 1.5 and AR>1.5.
    if (ar > 1.5 && curves[99]) {
      return interp1(curves[99],x,opts.logX,opts.logY);
    }
    if (ar >= keys[keys.length-1]) {
      return interp1(curves[keys[keys.length-1]],x,opts.logX,opts.logY);
    }
    let lo=keys[0], hi=keys[keys.length-1];
    for (let i=0;i<keys.length-1;i++) {
      if (ar>=keys[i] && ar<=keys[i+1]) { lo=keys[i]; hi=keys[i+1]; break; }
    }
    const y1=interp1(curves[lo],x,opts.logX,opts.logY);
    const y2=interp1(curves[hi],x,opts.logX,opts.logY);
    if (y1==null || y2==null) return null;
    if (hi===lo) return y1;
    return y1 + (ar-lo)/(hi-lo)*(y2-y1);
  }

  // Digitized anchor sets from the LOWER deflection charts.
  // Reference master: Fig. A1.20, 6 mm monolithic, 3-side.
  // X = Load × L^4 (kN·m²), L = free-edge length.
  const THREE_MONO_6 = {
    0.5:[[0.18,1],[0.55,5],[1.50,10],[2.20,15],[2.95,20],[4.00,25],[6.00,30]],
    0.75:[[0.12,1],[0.43,5],[1.25,10],[1.78,15],[2.20,20],[2.65,25],[3.10,30]],
    1.0:[[0.10,1],[0.36,5],[1.05,10],[1.50,15],[1.88,20],[2.25,25],[2.65,30]],
    1.5:[[0.08,1],[0.31,5],[0.90,10],[1.30,15],[1.65,20],[2.00,25],[2.35,30]],
    99:[[0.07,1],[0.27,5],[0.78,10],[1.12,15],[1.45,20],[1.75,25],[2.05,30]]
  };

  // Reference master: Fig. A1.36, 5 mm laminated designation, 3-side.
  const THREE_LAM_5 = {
    0.5:[[0.10,1],[0.63,5],[1.00,10],[1.35,15],[1.68,20],[2.10,25]],
    0.75:[[0.08,1],[0.42,5],[0.75,10],[1.02,15],[1.22,20],[1.44,25]],
    1.0:[[0.07,1],[0.34,5],[0.59,10],[0.82,15],[1.00,20],[1.20,25]],
    1.5:[[0.06,1],[0.27,5],[0.48,10],[0.67,15],[0.84,20],[1.00,25]],
    99:[[0.05,1],[0.22,5],[0.40,10],[0.56,15],[0.70,20],[0.83,25]]
  };

  // Reference 6 mm curves from Figs. A1.27 / A1.28 (monolithic) and A1.43 / A1.44 (laminated).
  // Log-log interpolation follows the printed chart axes.
  const TWO_MONO_6 = [[0.11,1],[0.22,2],[0.32,3],[0.55,5],[1.30,10],[3.20,20],[5.50,30],[11.0,50]];
  const TWO_LAM_6  = [[0.045,1],[0.08,2],[0.12,3],[0.20,5],[0.45,10],[1.00,20],[1.50,30],[2.50,50]];
  const ONE_MONO_6 = [[0.010,1],[0.025,2],[0.040,3],[0.070,5],[0.14,10],[0.30,20],[0.48,30],[0.90,50]];
  const ONE_LAM_6  = [[0.0045,1],[0.012,2],[0.020,3],[0.040,5],[0.090,10],[0.22,20],[0.38,30],[0.80,50]];

  function x1FourSide({a,b,t,q}) {
    a=Number(a); b=Number(b); t=Number(t); q=Number(q);
    if (!(a>0 && b>0 && t>0 && q>0)) return {ok:false,error:"Invalid X1 input."};

    const long=Math.max(a,b), short=Math.min(a,b);
    const ar=long/short, arUsed=Math.min(ar,5);
    const r0=0.553-3.83*arUsed+1.11*arUsed**2-0.0969*arUsed**3;
    const r1=-2.29+5.83*arUsed-2.17*arUsed**2+0.2067*arUsed**3;
    const r2=1.485-1.908*arUsed+0.815*arUsed**2-0.0822*arUsed**3;
    const inner=q*(long*short)**2/(E*t**4);
    if (!(inner>1)) return {ok:false,lowLoad:true,inner,ar,arUsed,error:"Appendix X1 logarithmic expression is outside its usable range for this input."};
    const x=Math.log(Math.log(inner));
    const w=t*Math.exp(r0+r1*x+r2*x*x);
    return {ok:true,w,rounded:Math.round(w),r0,r1,r2,x,inner,ar,arUsed,long,short,t,q,E};
  }

  function refThickness(kind, designation, which) {
    if (which==="three") return kind==="mono" ? minT[6] : minT[5];
    return minT[6];
  }

  function targetThickness(input) {
    const d = input.kind==="mono" ? Number(input.thickness) : Number(input.designation);
    return minT[d] ?? d;
  }

  function scaledChartResult(master, Xactual, t, tref, mode="linear", ar=null) {
    // Dimensionless plate scaling: X/t^4 and w/t.
    const Xref = Xactual * Math.pow(tref/t,4);
    let wref;
    if (ar == null) {
      wref=interp1(master,Xref,mode==="log",mode==="log");
    } else {
      wref=interpCurves(master,ar,Xref,{logX:false,logY:false});
    }
    if (wref==null) return {ok:false,outsideChart:true,Xref};
    const w=wref*(t/tref);
    return {ok:true,w,Xref,wref};
  }

  function threeSideGeometry() {
    const free = document.getElementById("threeFreeEdge")?.value || "top";
    const width = Number(document.getElementById("width")?.value);
    const height = Number(document.getElementById("height")?.value);
    const horizontal = free==="top" || free==="bottom";
    const freeEdge = horizontal ? width : height;
    const parallelSupported = horizontal ? height : width;
    return {free,freeEdge,parallelSupported,ar:freeEdge/parallelSupported};
  }

  function calcThree(r, applied) {
    const g=threeSideGeometry();
    if (!(g.ar>=0.5)) {
      return {
        ok:false,chartReview:true,method:`ASTM Fig. A1.${r.figure} lower deflection chart`,
        location:"center of unsupported edge",
        note:`Three-side chart AR=${g.ar.toFixed(2)} is below the digitized chart family minimum AR=0.50.`,
        appliedLoad:applied, threeGeom:g
      };
    }
    const Lm=g.freeEdge/1000;
    const X=applied*Math.pow(Lm,4);
    const t=targetThickness(r.input);
    const tref=refThickness(r.input.kind,r.input.designation,"three");
    const master=r.input.kind==="mono" ? THREE_MONO_6 : THREE_LAM_5;
    const z=scaledChartResult(master,X,t,tref,"linear",g.ar);

    if (!z.ok) return {
      ok:false,chartReview:true,method:`ASTM Fig. A1.${r.figure} lower deflection chart · digitized interpolation`,
      location:"center of unsupported edge",appliedLoad:applied,threeGeom:g,X,Xref:z.Xref,
      note:"The calculated point falls outside the digitized lower-chart range; review the ASTM figure directly."
    };

    return {
      ...z, appliedLoad:applied, totalDesignLoad:applied, support:"3",
      method:`ASTM Fig. A1.${r.figure} lower deflection chart · digitized interpolation`,
      location:"center of unsupported edge",threeGeom:g,X,minimumThickness:t,
      chartFigure:r.figure, chartDigitized:true
    };
  }

  function calcStrip(r, applied, support) {
    const L=Number(r.unsupported);
    const Lm=L/1000;
    const X=applied*Math.pow(Lm,4);
    const t=targetThickness(r.input);
    const tref=refThickness(r.input.kind,r.input.designation,"strip");
    let master;
    if (support==="2") master=r.input.kind==="mono" ? TWO_MONO_6 : TWO_LAM_6;
    else master=r.input.kind==="mono" ? ONE_MONO_6 : ONE_LAM_6;
    const z=scaledChartResult(master,X,t,tref,"log",null);

    const fig=r.figure;
    const location=support==="2" ? "center of unsupported edge" : "free edge opposite supported edge";
    if (!z.ok) {
      if (support==="2") {
        let teff=t;
        if (r.input.kind==="lam" && r.input.x9?.hefW) teff=Number(r.input.x9.hefW);

        // One-way simply-supported strip fallback:
        // wmax = 5 q L^4 / (384 E I), I/b = t_eff^3 / 12.
        const qNmm2=Number(applied)/1000;
        const E_MPa=71700;
        const IperWidth=Math.pow(teff,3)/12;
        const w=5*qNmm2*Math.pow(L,4)/(384*E_MPa*IperWidth);

        return {
          ok:true,
          engineeringFallback:true,
          chartReview:true,
          w,
          appliedLoad:applied,
          totalDesignLoad:applied,
          support,
          method:"Engineering two-side one-way simply-supported strip deflection",
          location,
          X,
          Xref:z.Xref,
          unsupported:L,
          minimumThickness:t,
          effectiveThickness:teff,
          chartFigure:fig,
          note:`Outside digitized ASTM Fig. A1.${fig} lower-chart range; numerical engineering fallback shown using a one-way simply-supported strip.`
        };
      }

      return {
        ok:false,chartReview:true,method:`ASTM Fig. A1.${fig} lower deflection chart · digitized interpolation`,
        location,appliedLoad:applied,X,Xref:z.Xref,
        note:"The calculated point falls outside the digitized lower-chart range; review the ASTM figure directly."
      };
    }

    return {
      ...z,appliedLoad:applied,totalDesignLoad:applied,support,
      method:`ASTM Fig. A1.${fig} lower deflection chart · digitized interpolation`,
      location,X,unsupported:L,minimumThickness:t,chartFigure:fig,chartDigitized:true
    };
  }

  function calcLite(r,totalDesignLoad,lsf,assembly) {
    const support=document.getElementById("support").value;
    let applied=Number(totalDesignLoad);
    if (assembly==="igu") applied=Number(totalDesignLoad)*Number(lsf ?? 0);

    if (!(applied>0)) return {ok:false,error:"Design pressure must be greater than zero.",appliedLoad:applied};

    if (support==="3") return calcThree(r,applied);
    if (support==="2") return calcStrip(r,applied,"2");
    if (support==="1") return calcStrip(r,applied,"1");

    const result={appliedLoad:applied,totalDesignLoad:Number(totalDesignLoad),support,assembly,method:null,ok:false,location:null};

    if (support!=="4") {
      result.method=`ASTM Fig. A1.${r.figure} lower deflection chart`;
      result.chartReview=true;
      result.note="Automatic numerical deflection is not enabled for this support condition.";
      return result;
    }

    const t=targetThickness(r.input);

    if (r.input.kind==="lam") {
      // ASTM E1300 6.2.5.4 uses the lower chart of A1.29-A1.35 for
      // four-side PVB laminated glass. Appendix X1 is the standard's
      // alternate approximate center-deflection procedure for four-side support.
      // Use the laminated ASTM designation's Table 4 minimum thickness.
      const x1=x1FourSide({a:r.geom.long,b:r.geom.short,t,q:applied});
      Object.assign(result,x1);
      result.method=`ASTM Fig. A1.${r.figure} lower chart / Appendix X1 approximate`;
      result.location="center of glass";
      result.minimumThickness=t;
      result.laminatedDesignation=Number(r.input.designation);
      result.laminated4Side=true;
      result.note="Four-side PVB laminated glass: automatic numerical deflection uses ASTM Appendix X1 as an approximate four-side procedure with the ASTM laminated designation minimum thickness. The corresponding ASTM basic-procedure source is the lower deflection chart of this A1 figure.";
      if (r.lr && applied<r.lr/3) result.caution=true;
      return result;
    }

    const x1=x1FourSide({a:r.geom.long,b:r.geom.short,t,q:applied});
    Object.assign(result,x1);
    result.method="ASTM E1300 Appendix X1";
    result.location="center of glass";
    result.minimumThickness=t;
    if (r.lr && applied<r.lr/3) result.caution=true;
    return result;
  }

  return {x1FourSide,calcLite,E};
})();
