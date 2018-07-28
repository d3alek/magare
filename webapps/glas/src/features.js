import React, { Component } from 'react';
import { markdown } from 'markdown'

import { Link } from 'react-router-dom';

class FeatureDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {}

    this.handleVote = this.handleVote.bind(this);
  }

  async setPrettyEditors() {
    const editors = this.props.doc.editors;
    if (editors) {
      const prettyEditors = await Promise.all(editors.map( async (editor) => {
        const prettyEditor = await this.props.publicUsers.get(editor);
        return (prettyEditor && prettyEditor.displayName) || editor;
      }));
      this.setState({
        prettyEditors: prettyEditors
      });
    }
  }

  async setPrettyComments() {
    const comments = this.props.doc.comments;
    if (comments) {
      const prettyComments = await Promise.all(comments.map( async (comment) => {
        const prettyCommentAuthor = await this.props.publicUsers.get(comment.author);
        const prettyComment = Object.assign({}, comment); 
        prettyComment.author = (prettyCommentAuthor && prettyCommentAuthor.displayName) || comment.author;
        return prettyComment;
      }));
      this.setState({
        prettyComments: prettyComments
      });
    }
  }

  async componentDidMount() {
    await this.setPrettyEditors();
    await this.setPrettyComments();
  }

  async componentDidUpdate(prevProps, prevState) {
    if (prevProps.doc !== this.props.doc) {
      await this.setPrettyEditors();
      await this.setPrettyComments();
    }
  }

  async handleVote(event) {
    const voteDirection = event.target.name;
    const votes = (this.props.doc.votes || {for: [], against: []});
    const userName = this.props.userName;

    if (voteDirection == "voteFor") {
      votes.for.push(userName);
    }
    if (voteDirection == "voteAgainst") {
      votes.against.push(userName);
    }

    const updatedFeature = Object.assign({}, this.props.doc);
    updatedFeature.votes = votes;
    await this.props.put(updatedFeature);
  }

  render() {
    const doc = this.props.doc;
    if (!doc) {
      return null;
    }
    const editors = this.state.prettyEditors || doc.editors;
    
    const comments = this.state.prettyComments || doc.comments;
    const commentViews = comments ? comments.map( comment =>
        <div className="comment" key={comment.author + ' - ' + comment.at}>
          <p className="author">{comment.author}</p>
          <p className="at">{comment.at}</p>
          {comment.message && <div className="message" dangerouslySetInnerHTML={{__html: markdown.toHTML(comment.message)}}></div>}
          <Link to={'/d/' + doc._id + '/c/' + comment.author + '/' + comment.at + '/edit'}>
            <button type="button" className="btn btn-primary">Промени</button>
          </Link>
        </div>
      ) : '';
  
    const myRevision = 'rev-' + doc._rev;
    const latestRevision = 'rev-' + (doc.latestRev || doc._rev);
    const attachments = doc._attachments || {};
    const versionSelector = (
        <select value={myRevision} onChange={(event) => this.props.handleRevisionChanged(doc, event.target.value)}>
          { Object.keys(attachments).concat([latestRevision])
              .filter(a => a.startsWith('rev'))
              .map(a => <option value={a} key={a}>{a}</option>)}
        </select>
    );

    const votes = this.props.doc.votes;
    const votedFor = votes && votes.for.length;
    const votedAgainst = votes && votes.against.length;

    return (
      <div className="col-12" key={doc._id}>
        <h4>{doc.title}</h4>
        <h6>{editors.join(', ')}</h6>
        <p>{doc.stage}</p>
        { doc.description && <div id="description" dangerouslySetInnerHTML={{__html: markdown.toHTML(doc.description)}}></div> }
        <button type="button" name="voteFor" className="btn btn-success" onClick={this.handleVote}>За <span id="votedFor" className="badge badge-light">{votedFor}</span></button>
        <button type="button" name="voteAgainst" className="btn btn-danger" onClick={this.handleVote}>Против <span id="votedAgainst" className="badge badge-light">{votedAgainst}</span> </button>
        <Link to={'/d/' + doc._id + '/edit'}>
          <button type="button" className="btn btn-info">Промени</button>
        </Link>
        {versionSelector}   
        <div>
          <h5>Коментари</h5>
          <Link to={'/d/' + doc._id + '/c/new/new/edit'}>
            <button type="button" className="btn btn-success">Добави</button>
          </Link>
          {commentViews}
        </div>
      </div>
    );
  }
}

class FeatureList extends Component {
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


export { FeatureDetails, FeatureList };
