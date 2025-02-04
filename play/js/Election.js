/****************************

SINGLETON CLASS on how to COUNT UP THE BALLOTS
and RENDER IT INTO THE CAPTION

*****************************/

var Election = {};

Election.score = function(model, options){

	// Tally the approvals & get winner!
	var tally = _tally(model, function(tally, ballot){
		for(var candidate in ballot){
			tally[candidate] += ballot[candidate];
		}
	});
	for(var candidate in tally){
		tally[candidate] /= model.getTotalVoters();
	}
	var winner = _countWinner(tally);
	var color = _colorWinner(model, winner);

	// NO WINNER?! OR TIE?!?!
	if(!winner){

		var text = "<b>NOBODY WINS</b>";
		model.caption.innerHTML = text;

	}else{

		// Caption
		var text = "";
		text += "<span class='small'>";
		text += "<b>highest average score wins</b><br>";
		for(var i=0; i<model.candidates.length; i++){
			var c = model.candidates[i].id;
			text += _icon(c)+"'s score: "+(tally[c].toFixed(2))+" out of 5.00<br>";
		}
		text += "<br>";
		text += _icon(winner)+" has the highest score, so...<br>";
		text += "</span>";
		text += "<br>";
		text += "<b style='color:"+color+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
		model.caption.innerHTML = text;

	}

};

Election.judgment = function(model, options){
	let votes = {};
	for (let id in model.candidatesById) votes[id] = [];

	let ballots = model.getBallots();
	for (let ballot of ballots){
		for (let [id, score] of Object.entries(ballot)){
			votes[id].push(score);
		}
	}

	let text = "<span class='small'>";

	let medians = {}
	for (let id of Object.keys(votes)){
		votes[id].sort();
		
		let votesForCandidate = votes[id];;
		let index = votesForCandidate.length/2;
		let median = votesForCandidate[index];
		medians[id] = median;
		text += _icon(id) + " had a median score of " + median + "/5 <br>";
	}

	text += "<br>";


	let winners = [];
	let bestMedian = -1;
	for (let [id, median] of Object.entries(medians)){
		if (median > bestMedian){
			bestMedian = median;
			winners = [id];
		} else if (median === bestMedian){
			winners.push(id);
		}
	}

	let winner = null;
	if(winners.length === 1){
		winner = winners[0];
	} else {
		text += "Tied scores between " + winners.map(_icon).join(", ") + ". Breaking tie <br>";
		text += "<br>";
		text += "<b>Usual Judgment</b><br>"
		winner = winners[0] //TEMP

		let counts = {};
		let maxUsual = -1;
		let usualWinner;
		for (let id of winners){
			let count = {approve: 0, neutral: 0, disapprove: 0};
			// We already did a sort so we should be able to do this faster with some binary search
			for (let vote of votes[id]){
				if (vote < bestMedian){
					count.disapprove += 1;
				} else if (vote === bestMedian){
					count.neutral += 1;
				} else {
					count.approve += 1;
				}
			}
			counts[id] = count;

			// Usual Judgment Winner
			let usualScore = bestMedian + ((count.approve - count.disapprove) / (2 * count.neutral));
			if (usualScore > maxUsual) {
				maxUsual = usualScore;
				usualWinner = id;
			}
			text += _icon(id) + " had a usual judgment of " + usualScore.toFixed(2) + ". <br>";
		}

		text += _icon(usualWinner) + " wins under Usual Judgment. <br>";
		text += "<br>";

		text += "<b>Majority Judgment</b><br>";
		for ([id, count] of Object.entries(counts)){
			text += _icon(id) + " has " + count.approve + " approvals and " + count.disapprove + " disapprovals. <br>"
		}
		text += "<br>";

		while (winners.length > 1){
			let largestVoterBlock = {id:"none", type:"approve", count:-1};
			for(let id of winners){
				let count = counts[id];
				if (count.approve > largestVoterBlock.count){
					largestVoterBlock = {id:id, type:"approve", count:count.approve};
				}
				if (count.disapprove > largestVoterBlock.count){
					largestVoterBlock = {id:id, type:"disapprove", count:count.disapprove};
				}

			}

			if (largestVoterBlock.type === "approve"){
				winners = [largestVoterBlock.id];
				text += _icon(largestVoterBlock.id) + " has the largest block approving and so...<br>";
			} else {
				winners = winners.filter((id) => id !== largestVoterBlock.id);
				text += _icon(largestVoterBlock.id) + " has the largest block disapproving and is eliminated.<br>";
				if(winners.length === 1){
					text += "No more candidates can be eliminated, so... <br>";
				}
			}
		}
		winner = winners[0];
	}

	let winningColor = _colorWinner(model, winner);
	text += "</span>";
	text += "<br>";
	text += "<b style='color:"+winningColor+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
	model.caption.innerHTML = text;

}

