const expect = require('chai').expect;
const util = require('./util.js');

var anonymousDb;
var db;
var adminDb;

describe('votes', () => {
  before( async () => {
    const server = await util.getServer();
    const validation = "votes";
    const url = 'http://' + server + validation;
    anonymousDb = new util.AnonymousDB(url);
    db = new util.AuthenticatedDB(url);
    adminDb = new util.AdminDB(url);

    await util.putValidation(server, validation);
  });

  beforeEach( async () => {
    const doc = await db.get('test-doc').catch(err => undefined);
    if (doc) {
      await db.remove(doc);
    }
  });

  after( async () => {
    await adminDb.destroy();
  });

  it('design document present', async () => {
    const result = await db.allDocs();
    expect(result.rows).to.have.length(1);
    expect(result.rows[0].id).to.equal('_design/votes');
  });

  it('anonymous not allowed to vote', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    const response = await anonymousDb.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('valid vote works', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    const response = await db.put(doc);
    expect(response.ok).to.be.true;
  });

  it('vote for with wrong user fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['non-test-user']}};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('vote against with wrong user fails', async () => {
    const doc = {_id: 'test-doc', votes: {against: ['non-test-user']}};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('vote for and against fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user'], against: ['test-user']}};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('vote twice fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user', 'test-user']}};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('vote twice different users fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['non-test-user', 'test-user']}};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('changing vote at once fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    var response = await db.put(doc);
    doc._rev = response.rev;
    doc.votes.for = [];
    doc.votes.against = ['test-user'];
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('changing vote in two steps succeeds', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    var response = await db.put(doc);
    doc._rev = response.rev;
    doc.votes.for = [];
    response = await db.put(doc);
    doc._rev = response.rev;
    doc.votes.against = ['test-user'];
    response = await db.put(doc);
    expect(response.ok).to.be.true;
  });


  it('removing own vote succeeds', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    var response = await db.put(doc);

    doc._rev = response.rev;
    doc.votes.for = [];
    response = await db.put(doc);
    expect(response.ok).to.be.true;
  });

  it('allow admin to remove votes', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['non-test-user']}};
    var response = await adminDb.put(doc);

    doc._rev = response.rev;
    doc.votes.for = [];
    response = await adminDb.put(doc);
    expect(response.ok).to.be.true;
  });


  it('removing someone elses vote fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['non-test-user']}};
    var response = await adminDb.put(doc);

    doc._rev = response.rev;
    doc.votes.for = [];
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('voting after already voted same fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['test-user']}};
    var response = await db.put(doc);

    doc._rev = response.rev;
    doc.votes.for = ['test-user', 'test-user'];
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('voting after already voted different fails', async () => {
    const doc = {_id: 'test-doc', votes: {against: ['test-user']}};
    var response = await db.put(doc);

    doc._rev = response.rev;
    doc.votes.for = ['test-user'];
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('editing someone elses comment fails', async () => {
    const doc = {_id: 'test-doc', comments: [{message: 'test comment', at: '2018-08-12T15:58:49.802Z', author: 'non-test-user'}]};
    var response = await adminDb.put(doc);

    doc._rev = response.rev;
    doc.comments[0].message = 'edited comment';
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('removing someone elses comment fails', async () => {
    const doc = {_id: 'test-doc', comments: [{message: 'test comment', at: '2018-08-12T15:58:49.802Z', author: 'non-test-user'}]};
    var response = await adminDb.put(doc);

    doc._rev = response.rev;
    doc.comments = [];
    response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('posting comment as someone else fails', async () => {
    const doc = {_id: 'test-doc', comments: [{message: 'test comment', at: '2018-08-12T15:58:49.802Z', author: 'non-test-user'}]};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('posting valid comment works', async () => {
    const doc = {_id: 'test-doc', comments: [{message: 'test comment', at: '2018-08-12T15:58:49.802Z', author: 'test-user'}]};
    const response = await db.put(doc);
    expect(response.ok).to.be.true;
  });

  it('posting two valid comments works', async () => {
    const doc = {_id: 'test-doc', comments: [{message: 'test comment', at: '2018-08-12T15:58:49.802Z', author: 'test-user'}]};
    var response = await adminDb.put(doc);

    doc._rev = response.rev;
    doc.comments.push({message: 'test comment 2', at: '2018-08-12T15:58:49.802Z', author: 'test-user'});

    response = await db.put(doc);
    expect(response.ok).to.be.true;
  });
});
