
let modelUri = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/899a5581-0c98-4e96-a389-13a6080eabf8?subscription-key=9c2eaf8becea42ef9a98c0d7e22ffa65&verbose=true&q=';
bot.add('/fromPrompt', function (session, results) {
    if (results) {
        if (results.response) {
            // Call LUIS and resolve matched entities
            builder.LuisDialog.recognize(session.message.text, modelUri, function (err, intents, entities) {
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
});
