const mysql = require('mysql');
const mysqlConfig = require('./db_config');
const pool = mysql.createPool(mysqlConfig);

// pool.on('acquire', function (connection) {
//     console.log('Connection %d acquired', connection.threadId);
// });

// pool.on('connection', function (connection) {
//     console.log('this is connection');
// });

module.exports = pool;