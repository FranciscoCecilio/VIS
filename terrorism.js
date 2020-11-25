var dataset, full_dataset;

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

  prepare_buttons();

});
gen_parallel_coordinates();



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
  var margin = {top: 30, right: 10, bottom: 10, left: 0},
  width = 1500,
  height = 300;

  var xscaleData = dataset.map((a) => a.Date);

  var xscale = d3
    .scalePoint()
    .domain(xscaleData)
    .range([padding, width - padding]);

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
    .attr("width", width)
    .attr("height", height);

  svg_line_chart
    .append("path")
    .datum(dataGroup)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 1)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return xscale(d[0]);
        })
        .y(function (d) {
          return hscale(d[1]);
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
      "translate(" + width/2 + " ," + (height - padding / 3) + ")"
    )
    .attr("class", "label")
    .text("Year");
}


function gen_parallel_coordinates() {
  var margin = {top: 30, right: 10, bottom: 10, left: 0},
    width = 1500 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;
  

  d3.csv("dataGroupedByCountry.csv").then(function(data){
    

    
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
        "Attacks",
        "GDP avg.",
        "Police",
        "Fatalities"
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

        return ((d.Attacks != -1 && d.Fatalities != -1) && (d["GDP avg."] != -1 && d.Police != -1))

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
  var margin = {top: 30, right: 10, bottom: 10, left: 0},
  width = 500 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

  d3.json("terrorism_attacks.json").then(function(data){
    svg_circlepacking = d3
      .select("#circle_packing")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")

  });
}


function button_deaths(){ 
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


  //Line chart  
  var dataGroup = d3.rollup(dataset, v=>d3.sum(v, d=>d.Fatalities),d=>d.Date);  
  var xscaleData = dataset.map((a) => a.Date);  

  var xscale = d3 
    .scalePoint() 
    .domain(xscaleData) 
    .range([padding, 1500 - padding]); 

  var hscale = d3 
    .scaleLinear()  
    .domain([ 
      0,  
      d3.max(dataGroup.values()), 
    ])  
    .range([300 - padding, padding]);  

  svg_line_chart  
    .select("path") 
    .datum(dataGroup) 
    .attr("fill", "none") 
    .attr("stroke", "orange") 
    .attr("stroke-width", 1)  
    .attr(  
      "d",  
      d3  
        .line() 
        .x(function (d) { 
          return xscale(d[0]);  
        })  
        .y(function (d) { 
          return hscale(d[1]);  
        })  
    );  

  var yaxis = d3  
    .axisLeft() // we are creating a d3 axis  
    .scale(hscale) // fit to our scale  
    .tickFormat(d3.format(".2s")) // format of each year  
    .tickSizeOuter(0);  

  svg_line_chart  
    .select("g")  
    .attr("transform", "translate(" + padding + ",0)")  
    .attr("class", "yaxis") // we are giving it a css style 
    .call(yaxis); 

/*Falta mudar o nome do Y!!!!!!!!!!!! 
  svg_line_chart  
    .text("Fatalities");*/  
}

function button_events(){  
  //Choropleth    
    var dataGroup = d3.rollup(dataset, v=>v.length,d=>d["Country Name"]);   
    var colorScale = d3.scaleThreshold()     
                    .domain([1, 10, 100, 1000, 1000, 10000])                      
                    .range(d3.schemeBlues[7]);
    // Update        
    svg_choropleth_map     
      .selectAll("path")        
      .attr("fill", function (d) {        
          d.total = dataGroup.get(d.properties.name) || 0;          
          return colorScale(d.total);           
      });


  //Line chart  
  var dataGroup = d3.rollup(dataset, v=>v.length,d=>d.Date);  
  var xscaleData = dataset.map((a) => a.Date);  

  var xscale = d3 
    .scalePoint() 
    .domain(xscaleData) 
    .range([padding, 1500 - padding]); 

  var hscale = d3 
    .scaleLinear()  
    .domain([ 
      0,  
      d3.max(dataGroup.values()), 
    ])  
    .range([300 - padding, padding]);  

  svg_line_chart  
    .select("path") 
    .datum(dataGroup) 
    .attr("fill", "none") 
    .attr("stroke", "steelblue")  
    .attr("stroke-width", 1)  
    .attr(  
      "d",  
      d3  
        .line() 
        .x(function (d) { 
          return xscale(d[0]);  
        })  
        .y(function (d) { 
          return hscale(d[1]);  
        })  
    );  

  var yaxis = d3  
    .axisLeft() // we are creating a d3 axis  
    .scale(hscale) // fit to our scale  
    .tickFormat(d3.format(".2s")) // format of each year  
    .tickSizeOuter(0);  

  svg_line_chart  
    .select("g")  
    .attr("transform", "translate(" + padding + ",0)")  
    .attr("class", "yaxis") // we are giving it a css style 
    .call(yaxis); 

/*Falta mudar o nome do Y!!!!!!!!!!!! 
  svg_line_chart  
    .text("Events");*/  
} 

function prepare_buttons() {  
  d3.select("#deaths").on("click", function () {button_deaths();}); 
  d3.select("#events").on("click", function () {button_events();});

  prepare_buttons();
}

//test

