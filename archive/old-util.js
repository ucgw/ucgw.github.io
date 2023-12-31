async function read_chart_data() {
  return await d3.csv("https://ucgw.github.io/data/mag6plus_charts.csv");
}

async function read_record_data() {
  return await d3.csv("https://ucgw.github.io/data/mag6plus_records.csv");
}

// a quick debug function for the csv data
// read in
function log_promise_data(promise_data) {
  promise_data
    .then(function(data) { console.log(data); });
}

function d3_svg_select_data_enter(data, width, height, xform_xrange, xform_yrange, shape) {
  var svg = d3.select("svg")
              .attr("width", width)
              .attr("height", height);

  var chart = svg.append("g")
              .attr("transform", "translate("+xform_xrange+","+xform_yrange+")")
              .selectAll(shape)
              .data(data)
              .enter();

  return { svg, chart };
}

function d3_append_circles(chart, cx, cxdom, cxrange, cy, cydom,cyrange, r, rrange) {
  let cxln = d3.scaleLog()
               .base(10)
               .domain(cxdom)
               .range(cxrange);
  let rln = d3.scaleLinear()
              .domain(r)
              .range(rrange);

  chart.append("circle")
       .attr("cx", function(d,i) { return cxln(cx[i]); })
       .attr("cy", function(d,i) { return cy[i]; })
       .attr("r", function(d,i) { return r[i]; })
}

function d3_append_axis_label(svg, axis, xdim, ydim, dimbuffer, text) {
  if (axis === "x") {
    svg.append("text")
       .attr("class", "x label")
       .attr("text-anchor", "middle")
       .attr("x", xdim)
       .attr("y", ydim + dimbuffer)
       .text(text);
  } else if (axis === "y") {
    svg.append("text")
       .attr("class", "y label")
       .attr("text-anchor", "middle")
       .attr("x", xdim + dimbuffer)
       .attr("y", ydim)
       .text(text);
  }
}

function d3_append_axis(svg, axistype, xform_xrange, xform_yrange, xd, xr, xt, tformat, label_text) {
  let ax = d3.scaleLog()
             .base(10)
             .domain(xd)
             .range(xr);

  let axis = axistype().scale(ax);

  axis.tickValues(xt);
  axis.tickFormat(d3.format(tformat));

  let axis_g = svg.append("g")
         .attr("transform", "translate("+xform_xrange+","+xform_yrange+")")
         .attr("fill", "none")
         .attr("font-size", "18")
         .attr("font-family", "sans-serif")
         .attr("text-anchor", "middle");

  axis_g.call(axis);
}

function percentage_diff_calc(x, y, scale) {
  let x_sized = [];
  let multiplier = 1.0;

  if (scale) {
    multiplier = parseFloat(scale);
  }

  for (var i=0; i < x.length; i++) {
    let cxnew = y[i] / x[i] * 100 * multiplier;
    x_sized.push(cxnew.toFixed(2));
  }

  console.log(x_sized);

  return x_sized;
}

function sum_dp_square_calc(x, y, scale) {
  /*
   * idea here is that rms is calculated using:
   *
   * rms = SQRT(1/n * SUM(xi^2))
   *
   * from this, we can get notions of scale of data
   * points by squaring rms and multiplying by the number
   * of data points in the set.
   *
   * i.e.
   *
   * n * rms^2 = SUM(xi^2)
   *
   * input param x == n
   * input param y == rms
   */

  let x_sized = [];
  let multiplier = 1.0;

  if (scale) {
    multiplier = parseFloat(scale);
  }

  for (var i=0; i < x.length; i++) {
    let cxnew = (x[i] * (y[i]**2) * multiplier);
    x_sized.push(cxnew.toFixed(2));
  }

  console.log(x_sized);

  return x_sized;
}

function scatterplot_deptherror_calc(x, y, scale) {
  return percentage_diff_calc(x, y, scale);
}

function scatterplot_magerror_calc(x, y, scale) {
  return percentage_diff_calc(x, y, scale);
}

function scatterplot_nstrms_calc(x, y, scale) {
  return sum_dp_square_calc(x, y, scale);
}

function axis_mag_ticks_calc(xd, numticks) {
  let unique = xd.filter((x, i) => {
                 return xd.indexOf(x) === i;
               });
  let tickfreq = Math.ceil(unique.length / Number(numticks));

  let ticks = unique.sort().filter((x, i) => {
           return i % tickfreq === 0;
         });

  console.log(ticks);
  return ticks;
}

