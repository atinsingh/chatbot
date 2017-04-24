const config = require("./appConfig.json");
const accountData = require('./data.json');
const moment = require("moment");
const _ = require("underscore");
const restify = require("restify");
const querystring = require("querystring");

var Utils;

Utils = (function () {
    function Utils() {
    };

    Utils.getIntentAndSentiment = function (query, callback) {
        var data = {};
        Utils.getLuisIntent(query, (response)=> {
            data.luis = response;
            Utils.getSentiment(query,(response)=>{
                data.bing = response;
                console.log("Got Sentiment and Intent");
                console.log(JSON.stringify(data));
                callback(data);
            });

        });

    }

    /*
     * Call MS LUIS to get the intent of the user.
     */
    Utils.getLuisIntent = function (question, callback) {
        var query = "?subscription-key=" + config.luisSubcriptionKey + "&verbose=true&q=" + querystring.escape(question);
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

    Utils.getSentiment = function (text, callback) {
        let options = {};
        options.contentType ="application/json";
        options.headers = {
            'Content-Type': "application/json",
             'Accept': "application/json",
            'Ocp-Apim-Subscription-Key':config.sentiMentSubscriptionKey
        }
        options.url = config.sentiMentURL;
        //options.path = "sentiment"
        let docObject = this.createDocument(text);
        perFormRequest(options, "POST", docObject, callback);

    }

    /*
     * Go get post
     *
     */

    function perFormRequest(options, method, request, callback) {
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
                console.log('%d -> %j', res.statusCode, res.headers);
                console.log('%s', data);
                client.close();
                console.log("BING RESPONSE");
                callback(JSON.parse(data));
            });
        }

    }

    /*
     * Utility function for Bing API
     */
    Utils.createDocument = function (text) {
        let textObj = {};
        textObj.language = 'en';
        textObj.id = '1';
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

    Utils.pullAccountDetails = function (accountNo, accountPIn) {
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


    /*
     *
     * Use custom entity recogniser if inbuilt fails
     *
     *
     */

    Utils.dateTimeDateMoments = function (datetimeDateEntities, type) {
        console.log("Inside custom parsing function");
        _(datetimeDateEntities).map((datetimeDateEntity) => {
            let entityType;
            if (type === 'builtin.datetime.time') {
                entityType = datetimeDateEntity.resolution.time;
                if(entityType==='TMO'){
                    entityType = 'XXXX-XX-XXTMO';
                }else if(entityType=="TAF"){
                    entityType = 'XXXX-XX-XXTAF';
                }else{
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

    Utils.getFreeslots = function (scheduleDay, startTime, endTime) {
        let slots = {};
        console.log("StartTime " + startTime);
        accountData.appoitmentSlots.forEach((slot) => {
            if (slot.starttime >= startTime) {
                slot.date = scheduleDay;
                slots[slot.date + "-" + slot.starttime] = slot;
            }
        });
        console.log("Below are the slots I have identified");
        console.log(slots);
        return slots;
    }

    function FourEmotions(score) {
        if(score>=0.8){
            return "Happy";
        }
        if(score>=0.6&&score<0.8){
            return "Practical";
        }
        if(score>=0.5&&score<0.6){
            return "Sad";
        }
        if(score<0.4){
            return "Sad";
        }
    }

    //
    getNextBestAction = function (index,resultIndex,topic,mood) {
        console.log("Sending data to Pontis: index"+index+" resultIndex:"+resultIndex+" topic:"+topic+" mood:"+mood);
        var host = "52.58.126.193";
        var port= "8080";
        var endpoint = "/Pontis-WebDesktop/newxml";
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

        performRequest(host,port,endpoint, method, data,function (response){
            data = '<PontisRequest username="user1" password="user1" service="GenEventProcessingService" operation="report" instance="ReportRequest">'+
                '<subscriberIdData instance="SubscriberId">'+
                '<subscriberId>'+subscriberId+'</subscriberId>'+
                '</subscriberIdData>'+
                '<eventData instance="OODInboundGetMenuEvent">'+
                '<channelId onchange="true" onselect="RealTimeInboundChannels">OODInboundMessageOODChannelCP</channelId>'+
                '<isDefaultMenu onchange="true" onselect="Boolean">true</isDefaultMenu>'+
                '</eventData>'+
                '</PontisRequest>';

            performRequest(host,port,endpoint, method, data,function (response){
                console.log("get response from Pontis: index"+index+" resultIndex:"+resultIndex+" topic:"+topic+" mood:"+mood);
                console.log(response);
                addOffers(index,resultIndex,response);
            });
        });
    };


    return Utils;
})();
module.exports=Utils;