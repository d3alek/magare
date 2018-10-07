const expect = require('chai').expect;
const util = require('./util.js');

var anonymousDb;
var db;
var adminDb;

describe('authenticated write', () => {
  before( async () => {
    const server = await util.getServer();
    const validation = "authenticated-write";
    const url = 'http://' + server + validation;
    anonymousDb = new util.AnonymousDB(url);
    db = new util.AuthenticatedDB(url);
    adminDb = new util.AdminDB(url);

    await util.putValidation(server, validation);
  });

  beforeEach( async () => {
    const doc = await db.get('test-doc').catch(err => undefined);
    if (doc) {
      doc.author = 'test-admin';
      doc.editors = ['test-admin'];
      doc._deleted = true;
      await adminDb.put(doc);
    }
  })
  after( async () => {
    await adminDb.destroy();
  });

  it('design document present', async () => {
    const result = await db.allDocs();
    expect(result.rows).to.have.length(1);
    expect(result.rows[0].id).to.equal('_design/authenticated-write');
  });

  it('anonymous not allowed to create', async () => {
    const doc = {_id: 'test-doc', author: 'test-user'};
    const response = await anonymousDb.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('authenticated allowed to create', async () => {
    const doc = {_id: 'test-doc', author: 'test-user', editors: ['test-user']};
    const response = await db.put(doc);
    expect(response.ok).to.be.true;
  });

  it('document author not user fails', async () => {
    const doc = {_id: 'test-doc', author: 'non-test-user'};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('document author not part of editors fails', async () => {
    const doc = {_id: 'test-doc', author: 'test-user'};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

  it('null in editors fails', async () => {
    const doc = {_id: 'test-doc', author: 'test-user', editors: ['test-user', null]};
    const response = await db.put(doc).catch( err => {
      console.log(err.message);
      expect(err.error).to.equal("forbidden");
    });
    expect(response).to.be.undefined;
  });

});