function axis_depth_ticks_calc(xd, tickgap) {
  let xd_min = Math.min(...xd); 
  let xd_max = Math.max(...xd);

  let tickgap_multiplier = 0;
  let tick_lower = xd_min - tickgap;
  let tick_upper = xd_max % tickgap;

  while (tick_lower > tickgap) {
    tick_lower = tick_lower - tickgap;
    tickgap_multiplier++;
  }
  xd_min = tickgap * tickgap_multiplier;

  while (tick_upper != 0) {
    xd_max = xd_max + 1;
    tick_upper = xd_max % tickgap;
  }

  console.log("min x-axis: "+xd_min);
  console.log("max x-axis: "+xd_max);

  ticks = [];

  for (; xd_min < xd_max; xd_min += tickgap) {
    ticks.push(xd_min);
  }

  return ticks;
}

function make_scatterplot(promise_data, yaxfield, cxfield, cyfield, xform_xrange, xform_yrange, canvas_width, canvas_height, downsize, logscale, xa_numticks, xa_tickgap, yaxmultiplier, errmultiplier) {
  promise_data
    .then(
      function(data) {
        const cx = data.map(a => Number(a[cxfield]));
        const cy = data.map(a => Number(a[cyfield]));
        const yax = data.map(a => Number(a[yaxfield]) * parseFloat(yaxmultiplier));

        console.log(cx);
        console.log(cy);
        console.log(yax);

        let cxlower = Math.floor(Math.min(...cx)) - 1;
        let cxupper = Math.ceil(Math.max(...cx)) + 1;
        //let yaxlower = Math.floor(Math.min(...cy)) - 1;
        //let yaxupper = Math.floor(Math.max(...cy)) + 1;
        let yaxlower = Math.floor(Math.min(...yax)) - 1;
        let yaxupper = Math.floor(Math.max(...yax)) + 1;


        var raderr_sized = [];
        var xa_range = [];
        var ya_range = [];
        var ya_ticks = [];
        var xa_ticks = [];

        let scatter = d3_svg_select_data_enter(cx, canvas_width, canvas_height, xform_xrange, xform_yrange, "circle");

        switch (cyfield) {
          case "magError":
            raderr_sized = scatterplot_magerror_calc(cx, cy, errmultiplier);
            xa_ticks = axis_mag_ticks_calc(cx, xa_numticks);

            d3_append_axis(scatter.svg, d3.axisBottom, xform_xrange, xform_yrange+xform_xrange, [cxlower, cxupper], [0, canvas_height], xa_ticks, '~s');

            d3_append_axis_label(scatter.svg, 'x', canvas_width/2, xform_yrange+xform_xrange, 50, 'Earthquake Magnitude');
            break;

          case "depthError":
            raderr_sized = scatterplot_deptherror_calc(cx, cy, errmultiplier);
            xa_ticks = axis_depth_ticks_calc(cx, xa_tickgap);

            d3_append_axis(scatter.svg, d3.axisBottom, xform_xrange, canvas_height-(xform_yrange-75), [cxlower, cxupper], [0, canvas_height], xa_ticks, '~s');

            d3_append_axis_label(scatter.svg, 'x', xform_xrange+200, xform_yrange+xform_xrange, 590, 'Earthquake Depth (in km.)');
            break;

          case "rms":
            raderr_sized = scatterplot_nstrms_calc(cx, cy, errmultiplier);
            break;
        }

        d3_append_circles(scatter.chart, cx, [cxlower, cxupper], [0, canvas_height], yax, [yaxupper, yaxlower],[0, canvas_width], raderr_sized, [0, canvas_height]);

        //d3_append_axis(scatter.svg, d3.axisBottom, xform_xrange, xform_yrange+xform_xrange, [cxlower, cxupper], [0, canvas_height], xa_ticks, '~s');
        //d3_append_axis(scatter.svg, d3.axisBottom, xform_xrange, canvas_height-xform_yrange, [cxlower, cxupper], [0, canvas_height], xa_ticks, '~s');
        //d3_append_axis(scatter.svg, d3.axisBottom, xform_xrange, xform_yrange+cxupper, [cxlower, cxupper], [0, canvas_height], xa_ticks, '~s');
    });
}
