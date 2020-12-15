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

var linesPC;
var dimensions = [
    "Fatalities",
    "Attacks",
    "Military",
    "Police"
];
//
//colors
var color = ["DarkOrange","DarkGreen","DarkViolet","DarkBlue","DarkRed"];
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
        .attr("font-weight", "bold")
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
            } else {
                if (this.style.opacity == 0.5) {
                    d3.select(this)
                        .style("opacity", 1)
                        .style("stroke", "black")
                }
            }
            //highlight PC
            svg_pc.selectAll("path")
                .style("stroke","#aba9a4")
                .style("opacity",0.2)

            d3.select("path#pc-"+d.target.id)
                .style("stroke", "#69b3a2")
                .style("opacity", 1)
                .attr("stroke-width",3).raise()
        }

        let mouseLeave = function(d) {
            if (selectedCountries.length == 0) {
                svg_choropleth_map
                    .selectAll("path")
                    .style("opacity", 1)
                    .style("stroke", "transparent")
            } else {
                if (this.style.opacity != 0.98) {
                    d3.select(this)

                    .style("opacity", 0.5)
                        .style("stroke", "transparent")
                }
            }


            //unhighlight PC
            svg_pc.selectAll("path")
                .style("stroke","#69b3a2")
                .style("opacity",0.5)
                .attr("stroke-width",1)
        }

        let click = function(event, d) {
            if (selectedCountries.includes(d.properties.name)) {
                var index = selectedCountries.indexOf(d.properties.name);
                selectedCountries.splice(index, 1);
                d3.select(event.target)
                    .style("opacity", 0.5)
                    .style("stroke", "black")
                    .attr("stroke-width",1)
            } else {
                selectedCountries.push(d.properties.name);
                colorN+=1;
                d3.select(event.target)
                    .style("opacity", 0.98)
                    .style("stroke", color[colorN%5])
                    .attr("stroke-width",2)
            }
            renderLineChart(d.properties.name);
        }


        var projection = d3.geoEqualEarth();
        var path = d3.geoPath().projection(projection);

        countries_ids = new Map()

        d3.select("svg")
            .selectAll("path")
            .data(topojson.feature(topology, topology.objects.countries).features)
            .enter()
            .append("path")
            .attr("id", function(d){
                countries_ids.set(""+d.properties.name,d.id)
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
        console.log(x)
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
    var margin = { top: 30, right: 10, bottom: 10, left: 0 },
        width = 750 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;


    d3.csv("dataGrouped_iso.csv").then(function(data_filtered) {


        svg_pc = d3
            .select("#parallel_coordinates")
            .append("svg") // we are appending an svg to the div 'line_chart'
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")")
            

        //DEBUG PURPOSES
        //var selected_country = "Portugal";


        //data_filtered = data.filter(function(d) {
        //    return ((d.Attacks != -1 && d.Fatalities != -1) || (d["Military"] != -1 && d.Police != -1))
        //});
        // For each dimension, I build a linear scale. I store all in a y object
        yPC = {}
        for (i in dimensions) {
            name = dimensions[i]
            scale = [0, d3.max(data_filtered, function(d) { return +d[name]; })];

            yPC[name] = d3.scaleLinear()
                .domain(scale) // --> Same axis range for each group
                // --> different axis range for each group --> .domain( [d3.extent(data, function(d) { return +d[name]; })] )
                .range([height, 0])
        }

        // Build the X scale -> it find the best position for each Y axis
        xPC = d3.scalePoint()
            .range([0, width])
            .padding(0.5)
            .domain(dimensions);

        // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
        function path(d) {
            return d3.line()(dimensions.map(function(p) {
                
                return [xPC(p), yPC[p](d[p])];
            }));
            //return d3.line()([5,7]);
        }

        // Draw the linesOriginal
        linesPC = svg_pc
            .selectAll("myPath")
            .data(data_filtered)
            .enter().append("path")
            .attr("id",function(d) {
                return "pc-"+d.ID;
            })
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#69b3a2")
            .style("opacity", 0.5)

        // Draw the axis:
        svg_pc.selectAll("myAxis")
            // For each dimension of the dataset I add a 'g' element:
            .data(dimensions).enter()
            .append("g")
            // I translate this element to its right position on the x axis
            .attr("transform", function(d) { return "translate(" + xPC(d) + ")"; })
            // And I build the axis with the call function
            .each(function(d) { d3.select(this).call(d3.axisLeft().scale(yPC[d])); })
            // Add axis title
            .append("text")
            .style("text-anchor", "middle")
            .attr("y", -9)
            .text(function(d) { return d; })
            .style("fill", "black")

        //HIGHLIGHT
        function highlight(d) {
           console.log("wndkoqwnod") 
        }
        var highlight = function(d){

            d3.selectAll("line " + d)
              .transition().duration(200)
              .style("stroke", "black")
              .style("opacity", "1")
          }
        
        // Unhighlight
        var doNotHighlight = function(d){
            d3.selectAll(".line")
                .transition().duration(200).delay(1000)
                .style("stroke", "white" )
                .style("opacity", "1")
        }

        // Draw the linesOriginal
        

    });
}

