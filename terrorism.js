var dataset, full_dataset, datasetSecurity;

var padding = 60;

var svg_choropleth_map, svg_circle_packing, svg_line_chart, svg_parallel_coordinates;


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
  gen_circle_packing();
  gen_parallel_coordinates();


});


function gen_choropleth_map(){
  var margin = {top: 30, right: 10, bottom: 10, left: 0},
    width = 1000 - margin.left - margin.right,

    height = 500 - margin.top - margin.bottom;

  svg_choropleth_map = d3
    .select("#choropleth_map")
    .append("svg") // we are appending an svg to the div 'line_chart'
    .attr("width", width)
    .attr("height", height);

  
  var dataGroup = d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d["Country Name"]);
  var colorScale = d3.scaleThreshold()
                    .domain([10, 100, 1000, 10000, 10000, 100000])
                    .range(d3.schemeReds[6]);
  
  d3.json("world.json").then(function(topology){
    let mouseOver = function(d) {
      d3.selectAll(".Country")
        .transition()
        .duration(200)
        .style("opacity", .5)
      d3.select(this)
        .transition()
        .duration(200)
        .style("opacity", 1)
        .style("stroke", "black")
    }
  
    let mouseLeave = function(d) {
      d3.selectAll(".Country")
        .transition()
        .duration(200)
        .style("opacity", .8)
      d3.select(this)
        .transition()
        .duration(200)
        .style("stroke", "transparent")
    }


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
      })
    .on("mouseover", mouseOver )
    .on("mouseleave", mouseLeave )
    .append("title").text(function(d) {
      return d.properties.name;});
    });
}

function gen_line_chart() {
d3.json("security.json").then(function(datasetSecurity) {
  // set the dimensions and margins of the graph
  var margin = {top: 60, right: 60, bottom: 60, left: 60},
  width = 1500 - margin.left - margin.right,
  height = 300 - margin.top - margin.bottom;

  // append the svg obgect to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  var svg_line_chart = d3.select("#line_chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

  // Get the data
  var dataGroupy0= d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d.Date);
  var dataGroupy1= d3.rollup(datasetSecurity, v=>d3.mean(v, d=>d.Value),d=>d.Date,d=>d["Indicator Name"]);

  // set the ranges
  var x = d3.scalePoint().range([0, width]);
  var y0 = d3.scaleLinear().range([height, 0]);
  var y1 = d3.scaleLinear().range([height, 0]);
// Scale the range of the data
  x.domain(datasetSecurity.map((a) => a.Date));
  y0.domain([0, d3.max(dataGroupy0.values())]);
  y1.domain([0, d3.max(dataGroupy1.values()).get("Military expenditure (% of GDP)")]);

  
  
  var line1 = svg_line_chart
    .append("path")
    .datum(dataGroupy0)
    .attr("fill", "none")
    .attr("stroke", "indianred")
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d[0]);
        })
        .y(function (d) {
          return y0(d[1]);
        })
    );

  var line2 = svg_line_chart
    .append("path")
    .datum(dataGroupy1)
    .attr("fill", "none")
    .attr("stroke", "seagreen")
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d[0]);
        })
        .y(function (d) {
          return y1(d[1].get("Military expenditure (% of GDP)"));
        })
    );

  // Add the X Axis
  var axisX = svg_line_chart.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x)/*.ticks(29)*/);

  // Add the Y0 Axis
  var axisY0 = svg_line_chart.append("g")
      .attr("class", "axisRed")
      .call(d3.axisLeft(y0));

  // Add the Y1 Axis
  var axisY1 = svg_line_chart.append("g")
      .attr("class", "axisGreen")
      .attr("transform", "translate( " + width + ", 0 )")
      .call(d3.axisRight(y1));

  d3.select("#deaths").on("click", function () {
      button_deaths();//do the map
      var dataGroup= d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d.Date);     

      y0.domain([0, d3.max(dataGroup.values())]);
      axisY0
        .attr("class", "axisRed")
        .call(d3.axisLeft(y0));
      line1
        .datum(dataGroup)
        .transition()
        .duration(1000)
        .attr("stroke", "indianRed")
        .attr(
          "d",
          d3
            .line()
            .x(function (d) {
              return x(d[0]);
            })
            .y(function (d) {
              return y0(d[1]);
            })
        );
  }); 
  d3.select("#attacks").on("click", function () {
      button_attacks();//do the map
      var dataGroup= d3.rollup(dataset, v=>v.length, d=>d.Date);   

      y0.domain([0, d3.max(dataGroup.values())]);
      axisY0
        .attr("class", "axisSteelBlue")
        .call(d3.axisLeft(y0));
      line1
        .datum(dataGroup)
        .transition()
        .duration(1000)
        .attr("stroke", "steelblue")
        .attr(
          "d",
          d3
            .line()
            .x(function (d) {
              return x(d[0]);
            })
            .y(function (d) {
              return y0(d[1]);
            })
        );
  });

});

}

