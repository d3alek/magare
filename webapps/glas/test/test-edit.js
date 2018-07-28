import '@babel/polyfill/noConflict';
import React from 'react';
import { expect } from 'chai';
import { shallow, configure } from 'enzyme';
import sinon from 'sinon';
import Adapter from 'enzyme-adapter-react-16';

import { EditUser } from '../src/edit.js';
import { tick } from './util.js';

configure({ adapter: new Adapter() })

const db = {
  getUser: () => {
    return {name: 'test-user', displayName: 'Test User', email: 'test@email'}
  },
  signUp: sinon.fake(),
  putUser: sinon.fake()
};

const publicUsers = {
  get: sinon.fake(),
  put: sinon.fake()
};


describe('<EditUser />', () => {
  it('renders five inputs, 1 email, 2 passwords', async () => {
    const wrapper = shallow(<EditUser db={db} loggedUser={"test-user"}/>);

    await tick();

    wrapper.update();

    expect(wrapper.find('input')).to.have.length(5);
    expect(wrapper.find('input[type="password"]')).to.have.length(2);
    expect(wrapper.find('input[type="email"]')).to.have.length(1);
  });

  it('one password when no `user` property', () => {
    const wrapper = shallow(<EditUser db={db}/>);
    expect(wrapper.find('input[type="password"]')).to.have.length(1);
  });

  it('submit calls handleSubmit', () => {
    const handleSubmit = sinon.fake();
    sinon.replace(EditUser.prototype, 'handleSubmit', handleSubmit);
    const wrapper = shallow(<EditUser db={db}/>);
    wrapper.find('form').simulate('submit');
    expect(handleSubmit.called).to.be.true;
    sinon.restore();
  });

  it('submit showns error on empty `name` or `oldPassword`', () => {
    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} user={null}/>);
    wrapper.find('form').simulate('submit');
    expect(wrapper.find('div.alert-danger')).to.have.length(1);
  });
  
  it('submit calls db.signUp when `user` is null', () => {
    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} user={null}/>);
    wrapper.find('input[name="name"]').simulate('change', {target: { name: 'name', value: 'test-name' } });;
    wrapper.find('input[name="oldPassword"]').simulate('change', {target: { name: 'oldPassword', value: 'test-password' } });
    wrapper.find('form').simulate('submit');
    expect(db.signUp.called).to.be.true;
  });

  it('fills `name`, `displayName` and `email` when `user` is provided', async () => {
    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} loggedUser={"test-user"}/>);

    await tick();

    wrapper.update();
    expect(wrapper.find('input[name="name"]').get(0).props.value).to.equal('test-user');
    expect(wrapper.find('input[name="displayName"]').get(0).props.value).to.equal('Test User');
    expect(wrapper.find('input[name="email"]').get(0).props.value).to.equal('test@email');
  });

  it('submit calls db.putUser when `user` is provided', async () => {
    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} loggedUser={"test-user"}/>);
    
    await tick();

    wrapper.find('form').simulate('submit');
    expect(db.putUser.called).to.be.true;
  });

  it('submit calls publicUsers.put after db.putUser', async () => {

    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} loggedUser={"test-user"}/>);
    
    await tick();
    await tick();

    wrapper.find('form').simulate('submit');
    expect(db.putUser.called).to.be.true;
    expect(publicUsers.put.called).to.be.true;
  });

  it('submit calls publicUsers.put after db.signUp', () => {
    const wrapper = shallow(<EditUser db={db} publicUsers={publicUsers} user={null}/>);
    wrapper.find('input[name="name"]').simulate('change', {target: { name: 'name', value: 'test-name' } });;
    wrapper.find('input[name="oldPassword"]').simulate('change', {target: { name: 'oldPassword', value: 'test-password' } });
    wrapper.find('form').simulate('submit');
    expect(db.signUp.called).to.be.true;
    expect(publicUsers.put.called).to.be.true;
  });

  // TODO test that if new password is given, tries to authenticate with old password first, and then updates password
  //
  // TODO test that if new password is given, tries to authenticate with old password first, and then updates password
});
