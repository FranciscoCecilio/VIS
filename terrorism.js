var dataset, full_dataset;

var padding = 60;

var svg_choropleth_map, svg_circle_packing, svg_line_chart, svg_parallel_coordinates;

var width1 = 600;
var width2 = 1200;
var height = 400;
var height2 = 500;

var radius = 5;

var dispatch;

var selectedBar, selectedCircle, selectedYear;

var context = 0; // 0 - Reset; 1 - New; 2 - Old.

var test;


d3.json("terrorism_attacks.json").then(function (data) {
  full_dataset = data; // this variable is always the full dataset
  dataset = data; // this variable is the dataset that we will work with

  gen_choropleth_map();
  gen_line_chart();

  prepare_buttons();



});


function gen_choropleth_map(){
  svg_choropleth_map = d3
    .select("#choropleth_map")
    .append("svg") // we are appending an svg to the div 'line_chart'
    .attr("width", width2)
    .attr("height", height2);

  
  var dataGroup = d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d["Country Name"]);
  var colorScale = d3.scaleThreshold()
                    .domain([10, 100, 1000, 10000, 10000, 100000])
                    .range(d3.schemeReds[6]);
  
  d3.json("world.json").then(function(topology){
    var projection = d3.geoEqualEarth();
    var path = d3.geoPath().projection(projection);
    d3.select("svg")
    .selectAll("path")
    .data(topojson.feature(topology, topology.objects.countries).features)
    .enter()
    .append("path")
    .attr("d",path)
    .attr("fill", function (d) {
        d.total = dataGroup.get(d.properties.name) || 0;
        return colorScale(d.total);
      });
    });
}



function gen_line_chart() {
  var xscaleData = dataset.map((a) => a.Date);

  var xscale = d3
    .scalePoint()
    .domain(xscaleData)
    .range([padding, width2 - padding]);

  dataGroup= d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d.Date);
  var hscale = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(dataGroup.values()),
    ])
    .range([height - padding, padding]);

  svg_line_chart = d3
    .select("#line_chart")
    .append("svg") // we are appending an svg to the div 'line_chart'
    .attr("width", width2)
    .attr("height", height);

  svg_line_chart
    .append("path")
    .datum(dataset)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return xscale(d.Date);
        })
        .y(function (d) {
          return hscale(d.Fatalities);
        })
    );

  svg_line_chart
    .append("path")
    .datum(dataset)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return xscale(d.Date);
        })
        .y(function (d) {
          return hscale(d.Fatalities);
        })
    );

  var yaxis = d3
    .axisLeft() // we are creating a d3 axis
    .scale(hscale) // fit to our scale
    .tickFormat(d3.format(".2s")) // format of each year
    .tickSizeOuter(0);

  svg_line_chart
    .append("g") // we are creating a 'g' element to match our yaxis
    .attr("transform", "translate(" + padding + ",0)")
    .attr("class", "yaxis") // we are giving it a css style
    .call(yaxis);

  svg_line_chart
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .attr("class", "label")
    .text("Fatalities");

  var xscaleDataFiltered = xscaleData.filter(function (d, i) {
    if (i % 5 == 0) return d;
  });

  var xaxis = d3
    .axisBottom() // we are creating a d3 axis
    .scale(xscale) // we are adding our padding
    .tickValues(xscaleDataFiltered)
    .tickSizeOuter(0);

  svg_line_chart
    .append("g") // we are creating a 'g' element to match our x axis
    .attr("transform", "translate(0," + (height - padding) + ")")
    .attr("class", "xaxis") // we are giving it a css style
    .call(xaxis);

  // text label for the x axis
  svg_line_chart
    .append("text")
    .attr(
      "transform",
      "translate(" + width2 / 2 + " ," + (height - padding / 3) + ")"
    )
    .attr("class", "label")
    .text("Year");
}

function prepare_buttons() {
  var hscale = d3
    .scaleLinear() // we are setting
    .domain([0, 10]) // values range
    .range([height - padding, padding]); // we are adding our padding to our height scale

  d3.select("#deaths").on("click", function () {
    var dataGroup = d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d["Country Name"]);
    var colorScale = d3.scaleThreshold()
                    .domain([10, 100, 1000, 10000, 10000, 100000])
                    .range(d3.schemeReds[6]);
    
    // Update 
    svg_choropleth_map
      .selectAll("path")
      .attr("fill", function (d) {
          d.total = dataGroup.get(d.properties.name) || 0;
          return colorScale(d.total);
      });
      
  });

  d3.select("#events").on("click", function () {
    var dataGroup = d3.rollup(dataset, v=>d3.count(v, d=>d.Date),d=>d["Country Name"]);
    var colorScale = d3.scaleThreshold()
                    .domain([10, 100, 1000, 10000, 10000, 100000])
                    .range(d3.schemeBlues[6]);
    
    // Update 
    svg_choropleth_map
      .selectAll("path")
      .attr("fill", function (d) {
          d.total = dataGroup.get(d.properties.name) || 0;
          return colorScale(d.total);
      });
  });

  prepare_buttons();
}

