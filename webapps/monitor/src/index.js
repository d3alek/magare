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
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            {sensePath}
          </ol>
        </nav>
        <ul className="nav nav-pills ml-3 pt-1">
          {senseList}
        </ul>
      </div>
    );
  }
}

class Monitor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      docs: [],
      selectedSense: null,
      sinceHours: 0,
      toHours: 1
    }
    this.selectSense = this.selectSense.bind(this);
  }
  
  async loadDocs(sinceHours, toHours) {
    const db = new PouchDB(window.ENDPOINT + this.props.name);
    // TODO this assumes no gaps in data - which there always are. Do a different query instead
    const latestDoc = await db.allDocs({
      include_docs: true,
      descending: true,
      skip: Math.max(1, 2 - toHours),
      limit: sinceHours + toHours
    });

    const docs = latestDoc.rows.map(r => r.doc);

    this.setState({
      docs: docs
    });
  }

  async componentDidMount() {
    if (!this.props.name) {
      return;
    }
    this.loadDocs(this.state.sinceHours, this.state.toHours);
  }

  async componentDidUpdate(prevProps, prevState) {
    if (!this.props.name) {
      return;
    }

    if ( this.props.name !== prevProps.name
      || this.state.sinceHours !== prevState.sinceHours
      || this.state.toHours !== prevState.toHours) {
      await this.loadDocs(this.state.sinceHours, this.state.toHours);
    }
  }

  selectSense(sense) {
    this.setState({
      selectedSense: sense
    });
  }

  changeSinceHours(adjustment) {
    if (this.state.sinceHours + adjustment < 0
      || this.state.sinceHours + adjustment + this.state.toHours < 0) {
      return;
    }
    this.setState({
      sinceHours: this.state.sinceHours+adjustment
    })
  }
  changeToHours(adjustment) {
    if (this.state.toHours + adjustment > 1 
      || this.state.sinceHours + (this.state.toHours + adjustment) < 1) {
      return;
    }
    this.setState({
      toHours: this.state.toHours+adjustment
    })
  }

  render() {
    const sinceHours = this.state.sinceHours;
    const toHours = this.state.toHours;
    const docs = this.state.docs;
    const selectedSense = this.state.selectedSense;
    const senseNames = docs ?
      Array.from(new Set(docs.map(doc => Object.keys(doc).filter(s => !s.startsWith("_"))).flatten())) 
        : [];
    const data = selectedSense ? docs.map(doc => doc[selectedSense]).flatten() : [];
    const thisHour = new Date();
    thisHour.setSeconds(0);
    thisHour.setMinutes(0);
    const sinceString = new Date(thisHour.getTime() - sinceHours*1000*60*60).toLocaleString();
    const toString = toHours === 1 ? new Date().toLocaleString() : new Date(thisHour.getTime() + toHours*1000*60*60).toLocaleString();

    return (
      <div className="monitor mt-3" style={{height:"90%"}}>
        <Senses selected={selectedSense} senses={senseNames} selectSense={this.selectSense}/>
        <div className="btn-group mr-2" role="group" aria-label="Second group">
          <button type="button" className="btn btn-secondary" onClick={() => this.changeSinceHours(+1)}>-</button>
          <button type="button" className="btn btn-secondary">{sinceString}</button>
          <button type="button" className="btn btn-secondary" onClick={() => this.changeSinceHours(-1)}>+</button>
        </div>
        <div className="btn-group mr-2" role="group" aria-label="Second group">
          <button type="button" className="btn btn-secondary" onClick={() => this.changeToHours(-1)}>-</button>
          <button type="button" className="btn btn-secondary">{toString}</button>
          <button type="button" className="btn btn-secondary" onClick={() => this.changeToHours(+1)}>+</button>
        </div>
        <LineChart data={data}/>
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
        <Monitor name={selectedMonitor}/>
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
