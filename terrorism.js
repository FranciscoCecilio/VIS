var dataset, full_dataset, datasetSecurity;

var padding = 60;

var svg_choropleth_map, svg_circle_packing, svg_line_chart, svg_pc;
var gradient_red, gradient_blue;

var radius = 5;

var dispatch;

var selectedBar, selectedCircle, selectedYear;

var context = 0; // 0 - deaths; 1 - events.


var countries_ids;

var selectedCountries = [];

//line chart
var linesOriginal = [];

var linesDrawNames = [];
var linesDraw = [];
var linesSizes = [];

var x, y0, y1;
var axisX, axisY0, axisY1;
//
//parallel coordinates
var xPC, yPC;

var linePC;
var axisPC;
var background;
var foreground;
var dragging = {};
var dimensions = [
    "Fatalities",
    "Attacks",
    "Military",
    "Police"
];
//
//circle packing
var node, nodes, pack;
//
//colors
var color = ["DarkOrange", "DarkGreen", "DarkViolet", "DarkBlue", "DarkRed"];
var colorN = 0;
//

d3.json("terrorism_attacks.json").then(function(data) {
    full_dataset = data; // this variable is always the full dataset
    dataset = data; // this variable is the dataset that we will work with

    gen_choropleth_map();
    gen_line_chart();
    gen_circle_packing();
    gen_parallel_coordinates();


});


