import { Link  } from 'react-router-dom';
import React, { Component } from 'react';

const COLS = 50;

function calculateRows(text) {
  var linecount = 0;
  if (!text) {
    return 1;
  }
  text.split('\n').forEach( l => linecount += Math.ceil(l.length/COLS));
  return linecount+1;
}

class EditUser extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: null,
      displayName: null,
      email: null,
      oldPassword: null,
      newPassword: null,
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  async componentDidMount() {
    const user = this.props.loggedUser && await this.props.db.getUser(this.props.loggedUser);

    if (user) {
      this.setState({
        user: user,
        name: user.name,
        displayName: user.displayName,
        email: user.email 
      });
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

  async handleSubmit(event, toDelete) {
    event && event.preventDefault();

    const db = this.props.db;
    const user = this.state.user;
    const name = this.state.name;
    const displayName = this.state.displayName;
    const email = this.state.email;

    const oldPassword = this.state.oldPassword;
    const newPassword = this.state.newPassword;

    if (newPassword) {
      if (oldPassword) {
        // TODO try to authenticate with oldPassword, if it works update newPassword
      }
    }

    if (user) {
      const response = await db.putUser(user.name, {
        metadata: {
          displayName: displayName,
          email: email
        }
      });
      if (response && response.ok) {
        window.location.href = '/';
      }
      else {
        this.setState({
          error: "Грешка при връзката с магаре: " + response
        });
      }
    }
    else {
      if (name && oldPassword) {
        const response = await db.signUp(name, oldPassword, {
          metadata: {
            displayName: displayName,
            email: email
          }
        });
        if (response && response.ok) {
          // TODO login
          window.location.href = '/';
        }
        else {
          this.setState({
            error: "Грешка при връзката с магаре: " + response
          });
        }
      }
      else {
        this.setState({
          error: "Трябва да предоставиш име и парола"
        });
      }
    }
  }

  render() {
    const name = this.state.name;
    const displayName = this.state.displayName;
    const email = this.state.email;
    const oldPassword = this.state.oldPassword;
    const newPassword = this.state.newPassword;
    const error = this.state.error && (
        <div className="alert alert-danger" role="alert">
          {this.state.error}
        </div>
    );

    return (
      <form onSubmit={this.handleSubmit}>
        {error}
        <input type="text" className="form-control" name="name" value={name} placeholder="Име" onChange={this.handleChange}/>
        <input type="text" className="form-control" name="displayName" value={displayName} placeholder="Видимо име" onChange={this.handleChange}/>
        <input type="email" className="form-control" name="email" value={email} placeholder="Електронна поща" onChange={this.handleChange}/>
        <input type="password" className="form-control" name="oldPassword" value={oldPassword} placeholder="Стара парола" onChange={this.handleChange}/>
        <input type="password" className="form-control" name="newPassword" value={newPassword} placeholder="Нова парола" onChange={this.handleChange}/>
        <button type="submit" className="btn btn-primary">Изпрати</button>
        <Link to="/">
          <button className="btn btn-secondary">Назад</button>
        </Link>
      </form>
    );
  }
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
          <textarea className="form-control" name="message" cols={COLS} rows={calculateRows(message)} value={message} onChange={this.handleChange}/>
        </div>
        <button type="submit" className="btn btn-primary">Изпрати</button>
        <button className="btn btn-danger" onClick={(e) => this.handleSubmit(e, true)}>Изтрий</button>
        <Link to={'/d/' + this.props.docId}>
          <button className="btn btn-secondary">Откажи</button>
        </Link>
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
          <textarea className="form-control" name="description" cols={COLS} rows={calculateRows(description)} value={description} onChange={this.handleChange}/>
        </div>
        <button type="submit" className="btn btn-primary">Изпрати</button>
        <Link to={doc._id ? ('/d/' + doc._id) : '/'}>
          <button className="btn btn-secondary">Откажи</button>
        </Link>
      </form>
    );
  }
}


export { EditComment, EditDoc, EditUser };
