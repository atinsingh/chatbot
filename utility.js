
const config = require("./appConfig.json");
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
                //console.log(JSON.stringify(data));

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
      client.post(options, (err, req,res,data)=>{
            if(err){
                console.log(err);
                return;
            }
            client.close();
            callback(data);
      })
  }

createDocument = function (text) {
    let textObj = {};
    textObj.language = "en";
    textObj.id = "1";
    textObj.text = text;

    let documentObj = Object([textObj]);

}