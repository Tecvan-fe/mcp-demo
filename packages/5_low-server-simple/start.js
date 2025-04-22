require('sucrase/register/ts');

// require('./src/simple-tools');
// require('./src/simple-resource');
// require('./src/simple-prompt');
// require('./src/simple-sampling');

if (process.argv[2] === 'advanced') {
  require('./src/advanced-prompt');
} else if (process.argv[2] === 'real') {
  require('./src/advanced-prompt-real');
} else {
  require(`./src/simple-${process.argv[2]}`);
}
