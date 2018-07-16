import React, { Component } from 'react';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import LineChart from './LineChart';

window.ENDPOINT = 'https://magare.otselo.eu/';


function getLevelSenses(senses, level, prefix) {
  const filteredSenses = senses.filter(s => !s.startsWith('_')).filter(s => s.startsWith(prefix));
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
      levelSenses: null,
    };
  }

  levelUp(senses) {
    const level = this.state.level;
    const prefix = this.state.prefix;
    if (senses.length == 1) {
      this.props.selectSense(senses[0].join('/'))
    }
    else {
      var newLevel = level + 1;
      var newPrefix = level > 0 ? prefix + '/' + senses[0][level] : senses[0][0];
      var levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
      while (Object.keys(levelSenses).length == 1) {
        newLevel = newLevel + 1;
        newPrefix = newPrefix + '/' + senses[0][newLevel-1]
        levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
        console.log("in do loop " + newLevel + " " + newPrefix + " " + Object.keys(levelSenses).length);
      }

      this.setState({
        level: newLevel,
        prefix: newPrefix, 
        levelSenses: levelSenses
      });
    }
  }

  levelDown() {
    //TODO fix
    const level = this.state.level;
    const prefix = this.state.prefix;

    var newLevel = level - 1;
    var newPrefix = prefix.split('/').slice(0, newLevel).join('/');
    var levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
    while (Object.keys(levelSenses).length == 1) {
      newLevel = newLevel - 1;
      newPrefix = prefix.split('/').slice(0, newLevel).join('/');
      levelSenses = getLevelSenses(this.props.senses, newLevel, newPrefix)
      console.log("level-down in do loop " + newLevel + " " + newPrefix + " " + Object.keys(levelSenses).length + " " + newPrefix);
    }

    this.setState({
      level: newLevel,
      prefix: newPrefix,
      levelSenses: levelSenses
    });
  }

  render() {
    const level = this.state.level;
    var levelSenses = this.state.levelSenses;
    if (!levelSenses) {
      levelSenses = getLevelSenses(this.props.senses, 0, "");
    }
    console.log(this.props.senses);
    console.log(levelSenses);
    const senseList = Object.keys(levelSenses).map( sensePrefix => (
      <li key={sensePrefix}>
        <button onClick={() => this.levelUp(levelSenses[sensePrefix])}>
          {sensePrefix}
        </button>
      </li>
    ));

    return (
      <div>
        <ul>
          {senseList}
        </ul>
        {level > 0 ? <button onClick={() => this.levelDown()}>Back</button> : ''}
      </div>
    );
  }
}

class Monitor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      senses: [],
      selectedSense: null,
    }
    this.selectSense = this.selectSense.bind(this);
  }

  async componentDidMount() {
    const db = new PouchDB(window.ENDPOINT + this.props.name);
    const latestDoc = await db.allDocs({
      include_docs: true,
      descending: true,
      skip: 1,
      limit: 1
    });

    console.log(latestDoc);
    const senses = latestDoc.rows[0].doc;

    this.setState({
      //documents: documents.rows.filter(d => !d.id.startsWith('_design'))
      senses: senses
    });
  }

  selectSense(sense) {
    this.setState({
      selectedSense: sense
    });
  }

  render() {
    const senses = this.state.senses;
    const selectedSense = this.state.selectedSense;

    return (
      <div className="monitor">
        { selectedSense ? (<LineChart data={senses[selectedSense]}/>) : ''}
        <Senses senses={Object.keys(senses)} selectSense={this.selectSense}/>
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
        <li key={monitor}>
          <button onClick={() => this.props.onClick(monitor)}>
            {monitor}
          </button> 
        </li>
    );

    return (
      <div className='monitor-list'>
        {monitors}
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
      <div className='app'>
        <MonitorList onClick={(monitor) => this.handleMonitorClick(monitor)}/>
        {selectedMonitor ? (<Monitor key={selectedMonitor} name={selectedMonitor}/>) : ''}
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
