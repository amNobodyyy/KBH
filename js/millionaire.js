/**
* Edits the number prototype to allow money formatting
*
* @param fixed the number to fix the decimal at. Default 2.
* @param decimalDelim the string to deliminate the non-decimal
*        parts of the number and the decimal parts with. Default "."
* @param breakdDelim the string to deliminate the non-decimal
*        parts of the number with. Default ","
* @return returns this number as a USD-money-formatted String
*		  like this: x,xxx.xx
*/
Number.prototype.money = function (fixed, decimalDelim, breakDelim) {
	var n = this,
		fixed = isNaN(fixed = Math.abs(fixed)) ? 2 : fixed,
		decimalDelim = decimalDelim == undefined ? "." : decimalDelim,
		breakDelim = breakDelim == undefined ? "," : breakDelim,
		negative = n < 0 ? "-" : "",
		i = parseInt(n = Math.abs(+n || 0).toFixed(fixed)) + "",
		j = (j = i.length) > 3 ? j % 3 : 0;
	return negative + (j ? i.substr(0, j) +
		breakDelim : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + breakDelim) +
		(fixed ? decimalDelim + Math.abs(n - i).toFixed(fixed).slice(2) : "");
}

/**
* Plays a sound via HTML5 through Audio tags on the page
*
* @require the id must be the id of an <audio> tag.
* @param id the id of the element to play
* @param loop the boolean flag to loop or not loop this sound
*/
startSound = function (id, loop) {
	soundHandle = document.getElementById(id);
	if (loop)
		soundHandle.setAttribute('loop', loop);
	soundHandle.play();
}

