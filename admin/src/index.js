import React, { Component } from 'react';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import { versionControl, filterContent } from './version-control.js';

class Db extends Component {
  render() {
    return (
      <button className="db" onClick={this.props.onClick}>
      {this.props.name}
      </button>
    );
  }
}

window.COLS = 50;

function calculateRows(text) {
  var linecount = 0;
  text.split('\n').forEach( l => linecount += Math.ceil(l.length/window.COLS));
  return linecount + 1;
}

// TODO what I can't decide is the level of abstraction
// should Doc be calling db? Or should Doc be given everything he needs from DB... Probably the latter, Doc is given all info from the database, including all revisions and their data
//
// this will be good but allDocs({binary:true}) does not seem to work, try it again otherwise I anticipate UTF-8 issues
class Doc extends Component {
  constructor(props) {
    super(props);

    this.state = {
      id: props.doc._id,
      revision: 'rev-'+props.doc._rev,
      revisions: props.doc.revisions,
      changedContent: null
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    var name = event.target.type === 'text' ? 'newDocId' : 'newDocContent';
      
    this.setState({
      changedContent : event.target.value
    });
  }

  getPreviousRevision() {
    const thisRevisionNumber = parseInt(this.state.revision.split('-')[1]);
    if (thisRevisionNumber === 0) {
      console.log('No revision before 0');
      return this.state.revision;
    }
    const revisionPrefix = 'rev-'+thisRevisionNumber;
    const allResults = Object.keys(this.state.revisions).filter(a => a < revisionPrefix);
    const result = allResults[allResults.length-1];
    if (!result) {
      return this.state.revision;
    }
    return result;
  }

  getNextRevision() {
    const revision = this.state.revision;
    const thisRevisionNumber = parseInt(revision.split('-')[1]);
    const revisionPrefix = 'rev-'+thisRevisionNumber;
    const allResults = Object.keys(this.state.revisions).filter(a => a > revisionPrefix);
    const result = allResults[0] === revision ? allResults[1] : allResults[0];
    if (!result) {
      return 'rev-' + this.props.doc._rev;
    }
    return result;
  }

  changeRevision(revision) {
    this.setState({
      revision: revision
    });
  }

  saveChangedContent() {
    // TODO make sure parsed does not have '_id', '_rev', '_attachments'
    const newDoc = JSON.parse(this.state.changedContent);
    const doc = this.props.doc;
    newDoc._id = doc._id;
    newDoc._rev = doc._rev;
    newDoc._attachments = doc._attachments;

    this.props.putDocument(newDoc);
    this.setState({
      changedContent: null
    });
  }

  render() {
    const changedContent = this.state.changedContent;
    const revisions = this.state.revisions;

    const revision = this.state.revision;
    const content = changedContent ? 
      changedContent 
      : revision in revisions ? 
        JSON.stringify(revisions[revision], null, 2)
        : JSON.stringify(filterContent(this.props.doc), null, 2);
    const saveButton = changedContent ?
        <button onClick={() => this.saveChangedContent()}>Save</button>
      : '';
    return (
      <div>
        <button onClick={() => this.changeRevision(this.getNextRevision())}>Next revision</button>
        <button onClick={() => this.changeRevision(this.getPreviousRevision())}>Previous revision</button>
        <button onClick={() => this.props.deleteRevision(revision)}>Delete revision</button>
        <p>{revision in revisions ? revision : 'new'}</p>
        {saveButton}
        <textarea cols={window.COLS} rows={calculateRows(content)} value={content} onChange={this.handleChange}/>
      </div>
    );
  }
}

async function readAsText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", function() {
      resolve(reader.result);
    });
    reader.addEventListener("onerror", function() {
      reject(reader.error);
    });
    reader.readAsText(blob);
  });
}

async function revisionBlobsToStrings(doc) {
  var result = Object.assign({}, doc);
  if (!doc._attachments) {
    console.log('Document ' + doc._id + ' does not seem to be version controlled - no attachmentsf found');
    return doc;
  }
  if (result.revisions) {
    console.log("Warning! Document " + doc._id + ' already has revisions: ' + JSON.stringify(result.revisions) + '. Getting rid of them.');
  }
  result.revisions = {}
  for (const attachment of Object.keys(doc._attachments)) {
    if (!attachment.startsWith('rev-')) { continue;
    }
    const blob = doc._attachments[attachment].data;
    result.revisions[attachment] = JSON.parse(await readAsText(blob));
  }
  return result;
}

async function getAllDocs(db) {
  const allDocs = await db.allDocs({include_docs:true, attachments: true, binary: true});
  var docsWithStrings = {};
  for (const row of allDocs.rows) {
    docsWithStrings[row.id] = await revisionBlobsToStrings(row.doc);
  }
  return docsWithStrings;
}

function getEndpoint(remote) {
  return remote ? 'https://magare.otselo.eu/' : '';
}

