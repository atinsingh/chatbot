"use strict";

/**
 * Utils contains the functions require by chat bot. 
 * LUIS can BING and POINTIS calls are part of this file.
 */

var config = require("./config/appConfig.json");
var accountData = require('./data/data.json');
var moment = require("moment");
var _ = require("lodash");
var restify = require("restify");
var querystring = require("querystring");
var LOG = require("./log");

var Utils;

var utils = 'not good'

Utils = function () {
    function Utils() {};

    /**
     * Function to get intent and sentiment for the query
     * @query is the text from user
     * @callback is the function getIntentAndSentiment will call when data from api  is available
     */
    // Utils.getIntentAndSentiment = (query, callback) => {
    //     var data = {};
    //     Utils.getLuisIntent(query, (response)=> {
    //         data.luis = response;
    //         data.intent = response.topScoringIntent.intent;
    //         Utils.getSentiment(query,(response)=>{
    //             data.sentiment = response.sentiment;
    //             data.sentimentScore = response.score;
    //             LOG.debug("Sentiment and Intent",JSON.stringify(data));
    //             callback(data);

    //         });

    //     });

    // }

    /*
     * Call MS LUIS to get the intent of the user.
     * @query - string should use LUIS subcription Key and unescapped query string
     * @callback function will be called when data set is avilable
     * 
     */
    // Utils.getLuisIntent =  (question, callback) => {
    //     var query = "?subscription-key=" + config.luisSubcriptionKey + "&verbose=true&spellCheck=true&q=" + querystring.escape(question);
    //     var options = {};
    //     options.url = config.luisURL;
    //     options.contentType ="application/json";
    //     options.type = options.type || "json";
    //     options.path = config.luisPath + query;
    //     options.headers = {
    //         Accept: "application/json"
    //     };
    //     perFormRequest(options, "GET", query, callback);
    // }

    /**
     * Function will call Microsoft Bing Text Analytics API to get the sentiment score
     * @text - is the text that will be pass as document to this post method.
     * @callback will be called when data set is available'
     */
    Utils.getSentiment = function (text, callback) {
        LOG.info("Calling Bing for Sentiment - text " + text);
        var options = {};
        options.contentType = "application/json";
        options.headers = {
            'Content-Type': "application/json",
            'Accept': "application/json",
            'Ocp-Apim-Subscription-Key': config.sentiMentSubscriptionKey
        };
        options.url = config.sentiMentURL;
        //options.path = "sentiment"
        // createDocument will create document object from the text string being passed.
        var docObject = CreateDocument(text);
        var sentiment = {};
        perFormRequest(options, "POST", docObject, function (response) {
            LOG.debug("Sentiment from Bing -", sentiment);
            sentiment.sentiment = FourEmotions(response.documents[0].score);
            sentiment.score = response.documents[0].score;
            callback(sentiment);
        });
    };

    /**
     * perFormRequest will do a HTTP GET/POST call method on the method provided 
     * method will create a new Restify client based on the option passeed, option should have a hostname 
     * 
     */

     function perFormRequest(options, method, request, callback) {
        //console.log(options);
        var client = restify.createStringClient(options);
        if (method === 'GET') {
            console.log("Going to make call to LUIS now");
            client.get(options, function (err, req, res, data) {
                if (err) {
                    console.log(err);
                    return;
                }
                //console.log(data);
                client.close();

                callback(JSON.parse(data));
            });
        } else {
            client.post(options, request, function (err, req, res, data) {
                if (err) {
                    console.log(err);
                    return;
                }
                client.close();
                callback(JSON.parse(data));
            });
        }
    };

    /*
     * Utility function to create a document object for Bing API
     * Since I am always going to use single document so keeping ID - 1 always.
     */
    function CreateDocument(text) {
        var textObj = {};
        textObj.language = 'en';
        textObj.id = '1';
        textObj.text = text;

        var documentObj = {};
        documentObj.documents = [textObj];
        return JSON.stringify(documentObj);
    };

    /**
     * This function should be used to fetch account details, and problem associated with account.
     * function should take an account number a account pin.
     * for demo we will load data from JSON and ignore the PIN
     */

    Utils.pullAccountDetails = function (accountNo, accountPIn) {
        console.log("Fetching details for account %s", accountNo);
        var user = null;
        accountData.accounts.forEach(function (account) {
            if (Number(account.accountNumber) === accountNo) {
                user = account;
            }
        });
        LOG.debug("Found user details :", user);
        return user;
    };

    /**
     * Custom datetime entity parser using momentjs 
     *
     */

    Utils.dateTimeDateMoments = function (datetimeDateEntities, type) {
        LOG.info("Inside custom parsing function");
        _.mapValues(datetimeDateEntities, function (datetimeDateEntity) {
            var entityType = void 0;
            if (type === 'builtin.datetime.time') {
                entityType = datetimeDateEntity.resolution.time;
                if (entityType === 'TMO') {
                    entityType = 'XXXX-XX-XXTMO';
                } else if (entityType == "TAF") {
                    entityType = 'XXXX-XX-XXTAF';
                } else if (entityType == "TEV") {
                    entityType = 'XXXX-XX-XXTEV';
                }
            } else {
                entityType = datetimeDateEntity.resolution.date;
            }
            LOG.debug("Parsing following entity", entityType);
            entityType = moment.utc(entityType.replace("XXXX", moment().year()).replace("WXX-XX", 'W' + moment().week() + '-' + moment().day()).replace("WXX", 'W' + moment().week()).replace("XX", moment().month() < 9 ? "0" + moment().add(1, 'months').month() : moment().add(1, 'months').month()).replace("XX", moment().day() < 9 ? "0" + moment().add(1, 'days').day() : moment().add(1, 'days').day()).replace('TMO', "T08:00:00").replace('TAF', "T12:00:00").replace('TEV', "T15:00:00"), moment.ISO_8601, true).format();
            if (type === 'builtin.datetime.time') {
                datetimeDateEntity.resolution.time = entityType;
            } else {
                datetimeDateEntity.resolution.date = entityType;
            }
        });
        console.log(datetimeDateEntities);
    };

    /*
     * Temorary function to pull the available slots,
     * this would be replaced with the actual API call in the future. API might need few params
     * like Address or ZIP code of the customer and line of business
     */

    Utils.getFreeslots = function (scheduleDay, startTime, endTime) {
        //for demo discard the date;
        scheduleDay = moment.utc(scheduleDay).format('YYYY-MM-DD');
        startTime = startTime || "0800"; // in case I am not getting any startTime, I will start with first slot
        var slots = {};
        LOG.debug("StartTime ", startTime);
        LOG.debug("Date ", scheduleDay);
        LOG.error("StartTime converted one ", moment.utc(startTime).format("HH:mm A"));

        accountData.appoitmentSlots.forEach(function (slot) {
            LOG.error("Coming from DB ", moment(slot.starttime, "hhmm").format("HHmm"));
            if (moment(slot.starttime, "hhmm").format("HH:mm") > moment.utc(startTime).format("HHmm")) {
                slot.date = scheduleDay;
                LOG.debug(slot.date + "T" + moment(slot.starttime, "hhmm").format("HH:mm"));
                slots[moment(slot.date + "T" + moment(slot.starttime, "hhmm").format("HH:mm")).format('YYYY-MM-DD HH:mm A')] = slot;
            }
        });
        LOG.debug("Below are the slots I have identified for you", JSON.stringify(slots));
        return slots;
    };

    /**
     * Function to return the mood based on the sentiment score from Bing API;
     */
   function FourEmotions(score) {
        if (score >= 0.92) {
            return "Happy";
        }
        if (score >= 0.6 && score < 0.92) {
            return "Practical";
        }
        if (score >= 0.5 && score < 0.6) {
            return "Sad";
        }
        if (score < 0.4) {
            return "Anger";
        }
    };

    /**
     * Function will make a poitis call to get nextBestOffer to be displayed on chat.
     */
    Utils.getNextBestOffer = function (acccountNumber, topic, mood) {
        LOG.info("Sending data to Pontis:  topic:" + topic + " mood:" + mood);
        var options = {};
        options.url = config.pointisURL;
        // var host = "  ";
        //var port= "8080";
        //var endpoint = "/Pontis-WebDesktop/newxml";

        var method = "POST";
        var account = Utils.pullAccountDetails(Number(acccountNumber), "1234");
        var subscriberId = account.subscriberId;

        // if (globalVar.getCustomer() === "101"){
        //     subscriberId = "188885";
        // }
        // else if (globalVar.getCustomer() === "102"){
        //     subscriberId = "188886";
        // }
        // else if (globalVar.getCustomer() === "103"){
        //     subscriberId = "188887";
        // }
        // else if (globalVar.getCustomer() === "104"){
        //     subscriberId = "188888";
        // }
        // else{
        //     subscriberId = "188889";
        // }
        var sentiment = "";
        if (mood === "Sadness") {
            sentiment = "Sad";
        } else if (mood === "Anger") {
            sentiment = "Angry";
        } else if (mood === "Practical") {
            sentiment = "Neutral";
        } else if (mood === "Happy") {
            sentiment = "Happy";
        } else {
            sentiment = "Neutral";
        }

        /**
         * Temp code should be removed after pointis is working
         */

        var offer = _.filter(accountData.pointisOffers, function (offer) {
            //LOG.info("Before IF" ,JSON.stringify(offer));
            return offer.mood === sentiment;
        });
        return offer;

        // Enable will code for pointis call
        // var data = '<PontisRequest username="user1" password="user1" service="GenEventProcessingService" operation="report" instance="ReportRequest">'+
        //     '<subscriberIdData instance="SubscriberId">'+
        //     '<subscriberId>'+subscriberId+'</subscriberId>'+
        //     '</subscriberIdData>'+
        //     '<eventData instance="SubscriberUpdateEvent">'+
        //     '<contactReason onchange="true" onselect="ContactReasons">'+topic+'</contactReason>'+
        //     '<customerSentiment onchange="true" onselect="CustomerSentiments">'+sentiment+'</customerSentiment>'+
        //     '<productInterest onchange="true" onselect="ProductInterestList">SIM ONLY</productInterest>'+
        //     '</eventData>'+
        //     '</PontisRequest>';
        //
        // performRequest(options, method, data,function (response){
        //     data = '<PontisRequest username="user1" password="user1" service="GenEventProcessingService" operation="report" instance="ReportRequest">'+
        //         '<subscriberIdData instance="SubscriberId">'+
        //         '<subscriberId>'+subscriberId+'</subscriberId>'+
        //         '</subscriberIdData>'+
        //         '<eventData instance="OODInboundGetMenuEvent">'+
        //         '<channelId onchange="true" onselect="RealTimeInboundChannels">OODInboundMessageOODChannelCP</channelId>'+
        //         '<isDefaultMenu onchange="true" onselect="Boolean">true</isDefaultMenu>'+
        //         '</eventData>'+
        //         '</PontisRequest>';
        //
        //     performRequest(options, method, data,function (response){
        //         console.log("get response from Pontis: index"+index+" resultIndex:"+resultIndex+" topic:"+topic+" mood:"+mood);
        //         console.log(response);
        //
        //     });
        // });
    };

    return Utils;
}();
module.exports = Utils;