function gen_choropleth_map() {
    var margin = { top: 30, right: 10, bottom: 10, left: 0 },
        width = 1000 - margin.left - margin.right,

        height = 500 - margin.top - margin.bottom;

    svg_choropleth_map = d3
        .select("#choropleth_map")
        .append("svg") // we are appending an svg to the div 'line_chart'
        .attr("width", width)
        .attr("height", height);

    var dataGroup = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d["Country Name"]);
    var max_attacks = d3.max(dataGroup, function(d) {
        return +d[1]; //<-- convert to number
    })

    domain = d3.range(0, max_attacks, 2000)


    var colorScale = d3.scaleThreshold()
        .domain([10, 100, 1000, 10000, 10000, 100000])
        .range(d3.schemeReds[6]);


    breaks = [0.10, 0.300, 0.5000, 0.70000, 0.80000, 1.00000]
    colors = d3.schemeReds[6]

    gradient_red = svg_choropleth_map.append("defs")
        .append("linearGradient")
        .attr("id", "gradient_red")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    gradient_red.selectAll("stop")
        .data(d3.zip(breaks, colors))
        .enter().append("stop")
        .attr("offset", function(d) { return d[0]; })
        .attr("stop-color", function(d) { return d[1]; });


    gradient_blue = svg_choropleth_map.append("defs")
        .append("linearGradient")
        .attr("id", "gradient_blue")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    breaks = [0.10, 0.300, 0.5000, 0.70000, 0.80000, 1.00000]
    colors = d3.schemeBlues[6]
    gradient_blue.selectAll("stop")
        .data(d3.zip(breaks, colors))
        .enter().append("stop")
        .attr("offset", function(d) { return d[0]; })
        .attr("stop-color", function(d) { return d[1]; });

    svg_choropleth_map.append("rect")
        .attr("class", "linearLegend")
        .attr("transform", "translate(38,270)")
        .attr("width", 20)
        .attr("height", 150)
        .style("fill", "url(#gradient_red)");

    var legend = svg_choropleth_map.selectAll("#gradient_red")
        .data(breaks)
        .enter()
        .append('text')
        .attr("font-family", "Arial")
        .attr("x", function(d, i) {
            return 70;
        })
        .attr("y", function(d, i) {
            return 255 + i * 32;
        })
        .text(function(d) {
            return d;
        });
    //Buttons changing the line chart
    d3.select("#deaths_r").on("click", function() { button_deaths(); })
    d3.select("#attacks_r").on("click", function() { button_attacks(); });

    d3.json("world.json").then(function(topology) {
        let mouseOver = function(d) {
            if (selectedCountries.length == 0) {
                svg_choropleth_map
                    .selectAll("path")
                    .style("opacity", .5)
                    .style("stroke", "transparent")
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke", "black")


                //grey out PC
                svg_pc.selectAll("path")
                .style("stroke", "#aba9a4")
                .style("opacity", 0.2)
                d3.select("path#pc-" + d.target.id)
                .style("stroke", "#69b3a2")
                .style("opacity", 1)
                .attr("stroke-width", 3).raise()
            } else {
                if (this.style.opacity == 0.5) {
                    d3.select(this)
                        .style("opacity", 1)
                        .style("stroke", "black")
                }

                //highligh target PC
                if(!selectedCountries.includes(d.target.id)) {
                    d3.select("path#pc-" + d.target.id)
                    .style("stroke", "#69b3a2")
                    .style("opacity", 1)
                    .attr("stroke-width", 3).raise()
                }
                
            }
            

            
        }

        let mouseLeave = function(d) {
            if (selectedCountries.length == 0) {
                svg_choropleth_map
                    .selectAll("path")
                    .style("opacity", 1)
                    .style("stroke", "transparent")

                //unhighlight PC
                svg_pc.selectAll("path")
                    .style("stroke", "#69b3a2")
                    .style("opacity", 0.5)
                    .attr("stroke-width", 1)
                
            } else {
                if (this.style.opacity != 0.98) {
                    d3.select(this)

                    .style("opacity", 0.5)
                        .style("stroke", "transparent")
                }
                //unhighlight one line from PC
                if(!selectedCountries.includes(d.target.id)) {
                    d3.select("path#pc-" + d.target.id)
                    .style("stroke", "#aba9a4")
                    .style("opacity", 0.5)
                    .attr("stroke-width", 1)


                }
                
            }


            
        }

        let click = function(event, d) {
            if (selectedCountries.includes(d.id)) {
                var index = selectedCountries.indexOf(d.id);
                selectedCountries.splice(index, 1);
                d3.select(event.target)
                    .style("opacity", 0.5)
                    .style("stroke", "black")
                    .attr("stroke-width", 1)
                
            } else {
                selectedCountries.push(d.id);
                colorN += 1;
                d3.select(event.target)
                    .style("opacity", 0.98)
                    .style("stroke", color[colorN % 5])
                    .attr("stroke-width", 2)

                //HIGHLIGHT PC
                d3.select("path#pc-" + event.target.id)
                    .style("stroke", color[colorN % 5])
                    .style("opacity", 1)
                    .attr("stroke-width", 3).raise()
            }
            renderLineChart(d.id);
        }


        var projection = d3.geoEqualEarth();
        var path = d3.geoPath().projection(projection);

        countries_ids = new Map()

        d3.select("svg")
            .selectAll("path")
            .data(topojson.feature(topology, topology.objects.countries).features)
            .enter()
            .append("path")
            .attr("id", function(d) {
                countries_ids.set(d.id,"" + d.properties.name)
                return d.id;
            })
            .attr("d", path)
            .attr("fill", function(d) {
                d.total = dataGroup.get(d.properties.name) || 0;
                return colorScale(d.total);
            })
            .on("mouseover", mouseOver)
            .on("mouseleave", mouseLeave)
            .on("click", (function(event, d) {
                click(event, d);
            }))
            .append("title").text(function(d) {
                return d.properties.name;
            });
    });

}

