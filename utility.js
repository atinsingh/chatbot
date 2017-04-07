
const config = require("./appConfig.json");
const accountData = require('./data.json');
const moment = require("moment");
const _ = require("underscore");
const restify = require("restify");



 module.exports.getLuisIntent = function(question, callback) {
            var query = "?subscription-key=" + config.luisSubcriptionKey + "&verbose=true&q=" + question;
            var options = {};
            options.url = config.luisURL;
            options.type = options.type || "json";
            options.path = config.luisPath + query;
            options.headers = {Accept: "application/json"};


            var client = restify.createClient(options);

            client.get(options, function (err, req, res, data) {
                if (err) {
                    console.log(err);
                    return;
                }
                client.close();
                console.log(JSON.stringify(data));

                callback(data);
            });
  }

  module.exports.getSentiment = function (text, callback) {

      let options = {};
      options.headers = {
          'Content-Type': "application/json",
           Accept: application/json,
           'Ocp-Apim-Subscription-Key':config.sentiMentSubscriptionKey
      }
      options.url = config.sentiMentURL;
      options.path = "sentiment"
      let client = restify.createClient(options);
      let docObject = this.createDocument(text);
      client.post(options, (err, docObject, req,res,data)=>{
            if(err){
                console.log(err);
                return;
            }
            client.close();
            callback(data);
      })
  }

module.exports.createDocument = function (text) {
    let textObj = {};
    textObj.language = "en";
    textObj.id = "1";
    textObj.text = text;

    let documentObj = {};
    documentObj.documents = [textObj];
    return JSON.stringify(documentObj);
}

/*
 * This function should be used to fetch account details, and problem associated with account.
 * function should take an account number a account pin.
 * for demo we will load data from JSON and ignore the PIN
 */

module.exports.pullAccountDetails = function (accountNo, accountPIn) {
    console.log("Fetching details for account %s", accountNo);
    let user = null;
    accountData.accounts.forEach((account)=>{
        if(Number(account.accountNumber)===accountNo){
            user = account;
        }
    })
    console.log("Found user details %j", user);
    return user;
}


/*
 *
 * Use custom entity recogniser if inbuilt fails
 *
 *
 */

 module.exports.dateTimeDateMoments = function(datetimeDateEntities, type){
     console.log("Inside custom parsing function");
     _(datetimeDateEntities).map((datetimeDateEntity) => {
         let entityType;
         if(type==='builtin.datetime.time'){
             console.log("Now this is what I got"+entityType);
             entityType = datetimeDateEntity.resolution.time;
         }else{
             entityType = datetimeDateEntity.resolution.date;
         }
         console.log("Parsing following entity");
         console.log(entityType);
         entityType=  moment.utc(entityType.replace("XXXX", moment().year())
         .replace("WXX-XX", 'W' + moment().week() + '-' + moment().day())
         .replace("WXX", 'W' + moment().week())
         .replace("XX", moment().month()<9?"0"+moment().add(1, 'months').month():moment().add(1, 'months').month())
         .replace("XX", moment().day())
         .replace('TMO',"T8:00:00")
         .replace('TAF',"T12:00:00")
         .replace('TEV',"T15:00:00"), moment.ISO_8601,true).format();
         if(type==='builtin.datetime.time'){
             datetimeDateEntity.resolution.time = entityType;
         }else{
             datetimeDateEntity.resolution.date = entityType;
         }
     });
     console.log("in parsing function");
     console.log(datetimeDateEntities);

}

/*
 * Temorary function to pull the available slots,
 * this would be replaced with the actual API call in the future. API might need few params
 * like Address or ZIP code of the customer and line of business
 */

module.exports.getFreeslots = function(scheduleDay,startTime,endTime){
    let slots ={};
    console.log("StartTime "+startTime);
    accountData.appoitmentSlots.forEach((slot)=>{
        if(slot.starttime>=startTime){
            slot.date=scheduleDay;
            slots[slot.date+"-"+slot.starttime]=slot;
        }
    });
    console.log("Below are the slots I have identified");
    console.log(slots);
    return slots;
}
