var margin = {top: 20, right: 80, bottom: 30, left: 80};
var width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom,
  writes_height = 50,
  senses_height = height - writes_height;

var green = "#4CAF50";

var timeformat = d3.timeFormat("%H:%M");

var x = d3.scaleTime().range([0, width]),
    numbers_y = d3.scaleLinear().range([senses_height/2, 0]),
    percents_y = d3.scaleLinear().range([senses_height, senses_height/2 + 10]),
    writes_y = d3.scaleBand().range([height, senses_height + 10]);

var numbers_line = d3.line()
    .curve(d3.curveBasis)
    .x(function(d) { return x(d.date); })
    .y(function(d) { return numbers_y(d.value); });

var percents_line = d3.line()
    .curve(d3.curveBasis)
    .x(function(d) { return x(d.date); })
    .y(function(d) { return percents_y(d.value); });

var writes_area = d3.area()
    .x(function(d) { return x(d.date); })
    .y1(function(d) { return writes_y(d.id); }) // TODO map d.id to writes_y range somehow
    .y0(function(d) { return writes_y(d.id) + writes_y.bandwidth(); })
    .defined(function(d) { return d.value && d.value !== 0; });

//var displayables_config = JSON.parse(document.getElementById("displayables-input").textContent);
var displayables_config = app.displayablesConfig;

function senses_line(id) {
  if (getConfig(id).type === "percent") {
    return percents_line;
  }
  
  return numbers_line;
}

function senses_y(id) {
  if (getConfig(id).type === "percent") {
    return percents_y;    
  }
  
  return numbers_y;
}

function getAlias(sense_id) {
  var config = getConfig(sense_id);
  var alias = config.alias;
  if (alias)
    return alias;
  else
    return sense_id;
};
function getColor(sense_id) {
  return getConfig(sense_id).color;
};

d3.select("#switch-graph").on("click", function() {
  selected = d3.select(this)
  if (selected.text() == "Стара графика") {
    d3.select("#graph-container").classed("hidden", true);
    d3.select("#old-graph-container").classed("hidden", false);
    selected.text("Нова графика");
  }
    
  else {
    d3.select("#graph-container").classed("hidden", false);
    d3.select("#old-graph-container").classed("hidden", true);
    selected.text("Стара графика");
  }
});

function fetch_and_redraw() {
  d3.event.preventDefault();
  d3.select(".loading").classed("hidden", false);
  since_days = this.dataset.sinceDays;
  since_hours = this.dataset.sinceHours;

  if (since_days) 
    from = moment().utc().subtract(since_days, 'days')

  if (since_hours)
    from = moment().utc().subtract(since_hours, 'hours')

  var to = moment().utc().add(1, 'minutes')

  d3.json(historyViewQuery(app.thing, from, to), redraw);

  d3.select(".graph-since[disabled]").attr("disabled", null);
  d3.select(this).attr("disabled", true);
};

d3.selectAll(".graph-since").on("click", fetch_and_redraw);

d3.select(".loading").classed("hidden", false);
var from = moment().utc().subtract(1, 'days');

var to = moment().utc().add(1, 'minutes')

d3.json(historyViewQuery(app.thing, from, to), redraw);

function unwrap(wrapped) {
  return wrapped.split("(")[1].split(")")[0]
};