function gen_line_chart() {
    d3.json("security.json").then(function(datasetSecurity) {
        // set the dimensions and margins of the graph
        var margin = { top: 60, right: 60, bottom: 60, left: 60 },
            width = 750 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        // append the svg obgect to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        svg_line_chart = d3.select("#line_chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Get the data
        var dataGroupy0 = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d.Date);
        var dataGroupy1 = d3.rollup(datasetSecurity, v => d3.mean(v, d => d.Value), d => d.Date, d => d["Indicator Name"]);

        // set the ranges
        x = d3.scalePoint().range([0, width]);
        y0 = d3.scaleLinear().range([height, 0]);
        y1 = d3.scaleLinear().range([height, 0]);
        // Scale the range of the data
        x.domain(datasetSecurity.map((a) => a.Date));
        y0.domain([0, d3.max(dataGroupy0.values())]);
        y1.domain([0, d3.max(dataGroupy1.values()).get("Military expenditure (% of GDP)")]);

        linesOriginal.push(svg_line_chart
            .append("path")
            .datum(dataGroupy0)
            .attr("fill", "none")
            .attr("stroke", "indianred")
            .attr("stroke-width", 1)
            .attr("d", d3.line()
                .x(function(d) { return x(d[0]); })
                .y(function(d) { return y0(d[1]); })
            ));

        linesOriginal.push(svg_line_chart
            .append("path")
            .datum(dataGroupy1)
            .attr("fill", "none")
            .attr("stroke", "seagreen")
            .attr("stroke-width", 1)
            .attr("d", d3.line()
                .x(function(d) { return x(d[0]); })
                .y(function(d) { return y1(d[1].get("Military expenditure (% of GDP)")); })
            ));

        // Add the X Axis
        let xAxisGenerator = d3.axisBottom(x);
        xAxisGenerator.tickValues(x.domain().filter((d, i) => d % 10 === 0)); // got it :)
        axisX = svg_line_chart.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxisGenerator);
        //.call(d3.axisBottom(x) /*.ticks(29)*/ );

        // Add the Y0 Axis
        axisY0 = svg_line_chart.append("g")
            .attr("class", "axisRed")
            .call(d3.axisLeft(y0).ticks(5)); // got it :)

        // Add the Y1 Axis
        axisY1 = svg_line_chart.append("g")
            .attr("class", "axisGreen")
            .attr("transform", "translate( " + width + ", 0 )")
            .call(d3.axisRight(y1));


        //INTERACTIVE 
        /*var focus = svg_line_chart
            .append('g')
            .append('circle')
            .style("fill", "none")
            .attr("stroke", "black")
            .attr('r', 8.5)
            .style("opacity", 0)

        var focusText = svg_line_chart
            .append('g')
            .append('text')
            .style("opacity", 0)
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")


        svg_line_chart
            .append('rect')
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr('width', width)
            .attr('height', height)
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseout', mouseout);
        function mouseover() {
            focus.style("opacity", 1)
            focusText.style("opacity",1)
        }
        function mousemove() {
            // recover coordinate we need
            var x0 = x.invert(d3.pointer(this)[0]);
            var i = bisect(datasetSecurity, x0, 1);
            selectedData = datasetSecurity[i]
            focus
              .attr("cx", x(selectedData.x))
              .attr("cy", y(selectedData.y))
            focusText
              .html("x:" + selectedData.x + "  -  " + "y:" + selectedData.y)
              .attr("x", x(selectedData.x)+15)
              .attr("y", y(selectedData.y))
            }
          function mouseout() {
            focus.style("opacity", 0)
            focusText.style("opacity", 0)
          }

        */
    });

}