/**
* The View Model that represents one game of
* Who Wants to Be a Millionaire.
* 
* @param data the question bank to use
*/
var MillionaireModel = function (data) {
	var self = this;

	// The 15 questions of this game
	this.questions = data.questions;

	// A flag to keep multiple selections
	// out while transitioning levels
	this.transitioning = false;

	// The current money obtained
	this.money = new ko.observable(0);

	// The current level(starting at 1) 
	this.level = new ko.observable(1);

	// Pause Timer
	this.timerPaused = new ko.observable(false);

	// Timer variables
	this.timeLeft = new ko.observable(0); // Initial time left is 0
	var timer; // Variable to hold the interval timer

	// The three options the user can use to 
	// attempt to answer a question (1 use each)
	this.usedFifty = new ko.observable(false);
	this.usedPhone = new ko.observable(false);
	this.usedAudience = new ko.observable(false);
	// this.usedSwapQuestion = new ko.observable(false);

	// Grabs the question text of the current question
	self.getQuestionText = function () {
		return self.questions[self.level() - 1].question;
	}

	// Gets the answer text of a specified question index (0-3)
	// from the current question
	self.getAnswerText = function (index) {
		return self.questions[self.level() - 1].content[index];
	}

	// Observable to store the formatted time (MM:SS)
	self.formattedTime = ko.computed(function () {
		var totalSeconds = self.timeLeft();
		var minutes = Math.floor(totalSeconds / 60); // Calculate the minutes
		var seconds = totalSeconds % 60; // Calculate the remaining seconds
		// Ensure seconds are always two digits (e.g., 03, 05)
		return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
	});

	// Timer logic to start counting down
	self.startTimer = function () {
		// Get the timer value from the current question in the JSON
		var timeLimit = parseInt(self.questions[self.level() - 1].timer) || 30; // Default to 30 seconds if no timer is provided
		self.timeLeft(timeLimit); // Set the timer to the question's time

		var totalTime = timeLimit; // Store the total time for percentage calculation

		if (timer) {
			clearInterval(timer); // Clear any existing timer
		}

		// Start a new timer
		timer = setInterval(function () {
			if (!self.timerPaused()) {
				var currentTime = self.timeLeft() - 1;
				self.timeLeft(currentTime); // Decrease time left by 1 second

				// Calculate the percentage of time left for the progress bar
				var percentage = (currentTime / totalTime) * 100;
				$("#time-bar-inner").css("width", percentage + "%"); // Update the width of the progress bar

				// Shrink both the left and right bars based on the remaining percentage
				$("#left-bar").css("width", (percentage * 0.45) + "%");
				$("#right-bar").css("width", (percentage * 0.45) + "%");

				// Change the color of the progress bars based on the percentage of time left
				if (percentage > 50) {
					$("#left-bar, #right-bar").css("background-color", "green"); // More than 50% left
				} else if (percentage > 20) {
					$("#left-bar, #right-bar").css("background-color", "orange"); // Between 20% and 50%
				} else {
					$("#left-bar, #right-bar").css("background-color", "red"); // Less than 20% left
				}

				if (self.timeLeft() <= 0) {
					clearInterval(timer); // Stop the timer
					self.outOfTime(); // Trigger game over if time runs out
				}
			}
		}, 1000); // 1 second interval
	};

	// Called when time runs out
	self.outOfTime = function () {
		$("#game").fadeOut('slow', function () {
			$("#game-over").html('Time’s Up! Game Over!');
			$("#game-over").fadeIn('slow');
			self.transitioning = false;
		});
	};

	// Uses the fifty-fifty option of the user
	self.fifty = function (item, event) {
		if (self.transitioning)
			return;
		$(event.target).fadeOut('slow');
		var correct = this.questions[self.level() - 1].correct;
		var first = (correct + 1) % 4;
		var second = (first + 1) % 4;
		if (first == 0 || second == 0) {
			$("#answer-one").fadeOut('slow');
		}
		if (first == 1 || second == 1) {
			$("#answer-two").fadeOut('slow');
		}
		if (first == 2 || second == 2) {
			$("#answer-three").fadeOut('slow');
		}
		if (first == 3 || second == 3) {
			$("#answer-four").fadeOut('slow');
		}
	}


	self.leaveGame = function () {
		// Get the current money won
		var currentMoneyWon = self.money();
		startSound("rightsound", false);
		// Fade out the game screen and show the game-over message with the amount won
		$("#game").fadeOut('slow', function () {
			$("#game-over").html('You chose to leave! You won ₹' + currentMoneyWon);
			$("#game-over").fadeIn('slow');
			self.transitioning = false;
		});
	};

	self.useAudience = function (item, event) {
		self.timerPaused(!self.timerPaused());

		if (!self.timerPaused()) {
			if (self.transitioning)
				return;
			$(event.target).fadeOut('slow');
		}

		$("#audience").css("background-position", "0px -64px")
	}

	self.usePhone = function (item, event) {
		self.timerPaused(!self.timerPaused());

		if (!self.timerPaused()) {
			if (self.transitioning)
				return;
			$(event.target).fadeOut('slow');
		}

		$("#phone-friend").css("background-position", "0px -64px")
	}

	// Fades out an option used if possible
	self.fadeOutOption = function (item, event) {
		if (self.transitioning)
			return;
		$(event.target).fadeOut('slow');
	}

	self.getLastCheckpoint = function () {
		var currentLevel = self.level();

		if (currentLevel > 6) {
			return 320;
		} else if (currentLevel > 3) {
			return 40;
		} else {
			return 0;
		}
	}

	// Attempts to answer the question with the specified
	// answer index (0-3) from a click event of elm
	self.answerQuestion = function (index, elm) {
		if (self.transitioning)
			return;
		self.transitioning = true;

		// Set the clicked answer to the "waiting" state (orange)
		$("#" + elm).css('background', 'orange');

		clearInterval(timer); // Stop the timer when the user answers
		// Wait for 1 second to simulate the waiting state
		setTimeout(function () {
			// Check if the selected answer is correct
			if (self.questions[self.level() - 1].correct == index) {
				// If correct, set the background to green and play the correct sound
				self.rightAnswer(elm);
			} else {
				// If wrong, show the wrong answer in red and reveal the correct answer
				self.wrongAnswer(elm);
			}
		}, 3000);
	}

	// Executes the proceedure of a correct answer guess, moving
	// the player to the next level (or winning the game if all
	// levels have been completed)
	self.rightAnswer = function (elm) {

		$("#" + elm).slideUp('slow', function () {
			startSound('rightsound', false);
			$("#" + elm).css('background', 'green').slideDown('slow', function () {
				self.money($(".active").data('amt'));
				setTimeout(function () {
					if (self.level() + 1 > 5) {
						var background = document.getElementById("background");
						background.pause();

						var win = document.getElementById("winsound");
						win.play();
						
						$("#game").fadeOut('slow', function () {
							$("#game-over").html('You Win!');
							$("#game-over").fadeIn('slow');
						});
					} else {
						self.level(self.level() + 1);
						$("#" + elm).css('background', 'none');
						$("#answer-one").show();
						$("#answer-two").show();
						$("#answer-three").show();
						$("#answer-four").show();
						self.startTimer(); // Restart the timer for the next question
						self.transitioning = false;
					}
				}, 5000);
			});
		});
	}

	// Executes the proceedure of guessing incorrectly, losing the game.
	self.wrongAnswer = function (elm) {
		$("#" + elm).slideUp('slow', function () {
			startSound('wrongsound', false);
			$("#" + elm).css('background', 'red').slideDown('slow', function () {
				setTimeout(function () {
					// Find the correct answer and highlight it in green
					var correctIndex = self.questions[self.level() - 1].correct;
					var answerIds = ['#answer-one', '#answer-two', '#answer-three', '#answer-four'];
					var correctAnswerId = answerIds[correctIndex];
					$(correctAnswerId).css('background', 'green');

					var getLastCheckpoint = self.getLastCheckpoint();

					// After showing the correct answer, proceed to the game over screen
					setTimeout(function () {
						$("#game").fadeOut('slow', function () {
							$("#game-over").html('You have won ₹' + getLastCheckpoint);
							$("#game-over").fadeIn('slow');
							self.transitioning = false;
						});
					}, 2000); // Pause for 2 seconds to show the correct answer
				}, 1000);
			});
		});
	}

	// Gets the money formatted string of the current won amount of money.
	self.formatMoney = function () {
		return self.money().money(2, '.', ',');
	}
};

// Executes on page load, bootstrapping
// the start game functionality to trigger a game model
// being created
$(document).ready(function () {
	$.getJSON("questions2.json", function (data) {
		for (var i = 1; i <= data.games.length; i++) {
			$("#problem-set").append('<option value="' + i + '">' + i + '</option>');
		}
		$("#pre-start").show();
		$("#start").click(function () {
			var index = $('#problem-set').find(":selected").val() - 1;
			var gameModel = new MillionaireModel(data.games[index]);

			ko.applyBindings(gameModel);
			$("#pre-start").fadeOut('slow', function () {
				startSound('background', true);
				$("#game").fadeIn('slow');

				// *** Start the timer for the first question ***
				gameModel.startTimer();
			});
		});
	});
});