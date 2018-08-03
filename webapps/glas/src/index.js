import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import { BrowserRouter as Router, Link, NavLink, Route } from 'react-router-dom';
import { versionControl, blobAsText } from './version-control.js';
import { EditComment, EditDoc, EditUser } from './edit.js';
import { FeatureDetails, FeatureList } from './features.js';
import { NavBar } from './NavBar.js';
import { Login } from './Login.js';

import plugin from 'pouchdb-authentication';

PouchDB.plugin(plugin);

window.ENDPOINT = 'https://magare.otselo.eu/';
window.DB = 'features';
window.PUBLIC_USERS = 'public_users';


class UserDetails extends Component {
  render() {
    const db = this.props.db;
    const publicUsers = this.props.publicUsers;
    const userName = this.props.userName;
    return userName ? (
      <div className="row"> 
        <div className="col-12">
          <h4>Промени профила или <button className="btn" onClick={() => this.props.logOut()}>Излез</button></h4>
          <EditUser loggedUser={userName} db={db} publicUsers={publicUsers}/>  
        </div>
      </div>
    ) : (
      <div className="row"> 
        <div className="col-md-5">
          <h4>Съществуващ профил</h4>
          <Login logIn={this.props.logIn} userName={userName} publicUsers={publicUsers}/>
        </div>
        <div className="col-md-2 text-center align-self-center">
          <h4>или</h4>
        </div>
        <div className="col-md-5">
          <h4>Нов профил</h4>
          <EditUser loggedUser={userName} db={db} publicUsers={publicUsers}/>  
        </div>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    const publicUsers = new PouchDB(window.PUBLIC_USERS);
    const db = versionControl(new PouchDB(window.ENDPOINT + window.DB, {
      fetch(url, opts) { // as per https://github.com/pouchdb-community/pouchdb-authentication/issues/239#issuecomment-403506880
        opts.credentials='include'
        return PouchDB.fetch(url, opts)
      },
      skip_setup: true}));

    this.state = {
      docs: [],
      db: db,
      publicUsers: publicUsers
    };

    this.logOut = this.logOut.bind(this);
    this.logIn = this.logIn.bind(this);
  }

  showError(e) {
    console.log(e);
    var error = 'Unknown error - see logs.';
    if (e.status === 404) {
      error = 'Database `' + window.DB + '` not found.';
    }
    this.setState({
      error: error
    });
  }

  async getAllDocs() {
    const docs = await this.state.db.allDocs({
      include_docs: true,
    }).catch( e => this.showError(e));

    const docsMap = {};
    if (docs) {
      docs.rows.forEach(r => {
        if (!r.id.startsWith('_')) {
          docsMap[r.id] = r.doc;
        }
      });
    }

    return docsMap;
  }

  startPublicUserReplication() {
    PouchDB.sync(this.state.publicUsers, window.ENDPOINT + window.PUBLIC_USERS, {
      live: true,
      retry: true
    }).on('change', info => {
      console.log("replication change")
    }).on('paused', err => {
      console.log("replication paused")
    }).on('active', () => {
      console.log("replication active")
    }).on('denied', err => {
      console.log("replication denied")
    }).on('complete', err => {
      console.log("replication complete")
    }).on('error', err => {
      console.log("replication error")
    });
  }

  async componentDidMount() {
    const docs = await this.getAllDocs();
    const session = await this.state.db.getSession();
    this.startPublicUserReplication();
    if (docs) {
      this.setState({
        docs: docs,
        userName: session.userCtx.name
      });
    }
  }

  async handleDocChanged(newDoc) {
    if (!newDoc._id) {
      const uuid = await fetch(window.ENDPOINT + '_uuids')
        .then(r => r.json())
        .then(r => r.uuids[0]);
      newDoc._id = 'vote-' + uuid.substr(24);
    }
    const userName = this.state.userName;
    if (!newDoc.editors || newDoc.editors.indexOf(userName) === -1) {
      newDoc.editors = (newDoc.editors || []).concat([userName]);
    }
    newDoc.author = userName;
    await this.state.db.put(newDoc);
    const docs = await this.getAllDocs();
    this.setState({
      docs: docs
    });
    return newDoc._id;
  }

  async handleCommentChanged(newComment, doc) {
    const userName = this.state.userName;
    if (! (newComment.at && newComment.author)) {
      newComment.at = new Date().toISOString();
      newComment.author = userName;
    }
    const comments = doc.comments || [];
    var index = comments.findIndex(c => 
      c.author === newComment.author 
      && c.at == newComment.at)
    if (index === -1) {
      index = comments.length;
    }
    if (!newComment.message) {
      comments.splice(index,1);
    }
    else {
      comments[index] = newComment;
    }
    doc.comments = comments;
    doc.author = userName;
    await this.state.db.put(doc);
    const docs = await this.getAllDocs();
    this.setState({
      docs: docs
    });
    return doc._id;
  }


  async handleRevisionChanged(doc, revision) {
    // TODO submit button adds user to editors if not present, makes a new version (saving old one) of document and pushes it
    var revisionDoc;
    const rev = revision.substr(4);
    if (doc.latestRev !== rev) {
      const attachment = await this.state.db.getAttachment(doc._id, revision);
      revisionDoc = JSON.parse(await blobAsText(attachment));
      revisionDoc._id = doc._id;
      revisionDoc._rev = rev;
      revisionDoc._attachments = doc._attachments;
      revisionDoc.latestRev = doc.latestRev || doc._rev;
    }
    else {
      revisionDoc = this.state.db.__oldDocs[doc._id];
    }

    const docs = this.state.docs;
    docs[doc._id] = revisionDoc;

    this.setState({
      docs: docs
    });
  }

  async logOut() {
    await this.state.db.logOut();
    this.setState({
      userName: null
    });
  }

  async getUserDisplayName(user) {
    return (await this.state.publicUsers.get(user) || {}).displayName || user;
  }

  async logIn(name, password) {
    const response = await this.state.db.logIn(name, password).catch(err => {
      if (err) {
        if (err.name === 'unauthorized' || err.name === 'forbidden') {
          // name or password incorrect
          // TODO redirect to a page
          return null;
        } else {
          // other error
          // TODO redirect to a page
          return null;
        }
      }
    });

    if (response) {
      this.setState({
        userName: response.name
      });
    }
  }

  render() {
    const docs = this.state.docs;
    const userName = this.state.userName;
    const db = this.state.db;

    const publicUsers = this.state.publicUsers;
    const error = this.state.error;
    const errorMessage = error ?
      <div className="alert alert-danger">{error}</div> 
      : '';
    const root = 'Предложения';

    return (
      <Router>
        <div className='container' style={{height:"100vh"}}>
          <Route path='/' render={ ( {location} ) =>
            <NavBar location={location} userName={userName} logIn={this.logIn} publicUsers={publicUsers} docs={docs}/>
          }/>
          {errorMessage}
          <Route exact path='/' render={ () => (
            <FeatureList docs={docs}/>
          )}/>
          <Route exact path='/d/:docId' render={ ({match}) => {
            const doc = docs[match.params.docId];
            const path = [
              root,
              [doc && doc.title, null],
            ];
            return doc && (
              <FeatureDetails 
                doc={doc}
                publicUsers={publicUsers}
                userName={userName}
                handleRevisionChanged={(doc, version) => this.handleRevisionChanged(doc, version)}
                put={db.put}
              />
          )}}/>
          <Route path='/d/:docId/edit' render={ ({match}) => {
            const doc = docs[match.params.docId];
            const path = doc ? [
              root,
              [doc.title,'/d/'+match.params.docId],
              ['Промени', null]
            ] : [
              root,
              ['Ново', null],
            ];

            return (
              <EditDoc 
                doc={doc}
                handleDocChanged={(newDoc) => this.handleDocChanged(newDoc)}/>
            )}}/>
          <Route path='/d/:docId/c/:commentAuthor/:commentAt/edit' render={ ({match}) => {
            const doc = docs[match.params.docId];
            const commentAuthor = match.params.commentAuthor;
            const commentAt = match.params.commentAt;
            const comment = doc && doc.comments && doc.comments.find(c => 
                    c.author === commentAuthor 
                    && c.at === commentAt);
            const path = [
              root,
              [doc && doc.title,'/d/'+match.params.docId],
              [comment ? (commentAuthor+'-'+commentAt) : 'Нов коментар',null]
            ];
            return doc && (
              <EditComment
                docId={doc._id}
                comment={comment}
                handleCommentChanged={(newComment) => this.handleCommentChanged(newComment, doc)}/>
          )}}/>
          <Route path='/user' render={ () => 
              <UserDetails logIn={this.logIn} db={db} userName={userName} logOut={this.logOut} publicUsers={publicUsers}/>
          }/>
        </div>
      </Router>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
