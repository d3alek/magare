const expect = require('chai').expect;
const util = require('./util.js');

var db;
var adminDb;

describe('idiot', () => {
  before( async () => {
    const server = await util.getServer();
    const validation = "idiot";
    const url = 'http://' + server + validation;
    db = new util.AnonymousDB(url);
    adminDb = new util.AdminDB(url);
    await adminDb.destroy();

    await util.putValidation(server, validation);
  });

  beforeEach( async () => {
    const doc = await db.get('test-doc').catch(err => undefined);
    if (doc) {
      doc.author = 'test-admin';
      doc.editors = ['test-admin'];
      doc._deleted = true;
      await db.put(doc);
    }
  })

  it('design doc exists', async () => {
    const result = await db.allDocs();
    expect(result.rows).to.have.length(1);
    expect(result.rows[0].id).to.equal('_design/idiot');
  });

  it('no difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 1
          }
        }
      },
      desired: {
        config: {
          a: 1
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(0);
  });

  it('number difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 1
          }
        }
      },
      desired: {
        config: {
          a: 2
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal(['a']);
    expect(response.rows[0].value).to.equal(2);
  });

  it('string difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 'c' 
          }
        }
      },
      desired: {
        config: {
          a: 'd'
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal(['a']);
    expect(response.rows[0].value).to.equal('d');
  });

  it('two elements, two differences', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 'c',
            b:  0
          }
        }
      },
      desired: {
        config: {
          a: 'd',
          b:  1
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(2);
    expect(response.rows[0].key).to.deep.equal(['a']);
    expect(response.rows[0].value).to.equal('d');
    expect(response.rows[1].key).to.deep.equal(['b']);
    expect(response.rows[1].value).to.equal(1);
  });

  it('two elements, one difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 'c',
            b:  0
          }
        }
      },
      desired: {
        config: {
          a: 'd',
          b:  0
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal(['a']);
    expect(response.rows[0].value).to.equal('d');
  });

  it('nested difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            deeper: {
              a: 'c',
              b:  0
            }
          }
        }
      },
      desired: {
        config: {
          deeper: {
            a: 'd',
            b:  0
          }
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal(['deeper', 'a']);
    expect(response.rows[0].value).to.equal('d');
  });

  it('array difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            deeper: [
              {
                a: 'b'
              },
              {
                c: 0
              }
            ]
          }
        }
      },
      desired: {
        config: {
          deeper: [
            {
              a: 'b'
            },
            {
              c: 1
            }
          ]
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));
    expect(response.total_rows).to.equal(1);
    expect(response.rows[0].key).to.deep.equal(['deeper', 1, 'c']);
    expect(response.rows[0].value).to.equal(1);
  });

  it('no delta on data type difference', async () => {
    const doc = {
      _id: 'test-doc', 
      reported: {
        state: {
          config: {
            a: 1
          }
        }
      },
      desired: {
        config: {
          a: '1'
        }
      }
    }

    await db.put(doc);
    const response = await db.query('idiot/delta').catch(err =>
      console.log('ERROR: ' + err.message));

    expect(response.total_rows).to.equal(0);
  })
});

