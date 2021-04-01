var fs = require("fs");
function merge(content, values) {
  // loop over all the keys in the values object
  Object.keys(values).forEach(function(key) {
    // look for the key surrounded by % in the string
    // and replace it by the value from values
    content = content.split('%' + key + '%').join(values[key]);
  });
  return content;
}

function view (templateName, values, res) {
	var fileContent = fs.readFileSync('./templates/' + templateName + '.html', 'utf-8');
	fileContent = merge(fileContent, values);
	res(fileContent);
}

module.exports.view = view;