import React, { Component } from 'react';
import * as d3 from "d3";

function parseDatum(d) {
  const split = d.split('-');
  return {
    date: new Date(parseFloat(split[0])*1000),
    value: parseFloat(split[1])
  };
}

function parseData(data) {
  return data.map(parseDatum).filter(d => !isNaN(d.value)).sort((a,b) => a.date - b.date);
}

function getColor(d) {
  return "#4CAF50"; // green
}
class LineChart extends Component {
  constructor(props) {
    super(props);
    const margin = {top: 20, right: 80, bottom: 30, left: 80};
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    this.state = {
      margin: margin,
      width: width,
      height: height,
    }
    this.setContext = this.setContext.bind(this);
  }

  componentDidMount() {
    console.log("Did mount");
    const g = this.setContext();
    this.setBackground();
  }

  componentDidUpdate() {
    console.log("Did update");
    this.setBackground();
  }

  setContext() {
    const margin = this.state.margin;
    const width = this.state.width;
    const height = this.state.height;

    const svg = d3.select(this.refs.chart);
    const gEnter = svg
      .append('g')
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.attr("width", width + margin.left + margin.right);
    gEnter.append("g")
          .attr("class", "axis axis-x")
          .attr("transform", "translate(0," + height + ")");
    gEnter.append("g")
          .attr("class", "axis axis-y");
  }

  setBackground() {
    const svg = d3.select(this.refs.chart);
    const g = svg.select("g");
    const x = d3.scaleTime().range([0, this.state.width]);
    const y = d3.scaleLinear().range([this.state.height, 0]);
    const line = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.value); });

    const data = parseData(this.props.data);

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([
      d3.min(data, function(d) { return d.value; }),
      d3.max(data, function(d) { return d.value; })
    ]);

    g.select("g.axis.axis-x").transition().call(d3.axisBottom(x));
    g.select("g.axis.axis-y").transition().call(d3.axisLeft(y));

    const sense = g.selectAll(".sense")
      .data([{values: data}]);
    console.log(sense);

    const senseEnter = sense.enter()
      .append("g")
      .attr("class", "sense");

    console.log(senseEnter);

    senseEnter.append("path")
      .attr("class", "line");

    senseEnter.append("text")
      .attr("x", 3)
      .attr("dy", "0.35em")
      .style("font", "10px sans-serif");
    
    senseEnter.merge(sense).select("path.line")
      .style("stroke", function(d) { return getColor(d); })
      .style("fill", "none")
      .transition() 
        .attr("d", function(d) { console.log(d); return line(d.values); })
  
    sense.exit()
      .remove();

    return senseEnter;
  }

  render() {
    return (
      <svg className="d3-container" ref='chart' width={960} height={500}></svg>
    );
  }
}

export default LineChart;