Election.approval = function(model, options){

	// Tally the approvals & get winner!
	var tally = _tally(model, function(tally, ballot){
		var approved = ballot.approved;
		for(var i=0; i<approved.length; i++) tally[approved[i]]++;
	});
	var winner = _countWinner(tally);
	var color = _colorWinner(model, winner);

	// NO WINNER?! OR TIE?!?!
	if(!winner){

		var text = "<b>NOBODY WINS</b>";
		model.caption.innerHTML = text;

	}else{

		// Caption
		var text = "";
		text += "<span class='small'>";
		text += "<b>most approvals wins</b><br>";
		for(var i=0; i<model.candidates.length; i++){
			var c = model.candidates[i].id;
			text += _icon(c)+" got "+tally[c]+" approvals<br>";
		}
		text += "<br>";
		text += _icon(winner)+" is most approved, so...<br>";
		text += "</span>";
		text += "<br>";
		text += "<b style='color:"+color+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
		model.caption.innerHTML = text;

	}

};

Election.condorcet = function(model, options){

	var text = "";
	text += "<span class='small'>";
	text += "<b>who wins each one-on-one?</b><br>";

	var ballots = model.getBallots();

	// Create the WIN tally
	var tally = {};
	for(var candidateID in model.candidatesById) tally[candidateID] = 0;

	// For each combination... who's the better ranking?
	for(var i=0; i<model.candidates.length-1; i++){
		var a = model.candidates[i];
		for(var j=i+1; j<model.candidates.length; j++){
			var b = model.candidates[j];

			// Actually figure out who won.
			var aWins = 0;
			var bWins = 0;
			for(var k=0; k<ballots.length; k++){
				var rank = ballots[k].rank;
				if(rank.indexOf(a.id)<rank.indexOf(b.id)){
					aWins++; // a wins!
				}else{
					bWins++; // b wins!
				}
			}

			// WINNER?
			var winner = (aWins>bWins) ? a : b;
			tally[winner.id]++;

			// Text.
			var by,to;
			if(winner==a){
				by = aWins;
				to = bWins;
			}else{
				by = bWins;
				to = aWins;
			}
			text += _icon(a.id)+" vs "+_icon(b.id)+": "+_icon(winner.id)+" wins by "+by+" to "+to+"<br>";

		}
	}

	// Was there one who won all????
	var topWinner = null;
	for(var id in tally){
		if(tally[id]==model.candidates.length-1){
			topWinner = id;
		}
	}

	// Winner... or NOT!!!!
	text += "<br>";
	if(topWinner){
		var color = _colorWinner(model, topWinner);
		text += _icon(topWinner)+" beats all other candidates in one-on-one races.<br>";
		text += "</span>";
		text += "<br>";
		text += "<b style='color:"+color+"'>"+_toCat(topWinner).toUpperCase()+"</b> WINS";
	}else{
		model.canvas.style.borderColor = "#000"; // BLACK.
		text += "NOBODY beats everyone else in one-on-one races.<br>";
		text += "</span>";
		text += "<br>";
		text += "THERE'S NO WINNER.<br>";
		text += "<b id='ohno'>OH NO.</b>";
	}

	// what's the loop?

	model.caption.innerHTML = text;

};

Election.borda = function(model, options){

	// Tally the approvals & get winner!
	var tally = _tally(model, function(tally, ballot){
		for(var i=0; i<ballot.rank.length; i++){
			var candidate = ballot.rank[i];
			tally[candidate] += i; // the rank!
		}
	});
	var winner = _countLoser(tally); // LOWER score is best!
	var color = _colorWinner(model, winner);

	// NO WINNER?! OR TIE?!?!
	if(!winner){

		var text = "<b>NOBODY WINS</b>";
		model.caption.innerHTML = text;

	}else{

		// Caption
		var text = "";
		text += "<span class='small'>";
		text += "<b>lower score is better</b><br>";
		for(var i=0; i<model.candidates.length; i++){
			var c = model.candidates[i].id;
			text += _icon(c)+"'s total score: "+tally[c]+"<br>";
		}
		text += "<br>";
		text += _icon(winner)+" has the <i>lowest</i> score, so...<br>";
		text += "</span>";
		text += "<br>";
		text += "<b style='color:"+color+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
		model.caption.innerHTML = text;

	}

};