async function getAllDbs(remote) {
  var allDbs;
  if (remote) {
    allDbs = await fetch(getEndpoint(true) + '_all_dbs').then( r => r.json());
  }
  else {
    allDbs = ['admin-local'];
  }
  return allDbs;
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dbs: [],
      selectedDb: null,
      docs: [],
      selectedDoc: null,
      remote: false,
      authenticated: false,
      adminUser: "",
      adminPassword: "",
      newDocId: null,
      askNewDocId: false,
      newDatabaseName: null,
      askNewDatabaseName: false
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    var name = event.target.name;
      
    this.setState({
      [name] : event.target.value
    });
  }

  async componentDidMount() {
    var allDbs = await getAllDbs(this.state.remote);
    this.setState({
      dbs: allDbs
    });
  }

  async handleDbClick(name) {
    console.log("Clicked db " + name);
    const user = this.state.adminUser;
    const password = this.state.adminPassword;
    const auth = user && password ? {
          username: this.state.adminUser,
          password: this.state.adminPassword
        } : null;
    const db = versionControl(new PouchDB(
      getEndpoint(this.state.remote) + name, {
        auth: auth
      }
    ));

    const docs = await getAllDocs(db);
    this.setState({
      docs: docs,
      selectedDb: db
    });
  }

  async newDatabase() {
    if (!this.state.authenticated) {
      console.log("Must be authenticated admin to create new databases");
    }
    const newDatabaseName = this.state.newDatabaseName;
    if (newDatabaseName) {
      await this.handleDbClick(newDatabaseName);
      this.setState({
        askNewDatabaseName: false,
        newDatabaseName: ''
      });
      if (this.state.remote) {
        const allDbs = await getAllDbs(true);
        this.setState({
          dbs: allDbs
        });
      }
    }
    else {
      this.setState({
        askNewDatabaseName: true,
        newDatabaseName: ''
      });
    }
  }

  handleDocClick(doc) {
    console.log("Clicked doc " + doc._id);
    this.setState({
      selectedDoc: doc,
    });
  }

  handleNewDocClick(db) {
    const newDocId = this.state.newDocId;
    if (newDocId) {
      const doc = {'_id': newDocId} 
      this.putDocument(db, doc);
      this.setState({
        newDocId: null,
        askNewDocId: false
      });
    }
    else {
      this.setState({
        askNewDocId: true,
        newDocId: ''
      });
    }
  }

  async putDocument(db, newDoc) {
    await db.put(newDoc);
    const docs = await getAllDocs(db);
    this.setState({
      selectedDoc: docs[newDoc._id],
      docs: docs
    });
  }

  async onRemoteSwitch() {
    const newRemote = ! (this.state.remote);
    const allDbs = await getAllDbs(newRemote);
    this.setState({
      dbs: allDbs,
      remote: newRemote
    });
  }

  async deleteRevision(db, doc, revision) {
    if (!this.state.authenticated) {
      console.log("Must be authenticated admin to delete revisions");
    }
    await db.removeAttachment(doc._id, revision, doc._rev);
    const docs = await getAllDocs(db);
    this.setState({
      selectedDoc: docs[doc._id],
      docs: docs
    });
  }

  authenticate() {
    const adminUser = this.state.adminUser;
    const adminPassword = this.state.adminPassword;

    const url = getEndpoint(true) + '_session';
    if (!url.startsWith('https')) {
      console.log("Refusing to authenticate over non-SSL URL: " + url);
      return;
    }
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(adminUser + ":" + adminPassword));
    fetch(url, {headers: headers}).then( r => r.json()).then( r => {
      if (r.userCtx.roles.includes('_admin')) {
        this.setState({
          authenticated: true,
          selectedDb: null,
          selectedDoc: null
        });
      }
      else {
        console.log("User " + r.userCtx.name + " does not have the _admin role: " + JSON.stringify(r.userCtx.roles))
        this.setState({
          authenticated: false,
          adminUser: '',
          adminPassword: ''
        });
      }
    });
  }

  render() {
    const authenticateForm = this.state.remote && !this.state.authenticated ? (
        <div className="app">
          <input type="text" name="adminUser" value={this.state.adminUser} onChange={this.handleChange}/>
          <input type="password" name="adminPassword" value={this.state.adminPassword} onChange={this.handleChange}/>
          <input type="submit" value="Authenticate" onClick={() => this.authenticate()}/>
        </div>
      ) : '';

    const dbs = this.state.dbs.map( db => 
        <li key={db.name}><Db onClick={() => this.handleDbClick(db)} name={db}/></li>
    );
    const docs = Object.values(this.state.docs).map( doc => 
        <li key={doc._rev}>
          <button onClick={() => this.handleDocClick(doc)}>
          {doc._id}
          </button>
        </li>
    );
    const selectedDb = this.state.selectedDb;
    const doc = this.state.selectedDoc;
    const selectedDoc = this.state.selectedDoc !== null ?
        <ul className="doc_details">
          <Doc key={this.state.selectedDoc._rev} doc={doc} putDocument={(newDoc) => this.putDocument(selectedDb, newDoc)} deleteRevision={(revision) => this.deleteRevision(selectedDb, doc, revision)}/>
        </ul>
      : "";

    const newDocIdInput = this.state.askNewDocId ? 
      <input type="text" name="newDocId" value={this.state.newDocId} onChange={this.handleChange}/>
      : '';
    const newDatabaseNameInput = this.state.askNewDatabaseName ? 
      <input type="text" name="newDatabaseName" value={this.state.newDatabaseName} onChange={this.handleChange}/>
      : '';

    return (
      <div className="app">
        <button onClick={() => this.onRemoteSwitch()}>
          {this.state.remote ? "Remote" : "Local"}
        </button>
        { authenticateForm }
        <button onClick={() => this.newDatabase()}>
          New database
        </button>
        <ul className="db_list">
          {newDatabaseNameInput}
          {dbs}
        </ul>
        <ul className="doc_list">
          <button onClick={() => this.handleNewDocClick(selectedDb)}>New Document</button>
          {newDocIdInput}
          {docs}
        </ul>
        {selectedDoc}    
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
