import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import { markdown } from 'markdown'
import { BrowserRouter as Router, Link, Route } from 'react-router-dom';
import { versionControl, blobAsText } from './version-control.js';
import { EditComment, EditDoc, EditUser } from './edit.js';

import plugin from 'pouchdb-authentication';

PouchDB.plugin(plugin);

window.ENDPOINT = 'https://magare.otselo.eu/';
window.DB = 'features';

class DocDetails extends Component {
  render() {
    const doc = this.props.doc;
    if (!doc) {
      return null;
    }
    
    const comments = doc.comments ? doc.comments.map( comment =>
        <div key={comment.author + ' - ' + comment.at}>
          <p>{comment.author + ' - ' + comment.at}</p>
          {comment.message && <span dangerouslySetInnerHTML={{__html: markdown.toHTML(comment.message)}}></span>}
          <Link to={'/d/' + doc._id + '/c/' + comment.author + '/' + comment.at + '/edit'}>
            <button type="button" className="btn btn-primary">Промени</button>
          </Link>
        </div>
      ) : '';
  
    const myRevision = 'rev-' + doc._rev;
    const latestRevision = 'rev-' + (doc.latestRev || doc._rev);
    const versionSelector = (
        <select value={myRevision} onChange={(event) => this.props.handleRevisionChanged(doc, event.target.value)}>
          { Object.keys(doc._attachments).concat([latestRevision])
              .filter(a => a.startsWith('rev'))
              .map(a => <option value={a} key={a}>{a}</option>)}
        </select>
    );

    return (
      <div className="col-12" key={doc._id}>
        <h4>{doc.title}</h4>
        <h6>{doc.editors}</h6>
        <p>{doc.stage}</p>
        { doc.description && <span dangerouslySetInnerHTML={{__html: markdown.toHTML(doc.description)}}></span> }
        <button type="button" className="btn btn-success">За</button>
        <button type="button" className="btn btn-danger">Против</button>
        <Link to={'/d/' + doc._id + '/edit'}>
          <button type="button" className="btn btn-info">Промени</button>
        </Link>
        {versionSelector}   
        <div>
          <h5>Коментари</h5>
          <Link to={'/d/' + doc._id + '/c/new/new/edit'}>
            <button type="button" className="btn btn-success">Добави</button>
          </Link>
          {comments}
        </div>
      </div>
    );
  }
}

class DocList extends Component {
  render() {
    const docs = Object.values(this.props.docs);
    const summaries = docs.map( doc => {
      return (
        <div className="col-12" key={doc._id}>
          <Link to={'/d/' + doc._id}>
            <h4>{doc.title}</h4>
          </Link>
        </div>
    )});

    return (
      <div className="row">
        {summaries}
        <div className="col-12">
          <Link to={'/d/new/edit'}>
            <button type="button" className="btn btn-success">Ново предложение</button>
          </Link>
        </div>
      </div>
    );
  }
}

class NavBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      user: null
    };

    this.handleLoginRegister = this.handleLoginRegister.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  async handleLoginRegister(event) {
    event.preventDefault();

    const name = this.state.name;
    const password = this.state.password;

    if (name && password) {
      const response = await this.props.db.logIn(name, password).catch(err => {
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

      // TODO make a user profile page
      if (response) {
        this.setState({
          user: response.name
        });
      }
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
    const user = this.state.user || this.props.user;
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

        { !user ? (
          <form className="form-inline my-2 my-lg-0" onSubmit={this.handleLoginRegister}>
            <input className="form-control mr-sm-2" type="text" name="name" placeholder="Име" aria-label="Име" onChange={this.handleChange}/>
            <input className="form-control mr-sm-2" type="password" name="password" placeholder="Парола" aria-label="Парола" onChange={this.handleChange}/>
            <button className="btn btn-outline-success my-2 my-sm-0" type="submit">Влез/Запиши се</button>
          </form>
          ) : <Link to="/user">{user}</Link> }
        </div>
      </nav>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    const db = versionControl(new PouchDB(window.ENDPOINT + window.DB, {
      fetch(url, opts) { // as per https://github.com/pouchdb-community/pouchdb-authentication/issues/239#issuecomment-403506880
        opts.credentials='include'
        return PouchDB.fetch(url, opts)
      },
      skip_setup: true}));

    this.state = {
      docs: [],
      db: db
    };
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

  async componentDidMount() {
    const docs = await this.getAllDocs();
    const session = await this.state.db.getSession();

    if (docs) {
      this.setState({
        docs: docs,
        user: session.userCtx.name
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
    const user = this.state.user;
    if (!newDoc.editors || newDoc.editors.indexOf(user) === -1) {
      newDoc.editors = (newDoc.editors || []).concat([user]);
    }
    newDoc.author = user;
    await this.state.db.put(newDoc);
    const docs = await this.getAllDocs();
    this.setState({
      docs: docs
    });
    return newDoc._id;
  }

  async handleCommentChanged(newComment, doc) {
    const user = this.state.user;
    if (! (newComment.at && newComment.author)) {
      newComment.at = new Date().toISOString();
      newComment.author = user;
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
    doc.author = user;
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

  render() {
    const docs = this.state.docs;
    const user = this.state.user;
    const db = this.state.db;

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
              <NavBar path={[[root[0],null]]} user={user} db={db}/>
              <DocList docs={docs}/>
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
              <NavBar path={path} user={user} db={db}/>
              <DocDetails 
                doc={doc}
                handleRevisionChanged={(doc, version) => this.handleRevisionChanged(doc, version)}/>
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
                <NavBar path={path} user={user} db={db}/>
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
                <NavBar path={path} user={user} db={db}/>
                <EditComment
                  docId={doc._id}
                  comment={comment}
                  handleCommentChanged={(newComment) => this.handleCommentChanged(newComment, doc)}/>
              </div>
          )}}/>
          <Route path='/user' render={ () => (
            <EditUser user={user} db={db}/>  
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
