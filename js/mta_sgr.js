// a JavaScript function that formats the numbers with commas
// based on http://cwestblog.com/2011/06/23/javascript-add-commas-to-numbers/
function addCommas(intNum) {
  return (intNum + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
}

// the center point of the map on load. Change this to adjust the center point of the map.
var map_centerpoint = [40.737092, -73.946743];
// zoom level of the map on load. Higher number zooms the map in closer
var zoom_level = 11;
// your visualization layer from CartoDB
var myVizLayer = 'https://richard-datapolitan.cartodb.com/api/v2/viz/c35e85b2-5370-11e5-b844-0e9d821ea90d/viz.json';
var cartodbSqlBase = 'http://richard-datapolitan.cartodb.com/api/v2/sql';

// the name of the CartoDB table I want to query against
var point_table_name = 'map_data_sgr';
var line_table_name = 'nyct_routes_1';

var sublayers=[]; //access to the sublayer objects in CartoDB API
var orig_line_css=[]; //array to hold the original CartoCSS for resetting the map


// create the map object
function init(){
  var map = new L.Map('map', {
      center: map_centerpoint, //center of map
      zoom: zoom_level //zoom level of map
    });
  // initializes the basemap. This uses the basic positron background
  var basemap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',{
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    }).addTo(map);

  var myLayer = cartodb.createLayer(map, myVizLayer) 
    .addTo(map)
    .done(function(layer) {
       for (var i = 0; i < layer.getSubLayerCount(); i++) {
           sublayers[i] = layer.getSubLayer(i);
           // alert("Congrats, you added sublayer #" + i + "!");
        } 
        layer.setInteraction(true);
        layer.on('error', function(err) {
            console.log('error: ' + err);
        });
        draw_chart();
        orig_line_css.push(sublayers[0].getCartoCSS());
        orig_line_css.push(sublayers[1].getCartoCSS());
    });
  } //end function init

init(); //initialize the map

///////variables for the D3 chart////////////
var width = 262,
    height = 200,
    radius = Math.min(width, height) / 2;

var color = d3.scale.ordinal()
    .range(['#1a9850', '#FFFF00', '#FF6600',  '#d73027']);

var arc = d3.svg.arc()
    .outerRadius(radius - 10)
    .innerRadius(radius - 70);

var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.spc; });

var svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

//create the d3 chart. Takes a parameter when a route has been selected, otherwise defaults to the entire dataset
function draw_chart(route_url){
  var url;
  if (route_url){
    d3.selectAll('.arc').remove(); //clear the existing chart to replace (a complete hack so I don't have to fight with transitions)
    url = route_url; //replace the url with the route where clause
  } else {
    url = cartodbSqlBase + '?' + $.param({ q:"SELECT sgr_perc_cat, COUNT(sgr_perc_cat) AS spc FROM map_data_sgr GROUP BY sgr_perc_cat ORDER BY sgr_perc_cat" }); //query for full table
  }
  //render utilizing the json from CartoDB
  d3.json(url,function (data){
    
    var dataset = [];
    data.rows.forEach(function(d){
      dataset.push(d);
    })

    var total = 0;
    dataset.forEach(function(d){
      total += d.spc;
    })

    g = svg.selectAll(".arc")
        .data(pie(dataset))
      .enter().append("g")
        .attr("class", "arc");

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.data.sgr_perc_cat); });

    g.append("text")
        .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .attr("class","chart-text")
        .style("text-anchor", "middle")
        .text(function(d) { return Math.round(((d.data.spc/total)*100)) + '%'; });
    }) //end d3.json

} //end function draw_chart


function update_chart(route){
  var url = cartodbSqlBase + '?' + $.param({ q:"SELECT sgr_perc_cat, COUNT(sgr_perc_cat) AS spc FROM map_data_sgr WHERE numbers_letters ILIKE '%" + route + "%' GROUP BY sgr_perc_cat ORDER BY sgr_perc_cat" });
  draw_chart(url);
} //end function update_chart

var opaqueStyle = $("#opaque").text();

$(document).ready(function() {
    $(".subway-route").click(function(event) {
        var route = event.target.id;
        var pt_sql,rt_sql;
        if (route == 'reset'){
          pt_sql = "SELECT * FROM " + point_table_name;
          rt_sql = "SELECT * FROM " + line_table_name;
          draw_chart();
          sublayers[0].setCartoCSS(orig_line_css[0]);
          sublayers[1].setCartoCSS(orig_line_css[1]);
        } else {
          pt_sql = "SELECT * FROM " + point_table_name + " WHERE numbers_letters ILIKE '%" + route + "%'";
          rt_sql = "SELECT * FROM " + line_table_name + " WHERE route_id ILIKE '%" + route + "%'";
        };
        // console.log(pt_sql);
        sublayers[2].setSQL(pt_sql);
        // console.log(rt_sql);
        sublayers[0].setSQL(rt_sql);
        sublayers[1].setSQL(rt_sql);
        update_chart(route);
    });
    $("li").click(function(event){
      sublayers[1].setSQL("SELECT * FROM " + line_table_name);
      var cat = event.target.id;
      sql = "SELECT * FROM " + point_table_name + " WHERE sgr_perc_cat = " + cat;
      sublayers[2].setSQL(sql);
      sublayers[1].setCartoCSS(opaqueStyle);
      sublayers[0].setCartoCSS(opaqueStyle);
    })
});