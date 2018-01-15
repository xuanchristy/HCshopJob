const Pool = require('./dbPool');

// 查询表达式
var selectSql = "SELECT[DISTINCT][FIELD] FROM [TABLE][FORCE][JOIN][WHERE][GROUP][HAVING][ORDER][LIMIT][UNION][LOCK][COMMENT]";

function parseWhere( $where ) {
	let parsedString = "";
	if( $where ) {
		if( typeof $where === "string" ) {
			parsedString = " WHERE " + $where;
		}
		if( $where instanceof Object ) {
			for( name in $where ) {
				if( typeof $where[name] === "string" ) {
					parsedString += name + "='" + $where[name] + "'" + " AND ";
				} else if( typeof $where[name] === "number" ) {
					parsedString += name + "=" + $where[name] + " AND ";
				}
			}
			parsedString = " WHERE " + parsedString.slice( 0, parsedString.length-5 );
		}
	}
	return parsedString;
}
function parseDistinct( $distinct ) {
	return $distinct ? " DISTINCT" : "";
}
function parseField( $field ) {
	if( typeof $field === "undefined" ) {
		return " *";
	}
	if( typeof $field === "string" ) {
		return " " + $field;
	}
	if( Array.isArray( $field ) ) {
		return " " + $field.toString();
	}
}
function parseJoin( $join ) {
	return $join ? $join : "";
}
function parseGroup( $group ) {
	return !$group ? "" : "GROUP BY " + $group;
}
function parseHaving( $having ) {
	return !$having ? "" : "HAVING " + $having;
}
function parseOrder( $order ) {
	if( typeof $order === "string" && $order.length ) {
		return " ORDER BY " + $order;
	}
	if( $order instanceof Object ) {
		return " ORDER BY " + JSON.stringify( $order ).replace( /[{"}\s]/g, "" ).replace( /\:/g, " " );
	}
	return "";
}
function parseLimit( $limitStart, $limitLength ) {
	let start = $limitStart;
	let len = $limitLength;
	if( typeof start == "undefined" || len <= 0 ) {
		return "";
	}
	if( typeof len == "undefined" ) {
		len = start;
		start = 0;
	}
	return " LIMIT " + start + "," + len;
}

function M( datasheet ) {
	return new M.fn.init( datasheet );
}

M.fn = M.prototype = {

	"constructor" : M,
	init : function( datasheet ) {
		// 创建mysql链接
			this.connection = Pool;
			try {
				if( !datasheet ) {
					throw new Error( "datasheet is not empty!" );
				} else {
					this.datasheet = datasheet;
				}
			} catch( err ) {
				console.log( "error connecting: Error: " + err.message );
			};
			// SQL查询语句
			this.selectSql = selectSql.replace( /\[TABLE\]/, datasheet );
	},
	"distinct" : function( sql ) {
		sql = parseDistinct( sql );
		this.selectSql = this.selectSql.replace( /\[DISTINCT\]/, sql );
		return this;
	},
	"field" : function( sql ) {
		sql = parseField( sql );
		this.selectSql = this.selectSql.replace( /\[FIELD\]/, sql );
		return this;
	},
	"where" : function( sql ) {
		sql = parseWhere( sql );
		this.selectSql = this.selectSql.indexOf( "[WHERE]" ) > 0 ? 
		this.selectSql.replace( /\[WHERE\]/g, sql )
		: this.selectSql.replace( /(?=\[GROUP\])|(?=\[group\])/, " AND" + sql.replace( "WHERE ", "" ) );
		return this;
	},
	"order" : function( sql ) {
		sql = parseOrder( sql );
		this.selectSql = this.selectSql.replace( /\[ORDER\]/, sql );
		return this;
	},
	"limit" : function( limit_start, limit_length ) {
		let sql = parseLimit( limit_start, limit_length );
		this.selectSql = this.selectSql.replace( /\[LIMIT\]/, sql );
		return this;
	},
	"join" : function( sql, model ) {
		let joinModel = model ? model + " JOIN" : "INNER JOIN";

	},
	/**
	 * 查询记录数
	 * @param  {String}   data     [需要查询的字段名称]
	 * @param  {Function} callback [回调函数]
	 */
	"count" : function( data, callback ) {
		var connection = this.connection,
			selectSql = this.selectSql,
			param = "";

		if( typeof data === "string" ) {
			param = "COUNT(" + data + ")";
		} else {
			param = "COUNT(*)"
			callback = data;
		}
		selectSql = selectSql.replace( selectSql.slice( 0, selectSql.indexOf( "FROM" ) ), "SELECT " + param + " " ).replace( /\[[A-Z]+\]/g, "" );
		var promise = new Promise( ( resolve, reject ) => {
			connection.query( selectSql, ( error, results, fields ) => { 
				if( error ) { throw error; }
				if( callback ) { callback( results[0][param] ); }
				resolve( results[0][param] );
			} );
		} )
		return promise;
	},
	/**
	 * 执行sql语句
	 * @param  {String}   sql      [sql原生语句]
	 * @param  {Function} callback [回调函数]
	 */
	"query" : function( sql, callback ) {
		var connection = this.connection;
		var promise = new Promise( ( resolve, reject ) => {
			connection.query( sql, ( error, results, fields) => {
				if( error ) { throw error; }
				if( callback ) { callback( results ); }
				resolve( results );
			} );
		} );
		return promise;
	},
	/**
	 * 查询指定id的记录
	 * @param  {Number}   id       [查询的记录id]
	 * @param  {Function} callback [回调函数]
	 */
	"find" : function( id, callback ) {
		var selectSql = this.selectSql,
			connection = this.connection,
			whereIndex = "";
		if( selectSql.indexOf( "[FIELD]" ) > 0 ) {
			selectSql = selectSql.replace( /\[FIELD\]/, " *" );
		}
		if( typeof id == "number" || typeof id == "string" ) {
			id = +id;
			if( selectSql.indexOf( "[WHERE]" ) > 0 ) {
				selectSql = selectSql.replace( /\[WHERE\]/, " WHERE id=" + id );
			} else if( whereIndex = selectSql.indexOf( "WHERE" ), whereIndex > 0 ) {
				selectSql = selectSql.replace( selectSql.slice( selectSql.indexOf( "WHERE" ) ), "WHERE id=" + id );
			}			
		}
		if( typeof id == "function" ) {
			callback = id;
		}
		selectSql = selectSql.replace( /\[[A-Z]+\]/g, "" );
		var promise = new Promise( ( resolve, reject ) => {
			connection.query( selectSql, ( error, results, fields ) => {
				if( error ) { throw error; }
				if( callback ) { callback( results[0] ); }
				resolve( results[0] );
			} );
		} );
		return promise;
	},
	/**
	 * 查询记录
	 * @param  {Function} callback [回调函数]
	 */
	"select" : function( callback ) {
		var	selectSql = this.selectSql,
			connection = this.connection;
		if( selectSql.indexOf( "[FIELD]" ) > 0 ) {
			selectSql = selectSql.replace( "[FIELD]", " *" );
		}
		selectSql = selectSql.replace( /\[[A-Z]+\]/g, "" );
		var promise = new Promise( function( resolve, reject ) {
			connection.query( selectSql, function (error, results, fields) {
				if( error ) { throw error };
				if( callback ) { callback( results ) };
				resolve( results );
			} );
		} );
		return promise;
	},
	/**
	 * 新增记录
	 * @param  {Object}   data     [新增记录对象]
	 * @param  {Function} callback [回调函数]
	 */
	"insert" : function( data, callback ) {
		var columns="", values="",
			connection = this.connection,
			insertSql = "INSERT INTO " + this.datasheet + " ( [columns] ) VALUES [values]";

		if( data instanceof Object ) {
			for( name in data ) {
				columns += name + ",";
				values += "'" + data[name] + "'" + ",";
			}
			insertSql = insertSql.replace( "[columns]", columns.replace( /,$/, "" ) ).replace( "[values]", "(" + values.replace( /,$/, "" ) + ")" );
		}
		var promise = new Promise( function( resolve, reject ) {
			connection.query( insertSql, function( error, results, fields ) {
				if( error ) { throw error; }
				if( callback ) { callback( results["insertId"] ); }
				resolve( results["insertId"] );
			} );
		} );
		return promise;
	},
	/**
	 * 更新记录
	 * @param  {Object}   data     [更新记录新对象]
	 * @param  {Function} callback [回调函数]
	 */
	"update" : function( data, callback ) {
		var connection = this.connection,
			updateData = "",
			updateSql = this.selectSql.replace( /\[[A-Z]+\]/g, "" ).replace( new RegExp( "SELECT FROM " + this.datasheet ), "UPDATE " + this.datasheet + " SET [data]" );
		if( data instanceof Object ) {
			for( name in data ) {
				updateData += name + "=" + ( typeof data[name] !== "string" ? data[name] : "'" + data[name] + "'" ) + ",";
			}
			updateSql = updateSql.replace( "[data]", updateData.replace( /,$/, "" ) );
		} else if( typeof data === "string" ) {
			updateSql = updateSql.replace( "[data]", data );
		}
		var promise = new Promise( function( resolve, reject ) {
			connection.query( updateSql, function( error, results, fields ) {
				if( error ) { throw error; };
				if( callback ) { callback( results["affectedRows"] ); };
				resolve( results["affectedRows"] );
			} );
		});
		return promise;
	},
	/**
	 * 删除记录
	 * @param  {Object}   data     [待删除记录对象]
	 * @param  {Function} callback [回调函数]
	 */
	"delete" : function( data, callback) {
		var connection = this.connection,
			selectSql = this.selectSql,
			delSql = "DELETE FROM " + this.datasheet + " WHERE [delData]";

		if( Array.isArray( data ) ) {
			delSql = delSql.replace( "[delData]", "id=" + data.toString().replace( /,/g, " OR id=") );
		} else if( typeof data === "function" ) {
			selectSql = selectSql.replace( /\[FIELD\]/g, " *" ).replace( /\[[A-Z]+\]/g, "" );			
			delSql = delSql.replace( "WHERE [delData]", selectSql.slice( selectSql.indexOf( "WHERE" ) ) );
			callback = data;
		} else {
			delSql = delSql.replace( "[delData]", "id=" + +data );
		}
		var promise = new Promise( ( resolve, reject ) => {
			connection.query( delSql, ( error, results, fields ) => {
				if( error ) { throw error; }
				if( callback ) { callback( results["affectedRows"] ); }
				resolve( results["affectedRows"] );
			} );
		});
		return promise;
	},
};

M.fn.init.prototype = M.fn;
module.exports = M;