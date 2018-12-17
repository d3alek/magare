const expect = require('chai').expect;
const util = require('./util.js');
const fetch = require('node-fetch');

const ddName = "idiot-reported";
const updateName = "reported";

const throwMessage = util.throwMessage;

var db;
var adminDb;
var url;

function key(thing, timestamp) {
  return thing + '$' + timestamp;
}

function doc(thing, timestamp, reportedState, desiredConfig) {
  return {
    _id: key(thing, timestamp), 
    thing: thing,
    reported: {
      state: reportedState,
      timestamp: timestamp
    },
    desired: {
      config: desiredConfig
    }
  }
}

describe(ddName, () => {
  before( async () => {
    const server = await util.getServer();
    url = 'http://' + server + ddName;
    db = new util.AnonymousDB(url);
    adminDb = new util.AdminDB(url);
    await adminDb.destroy();

    await util.putValidation(server, ddName);
  });

  beforeEach( async () => {
    const docs = await db.allDocs();
    var id;
    for (row in docs.rows) {
      id = docs.rows[row].id; 
      if (id.startsWith('_design')) {
        continue;
      }
      await db.remove(id, docs.rows[row].value.rev).catch(throwMessage);
    }
  })

  it('design doc exists', async () => {
    const result = await db.allDocs();
    expect(result.rows).to.have.length(1);
    expect(result.rows[0].id).to.equal('_design/' + ddName);
  });

  it('fail adding new thing', async () => {
    const thing = 'test-doc';

    const body = {}
    const request = await fetch(url + '/_design/' + ddName + '/_update/' + updateName, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(request.ok).to.be.true;
    expect(await request.text()).to.equal('KO');

    const response = await db.allDocs({include_docs: true, startkey: thing, endkey: thing + '{'}).catch(throwMessage);
    expect(response.rows.length).to.equal(0);
  });

  it('update existing thing', async () => {
    const timestamp = '2018-11-28T07:44:18.882Z';
    const thing = 'test-doc';

    await db.put(doc(thing, timestamp, {a:1}))

    const body = {a:2}
    const existingDocumentKey = key(thing, timestamp)
    const request = await fetch(url + '/_design/' + ddName + '/_update/' + updateName + '/' + existingDocumentKey, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(request.ok).to.be.true;
    expect(await request.text()).to.equal('OK');

    const response = await db.allDocs({include_docs: true, startkey: thing + '{', endkey: thing, descending: true}).catch(throwMessage);
    expect(response.rows.length).to.equal(2);
    expect(response.rows[0].doc._id).to.contain(thing);
    expect(response.rows[0].doc.reported.state).to.deep.equal({a:2});
  });

  it('update preserves desired', async () => {
    const timestamp = '2018-11-28T07:44:18.882Z';
    const thing = 'test-doc';

    await db.put(doc(thing, timestamp, {a:1}, {b:2}))

    const body = {a:2};
    const existingDocumentKey = key(thing, timestamp)
    const request = await fetch(url + '/_design/' + ddName + '/_update/' + updateName + '/' + existingDocumentKey, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(request.ok).to.be.true;
    expect(await request.text()).to.equal('OK');

    const response = await db.allDocs({include_docs: true, startkey: thing + '{', endkey: thing, descending: true}).catch(throwMessage);
    expect(response.rows.length).to.equal(2);
    expect(response.rows[0].doc._id).to.contain(thing + '$');
    expect(response.rows[0].doc.reported.state).to.deep.equal({a:2});
    expect(response.rows[0].doc.desired.config).to.deep.equal({b:2});
  });
});

