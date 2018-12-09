const expect = require('chai').expect;
const util = require('./util.js');
const throwMessage = util.throwMessage;

const ddName = "idiot-delta";
const viewName = "delta";
const thing = 'test-thing';
const timestamp = '2018-12-09 21:00:21';
var db;
var adminDb;


function doc(reportedConfig, desiredConfig, docThing, docTimestamp) {
  if (typeof docThing === 'undefined') {
    docThing = thing;
  }
  if (typeof docTimestamp === 'undefined') {
    docTimestamp = timestamp;
  }
  return {
    _id: docThing + '/' + docTimestamp,
    thing: docThing,
    timestamp: docTimestamp,
    reported: {
      state: {
        config: reportedConfig
      }
    },
    desired: {
      config: desiredConfig
    }
  }
}

describe(ddName, () => {
  before( async () => {
    const server = await util.getServer();
    const url = 'http://' + server + ddName;
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

  it('no difference', async () => {
    await db.put(doc({a: 1}, {a:1}))

    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);

    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([]);
  });

  it('number difference', async () => {
    await db.put(doc({a: 1}, {a:2}))
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['a'],2]]);
  });

  it('string difference', async () => {
    await db.put(doc({a: 'c'}, {a: 'd'}))
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['a'],'d']]);
  });

  it('two elements, two differences', async () => {
    await db.put(doc(
      {a: 'c', b: 0}, 
      {a: 'd', b: 1}))
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal(
      [
        [['a'],'d'],
        [['b'], 1]
      ]);
  });

  it('two elements, one difference', async () => {
    await db.put(doc(
      {a: 'c', b: 0}, 
      {a: 'd', b: 0}))
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['a'],'d']]);
  });

  it('nested difference', async () => {
    await db.put(doc(
      {deeper: {a: 'c', b: 0}}, 
      {deeper: {a: 'd', b: 0}}))
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['deeper', 'a'],'d']]);
  });

  it('array difference', async () => {
    await db.put(doc(
      {deeper: [{a: 'c'}, {b: 0}]}, 
      {deeper: [{a: 'c'}, {b: 1}]}))

    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    console.log('response');
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['deeper',1,'b'],1]]);
  });

  it('no delta on data type difference', async () => {
    await db.put(doc(
      {a: 1}, 
      {a: 'b'}))

    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);

    expect(response.total_rows).to.equal(0);
  });

  it('two things', async () => {
    const thing = 'test-thing1'
    const anotherThing = 'test-thing2'

    await db.put(doc({a: 1}, {a:2}, thing))
    await db.put(doc({a: 1}, {a:2}, anotherThing))

    const response = await db.query(ddName + '/' + viewName, options={limit:1}).catch(throwMessage);

    expect(response.rows.length).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal([[['a'],2]]);
  });

  it('latest delta', async () => {
    const timestampOld = '2018-11-28 07:44:18';
    const timestampLatest = '2018-11-28 08:44:18';
    await db.put(doc({a: 1}, {a:2}, thing, timestampOld))
    await db.put(doc({a: 1}, {a:3}, thing, timestampLatest))

    const response = await db.query(ddName + '/' + viewName, options={limit:1,descending:true}).catch(throwMessage);

    expect(response.rows.length).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestampLatest]);
    expect(response.rows[0].value).to.deep.equal([[['a'],3]]);
  });


});
