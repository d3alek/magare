import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import ReactDOM from 'react-dom';
import PouchDB from 'pouchdb';
import { markdown } from 'markdown'
import { BrowserRouter as Router, Link, Route } from 'react-router-dom';
import { versionControl, blobAsText } from './version-control.js';

window.ENDPOINT = 'https://magare.otselo.eu/';
window.DB = 'features';
window.COLS = 50;

function calculateRows(text) {
  var linecount = 0;
  if (!text) {
    return 1;
  }
  text.split('\n').forEach( l => linecount += Math.ceil(l.length/window.COLS));
  return linecount+1;
}

class EditComment extends Component {
  constructor(props) {
    super(props);

    this.state = {
      title: null,
      description: null
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  async handleSubmit(event, toDelete) {
    event.preventDefault();

    const newComment = this.props.comment || {};
    newComment.message = this.state.message || newComment.message;
    if (toDelete) {
      newComment.message = null;
    }
    const id = await this.props.handleCommentChanged(newComment);
    window.location.href = '/d/' + id;
  }

  render() {
    const comment = this.props.comment || {message:''};
    const message = this.state.message || comment.message;

    // TODO show MD formatted text
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group">
          <ul className="nav nav-tabs">
            <li className="nav-item"><a className="nav-link active">Неформатиран текст</a></li>
            <li className="nav-item"><a className="nav-link" href="#markdown">Форматиран текст</a></li>
          </ul>
          <textarea className="form-control" name="message" cols={window.COLS} rows={calculateRows(message)} value={message} onChange={this.handleChange}/>
        </div>
        <button type="submit" className="btn btn-primary">Изпрати</button>
        <button className="btn btn-danger" onClick={(e) => this.handleSubmit(e, true)}>Изтрий</button>
      </form>
    );
  }
}

class EditDoc extends Component {
  constructor(props) {
    super(props);

    this.state = {
      title: null,
      description: null
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    const newDoc = this.props.doc || {};
    newDoc.title = this.state.title || newDoc.title;
    newDoc.description = this.state.description || newDoc.description;
    const id = await this.props.handleDocChanged(newDoc);
    window.location.href = '/d/' + id;
  }

  render() {
    const doc = this.props.doc || {title: '',description: ''};
    const title = this.state.title || doc.title;
    const description = this.state.description || doc.description;
    // TODO show MD formatted text
    
    return (
      <form onSubmit={this.handleSubmit}>
        <input className="form-control" type="text" name="title" value={title} onChange={this.handleChange}/>
        <div className="form-group">
          <ul className="nav nav-tabs">
            <li className="nav-item"><a className="nav-link active">Неформатиран текст</a></li>
            <li className="nav-item"><a className="nav-link" href="#markdown">Форматиран текст</a></li>
          </ul>
          <textarea className="form-control" name="description" cols={window.COLS} rows={calculateRows(description)} value={description} onChange={this.handleChange}/>
        </div>
        <button type="submit" className="btn btn-primary">Изпрати</button>
      </form>
    );
  }
}

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

class App extends Component {
  constructor(props) {
    super(props);
    const db = versionControl(new PouchDB(window.ENDPOINT + window.DB, { skip_setup: true}));

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
    if (docs) {
      this.setState({
        docs: docs
      });
    }
  }

  async handleDocChanged(newDoc) {
    // TODO submit button adds user to editors if not present
    if (!newDoc._id) {
      const uuid = await fetch(window.ENDPOINT + '_uuids')
        .then(r => r.json())
        .then(r => r.uuids[0]);
      newDoc._id = 'vote-' + uuid.substr(24);
    }
    await this.state.db.put(newDoc);
    const docs = await this.getAllDocs();
    this.setState({
      docs: docs
    });
    return newDoc._id;
  }

  async handleCommentChanged(newComment, doc) {
    if (! (newComment.at && newComment.author)) {
      newComment.at = new Date().toISOString(); // TODO do on server side
      newComment.author = "Author"; // TODO do on server side
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

    const error = this.state.error;
    const errorMessage = error ?
        <div className="alert alert-danger">{error}</div> 
      : '';

    return (
      <Router>
        <div className='container' style={{height:"100vh"}}>
          {errorMessage}
          <Route exact path='/' render={ () => (
            <DocList docs={docs}/>
          )}/>
          <Route exact path='/d/:docId' render={ ({match}) => (
            <DocDetails 
              doc={docs[match.params.docId]}
              handleRevisionChanged={(doc, version) => this.handleRevisionChanged(doc, version)}/>
          )}/>
          <Route path='/d/:docId/edit' render={ ({match}) => (
            <EditDoc 
              doc={docs[match.params.docId]}
              handleDocChanged={(newDoc) => this.handleDocChanged(newDoc)}/>
          )}/>
          <Route path='/d/:docId/c/:commentAuthor/:commentAt/edit' render={ ({match}) => {
            const doc = docs[match.params.docId];
            return doc && (
              <EditComment
                comment={doc.comments && doc.comments.find(c => 
                  c.author === match.params.commentAuthor 
                  && c.at === match.params.commentAt)}
                handleCommentChanged={(newComment) => this.handleCommentChanged(newComment, doc)}/>
          )}}/>

        </div>
      </Router>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