function gen_parallel_coordinates() {

    var margin = { top: 30, right: 10, bottom: 10, left: 50 },
        width = 750 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    xPC = d3.scalePoint()
            .range([0, width])
            .padding(0.1)
            .domain(dimensions),
    yPC = {};
    dragging = {};

    linePC = d3.line();
    axisPC = d3.axisLeft();


    svg_pc = d3.select("#parallel_coordinates").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            

    d3.csv("dataGrouped_id.csv").then(function(data) {


        for (i in dimensions) {
                name = dimensions[i]
                scale = [0, d3.max(data, function(d) { return +d[name]; })];

                yPC[name] = d3.scaleLinear()
                    .domain(scale) // --> Same axis range for each group
                    // --> different axis range for each group --> .domain( [d3.extent(data, function(d) { return +d[name]; })] )
                    .range([height, 0])
            }
          // Add grey background lines for context.
          background = svg_pc.append("g")
              .attr("class", "background")
            .selectAll("path")
              .data(data)
            .enter().append("path")
              .attr("d", path);

          // Add blue foreground lines for focus.
          foreground = svg_pc.append("g")
              .attr("class", "foreground")
            .selectAll("path")
              .data(data)
            .enter().append("path")
            .attr("id",function(d) {
                        return "pc-"+d.ID;
                    })
              .attr("d", path);

          // Add a group element for each dimension.
          var g = svg_pc.selectAll(".dimension")
              .data(dimensions)
            .enter().append("g")
              .attr("class", "dimension")
              .attr("transform", function(d) { return "translate(" + xPC(d) + ")"; })
              .call(d3.drag()
                .subject(function(d) { return {xPC: xPC(d)}; })
                .on("start", function(event, d) {
                  dragging[d] = xPC(d);
                  background.attr("visibility", "hidden");

                  if (d == "Fatalities") {
                    document.getElementById("deaths_r").click();
                  }else if (d == "Attacks") {
                    document.getElementById("attacks_r").click();
                  }else if (d == "Military") {
                    d3.json("security.json").then(function(datasetSecurity) {
                    var dataGroupy1 = d3.rollup(datasetSecurity, v => d3.mean(v, d => d.Value), d => d["Indicator Name"]=="Military expenditure (% of GDP)" , d => d.Date,);
                    y1.domain([0, d3.max(dataGroupy1.get(true).values())]);
                    axisY1
                        .attr("class", "axisGreen")
                        .call(d3.axisRight(y1).ticks(5));
                    linesOriginal[1]
                        .datum(dataGroupy1.get(true))
                        .transition()
                        .duration(1000)
                        .attr("stroke", "seagreen")
                        .attr("d", d3.line()
                            .x(function(d) { return x(d[0]); })
                            .y(function(d) { return y1(d[1]); })
                        )
                    });                  
                  }else if (d == "Police") {
                    d3.json("security.json").then(function(datasetSecurity) {
                    var dataGroupy1 = d3.rollup(datasetSecurity, v => d3.mean(v, d => d.Value), d => d["Indicator Name"] == "Police Personnel by 100,000 population",d => d.Date);               
                    y1.domain([0, d3.max(dataGroupy1.get(true).values())]);                    
                    axisY1
                        .attr("class", "axisGreen")
                        .call(d3.axisRight(y1).ticks(5));
                    linesOriginal[1]
                        .datum(dataGroupy1.get(true))
                        .transition()
                        .duration(1000)
                        .attr("stroke", "seagreen")
                        .attr("d", d3.line()
                            .x(function(d) { return x(d[0]); })
                            .y(function(d) { return y1(d[1]); })
                        )
                    });
                  }



                })
                .on("drag", function(event, d) {
                  dragging[d] = Math.min(width, Math.max(0, event.x));
                  foreground.attr("d", path);
                  dimensions.sort(function(a, b) { return position(a) - position(b); });
                  xPC.domain(dimensions);
                  g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
                })
                .on("end", function(event, d) {
                  delete dragging[d];
                  transition(d3.select(this)).attr("transform", "translate(" + xPC(d) + ")");
                  transition(foreground).attr("d", path);
                  background
                      .attr("d", path)
                    .transition()
                      .delay(500)
                      .duration(0)
                      .attr("visibility", null);
            }));

          // Add an axis and title.
          g.append("g")
              .attr("class", "axis")
              .each(function(d) { d3.select(this).call(axisPC.scale(yPC[d])); })
                .append("text")
                .style("text-anchor", "middle")
                .attr("y", -9)
                .text(function(d) { return d; })
                .style("fill", "black")
          // Add and store a brush for each axis.
          g.append("g")
              .attr("class", "brush")
              .each(function(d) {
                d3.select(this).call(yPC[d].brush = d3.brushY()
                    .on("start", (function(event, d) {brushstart(event, d);}))
                    .on("brush", (function(event, d) {brush(event, d);})));
              })
            .selectAll("rect")
              .attr("x", -8)
              .attr("width", 16);
});

function position(d) {
  var v = dragging[d];
  return v == null ? xPC(d) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
    return linePC(dimensions.map(function(p) { return [xPC(p), yPC[p](d[p])];}));
}

function brushstart(event, d) {
  event.sourceEvent.stopPropagation();
}

// Handles a brush event, toggling the display of foreground lines.
function brush(event, d) {
  var actives = dimensions.filter(function(p) { return !yPC[p].brush.empty(); }),
      extents = actives.map(function(p) { return yPC[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });
}
}


function gen_circle_packing() {
    var width = 510,
        heigth = 460,
        margin = 10;

    svg_circle_packing = d3.select("#circle_packing").append("svg")
        .attr("width", width)
        .attr("height", heigth)
        .append("g")
        .attr("transform", "translate(" + margin + "," + margin + ")");

    pack = d3.pack()
        .size([width, heigth - 50])
        .padding(10);
        
    d3.json("dataHierarchy.json").then(function(data) {
        nodes = d3.hierarchy(data)
            .sum(function(d) {
                return d.Fatalities;
            });
        //console.log(pack(nodes).descendants());
        node = svg_circle_packing.selectAll(".node")
            .data(pack(nodes).descendants())
            .enter()
            /*.filter(function(d) {
                return !d.children
            })*/
            .append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        node.append("circle")
            .attr("r", function(d) {
                return d.r;
            })
            .attr("fill", "indianRed")
            .attr("opacity", 0.25)
            .attr("stroke", "#ADADAD")
            .attr("stroke-width", "2");
        //CountryName
   /*     node.append("text")
            .text(function(d) {
                return d.data["Country Name"];
            })
            .style("fill", "black")
            .attr("font-family", "Arial")
            .attr('transform', 'translate(-30, ' + (50 - heigth / 2) + ')');*/
        //Perpetrators
        /* node.append("text")
             .text(function(d) {
                 return d.data.Perpetrator;
             })
             .style("fill", "green")
             .attr("font-family", "Arial")
             .style("text-anchor", "middle")
             .attr('transform', function(d) {
                 console.log(node);
                 return "translate(0,-" + d.r + ")"
             });
         //Weapons
         node.append("text")
              .text(function(d) {
                  return d.data.Weapon;
              })
              .attr("font-family", "Arial")
              .style("text-anchor", "middle")
              .style("font-size", 12)
              //.attr("dx", function(d) { return -20 })*/
    });
}


function button_deaths() {
    context = 0;
    //Choropleth
    var dataGroup = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d["Country Name"]);
    var colorScale = d3.scaleThreshold()
        .domain([10, 100, 1000, 10000, 10000, 100000])
        .range(d3.schemeReds[6]);

    svg_choropleth_map.select("rect")
        .style("fill", "url(#gradient_red)");

    // Update
    svg_choropleth_map
        .transition()
        .duration(1000)
        .selectAll("path")
        .attr("fill", function(d) {
            d.total = dataGroup.get(d.properties.name) || 0;
            return colorScale(d.total);
        });

    //Line Chart
    //original lines
    var dataGroup = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d.Date);

    y0.domain([0, d3.max(dataGroup.values())]);
    axisY0
        .attr("class", "axisRed")
        .call(d3.axisLeft(y0).ticks(5));
    linesOriginal[0]
        .datum(dataGroup)
        .transition()
        .duration(1000)
        .attr("stroke", "indianRed")
        .attr("d", d3.line()
            .x(function(d) { return x(d[0]); })
            .y(function(d) { return y0(d[1]); })
        );
    //selection lines
    if (linesDraw.length > 0) {
        for (let i = 0; i < linesDraw.length; i++) {
            var dataGroup = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d["Country Name"] == linesDrawNames[i], d => d.Date);
            linesSizes[i] = d3.max(dataGroup.get(true).values());
            linesDraw[i]
                .datum(dataGroup.get(true))
                .transition()
                .duration(1000)
                .attr("stroke", "indianRed")
                .attr("d", d3.line()
                    .x(function(d) { return x(d[0]); })
                    .y(function(d) { return y0(d[1]); })
                );
        }
        axisChangeLineChart(d3.max(linesSizes));
    }
}

