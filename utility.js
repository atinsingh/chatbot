/**
 * Utils contains the functions require by chat bot. 
 * LUIS can BING and POINTIS calls are part of this file.
 */

const config = require("./config/appConfig.json");
const accountData = require('./data/data.json');
const moment = require("moment");
const _ = require("underscore");
const restify = require("restify");
const querystring = require("querystring");
const LOG = require("./log");

var Utils;

Utils = (function () {
    function Utils() {
    };

    /**
     * Function to get intent and sentiment for the query
     * @query is the text from user
     * @callback is the function getIntentAndSentiment will call when data from api  is available
     */
    Utils.getIntentAndSentiment = (query, callback) => {
        var data = {};
        Utils.getLuisIntent(query, (response)=> {
            data.luis = response;
            data.intent = response.topScoringIntent.intent;
            Utils.getSentiment(query,(response)=>{
                data.bing = response;
                data.sentiment = FourEmotions(response.documents[0].score);
                data.sentimentScore = response.documents[0].score;
                console.log("Got Sentiment and Intent");
                console.log(JSON.stringify(data));
                callback(data);
                
            });

        });

    }

    /*
     * Call MS LUIS to get the intent of the user.
     * @query - string should use LUIS subcription Key and unescapped query string
     * @callback function will be called when data set is avilable
     * 
     */
    Utils.getLuisIntent =  (question, callback) => {
        var query = "?subscription-key=" + config.luisSubcriptionKey + "&verbose=true&spellCheck=true&q=" + querystring.escape(question);
        var options = {};
        options.url = config.luisURL;
        options.contentType ="application/json";
        options.type = options.type || "json";
        options.path = config.luisPath + query;
        options.headers = {
            Accept: "application/json"
        };
        perFormRequest(options, "GET", query, callback);
    }

    /**
     * Function will call Microsoft Bing Text Analytics API to get the sentiment score
     * @text - is the text that will be pass as document to this post method.
     * @callback will be called when data set is available'
     */
    Utils.getSentiment = (text, callback) => {
        let options = {};
        options.contentType ="application/json";
        options.headers = {
            'Content-Type': "application/json",
             'Accept': "application/json",
            'Ocp-Apim-Subscription-Key':config.sentiMentSubscriptionKey
        }
        options.url = config.sentiMentURL;
        //options.path = "sentiment"
        // createDocument will create document object from the text string being passed.
        let docObject = CreateDocument(text);
        perFormRequest(options, "POST", docObject, callback);

    }

   /**
    * perFormRequest will do a HTTP GET/POST call method on the method provided 
    * method will create a new Restify client based on the option passeed, option should have a hostname 
    * 
    */

    perFormRequest = (options, method, request, callback) => {
        //console.log(options);
        let client = restify.createStringClient(options);
        if (method === 'GET') {
            console.log("Going to make call to LUIS now");
            client.get(options,(err, req, res, data) => {
                if (err) {
                    console.log(err);
                    return;
                }
                //console.log(data);
                client.close();

                callback(JSON.parse(data));
            });

        } else {
            console.log("Going to make call to BING now");
            client.post(options,request, (err, req, res, data) => {
                if(err){
                    console.log(err);
                    return;
                }
                client.close();
                callback(JSON.parse(data));
            });
        }

    }

    /*
     * Utility function to create a document object for Bing API
     */
   CreateDocument = (text) => {
        let textObj = {};
        textObj.language = 'en';
        textObj.id = '1';
        textObj.text = text;

        let documentObj = {};
        documentObj.documents = [textObj];
        return JSON.stringify(documentObj);
    }

    /**
     * This function should be used to fetch account details, and problem associated with account.
     * function should take an account number a account pin.
     * for demo we will load data from JSON and ignore the PIN
     */

    Utils.pullAccountDetails =  (accountNo, accountPIn) => {
        console.log("Fetching details for account %s", accountNo);
        let user = null;
        accountData.accounts.forEach((account) => {
            if (Number(account.accountNumber) === accountNo) {
                user = account;
            }
        })
        console.log("Found user details %j", user);
        return user;
    }


   /**
    * Custom datetime entity parser using momentjs 
    *
    */

    Utils.dateTimeDateMoments = (datetimeDateEntities, type)=> {
        console.log("Inside custom parsing function");
        _(datetimeDateEntities).map((datetimeDateEntity) => {
            let entityType;
            if (type === 'builtin.datetime.time') {
                entityType = datetimeDateEntity.resolution.time;
                if(entityType==='TMO'){
                    entityType = 'XXXX-XX-XXTMO';
                }else
                if(entityType=="TAF"){
                    entityType = 'XXXX-XX-XXTAF';
                }else
                if(entityType=="TEV"){
                    entityType = 'XXXX-XX-XXTEV';
                }
            } else {
                entityType = datetimeDateEntity.resolution.date;
            }
            console.log("Parsing following entity");
            console.log(entityType);
            entityType = moment.utc(entityType.replace("XXXX", moment().year())
                .replace("WXX-XX", 'W' + moment().week() + '-' + moment().day())
                .replace("WXX", 'W' + moment().week())
                .replace("XX", moment().month() < 9 ? "0" + moment().add(1, 'months').month() : moment().add(1, 'months').month())
                .replace("XX", moment().day()<9?"0" + moment().add(1, 'days').day() : moment().add(1, 'days').day())
                .replace('TMO', "T08:00:00")
                .replace('TAF', "T12:00:00")
                .replace('TEV', "T15:00:00"), moment.ISO_8601, true).format();
            if (type === 'builtin.datetime.time') {
                datetimeDateEntity.resolution.time = entityType;
            } else {
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

    Utils.getFreeslots = (scheduleDay, startTime, endTime) => {
        let slots = {};
        console.log("StartTime " + startTime);
        accountData.appoitmentSlots.forEach((slot) => {
            if (slot.starttime >= startTime) {
                slot.date = scheduleDay;
                slots[slot.date + "-" + slot.starttime] = slot;
            }
        });
        console.log("Below are the slots I have identified for you");
        console.log(slots);
        return slots;
    }

    /**
     * Function to return the mood based on the sentiment score from Bing API;
     */
     FourEmotions=(score)=> {
        if(score>=0.92){
            return "Happy";
        }
        if(score>=0.6&&score<0.92){
            return "Practical";
        }
        if(score>=0.5&&score<0.6){
            return "Sad";
        }
        if(score<0.4){
            return "Sad";
        }
    }

    /**
     * Function will make a poitis call to get nextBestOffer to be displayed on chat.
     */
     Utils.getNextBestOffer = function (acccountNumber,topic,mood) {
        console.log("Sending data to Pontis:  topic:"+topic+" mood:"+mood);
        let options ={};
        options.url = config.pointisURL;
       // var host = "  ";
        //var port= "8080";
        //var endpoint = "/Pontis-WebDesktop/newxml";
        var method = "POST";
        var subscriberId = "";
        if (globalVar.getCustomer() === "101"){
            subscriberId = "188885";
        }
        else if (globalVar.getCustomer() === "102"){
            subscriberId = "188886";
        }
        else if (globalVar.getCustomer() === "103"){
            subscriberId = "188887";
        }
        else if (globalVar.getCustomer() === "104"){
            subscriberId = "188888";
        }
        else{
            subscriberId = "188889";
        }
        var sentiment = "";
        if (mood === "Sadness"){
            sentiment="Sad";
        }
        else if (mood === "Anger"){
            sentiment="Angry";
        }
        else if (mood === "Practical"){
            sentiment="Neutral";
        }
        else if (mood === "Happy"){
            sentiment="Happy";
        }
        else {
            sentiment="Neutral";
        }

        var data = '<PontisRequest username="user1" password="user1" service="GenEventProcessingService" operation="report" instance="ReportRequest">'+
            '<subscriberIdData instance="SubscriberId">'+
            '<subscriberId>'+subscriberId+'</subscriberId>'+
            '</subscriberIdData>'+
            '<eventData instance="SubscriberUpdateEvent">'+
            '<contactReason onchange="true" onselect="ContactReasons">'+topic+'</contactReason>'+
            '<customerSentiment onchange="true" onselect="CustomerSentiments">'+sentiment+'</customerSentiment>'+
            '<productInterest onchange="true" onselect="ProductInterestList">SIM ONLY</productInterest>'+
            '</eventData>'+
            '</PontisRequest>';
        
        performRequest(options, method, data,function (response){
            data = '<PontisRequest username="user1" password="user1" service="GenEventProcessingService" operation="report" instance="ReportRequest">'+
                '<subscriberIdData instance="SubscriberId">'+
                '<subscriberId>'+subscriberId+'</subscriberId>'+
                '</subscriberIdData>'+
                '<eventData instance="OODInboundGetMenuEvent">'+
                '<channelId onchange="true" onselect="RealTimeInboundChannels">OODInboundMessageOODChannelCP</channelId>'+
                '<isDefaultMenu onchange="true" onselect="Boolean">true</isDefaultMenu>'+
                '</eventData>'+
                '</PontisRequest>';

            performRequest(options, method, data,function (response){
                console.log("get response from Pontis: index"+index+" resultIndex:"+resultIndex+" topic:"+topic+" mood:"+mood);
                console.log(response);
                //addOffers(index,resultIndex,response);
            });
        });
    };


    return Utils;
})();
module.exports=Utils;