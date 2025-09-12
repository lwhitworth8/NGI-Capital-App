// Thin wrapper to resolve ts-jest from the workspace root when hoisted
const path = require('path')
let impl
try {
  impl = require('ts-jest')
} catch (e) {
  impl = require(path.resolve(__dirname, '../../node_modules/ts-jest'))
}
module.exports = impl

