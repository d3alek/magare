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

function getWidth(selection) {
  return selection.node().getBoundingClientRect().width;
}

function getHeight(selection) {
  return selection.node().getBoundingClientRect().height;
}

function getColor(d) {
  return "#4CAF50"; // green
}
class LineChart extends Component {
  constructor(props) {
    super(props);
    const margin = {top: 20, right: 80, bottom: 30, left: 80};
    d3.select(this.refs.chart)
    this.state = {
      margin: margin
    }
    this.setContext = this.setContext.bind(this);
  }

  componentDidMount() {
    const g = this.setContext();
    this.setBackground();
  }

  componentDidUpdate() {
    this.setBackground();
  }

  transformHeight(xAxis, height) {
      xAxis.attr("transform", "translate(0," + height + ")");
  }

  setContext() {
    const svg = d3.select(this.refs.chart);

    const margin = this.state.margin;
    const height = getHeight(svg) - margin.top - margin.bottom;
    this.setState({
      height: height
    });

    const gEnter = svg
      .append('g')
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const xAxis = gEnter.append("g")
          .attr("class", "axis axis-x");
    this.transformHeight(xAxis, height);
    gEnter.append("g")
          .attr("class", "axis axis-y");
  }

  setBackground() {
    const margin = this.state.margin;

    const svg = d3.select(this.refs.chart);
    const g = svg.select("g");

    const width = getWidth(svg) - margin.left - margin.right;
    const height = getHeight(svg) - margin.top - margin.bottom;
    if (height != this.state.height) {
      const xAxis = g.select('.axis-x');
      this.transformHeight(xAxis, height);
    }

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    const line = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.value); });

    const data = parseData(this.props.data);

    const minDate = d3.min(data, function(d) { return d.date });
    const maxDate = d3.max(data, function(d) { return d.date });
    x.domain([minDate, maxDate]);
    y.domain([
      d3.min(data, function(d) { return d.value; }),
      d3.max(data, function(d) { return d.value; })
    ]);

    g.select("g.axis.axis-x").transition().call(d3.axisBottom(x));
    g.select("g.axis.axis-y").transition().call(d3.axisLeft(y));

    const sense = g.selectAll(".sense")
      .data([{values: data}]);

    const senseEnter = sense.enter()
      .append("g")
      .attr("class", "sense");


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
        .attr("d", function(d) { return line(d.values); })
  
    sense.exit()
      .remove();

    return senseEnter;
  }

  render() {
    const data = parseData(this.props.data);
    const minDate = d3.min(data, function(d) { return d.date });
    const maxDate = d3.max(data, function(d) { return d.date });

    const save = (<p>{minDate ? new Date(minDate).toLocaleString() : ''} до {maxDate ? new Date(maxDate).toLocaleTimeString() : ''}</p>)
    return (
      <svg className="d3-container" ref='chart' width="100%" height="90%"></svg>
    );
  }
}

export default LineChart;
