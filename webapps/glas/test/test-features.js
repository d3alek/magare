import '@babel/polyfill/noConflict';
import React from 'react';
import { expect } from 'chai';
import { shallow, configure } from 'enzyme';
import sinon from 'sinon';
import Adapter from 'enzyme-adapter-react-16';

import { FeatureDetails, FeatureList } from '../src/features.js';
import { tick } from './util.js';

configure({ adapter: new Adapter() })

const doc = {
  title: "test-title",
  description: "test-description",
  editors: [ "test-editor" ],
  comments: [ {
    message : "Test comment",
    at: "2018-07-25T15:42:30.849Z",
    author: "test-comment-author"
  }],
  author: "test-author"
}

const publicUsers = {
  get: sinon.fake()
}

describe('<FeatureDetails />', () => {
  it('renders feature title, editors, description and comments', async () => {
    const wrapper = shallow(<FeatureDetails doc={doc} publicUsers={publicUsers}/>);

    expect(wrapper.find('h4').text()).to.equal("test-title");
    expect(wrapper.find('h6').text()).to.equal("test-editor");
    expect(wrapper.find('#description').render().text()).to.equal("test-description");
    expect(wrapper.find('.comment .message').render().text()).to.equal("Test comment");
    expect(wrapper.find('.comment .author').text()).to.equal("test-comment-author");
    expect(wrapper.find('.comment .at').text()).to.equal("2018-07-25T15:42:30.849Z");
  });

  it('renders 5 buttons', async () => {
    const wrapper = shallow(<FeatureDetails doc={doc} publicUsers={publicUsers}/>);

    expect(wrapper.find('button')).to.have.length(5);
  });

  it('vote for updates the feature', async () => {
    const put = sinon.fake();
    const wrapper = shallow(<FeatureDetails doc={doc} publicUsers={publicUsers} put={put} userName="test-user"/>);

    wrapper.find('button[name="voteFor"]').simulate('click', {target: { name: "voteFor" }});

    expect(put.called).to.be.true;
    expect(put.args[0][0].votes.for).to.contain("test-user");
  });

  it('vote against updates the feature', async () => {
    const put = sinon.fake();
    const wrapper = shallow(<FeatureDetails doc={doc} publicUsers={publicUsers} put={put} userName="test-user"/>);

    wrapper.find('button[name="voteAgainst"]').simulate('click', {target: { name: "voteAgainst" }});

    expect(put.called).to.be.true;
    expect(put.args[0][0].votes.against).to.contain("test-user");
  });

  // TODO test voting unlogged shows error
  // TODO test voting two times shows error
  // TODO test trying to change unlogged shows an error
  // TODO test change button on a comment only shows for it's author
  // TODO test add button for comment unlogged shows an error
});




