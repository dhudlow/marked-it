;(function() {
// use strict

var LINK = 1, HEADING = 2, PARAGRAPH = 3;
var INIT = 0, INVALID = -1, V_MIN = LINK, V_MAX = PARAGRAPH;

/*
A simple automata to consume TOC structure by infering
start(0) -> [link(1) -> heading(2) -> paragraph(3)]+

If unexpected input is encountered, the automata enters
invalid state (-1) which does nothing for all input.
*/
var automata = {
	_state: INIT,
	reset: function() { this._state = INIT; },
	next: function(action) {
		if (this._state < INIT || this._state > V_MAX || action < V_MIN || action > V_MAX) {
			return false;
		}
		if (this._state % V_MAX + 1 === action) {
			this._state = action;
			return true;
		}
		this._state = INVALID;
		return false;
	}
};

/* A basic stack to represents TOC tree structure */
var stack = [], currentTocs = [], currentToc;
/* root.length is the depth for one branch */
stack.push(currentTocs);

/* String representation of the TOC tree structure */
var tocBuffer = '<map>';

module.exports = {
	reset: function() {
		automata.reset();
		tocBuffer = '<map>';
		stack = [];
		currentTocs = [];
		stack.push(currentTocs);
		currentToc = null;
	},
	link: function(href, title, text) {
		if (automata.next(LINK)) {
			currentToc = {
				href: href,
				title: title,
				linktext: text,
				children: []
			};
			return true;
		}
		tocBuffer = null;
		return false;
	},
	heading: function(text, level) {
		if (automata.next(HEADING)) {
			while (level < stack.length) {
				stack.pop();
				currentTocs = stack[stack.length-1];
				tocBuffer += '</topicref>';
			}
			if (level == stack.length) { // current level
				if (currentTocs.length > 0) {
					tocBuffer += '</topicref>';
				}
				currentTocs.push(currentToc);
			} else if (level == stack.length + 1) { // next level
				currentTocs = currentTocs[currentTocs.length-1].children;
				stack.push(currentTocs);
				currentTocs.push(currentToc);
			} else { // invalid
				console.log('Invalid heading level: ' + level + ' depth=' + stack.length);
				automata.next(INVALID);
				tocBuffer = null;
				return false;
			}

			tocBuffer += '<topicref href="' + currentToc.href +
				'" navtitle="' + currentToc.title + '"><topicmeta>';
			if (currentToc.linktext) {
				tocBuffer += '<linktext>' + currentToc.linktext + '</linktext>';
			}
			tocBuffer += '</topicmeta>';

			return true;
		}
		tocBuffer = null;
		return false;
	},
	paragraph: function(text) {
		if (automata.next(PARAGRAPH)) {
			currentToc.description = text;
			tocBuffer = tocBuffer.substring(0, tocBuffer.length - 12) +
				'<shortdesc>' + text + '</shortdesc></topicmeta>';
			return true;
		}
		tocBuffer = null;
		return false;
	},
	buffer: function() {
		if (!tocBuffer) {
			return null; // invalid state
		}
		if (stack.length == 1 && currentTocs.length === 0) {
			// empty map or potential first TOC detected
			return currentToc ? '<map></map>' : null;
		}
		return tocBuffer + '</topicref></map>';
	}
};

})();