function gen_parallel_coordinates() {
  var margin = {top: 30, right: 10, bottom: 10, left: 0},
    width = 1500 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;
  

  d3.csv("dataGrouped.csv").then(function(data){
    

    
    svg_pc = d3
      .select("#parallel_coordinates")
      .append("svg") // we are appending an svg to the div 'line_chart'
      .attr("width", width+margin.left + margin.right)
      .attr("height", height+margin.top + margin.bottom)
      .append("g")
      .attr("transform",
            "translate("+margin.left+","+margin.top+")");
    //DEBUG PURPOSES
    var selected_country = "Portugal";

    var dimensions = [
        "Fatalities",
        "Attacks",
        "Military",
        "Police"
    ];
    

    // For each dimension, I build a linear scale. I store all in a y object
    var y = {}
    for (i in dimensions) {
      name = dimensions[i]
      scale = [0, d3.max(data, function(d) { return +d[name]; })];

      y[name] = d3.scaleLinear()
          .domain(scale) // --> Same axis range for each group
          // --> different axis range for each group --> .domain( [d3.extent(data, function(d) { return +d[name]; })] )
          .range([height, 0]) 
    }
  
    // Build the X scale -> it find the best position for each Y axis
    x = d3.scalePoint()
      .range([0, width])
      .padding(0.5)
      .domain(dimensions);
  

    

    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
    function path(d) {
        return d3.line()(dimensions.map(function(p) { 
            return [x(p), y[p](d[p])];
         }));
        //return d3.line()([5,7]);
    }
  
    data_filtered = data.filter(function(d) {
        /*console.log(d.Attacks);
        console.log(d["GDP avg."] );
        console.log(d.Fatalities);
        console.log(d.Police);*/

        return ((d.Attacks != -1 && d.Fatalities != -1) && (d["Military"] != -1 && d.Police != -1))

    });
    // Draw the lines
    svg_pc
      .selectAll("myPath")
      .data(data_filtered)
      .enter().append("path")
      .attr("d",  path)
      .style("fill", "none")
      .style("stroke", "#69b3a2")
      .style("opacity", 0.5)
  
    // Draw the axis:
    svg_pc.selectAll("myAxis")
      // For each dimension of the dataset I add a 'g' element:
      .data(dimensions).enter()
      .append("g")
      // I translate this element to its right position on the x axis
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      // And I build the axis with the call function
      .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
      // Add axis title
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
      .text(function(d) { return d; })
      .style("fill", "black")
    
  });
}

function gen_circle_packing() {
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
  d3.json("dataHierarchy.json").then(function(data) {
    var margin = {top: 30, right: 10, bottom: 10, left: 0},
    width = 1000 - margin.left - margin.right,

    height = 500 - margin.top - margin.bottom;

    var packLayout = d3.pack()
      .size([300, 300]);

    var rootNode = d3.hierarchy(data)

    console.log(rootNode);
    console.log(rootNode.descendants());
    rootNode.sum(function(d) {
      return d.Total;
    });

    packLayout(rootNode);
    
    var svg_circle_packing = d3.select("#circle_packing")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

    svg_circle_packing 
      .selectAll('g')
      .data(rootNode.descendants())
      .enter()
      .append('g')
      .attr('transform', function(d) {console.log(d);return 'translate(' + [d.x, d.y] + ')'})

    svg_circle_packing
      .append('circle')
      .attr('r', function(d) { console.log(d);/*return d.r; */})

    svg_circle_packing
      .append('text')
      .attr('dy', 4)
      .text(function(d) {
        console.log(d);return d.children === undefined ? d.data.name : '';
      })
    });
}


function button_deaths(){ 
    //Choropleth
    var dataGroup = d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d["Country Name"]);    
    var colorScale = d3.scaleThreshold()      
                    .domain([10, 100, 1000, 10000, 10000, 100000])                      
                    .range(d3.schemeReds[6]);                    
          
    // Update      
    svg_choropleth_map
      .transition()
      .duration(1000)      
      .selectAll("path")        
      .attr("fill", function (d) {        
          d.total = dataGroup.get(d.properties.name) || 0;            
          return colorScale(d.total);           
      });
}

function button_attacks(){  
  //Choropleth    
    var dataGroup = d3.rollup(dataset, v=>v.length,d=>d["Country Name"]);   
    var colorScale = d3.scaleThreshold()     
                    .domain([1, 10, 100, 1000, 1000, 10000])                      
                    .range(d3.schemeBlues[7]);
    // Update        
    svg_choropleth_map 
      .transition()
      .duration(1000)    
      .selectAll("path")        
      .attr("fill", function (d) {        
          d.total = dataGroup.get(d.properties.name) || 0;          
          return colorScale(d.total);           
      });
 
} 


