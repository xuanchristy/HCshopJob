const schedule = require("node-schedule");
const M = require("./mysqlLib.js");
const rule = new schedule.RecurrenceRule();  
// 任务循环时间间隔
const times = 59;
// 订单超时时间
const orderTimeOut = 1000*60*60*24;
rule.minute  = times;
schedule.scheduleJob(rule, function(){  
  M("shop_order").where(`order_status="ORDER_WAIT_PAY"`).select()
  .then((result) => {
        const promiseFunctions = [];
        for( let item of result ) {
            let createTime;
            let currentTime = Date.now() || +new Date;
            let _timeStamp = item["order_time"].replace(new RegExp("-","gm"),"/");
            createTime = (new Date(_timeStamp)).getTime();
            if( createTime + orderTimeOut < currentTime ) {
                promiseFunctions.push(M("shop_order").where(`id=${item["id"]}`).update(`order_status="ORDER_CLOSE_OUT"`));
            }
        }
        return Promise.all( promiseFunctions );        
  })
  .catch((err) => {
      console.error(err);
  })
});