function redraw(error, data) {
  if (error) throw error;

  senseColumns = []
  writeColumns = []
  data = data.rows.map(function (row) {
    var senses = row.value.senses;
    var write = row.value.write;
    senseColumns = senseColumns.concat(Object.keys(senses));
    if (write) {
      writeColumns = writeColumns.concat(Object.keys(write));
    }
    return {date: moment.utc([row.key[1], row.key[2], row.key[3], row.key[4], row.key[5], row.key[6]]), senses: senses, write: write}
  });

  senseColumns = Array.from(new Set(senseColumns));

  visible_sense_columns = senseColumns.filter(function(d) {
    return getConfig(d).graph;
  });

  var senses = visible_sense_columns.map(function(id) {
    return {
      id: id,
      values: data.map(function(d) {
        return {date: d.date, value: id === 'time'? d.senses[id] : parseValue(d.senses[id])};
      })
    };
  });
  var numbers = senses.filter(function(d) {
    return getConfig(d.id).type !== "percent";
  });

  writeColumns = Array.from(new Set(writeColumns));
  visible_write_columns = writeColumns.filter(function(d) {
    return getConfig(d).graph;
  });
  var writes = visible_write_columns.map(function(id) {
    return {
      id: id,
      values: data.map(function(d) {
        return {date: d.date, value: d.write ? d.write[id] : null, id: id};
      })
    };
  });
  x.domain(d3.extent(data, function(d) { return d.date; }));

  numbers_y.domain([
    d3.min(numbers, function(c) { return d3.min(c.values, function(d) { return d.value; }); }),
    d3.max(numbers, function(c) { return d3.max(c.values, function(d) { return d.value; }); })
  ]);

  percents_y.domain([0, 100]);

  write_height = 10;
  writes_length = writeColumns.length;
  below_x = 30
  writes_y.domain(writeColumns.map(function(d) { return d}))

  var dict = {"senses": senses, "writes": writes};
  var svg = d3.select("#graph")
    .selectAll("svg")
    .data([dict])
      
  var svgEnter = svg.enter().append("svg")

  var gEnter = svgEnter
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svgEnter.merge(svg).attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
  
  //  svgEnter.append("text")
  //    .attr("class", "count")
  //    .attr("transform", "translate(" 
  //      + margin.left + "," + margin.top + ")")
  //    .style("font", "10px sans-serif");
  //  
  //  svgEnter.merge(svg).select("text.count")
  //    .text("#" + senses[0].values.length)

  gEnter.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")

  gEnter.append("g")
        .attr("class", "axis axis-numbers-y");

  gEnter.append("g")
        .attr("class", "axis axis-percents-y");

  gEnter.append("g")
        .attr("class", "axis axis-writes-y");

  var g = svgEnter.merge(svg).select("g");
  g.select("g.axis.axis--x").transition().call(d3.axisBottom(x));
  g.select("g.axis.axis-numbers-y").transition().call(d3.axisLeft(numbers_y));
  g.select("g.axis.axis-percents-y").transition().call(d3.axisLeft(percents_y));
  g.select("g.axis.axis-writes-y").transition().call(d3.axisLeft(writes_y).tickFormat(getAlias));

  var sense = g.selectAll(".sense")
    .data(function(d) { return d["senses"]; }, function(d) {return d.id; });

  var senseEnter = sense.enter()
    .append("g")
    .attr("class", "sense");

  senseEnter.append("path")
    .attr("class", "line");

  senseEnter.append("text")
    .attr("x", 3)
    .attr("dy", "0.35em")
    .style("font", "10px sans-serif");
  
  senseEnter.merge(sense).select("path.line")
    .style("stroke", function(d) { return getColor(d.id); })
    .transition() 
      .attr("d", function(d) { return senses_line(d.id)(d.values); })
 
  senseEnter.merge(sense).select("text")
    .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
    .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + senses_y(d.id)(d.value.value) + ")"; })
    .text(function(d) { return getAlias(d.id); });

  sense.exit()
    .remove();

  var write = g.selectAll(".write")
    .data(function(d) { return d.writes; }, function(d) {return d.id; });

  var writeEnter = write.enter()
    .append("g")
    .attr("class", "write");

  writeEnter.append("path")
    .attr("class", "area");

  writeEnter.merge(write).select("path.area")
    .style("fill", function(d) { return getColor(d.id); })
    .transition() 
      .attr("d", function(d) { return writes_area(d.values); })
 
  write.exit()
    .remove();

  d3.select(".loading").classed("hidden", true);

  var mouseG = svgEnter.append("g")
    .attr("class", "mouse-over-effects")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  mouseG.append("path") // black vertical line to follow mouse
    .attr("class", "mouse-line")
    .style("stroke", green)
    .style("stroke-width", "1px")
    .style("opacity", "0");

  mouseG.append("text")
    .attr("class", "x-text")
    .style("text-anchor", "middle")
    .style("fill", green)
    .style("opacity", "0");

  var lines = document.getElementsByClassName('line'); // TODO use d3 selector
  var mousePerLineEnter = mouseG.selectAll('.mouse-per-line')
    .data(function(d) { return d.senses; })
    .enter()
    .append("g")
    .attr("class", "mouse-per-line");

  mousePerLineEnter.append("circle")
    .attr("r", 7)
    .style("stroke", green)
    .style("fill", "none")
    .style("stroke-width", "1px")
    .style("opacity", "0");

  mousePerLineEnter.append("text")
    .attr("fill", green)
    .attr("transform", "translate(10,-10)");

  mouseG.append("svg:rect") // append a rect to catch mouse movements on canvas
    .attr("class", "unselectable")
    .attr("width", width)
		.attr("height", height)
		.attr("fill", "none")
		.attr("pointer-events", "all")
		.on("mouseout", function() { // hide line, circles and text
			d3.select(".mouse-line")
				.style("opacity", "0");
			d3.selectAll(".mouse-per-line circle")
      	.style("opacity", "0");
			d3.selectAll(".mouse-per-line text")
      	.style("opacity", "0");
      d3.selectAll(".x-text")
      	.style("opacity", "0");
		})
		.on("mouseover", function() { // hide line, circles and text
			d3.select(".mouse-line")
				.style("opacity", "1");
			d3.selectAll(".mouse-per-line circle")
      	.style("opacity", "1");
			d3.selectAll(".mouse-per-line text")
      	.style("opacity", "1");
			d3.selectAll(".x-text")
      	.style("opacity", "1");
		})
		.on("mousemove", function() { 
			var mouse = d3.mouse(this);
      var xDate = x.invert(mouse[0]);
      d3.select(".x-text")
        .attr("transform", "translate(" + mouse[0] + ", " + (height + 30) + ")")
        .text(timeformat(xDate));
			d3.select(".mouse-line")
				.attr("d", function() {
					var d = "M" + mouse[0] + "," + (height + 10);
					d += " " + mouse[0] + "," + 0;
					return d;
				});
			d3.selectAll(".mouse-per-line")
				.attr("transform", function(d, i) {
					var bisect = d3.bisector(function(d) { return d.date; }).right;
					var idx = bisect(d.values, xDate);

					var beginning = 0,
							end = lines[i].getTotalLength(),
							target = null;

					while (true) {
						target = Math.floor((beginning + end) / 2);
						pos = lines[i].getPointAtLength(target);
						if ((target === end || target === beginning) && pos.x !== mouse[0]) {
							break;
						}
						if (pos.x > mouse[0])      end = target;
						else if (pos.x < mouse[0]) beginning = target;
						else break; //position found
					}

					d3.select(this).select("text")
						.text(senses_y(d.id).invert(pos.y).toFixed(2));

					return "translate(" + mouse[0] + "," + pos.y + ")";
				});
		});
};

function type(d, _, columns) {
  d.date = moment.utc(d.timestamp_utc)._d;
  for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
  return d;
}

function parseValue(s) {
  if (s) {
    return parseInt(s.split('|')[0])
  }
  else {
    return null;
  }
}