function button_attacks() {
    context = 1;
    //Choropleth    
    var dataGroup = d3.rollup(dataset, v => v.length, d => d["Country Name"]);
    var colorScale = d3.scaleThreshold()
        .domain([1, 10, 100, 1000, 1000, 10000])
        .range(d3.schemeBlues[6]);

    breaks = [0.10, 0.300, 0.5000, 0.70000, 0.80000, 1.00000]
    colors = d3.schemeBlues[6]

    svg_choropleth_map.select("defs")
        .selectAll("stop")
        .data(d3.zip(breaks, colors))
        .enter().append("stop")
        .attr("offset", function(d) { return d[0]; })
        .attr("stop-color", function(d) { return d[1]; });

    svg_choropleth_map.select("rect")
        .style("fill", "url(#gradient_blue)");

    // Update        
    svg_choropleth_map
        .transition()
        .duration(1000)
        .selectAll("path")
        .attr("fill", function(d) {
            d.total = dataGroup.get(d.properties.name) || 0;
            return colorScale(d.total);
        });

    //Line chart
    //original lines
    var dataGroup = d3.rollup(dataset, v => v.length, d => d.Date);
    y0.domain([0, d3.max(dataGroup.values())]);
    axisY0
        .attr("class", "axisSteelBlue")
        .call(d3.axisLeft(y0).ticks(5));
    linesOriginal[0]
        .datum(dataGroup)
        .transition()
        .duration(1000)
        .attr("stroke", "steelblue")
        .attr("d", d3.line()
            .x(function(d) { return x(d[0]); })
            .y(function(d) { return y0(d[1]); })
        );
    //selection lines
    if (linesDraw.length > 0) {
        for (let i = 0; i < linesDraw.length; i++) {
            var dataGroup = d3.rollup(dataset, v => v.length, d => d["Country Name"] == linesDrawNames[i], d => d.Date);
            linesSizes[i] = d3.max(dataGroup.get(true).values());
            linesDraw[i]
                .datum(dataGroup.get(true))
                .transition()
                .duration(1000)
                .attr("stroke", "steelblue")
                .attr("d", d3.line()
                    .x(function(d) { return x(d[0]); })
                    .y(function(d) { return y0(d[1]); })
                );
        }
        axisChangeLineChart(d3.max(linesSizes));
    }

    //circle packing
        d3.json("dataHierarchy.json").then(function(data) {
            nodes = d3.hierarchy(data)
                .sum(function(d) {
                    return d.Attacks;
                });
            

            svg_circle_packing.selectAll(".node").data(pack(nodes).descendants());


            node.selectAll("circle")
                .attr("r", function(d) {
                    return d.r;
                })
                .attr("fill", "steelblue");

           /* svg_circle_packing.selectAll(".node").data(pack(nodes).descendants())
                .attr("r", function(d) {
                    return d.r;
                })
                .attr("fill", "steelblue")
                .transition()
                .duration(1000);*/
        });
}

