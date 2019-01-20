const expect = require('chai').expect;
const util = require('./util.js');

const ddName = "idiot-history";
const viewName = "history";

const throwMessage = util.throwMessage;

var db;
var adminDb;

function doc(thing, timestamp, sense1, sense2) {
  return {
    _id: thing + '$' + timestamp, 
    thing: thing,
    senses: {
      ...sense1,
      ...sense2,
    },
    timestamp: timestamp
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

  it('simple', async () => {
    const timestamp = '2018-11-28 07:44:18';
    const thing = 'test-doc';

    await db.put(doc(thing, timestamp, {a:1}));
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal({a:1});
  });

  it('multiple senses', async () => {
    const timestamp = '2018-11-28 07:44:18';
    const thing = 'test-doc';

    await db.put(doc(thing, timestamp, {a:1}, {b:2}));
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal({a:1, b:2});
  });

  it('multiple docs', async () => {
    const timestamp_old = '2018-11-28 07:44:18';
    const timestamp_new = '2018-11-28 08:44:18';
    const thing = 'test-doc';

    await db.put(doc(thing, timestamp_old, {a:1}));
    await db.put(doc(thing, timestamp_new, {a:2}));
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(2);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp_old]);
    expect(response.rows[0].value).to.deep.equal({a:1});
    expect(response.rows[1].key).to.deep.equal([thing, timestamp_new]);
    expect(response.rows[1].value).to.deep.equal({a:2});
  });

  it('multiple things', async () => {
    const timestamp = '2018-11-28 07:44:18';
    const thing1 = 'thing1';
    const thing2 = 'thing2';

    await db.put(doc(thing1, timestamp, {a:1}));
    await db.put(doc(thing2, timestamp, {a:2}));
    const response = await db.query(ddName + '/' + viewName).catch(throwMessage);
    expect(response.total_rows).to.equal(2);
    expect(response.rows[0].key).to.deep.equal([thing1, timestamp]);
    expect(response.rows[0].value).to.deep.equal({a:1});
    expect(response.rows[1].key).to.deep.equal([thing2, timestamp]);
    expect(response.rows[1].value).to.deep.equal({a:2});
  });

  it('filter by day', async () => {
    const timestamp_date = '2018-11-28';
    const timestamp = timestamp_date + ' 07:44:18';
    const another_timestamp_date = '2018-11-29';
    const another_timestamp = another_timestamp_date + ' 07:44:18';
    const thing = 'thing';

    await db.put(doc(thing, timestamp, {a:1}));
    await db.put(doc(thing, another_timestamp, {a:2}));
    const response = await db.query(ddName + '/' + viewName, options={startkey:[thing, timestamp_date], endkey: [thing, another_timestamp_date, {}]}).catch(throwMessage);
    expect(response.rows.length).to.equal(1);
    expect(response.rows[0].key).to.deep.equal([thing, timestamp]);
    expect(response.rows[0].value).to.deep.equal({a:1});
  });

});

