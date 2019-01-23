function(newDoc, oldDoc, userCtx, secObj) { 
  var userName = userCtx.name;

  if (!userName) {
    throw({forbidden: 'Anonymous not allowed to edit documents.'});
  }

  var admin = userCtx.roles.indexOf('_admin') !== -1;
  var deleteAction = typeof newDoc === 'undefined' || newDoc === null || newDoc._deleted === true;

  if (!admin && deleteAction) {
    throw({forbidden: 'Only admins allowed to delete.'});
  }

  if (!newDoc.author || newDoc.author !== userName) {
    throw({forbidden: 'Document author must be user.'});
  }

  var idiot = userCtx.roles.indexOf('idiot') !== -1;

  if (!admin && !idiot) {
    throw({forbidden: 'Only admins and users with `idiot` role allowed to edit documents.'});
  }

  var robot = userCtx.roles.indexOf('robot') !== -1;
  var createAction = typeof oldDoc === 'undefined' || oldDoc === null

  if (!admin && !robot && createAction) {
    throw({forbidden: 'Only admins and users with `robot` role allowed to create documents.'});
  }
}
