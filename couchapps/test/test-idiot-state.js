const expect = require('chai').expect;
const util = require('./util.js');
const fetch = require('node-fetch');

const ddName = "idiot-state";
const updateName = "state";

const throwMessage = util.throwMessage;

var db;
var adminDb;
var url;
const timestamp = '2018-11-28T07:44:18.882Z';
const thing = 'test-doc';

function update(body) {
  return fetch(url + '/_design/' + ddName + '/_update/' + updateName + '/' + thing, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });
}

function updateConfig(config) {
  return update({ config: config})
}

async function getDeltaWhenConfigIs(config) {
  return JSON.parse((await (await updateConfig(config)).text()).split('\n')[1]);
}

async function getDelta(reportedConfig, desiredConfig) {
  await db.put(doc({}, desiredConfig));  
  return await getDeltaWhenConfigIs(reportedConfig);
}

function doc(reportedState, desiredConfig) {
  return {
    _id: thing, 
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
    const body = {}
    const request = await update(body);
    expect(request.ok).to.be.true;
    expect(await request.text()).to.equal('KO');

    const response = await db.allDocs({include_docs: true, startkey: thing, endkey: thing + '{'}).catch(throwMessage);
    expect(response.rows.length).to.equal(0);
  });

  it('update existing thing', async () => {
    await db.put(doc({a:1}))

    const body = {a:2}
    const request = await update(body);
    const text = (await request.text()).split('\n');
    expect(request.ok).to.be.true;
    expect(text[1]).to.equal('{}');

    const d = await db.get(thing).catch(throwMessage);
    expect(d._id).to.contain(thing);
    expect(d.reported.state).to.deep.equal({a:2});
  });

  it('update preserves desired', async () => {

    await db.put(doc({a:1}, {b:2}))

    const body = {a:2};
    const request = await update(body); 
    expect(request.ok).to.be.true;
    const text = (await request.text()).split('\n');
    expect(JSON.parse(text[1])).to.deep.equal({b:2});

    const d = await db.get(thing).catch(throwMessage);
    expect(d.reported.state).to.deep.equal({a:2});
    expect(d.desired.config).to.deep.equal({b:2});
  });

  it('no difference', async () => {
    await db.put(doc({}, {a: 1}))

    const delta = await getDeltaWhenConfigIs({a:1});

    expect(delta).to.deep.equal({});
  });

  it('number difference', async () => {
    await db.put(doc({}, {a:2}))

    const delta = await getDeltaWhenConfigIs({a:1});

    expect(delta).to.deep.equal({a: 2});
  });

  it('number difference 0', async () => {
    await db.put(doc({}, {a:0}))

    const delta = await getDeltaWhenConfigIs({a:1});

    expect(delta).to.deep.equal({a: 0});
  });


  it('string difference', async () => {
    await db.put(doc({}, {a: 'd'}))

    const delta = await getDeltaWhenConfigIs({a: 'c'});

    expect(delta).to.deep.equal({a: 'd'});
  });

  it('two elements, two differences', async () => {
    await db.put(doc({}, {a: 'd', b: 1}))

    const delta = await getDeltaWhenConfigIs({a: 'c', b: 0});

    expect(delta).to.deep.equal(
      { 'a': 'd',
        'b': 1});
  });

  it('two elements, one difference', async () => {
    await db.put(doc(
      {}, 
      {a: 'd', b: 0}))

    const delta = await getDeltaWhenConfigIs({a: 'c', b: 0});

    expect(delta).to.deep.equal(
      {'a': 'd'});
  });

  it('nested difference', async () => {
    await db.put(doc(
      {}, 
      {deeper: {a: 'd', b: 0}}))

    const delta = await getDeltaWhenConfigIs({deeper: {a: 'c', b: 0}});

    expect(delta).to.deep.equal(
      {deeper: {a: 'd'}});
  });

  it('nested no difference', async () => {
    await db.put(doc(
      {}, 
      {deeper: {a: 'c', b: 0}}))

    const delta = await getDeltaWhenConfigIs({deeper: {a: 'c', b: 0}});

    expect(delta).to.deep.equal({});
  });

  it('array difference', async () => {
    const delta = await getDelta(
      {deeper: [{a: 'c'}, {b: 0}]}, 
      {deeper: [{a: 'c'}, {b: 1}]});

    expect(delta).to.deep.equal(
      {deeper: [{a: 'c'}, {b: 1}]});
  });

  it('no delta on data type difference', async () => {
    const delta = await getDelta(
      {a: 1}, 
      {a: 'b'});

    expect(delta).to.deep.equal({});
  });

  it('partial desired', async () => {
    const delta = await getDelta(
      {a: {}, d: 1}, 
      {a: {b: 'c'}});

    expect(delta).to.deep.equal(
      {a: {b: 'c'}});
  });

});

