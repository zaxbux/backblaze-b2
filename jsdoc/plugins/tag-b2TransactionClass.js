exports.defineTags = function (dictionary) {
	dictionary.defineTag("b2TransactionClass", {
		mustHaveValue: true,
		canHaveType: false,
		canHaveName: true,
		onTagged: function (doclet, tag) {
			doclet.b2transaction = tag.value;
		}
	});
};

exports.handlers = {
	newDoclet: function(e) {
		const b2transaction = e.doclet.b2transaction;

		if (b2transaction) {
			e.doclet.description = `${e.doclet.description}
									B2 Transaction Class: ${b2transaction.name}`
		}
	}
}