function gen_circle_packing() {
    var width = 510,
        heigth = 460,
        margin = 10;

    var svg_circle_packing = d3.select("#circle_packing").append("svg")
        .attr("width", width)
        .attr("height", heigth)
        .append("g")
        .attr("transform", "translate(" + margin + "," + margin + ")");

    var pack = d3.pack()
        .size([width, heigth - 50])
        .padding(10);
    if (context == 0)
        d3.json("test.json").then(function(data) {
            console.log("ola");
            var nodes = d3.hierarchy(data)
                .sum(function(d) {
                    return d.value;
                });
            console.log(pack(nodes).descendants());
            var node = svg_circle_packing.selectAll(".node")
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
                .attr("fill", "steelblue")
                .attr("opacity", 0.25)
                .attr("stroke", "#ADADAD")
                .attr("stroke-width", "2");

            node.append("text")
                .text(function(d) {
                    //return d.data.name;
                    return d.children ? "" : d.data.name;
                })

        });
    //.value(function(d) { return d.size; });

    /*   var margin = 10,
    outerDiameter = 960,
    innerDiameter = outerDiameter - margin - margin;

var x = d3.scaleLinear()
    .range([0, innerDiameter]);

var y = d3.scaleLinear()
    .range([0, innerDiameter]);

var color = d3.scaleLinear()
    .domain([-1, 5])
    .range(["#e1f4fd", "#00aeef"])
    .interpolate(d3.interpolateHcl);

var pack = d3.pack()
    .padding(2)
    .size([innerDiameter, innerDiameter])
    .value(function(d) { return d.size; })

var svg_circle_packing = d3.select("#circle_packing").append("svg")
    .attr("width", outerDiameter)
    .attr("height", outerDiameter)
  .append("g")
    .attr("transform", "translate(" + margin + "," + margin + ")");

d3.json("dataHierarchy.json", function(error, root) {
  var focus = root,
      nodes = pack.nodes(root);

  svg_circle_packing.append("g").selectAll("circle")
      .data(nodes)
    .enter().append("circle")
      .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .attr("r", function(d) { return d.r; })
      .style("fill", function(d) { return d.children ? color(d.depth) : null; })
      .on("click", function(d) { return zoom(focus == d ? root : d); });

  svg_circle_packing.append("g").selectAll("text")
      .data(nodes)
    .enter().append("text")
      .attr("class", "label")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
      .style("display", function(d) { return d.parent === root ? null : "none"; })
      .text(function(d) { return d.name; });

  });*/

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
            linesSizes[i]=d3.max(dataGroup.get(true).values());
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
            linesSizes[i]=d3.max(dataGroup.get(true).values());
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
}

function renderLineChart(countryName) {
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
                .attr("stroke", color[colorN%5])
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
                .attr("stroke", color[colorN%5])
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
                linesSizes[i]=d3.max(dataGroup2.get(true).values());
                linesDraw[i]
                    .datum(dataGroup2.get(true))
                    .transition()
                    .duration(1000)
                    //.attr("stroke", "indianRed")
                    .attr("d", d3.line()
                        .x(function(d) { return x(d[0]); })
                        .y(function(d) { return y0(d[1]); 
                        })
                    );
            }
        }
    }
    if (context == 1) {
        console.log("azuis");
        console.log(value);
        y0.domain([0, value]);
        axisY0
            .attr("class", "axisSteelBlue")
            .call(d3.axisLeft(y0).ticks(5));
        if (linesDraw.length > 0) {
            for (let i = 0; i < linesDraw.length; i++) {
                var dataGroup2 = d3.rollup(dataset, v => v.length, d => d["Country Name"] == linesDrawNames[i], d => d.Date);
                linesSizes[i]=d3.max(dataGroup2.get(true).values());
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




























//not used

function renterParallelCoordinates() {
    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
    function path(d) {
        return d3.line()(dimensions.map(function(p) {
            return [xPC(p), yPC[p](d[p])];
        }));
    }
    d3.csv("dataGrouped.csv").then(function(data) {
        var dataFiltered;
        if (selectedCountries.length > 0) {
            dataFiltered = data.filter(function(d) {
                return (selectedCountries.includes(d.Country) &&
                    (d.Attacks != -1 && d.Fatalities != -1) &&
                    (d["Military"] != -1 && d.Police != -1))
            });
        } else {
            dataFiltered = data.filter(function(d) {
                return ((d.Attacks != -1 && d.Fatalities != -1) && (d["Military"] != -1 && d.Police != -1))
            });
        }
        linesPC.remove(); //remove old lines
        // Draw the linesOriginal
        linesPC = svg_pc
            .selectAll("myPath")
            .data(dataFiltered)
            .enter().append("path")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#69b3a2")
            .style("opacity", 0.5)
    });
}