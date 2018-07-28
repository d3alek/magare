function(newDoc, oldDoc, userCtx, secObj) { 
  var admin = userCtx.roles.indexOf('_admin') !== -1;

  if (!(newDoc && newDoc.votes)) {
    return;
  }

  if (!userCtx.name) {
    throw({forbidden: 'Anonymous not allowed to vote.'});
  }
  
  function arraySubtraction(a1, a2) {
    return a1.filter(function(value) {
      return -1 === a2.indexOf(value);
    });
  }

  var oldDocVotesFor = ((oldDoc && oldDoc.votes) || []).for || [];
  var newDocVotesFor = newDoc.votes.for || [];
  var newVotesFor = arraySubtraction(newDocVotesFor, oldDocVotesFor);
  var removedVotesFor = arraySubtraction(oldDocVotesFor, newDocVotesFor);
  var oldDocVotesAgainst = ((oldDoc && oldDoc.votes) || []).against || [];
  var newDocVotesAgainst = newDoc.votes.against || [];
  var newVotesAgainst = arraySubtraction(newDocVotesAgainst, oldDocVotesAgainst);
  var removedVotesAgainst = arraySubtraction(oldDocVotesAgainst, newDocVotesAgainst);
  var i;

  var newVotes = newVotesFor.concat(newVotesAgainst);
  var removedVotes = removedVotesFor.concat(removedVotesAgainst);
  log('votes');
  log(newVotes);
  log('removes');
  log(removedVotes);

  if (newVotes.length === 0 && 
    (oldDocVotesFor.length !== newDocVotesFor.length 
    || oldDocVotesAgainst.length !== newDocVotesAgainst.length)) {
    throw({forbidden: 'User already voted'});
  }
  if (newVotes.length > 0) {
    if (newVotes.length > 1) {
      throw({forbidden: 'Only one vote per change is allowed'});
    }
    if (newVotes[0] !== userCtx.name) {
      throw({forbidden: 'User must be the new voter'});
    }
    if (newVotesFor.length > 0) {
      log("old for");
      log(oldDocVotesFor);
      log("old against");
      log(oldDocVotesAgainst);
      if (oldDocVotesFor.indexOf(userCtx.name) !== -1) {
        throw({forbidden: 'User already voted'});
      }
    }
    else {
      log("old for");
      log(oldDocVotesFor);
      log("old against");
      log(oldDocVotesAgainst);
      if (oldDocVotesAgainst.indexOf(userCtx.name) !== -1) {
        throw({forbidden: 'User already voted'});
      }
    }
  }

  if (removedVotes.length > 0) {
    if (removedVotes.length > 1) {
      throw({forbidden: 'Only one removed vote per change is allowed'});
    }
    if (removedVotes[0] !== userCtx.name) {
      throw({forbidden: 'User can only remove own votes'});
    }
  }
}
