import '@babel/polyfill/noConflict';
import { expect } from 'chai';
import PouchDB from 'pouchdb';

// TODO testing locally
const SERVER = 'https://magare.otselo.eu/';
const DATABASE = 'test_features';

global.btoa = function (str) {return new Buffer(str).toString('base64');};

const anonymousDb = new PouchDB(SERVER + DATABASE, {
  skip_setup: true,
});

const db = new PouchDB(SERVER + DATABASE, {
  skip_setup: true,
  auth: {
    username: "test-user",
    password: "test-password"
  }
});

describe('votes validation', () => {
  afterEach( async () => {
    const doc = await db.get('test-doc').catch(err => undefined);
    if (doc) {
      await db.remove(doc);
    }
  })

  it('design document present', async () => {
    const result = await db.allDocs();
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

  it('removing someone elses vote fails', async () => {
    const doc = {_id: 'test-doc', votes: {for: ['non-test-user']}};
    // TODO make test-admin user which is a database-only admin
    var response = await db.put(doc);

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
});
