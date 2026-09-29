const NFLEngine = (() => {
  const A = 0.6948385402685583;
  const B = 1.126483835582976;
  const LAM_CF = 0.7798467672342461;

  function geom(w, h) {
    w = Number(w); h = Number(h);
    if (!(w > 0 && h > 0)) return null;
    return {
      long: Math.max(w, h),
      short: Math.min(w, h),
      area: w * h / 1e6,
      ar: Math.max(w, h) / Math.min(w, h)
    };
  }

  function lamDesignation(p1, pvb, p2) {
    p1 = Number(p1); p2 = Number(p2); pvb = Number(pvb);
    if (p1 === 6 && p2 === 6 && (Math.abs(pvb - .38) < .02 || Math.abs(pvb - .76) < .02)) return 12;
    if (p1 === 2.5 && p2 === 2.5 && Math.abs(pvb - 1.52) < .02) return 5;
    if (p1 === 4 && p2 === 4) return 8;

    const total = (ASTM.min[p1] || p1) + (ASTM.min[p2] || p2) + Math.min(pvb, 1.52);
    let d = null;
    for (const x of [5, 6, 8, 10, 12, 16, 19]) {
      if (ASTM.min[x] <= total) d = x;
    }
    return d;
  }

  function fig(kind, support, d) {
    if (kind === "mono") {
      if (support === "4") return ASTM.mono4[d];
      if (support === "3") return ASTM.mono3[d];
      if (support === "2") return 27;
      if (support === "1") return 28;
    } else {
      if (support === "4") return ASTM.lam4[d];
      if (support === "3") return ASTM.lam3[d];
      if (support === "2") return 43;
      if (support === "1") return 44;
    }
    return null;
  }

  function base6(g) {
    return Math.pow(5.6 / g.area, A) * Math.pow(1.4 / g.ar, B);
  }

  function tf(kind, d) {
    const t = ASTM.min[d];
    if (!t) return null;
    if (kind === "mono") return Math.pow(t / ASTM.min[6], 2.20);
    return LAM_CF * Math.pow(t / ASTM.min[6], 2.00);
  }

  // A1.27 / A1.43 digitized as q = C / L^4 on log-log axes.
  // L = unsupported-edge length in mm.
  function twoSideUnsupportedSpan(supportedEdges, width, height) {
    // ASTM two-opposite-side support:
    // Left / Right supported => distance between supports / top-bottom unsupported edge length = panel width.
    // Top / Bottom supported => distance between supports / left-right unsupported edge length = panel height.
    return supportedEdges === "tb" ? Number(height) : Number(width);
  }

  function twoSideNFL(kind, d, L) {
    const monoAnchorAt1_30 = {
      6: 1000, 8: 1190, 10: 1370, 12: 1530, 16: 1780, 19: 1940, 22: 2090
    };
    const lamAnchorAt3_00 = {
      5: 650, 6: 760, 8: 900, 10: 1030, 12: 1150, 16: 1330, 19: 1450
    };

    const anchors = kind === "mono" ? monoAnchorAt1_30 : lamAnchorAt3_00;
    const anchor = anchors[d];

    // Fig. A1.27 does not contain a 5 mm monolithic line.
    if (!anchor) {
      return {
        covered:false,
        reason:"thickness_not_on_chart"
      };
    }

    const qa = kind === "mono" ? 1.30 : 3.00;
    const C = qa * Math.pow(anchor, 4);
    const raw = C / Math.pow(L, 4);

    const qmin = kind === "mono" ? 0.25 : 0.20;
    const qmax = kind === "mono" ? 10.0 : 8.0;

    if (raw < qmin) {
      return {
        covered:true,
        inRange:false,
        direction:"below",
        raw,
        C,
        qmin,
        qmax
      };
    }

    if (raw > qmax) {
      return {
        covered:true,
        inRange:false,
        direction:"above",
        raw,
        C,
        qmin,
        qmax
      };
    }

    return {
      covered:true,
      inRange:true,
      raw,
      C,
      qmin,
      qmax
    };
  }

  function oneEdgeNFL(kind, d, L) {
    // Digitized from the supplied ASTM E1300-16 Fig. A1.28 and A1.44.
    // These log-log chart line families are straight and follow q = C / L^2.
    // Anchor lengths below are the chart-read L values at q = 1.00 kPa.

    const monoAnchorAt1_00 = {
      6: 408.6,
      8: 536.7,
      10: 639.7,
      12: 821.9,
      16: 1026.7,
      19: 1219.1,
      22: 1406.2
    };

    const lamAnchorAt1_00 = {
      6: 344.5,
      8: 481.7,
      10: 581.1,
      12: 765.5,
      16: 978.8,
      19: 1177.4
    };

    const anchors = kind === "mono" ? monoAnchorAt1_00 : lamAnchorAt1_00;
    const anchor = anchors[d];

    if (!anchor) {
      return {
        covered:false,
        reason:"thickness_not_on_chart"
      };
    }

    const C = Math.pow(anchor, 2); // because q_anchor = 1.00 kPa
    const raw = C / Math.pow(L, 2);

    const qmin = kind === "mono" ? 0.25 : 0.20;
    const qmax = 10.0;
    const Lmin = kind === "mono" ? 260 : 200;
    const Lmax = 3000;

    if (L < Lmin || L > Lmax) {
      return {
        covered:true,
        dimensionOutside:true,
        raw,
        C,
        qmin,
        qmax,
        Lmin,
        Lmax
      };
    }

    if (raw < qmin) {
      return {
        covered:true,
        inRange:false,
        direction:"below",
        raw,
        C,
        qmin,
        qmax,
        Lmin,
        Lmax
      };
    }

    if (raw > qmax) {
      return {
        covered:true,
        inRange:false,
        direction:"above",
        raw,
        C,
        qmin,
        qmax,
        Lmin,
        Lmax
      };
    }

    return {
      covered:true,
      inRange:true,
      raw,
      C,
      qmin,
      qmax,
      Lmin,
      Lmax
    };
  }



  function fourSideRowAtAR(figure, ar) {
    const d = (typeof NFLChartData !== "undefined") ? NFLChartData[String(figure)] : null;
    if (!d || !Array.isArray(d.rows) || !d.rows.length) return null;

    const rows = d.rows;
    if (!(ar >= 1)) return null;
    if (ar > 5) return {outsideAR:true, ar, maxAR:5};

    let lo = rows[0], hi = rows[rows.length - 1];
    for (const r of rows) {
      if (r.ar <= ar) lo = r;
      if (r.ar >= ar) { hi = r; break; }
    }

    if (lo.ar === hi.ar) {
      return {ar, q:lo.q.slice(), x:lo.x.slice(), xmax:d.xmax, ymax:d.ymax};
    }

    const f = (ar - lo.ar) / (hi.ar - lo.ar);
    const hiMap = new Map(hi.q.map((q,i)=>[Number(q), Number(hi.x[i])]));
    const q = [], x = [];

    lo.q.forEach((qq,i) => {
      qq = Number(qq);
      if (!hiMap.has(qq)) return;
      const x0 = Number(lo.x[i]);
      const x1 = hiMap.get(qq);
      q.push(qq);
      x.push(x0 + f * (x1 - x0));
    });

    return {ar, q, x, xmax:d.xmax, ymax:d.ymax};
  }

  function fourSideDigitized(figure, longDim, shortDim) {
    const long = Number(longDim), short = Number(shortDim);
    if (!(long > 0 && short > 0)) return {ok:false,error:"Invalid panel dimensions."};

    const ar = long / short;
    const row = fourSideRowAtAR(figure, ar);
    if (!row) return {ok:false,error:"Digitized ASTM chart data unavailable."};
    if (row.outsideAR) {
      return {
        ok:false, manual:true, outsideAR:true, ar,
        error:`Aspect ratio ${ar.toFixed(2)} is outside the digitized four-side ASTM chart interpolation range (AR 1.0–5.0).`
      };
    }

    if (long > row.xmax || short > row.ymax) {
      return {
        ok:false, outsideDimension:true, ar,
        xmax:row.xmax, ymax:row.ymax,
        error:`Panel dimensions are outside the plotted ASTM figure range (${row.xmax} × ${row.ymax} mm).`
      };
    }

    const q = row.q, x = row.x;
    if (!q.length || q.length !== x.length) {
      return {ok:false,error:"Digitized contour row is incomplete."};
    }

    // q is stored high -> low, while x-intersections run small -> large.
    if (long < x[0]) {
      return {
        ok:true, outsideRange:true, direction:"above",
        raw:q[0], nfl:q[0], ar,
        qmin:q[q.length-1], qmax:q[0],
        digitized:true,
        error:`NFL is above the highest digitized ASTM contour (> ${q[0].toFixed(2)} kPa).`
      };
    }

    if (long > x[x.length-1]) {
      return {
        ok:true, outsideRange:true, direction:"below",
        raw:q[q.length-1], nfl:q[q.length-1], ar,
        qmin:q[q.length-1], qmax:q[0],
        digitized:true,
        error:`NFL is below the lowest digitized ASTM contour (< ${q[q.length-1].toFixed(2)} kPa).`
      };
    }

    for (let i=0; i<x.length-1; i++) {
      if (long >= x[i] && long <= x[i+1]) {
        const f = (long - x[i]) / (x[i+1] - x[i]);
        const raw = q[i] + f * (q[i+1] - q[i]);
        return {
          ok:true,
          raw,
          nfl:Math.round(raw * 100) / 100,
          ar,
          digitized:true,
          qBracket:[q[i],q[i+1]],
          xBracket:[x[i],x[i+1]],
          qmin:q[q.length-1],
          qmax:q[0]
        };
      }
    }

    return {ok:false,error:"Unable to interpolate between ASTM chart contours."};
  }

  function digitizedContourY(figure, qTarget, xTarget) {
    const d = (typeof NFLChartData !== "undefined") ? NFLChartData[String(figure)] : null;
    if (!d || !Array.isArray(d.rows)) return NaN;

    const pts = [];
    for (const row of d.rows) {
      const qs = row.q.map(Number);
      const xs = row.x.map(Number);
      let xi = NaN;

      for (let i=0; i<qs.length; i++) {
        if (Math.abs(qs[i] - qTarget) < 1e-9) {
          xi = xs[i];
          break;
        }
      }

      if (!Number.isFinite(xi)) {
        for (let i=0; i<qs.length-1; i++) {
          const qHi = qs[i], qLo = qs[i+1];
          if (qTarget <= qHi && qTarget >= qLo) {
            const f = (qHi - qTarget) / (qHi - qLo);
            xi = xs[i] + f * (xs[i+1] - xs[i]);
            break;
          }
        }
      }

      if (Number.isFinite(xi)) {
        pts.push({x:xi, y:xi/Number(row.ar)});
      }
    }

    if (pts.length < 2) return NaN;
    pts.sort((a,b)=>a.x-b.x);

    if (xTarget < pts[0].x || xTarget > pts[pts.length-1].x) return NaN;
    for (let i=0; i<pts.length-1; i++) {
      if (xTarget >= pts[i].x && xTarget <= pts[i+1].x) {
        const f = (xTarget - pts[i].x)/(pts[i+1].x-pts[i].x || 1);
        return pts[i].y + f*(pts[i+1].y-pts[i].y);
      }
    }
    return NaN;
  }

  function calculate({kind, support, designation, width, height, supportedEdges, oneSupportedEdge}) {
    const g = geom(width, height);
    const f = fig(kind, support, designation);
    if (!g || !f) return {ok:false, error:"Input not covered."};


    if (support === "3") {
      return {
        ok:false,
        manual:true,
        figure:f,
        geom:g,
        designation,
        kind,
        threeSide:true,
        error:`ASTM Fig. A1.${f} applies. Automatic NFL is not enabled for three-side support yet.`
      };
    }

    if (support === "2") {
      const unsupported = twoSideUnsupportedSpan(supportedEdges, width, height);
      const result = twoSideNFL(kind, designation, unsupported);

      if (!result.covered) {
        return {
          ok:false,
          chartUnsupported:true,
          figure:f,
          geom:g,
          designation,
          kind,
          twoSide:true,
          unsupported,
          supportedEdges,
          error:`${designation} mm is not covered by ASTM Fig. A1.${f}.`
        };
      }

      if (!result.inRange) {
        return {
          ok:true,
          outsideRange:true,
          extrapolated:true,
          reviewRequired:true,
          figure:f,
          geom:g,
          designation,
          kind,
          twoSide:true,
          unsupported,
          supportedEdges,
          raw:result.raw,
          nfl:Math.round(result.raw * 20) / 20,
          C:result.C,
          qmin:result.qmin,
          qmax:result.qmax,
          direction:result.direction,
          error: result.direction === "below"
            ? `Calculated chart-line estimate is below the printed ASTM Fig. A1.${f} range (< ${result.qmin.toFixed(2)} kPa); engineering review required.`
            : `Calculated chart-line estimate is above the printed ASTM Fig. A1.${f} range (> ${result.qmax.toFixed(2)} kPa); engineering review required.`
        };
      }

      return {
        ok:true,
        figure:f,
        geom:g,
        raw:result.raw,
        nfl:Math.round(result.raw * 20) / 20,
        designation,
        kind,
        twoSide:true,
        unsupported,
        supportedEdges,
        C:result.C,
        qmin:result.qmin,
        qmax:result.qmax
      };
    }

    if (support === "1") {
      // Left or right supported => cantilever depth = panel width.
      // Top or bottom supported => cantilever depth = panel height.
      const unsupported =
        (oneSupportedEdge === "top" || oneSupportedEdge === "bottom")
          ? Number(height)
          : Number(width);

      const result = oneEdgeNFL(kind, designation, unsupported);

      if (!result.covered) {
        return {
          ok:false,
          chartUnsupported:true,
          figure:f,
          geom:g,
          designation,
          kind,
          oneEdge:true,
          unsupported,
          oneSupportedEdge,
          error:`${designation} mm is not covered by ASTM Fig. A1.${f}.`
        };
      }

      if (result.dimensionOutside) {
        return {
          ok:false,
          outsideDimension:true,
          figure:f,
          geom:g,
          designation,
          kind,
          oneEdge:true,
          unsupported,
          oneSupportedEdge,
          raw:result.raw,
          C:result.C,
          qmin:result.qmin,
          qmax:result.qmax,
          Lmin:result.Lmin,
          Lmax:result.Lmax,
          error:`Unsupported-edge length is outside ASTM Fig. A1.${f} chart range (${result.Lmin}–${result.Lmax} mm).`
        };
      }

      if (!result.inRange) {
        return {
          ok:false,
          outsideRange:true,
          figure:f,
          geom:g,
          designation,
          kind,
          oneEdge:true,
          unsupported,
          oneSupportedEdge,
          raw:result.raw,
          C:result.C,
          qmin:result.qmin,
          qmax:result.qmax,
          direction:result.direction,
          error: result.direction === "below"
            ? `NFL is below ASTM Fig. A1.${f} chart range (< ${result.qmin.toFixed(2)} kPa).`
            : `NFL is above ASTM Fig. A1.${f} chart range (> ${result.qmax.toFixed(2)} kPa).`
        };
      }

      return {
        ok:true,
        figure:f,
        geom:g,
        raw:result.raw,
        nfl:Math.round(result.raw * 20) / 20,
        designation,
        kind,
        oneEdge:true,
        unsupported,
        oneSupportedEdge,
        C:result.C,
        qmin:result.qmin,
        qmax:result.qmax,
        Lmin:result.Lmin,
        Lmax:result.Lmax
      };
    }

    if (support !== "4") {
      return {
        ok:false,
        manual:true,
        figure:f,
        geom:g,
        error:`ASTM Fig. A1.${f} applies. Automatic NFL is not enabled for this support condition yet.`
      };
    }

    const chart = fourSideDigitized(f, g.long, g.short);
    if (!chart.ok) {
      return {
        ...chart,
        figure:f,
        geom:g,
        designation,
        kind,
        fourSide:true
      };
    }

    return {
      ...chart,
      figure:f,
      geom:g,
      designation,
      kind,
      fourSide:true,
      source:"ASTM Annex A1 chart digitization / constant-AR contour interpolation"
    };
  }

  function contourY(kind, designation, q, x) {
    const f = fig(kind, "4", designation);
    if (f) {
      const y = digitizedContourY(f, Number(q), Number(x));
      if (Number.isFinite(y)) return y;
    }

    // Legacy fallback only if digitized data cannot be evaluated.
    const T = tf(kind, designation);
    if (!(T > 0 && q > 0 && x > 0)) return NaN;
    const C = T * Math.pow(5.6e6, A) * Math.pow(1.4, B);
    const expo = B - A;
    const val = q * Math.pow(x, A + B) / C;
    if (!(val > 0)) return NaN;
    return Math.pow(val, 1 / expo);
  }

  return {
    geom, lamDesignation, fig, calculate, contourY, twoSideUnsupportedSpan,
    fourSideDigitized, fourSideRowAtAR
  };
})();
