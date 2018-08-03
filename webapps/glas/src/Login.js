import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';

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

  async setPrettyUser() {
    const userName = this.props.userName;
    if (userName) {
      const prettyUser = await this.props.publicUsers.get(userName);
      this.setState({
        prettyUser: prettyUser && prettyUser.displayName
      });
    }
  }

  async componentDidMount() {
    await this.setPrettyUser();
  }

  async componentDidUpdate(prevProps, prevState) {
    if (prevProps.userName !== this.props.userName) {
      await this.setPrettyUser();
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
    const userName = this.state.prettyUser || this.props.userName;

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

export { Login };
