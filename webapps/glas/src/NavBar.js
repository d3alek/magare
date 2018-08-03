import React, { Component } from 'react';
import { Login } from './Login.js';
import { Link } from 'react-router-dom';

function parsePathParts(path, docs) {
  const split = path.split('/');
  const root = ["Предложения", "/"]
  if (!split[1]) {
    return [[root[0], null]];
  }
  if (split[1] === 'user') {
    return [["Потребител", null]];
  }
  if (split[1] === 'd') {
    const docId = split[2];
    const doc = docs && docs[docId];
    
    if (split[3] === 'edit') {
      return doc ? [
        root,
        [doc.title,'/d/'+docId],
        ['Промени', null]
      ] : [
        root,
        ['Ново', null],
      ];
    }
    if (split[3] === 'c') {
      const commentAuthor = split[4];
      const commentAt = split[5];
      const comment = doc && doc.comments && doc.comments.find(c => 
          c.author === commentAuthor && c.at === commentAt);
      console.log(doc);
      return [
        root,
        [doc && doc.title,'/d/'+docId],
        [comment ? (commentAuthor+'-'+commentAt) : 'Нов коментар',null]
      ];
    }
    return [
      root,
      [doc && doc.title, null],
    ];
  }
  return [["", null]];
}

class NavBar extends Component {
  render() {
    const pathParts = parsePathParts(this.props.location.pathname, this.props.docs);
    const path = pathParts.map(part => {
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
    const showLogIn = this.props.location.pathname.split('/')[1] !== 'user';

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
          {showLogIn && <Login logIn={logIn} userName={this.props.userName} short={true} publicUsers={this.props.publicUsers}/>}
        </div>
      </nav>
    );
  }
}

export { NavBar };
