import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import LineChart from './LineChart';

window.ENDPOINT = 'https://magare.otselo.eu/';


function getLevelSenses(senses, level, prefix) {
  const filteredSenses = senses.filter(s => s.startsWith(prefix));
  const levelSenses = {};
  filteredSenses.map( s => {
    const split = s.split('/');
    if (!(split[level] in levelSenses)) {
      levelSenses[split[level]] = [];
    }
    levelSenses[split[level]].push(split);
  });
  return levelSenses;
}

class Senses extends Component {
  constructor(props) {
    super(props);
    this.state = {
      level: 0,
      prefix: "" ,
    };
  }

  levelUp(senses) {
    const level = this.state.level;
    const prefix = this.state.prefix;
    if (senses.length == 1) {
      this.props.selectSense(senses[0].join('/'));
    }
    else {
      var newLevel = level + 1;
      var newPrefix = level > 0 ? prefix + '/' + senses[0][level] : senses[0][0];
      var levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
      while (Object.keys(levelSenses).length == 1) {
        newLevel = newLevel + 1;
        newPrefix = newPrefix + '/' + senses[0][newLevel-1]
        levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
      }

      this.setState({
        level: newLevel,
        prefix: newPrefix, 
      });
    }
  }

  levelDown(newLevel) {
    const level = this.state.level;
    const prefix = this.state.prefix;

    var newPrefix = prefix.split('/').slice(0, newLevel).join('/');
    var levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
    while (newLevel >= 0 && Object.keys(levelSenses).length == 1) {
      newLevel = newLevel - 1;
      newPrefix = prefix.split('/').slice(0, newLevel).join('/');
      levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
    }

    this.setState({
      level: newLevel,
      prefix: newPrefix,
    });
  }

  render() {
    const level = this.state.level;
    const prefix = this.state.prefix;
    const levelSenses = getLevelSenses(this.props.senses, level, prefix);
    const selected = this.props.selected;
    const senseList = Object.keys(levelSenses).sort().map( sensePrefix => (
      <li className="nav-item" key={sensePrefix}>
        <a href="#" className={"nav-link " + (levelSenses[sensePrefix][0].join('/') === selected ? "active" : "")} onClick={() => this.levelUp(levelSenses[sensePrefix])}>
          {sensePrefix}
        </a>
      </li>
    ));
    const sensePath = ["all"].concat(prefix.split('/')).map( (step, index) => (
      <li key={step+index} className="breadcrumb-item" onClick={() => this.levelDown(index)}>
        <a href="#">{step}</a>
      </li>
    ));

    return (
      <div className="row">
        <div className="col-xs-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              {sensePath}
            </ol>
          </nav>
          <ul className="nav nav-pills ml-3 pt-1">
            {senseList}
          </ul>
        </div>
      </div>
    );
  }
}

class Monitor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      doc: null,
      selectedSense: null,
    }
    this.selectSense = this.selectSense.bind(this);
  }

  async componentDidMount() {
    if (!this.props.name) {
      return;
    }
    const db = new PouchDB(window.ENDPOINT + this.props.name);
    const latestDoc = await db.allDocs({
      include_docs: true,
      descending: true,
      skip: 1,
      limit: 1
    });

    const doc = latestDoc.rows[0].doc;

    this.setState({
      doc: doc 
    });
  }

  selectSense(sense) {
    this.setState({
      selectedSense: sense
    });
  }

  render() {
    const doc = this.state.doc;
    const selectedSense = this.state.selectedSense;
    const senseNames = doc ? Object.keys(doc).filter(s => !s.startsWith("_")) : [];

    return (
      <div className="monitor mt-3" style={{height:"90%"}}>
        <Senses selected={selectedSense} senses={senseNames} selectSense={this.selectSense}/>
        <LineChart data={selectedSense ? doc[selectedSense] : []}/>
      </div>
    );
  }
}

class MonitorList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      monitors: []
    };
  }

  async componentDidMount() {
    var monitors = await fetch(window.ENDPOINT + '_all_dbs')
      .then(r => r.json())
      .then(r => r.filter(db => db.endsWith('-monitor')));
    this.setState({
      monitors: monitors
    });
  }

  render() {
    const monitors = this.state.monitors.map( monitor => 
        <li className="nav-item" key={monitor}>
          <a href="#" className={ "nav-link " + (monitor === this.props.selected ? 'active' : '')} key={monitor} onClick={() => this.props.onClick(monitor)}>{monitor}</a> 
        </li>
    );

    return (
      <div className="row">
        <ul className="col-xs-12 nav nav-pills mt-1">
          {monitors}
        </ul>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedMonitor: null   
    };
  }

  handleMonitorClick(monitor) {
    this.setState({
      selectedMonitor: monitor
    });
  }

  render() {
    const selectedMonitor = this.state.selectedMonitor;
    return (
      <div className='container' style={{height:"100vh"}}>
        <MonitorList selected={selectedMonitor} onClick={(monitor) => this.handleMonitorClick(monitor)}/>
        <Monitor key={selectedMonitor} name={selectedMonitor}/>
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
