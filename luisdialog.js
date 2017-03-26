/*-----------------------------------------------------------------------------
Basic pattern for exposing a custom prompt. The create() function should be
called once at startup and then beginDialog() can be called everytime you
wish to invoke the prompt.
-----------------------------------------------------------------------------*/

var builder = require('botbuilder');
let modelUri = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/899a5581-0c98-4e96-a389-13a6080eabf8?subscription-key=9c2eaf8becea42ef9a98c0d7e22ffa65&verbose=true&q=';

exports.beginDialog = function (session, results) {
    session.beginDialog('promptLUIS', results || {});
}

exports.create = function (bot) {
    console.log(" Now I am in custom LUIS analyzer");
    console.log(results);
    if (results) {
        if (results.response) {
            // Call LUIS and resolve matched entities
            console.log("Now going to analyst the response text - %s", session.message.text);
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
                console.log(intents);
                console.log("------------------------------");
                console.info(entities);
                var from  = builder.EntityRecognizer.resolveTime(args.entities);
                if (from) {
                    // User said a valid date.
                    session.endDialog({ response: from });
                } else if (session.dialogData.maxRetries > 0) {
                    // Re-prompt
                    session.dialogData.maxRetries--;
                    builder.Prompts.text(session, "I'm sorry I didn't get that, please try again?");
                } else {
                    // Too many retries. We end the dialog with a reason of notCompleted.
                    session.endDialog({ resumed: builder.ResumeReason.notCompleted }); 
                }
            });
        } else {
            // User said 'nevermind' or something
            session.endDialog(results);
        }
    } else {
        // First call to prompt
        session.dialogData.maxRetries = 2;
        builder.Prompts.text(session, "When you want appoitment?");
    }
}