function renderLineChart(countryID) {
    countryName = countries_ids.get(countryID)
    if (selectedCountries.length == 0) { //no selected countries
        if (context == 0) { axisChangeLineChart(12000); }
        if (context == 1) { axisChangeLineChart(6500); }
        linesOriginal[0].style("opacity", 1);
        linesOriginal[1].style("opacity", 1);
        axisY1.style("opacity", 1);
    }
    if (linesDrawNames.length == 0) { //first selected country
        linesOriginal[0].style("opacity", 0);
        linesOriginal[1].style("opacity", 0);
        axisY1.style("opacity", 0);
    }
    if (linesDrawNames.includes(countryName)) { //delete line
        var index = linesDrawNames.indexOf(countryName);
        linesDraw[index].remove();
        linesDrawNames.splice(index, 1);
        linesDraw.splice(index, 1);
        linesSizes.splice(index, 1);
        if (linesSizes.length > 0 && d3.max(linesSizes) != y0.domain()[1]) { //change axis size
            axisChangeLineChart(d3.max(linesSizes));
        }
    } else { //add line
        if (context == 0) {
            var dataGroup = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d["Country Name"] == countryName, d => d.Date);
            linesSizes.push(d3.max(dataGroup.get(true).values()));
            if (d3.max(linesSizes) != y0.domain()[1]) { //change axis size
                axisChangeLineChart(d3.max(linesSizes));
            }
            linesDrawNames.push(countryName);
            linesDraw.push(svg_line_chart
                .append("path")
                .datum(dataGroup.get(true))
                .attr("fill", "none")
                .attr("stroke", color[colorN % 5])
                .attr("stroke-width", 1)
                .attr("d", d3.line()
                    .x(function(d) { return x(d[0]); })
                    .y(function(d) { return y0(d[1]); }))
            );
        } else if (context == 1) {
            var dataGroup = d3.rollup(dataset, v => v.length, d => d["Country Name"] == countryName, d => d.Date);
            linesSizes.push(d3.max(dataGroup.get(true).values()));
            if (d3.max(linesSizes) != y0.domain()[1]) { //change axis size
                axisChangeLineChart(d3.max(linesSizes));
            }
            linesDrawNames.push(countryName);
            linesDraw.push(svg_line_chart
                .append("path")
                .datum(dataGroup.get(true))
                .attr("fill", "none")
                .attr("stroke", color[colorN % 5])
                .attr("stroke-width", 1)
                .attr("d", d3.line()
                    .x(function(d) { return x(d[0]); })
                    .y(function(d) { return y0(d[1]); }))
            );
        }
    }
}

