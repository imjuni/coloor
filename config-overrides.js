const { override, addBabelPlugin } = require("customize-cra");

module.exports = override(
  addBabelPlugin([
    "@babel/plugin-transform-exponentiation-operator",
    { loose: false },
  ]),
  addBabelPlugin(["@babel/plugin-syntax-bigint", { loose: false }])
  // addWebpackResolve({ plugins: new TsconfigPathsPlugin() })
);
