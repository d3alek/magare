import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import { BrowserRouter as Router, Link, NavLink, Route } from 'react-router-dom';
import { versionControl, blobAsText } from './version-control.js';
import { EditComment, EditDoc, EditUser } from './edit.js';
import { FeatureDetails, FeatureList } from './features.js';

import plugin from 'pouchdb-authentication';

PouchDB.plugin(plugin);

window.ENDPOINT = 'https://magare.otselo.eu/';
window.DB = 'features';
window.PUBLIC_USERS = 'public_users';

class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.handleLoginRegister = this.handleLoginRegister.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  async handleLoginRegister(event) {
    event.preventDefault();

    const name = this.state.name;
    const password = this.state.password;

    if (name && password) {
      await this.props.logIn(name, password);
    }
    else {
      window.location.href = '/user';
    }
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  render() {
    const userName = this.props.userName;

    if (userName) {
      return <div className="navbar-text">Здравей <NavLink to="/user">{userName}</NavLink></div>
    }

    const short = this.props.short;
    return (
      <form className={short && "form-inline" + " my-2 my-lg-0"} onSubmit={this.handleLoginRegister}>
        <div className="form-group">
          <label className={short && "sr-only"} htmlFor="name">Име за вход</label>
          <input className="form-control mr-sm-2" type="text" name="name" id="name" placeholder="Име за вход" aria-label="Име за вход" onChange={this.handleChange}/>
        </div>
        <div className="form-group">
          <label className={short && "sr-only"} htmlFor="password">Парола</label>
          <input className="form-control mr-sm-2" type="password" id="password" name="password" placeholder="Парола" aria-label="Парола" onChange={this.handleChange}/>
        </div>
        <button className="btn btn-outline-success my-2 my-sm-0" type="submit">{short ? "Влез/Запиши се" : "Влез"}</button>
      </form>
    );
  }
}

class NavBar extends Component {
  render() {
    const path = this.props.path.map(part => {
      return part[1] === null ? (
        <li key="active" className="active breadcrumb-item">
          {part[0]}
        </li>) : (
        <li key={part[1]} className="breadcrumb-item">
          <Link to={part[1]}>
            {part[0]}
          </Link>
        </li>
      )});

    const logIn = this.props.logIn;

    return (
      <nav className="navbar navbar-expand-lg navbar-light bg-light mb-3">
        <Link to='/'>
          <span className="navbar-brand">Глас</span>
        </Link>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ol className="navbar-nav mr-auto mb-0 breadcrumb bg-transparent">
            {path}
          </ol>
          {logIn && <Login logIn={logIn} userName={this.props.userName} short={true}/>}
        </div>
      </nav>
    );
  }
}

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
          <Login logIn={this.props.logIn} userName={userName}/>
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
      docs.rows.map(r => docsMap[r.id] = r.doc);
    }

    return docsMap;
  }

  startPublicUserReplication() {
    this.state.publicUsers.replicate.from(window.ENDPOINT + window.PUBLIC_USERS, {
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
    const root = ['Предложения', '/'];

    return (
      <Router>
        <div className='container' style={{height:"100vh"}}>
          {errorMessage}
          <Route exact path='/' render={ () => (
            <div>
              <NavBar path={[[root[0],null]]} userName={userName} logIn={this.logIn}/>
              <FeatureList docs={docs}/>
            </div>
          )}/>
          <Route exact path='/d/:docId' render={ ({match}) => {
            const doc = docs[match.params.docId];
            const path = [
              root,
              [doc && doc.title, null],
            ];
            return doc && (
            <div>
              <NavBar path={path} userName={userName} logIn={this.logIn}/>
              <FeatureDetails 
                doc={doc}
                publicUsers={publicUsers}
                handleRevisionChanged={(doc, version) => this.handleRevisionChanged(doc, version)}
                put={db.put}
              />
            </div>
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
              <div>
                <NavBar path={path} userName={userName} logIn={this.logIn}/>
                <EditDoc 
                  doc={doc}
                  handleDocChanged={(newDoc) => this.handleDocChanged(newDoc)}/>
              </div>
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
              <div>
                <NavBar path={path} userName={userName} logIn={this.logIn}/>
                <EditComment
                  docId={doc._id}
                  comment={comment}
                  handleCommentChanged={(newComment) => this.handleCommentChanged(newComment, doc)}/>
              </div>
          )}}/>
          <Route path='/user' render={ () => (
            <div>
              <NavBar path={[["Потребител", null]]} userName={userName} logIn={null}/>
              <UserDetails logIn={this.logIn} db={db} userName={userName} logOut={this.logOut} publicUsers={publicUsers}/>
            </div>
          )}/>
        </div>
      </Router>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