function axisChangeLineChart(value) {
    if (context == 0) {
        y0.domain([0, value]);
        axisY0
            .attr("class", "axisRed")
            .call(d3.axisLeft(y0).ticks(5));
        if (linesDraw.length > 0) {
            for (let i = 0; i < linesDraw.length; i++) {
                var dataGroup2 = d3.rollup(dataset, v => d3.sum(v, d => d.Fatalities), d => d["Country Name"] == linesDrawNames[i], d => d.Date);
                linesSizes[i] = d3.max(dataGroup2.get(true).values());
                linesDraw[i]
                    .datum(dataGroup2.get(true))
                    .transition()
                    .duration(1000)
                    //.attr("stroke", "indianRed")
                    .attr("d", d3.line()
                        .x(function(d) { return x(d[0]); })
                        .y(function(d) {
                            return y0(d[1]);
                        })
                    );
            }
        }
    }
    if (context == 1) {
        y0.domain([0, value]);
        axisY0
            .attr("class", "axisSteelBlue")
            .call(d3.axisLeft(y0).ticks(5));
        if (linesDraw.length > 0) {
            for (let i = 0; i < linesDraw.length; i++) {
                var dataGroup2 = d3.rollup(dataset, v => v.length, d => d["Country Name"] == linesDrawNames[i], d => d.Date);
                linesSizes[i] = d3.max(dataGroup2.get(true).values());
                linesDraw[i]
                    .datum(dataGroup2.get(true))
                    .transition()
                    .duration(1000)
                    //.attr("stroke", "steelblue")
                    .attr("d", d3.line()
                        .x(function(d) { return x(d[0]); })
                        .y(function(d) { return y0(d[1]); })
                    );
            }
        }
    }
}