Election.irv = function(model, options){

	var text = "";
	text += "<span class='small'>";

	var finalWinner = null;
	var roundNum = 1;

	var candidates = [];
	for(var i=0; i<model.candidates.length; i++){
		candidates.push(model.candidates[i].id);
	}

	while(!finalWinner){

		text += "<b>round "+roundNum+":</b><br>";
		text += "who's voters' #1 choice?<br>";

		// Tally the approvals & get winner!
		var pre_tally = _tally(model, function(tally, ballot){
			var first = ballot.rank[0]; // just count #1
			tally[first]++;
		});

		// ONLY tally the remaining candidates...
		var tally = {};
		for(var i=0; i<candidates.length; i++){
			var cID = candidates[i];
			tally[cID] = pre_tally[cID];
		}

		// Say 'em...
		for(var i=0; i<candidates.length; i++){
			var c = candidates[i];
			text += _icon(c)+":"+tally[c];
			if(i<candidates.length-1) text+=", ";
		}
		text += "<br>";

		// Do they have more than 50%?
		var winner = _countWinner(tally);
		var ratio = tally[winner]/model.getTotalVoters();
		if(ratio>=0.5){
			finalWinner = winner;
			text += _icon(winner)+" has more than 50%<br>";
			break;
		}

		// Otherwise... runoff...
		var loser = _countLoser(tally);
		text += "nobody's more than 50%. ";
		text += "eliminate loser, "+_icon(loser)+". next round!<br><br>";

		// ACTUALLY ELIMINATE
		candidates.splice(candidates.indexOf(loser), 1); // remove from candidates...
		var ballots = model.getBallots();
		for(var i=0; i<ballots.length; i++){
			var rank = ballots[i].rank;
			rank.splice(rank.indexOf(loser), 1); // REMOVE THE LOSER
		}

		// And repeat!
		roundNum++;
	
	}

	// END!
	var color = _colorWinner(model, finalWinner);
	text += "</span>";
	text += "<br>";
	text += "<b style='color:"+color+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
	model.caption.innerHTML = text;


};

Election.plurality = function(model, options){

	options = options || {};

	// Tally the approvals & get winner!
	var tally = _tally(model, function(tally, ballot){
		tally[ballot.vote]++;
	});
	var winner = _countWinner(tally);
	var color = _colorWinner(model, winner);

	// Caption
	var text = "";
	text += "<span class='small'>";
	if(options.sidebar){
		text += "<b>most votes wins</b><br>";
	}
	for(var i=0; i<model.candidates.length; i++){
		var c = model.candidates[i].id;
		if(options.sidebar){
			text += _icon(c)+" got "+tally[c]+" votes<br>";
		}else{
			text += c+": "+tally[c];
			if(options.verbose) text+=" votes";
			if(i<model.candidates.length-1) text+=", ";
		}
	}
	if(options.sidebar){
		text += "<br>";
		text += _icon(winner)+" has most votes, so...<br>";
	}
	text += "</span>";
	text += "<br>";
	text += "<b style='color:"+color+"'>"+_toCat(winner).toUpperCase()+"</b> WINS";
	model.caption.innerHTML = text;

};

var _tally = function(model, tallyFunc){

	// Create the tally
	var tally = {};
	for(var candidateID in model.candidatesById) tally[candidateID] = 0;

	// Count 'em up
	var ballots = model.getBallots();
	for(var i=0; i<ballots.length; i++){
		tallyFunc(tally, ballots[i]);
	}
	
	// Return it.
	return tally;

}

var _countWinner = function(tally){

	// TO DO: TIES as an array?!?!

	var highScore = -1;
	var winner = null;

	for(var candidate in tally){
		var score = tally[candidate];
		if(score>highScore){
			highScore = score;
			winner = candidate;
		}
	}

	return winner;

}

var _countLoser = function(tally){

	// TO DO: TIES as an array?!?!

	var lowScore = Infinity;
	var winner = null;

	for(var candidate in tally){
		var score = tally[candidate];
		if(score<lowScore){
			lowScore = score;
			winner = candidate;
		}
	}

	return winner;

}

var _colorWinner = function(model, winner){
	var color = (winner) ? Candidate.graphics[winner].fill : "";
	model.canvas.style.borderColor = color;
	return color;
}

var _toCat = function(id) {
  const catidates = {
    'square': 'Blue Cat',
    'triangle': 'Yellow Cat',
    'hexagon': 'Red Cat',
    'pentagon': 'Green Cat',
    'bob': 'Orange Cat'
  };
  
  return catidates[id];
}