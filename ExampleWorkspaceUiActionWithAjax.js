function onClick(g_form) {
    g_modal.showFrame({
        url: "https://<YOUR_INSTANCE>.service-now.com/genai.gif",
        title: "Now Assist Skill Output",
        size: "sm",
    });

    var inputsPayload = {};
    inputsPayload['incident'] = {
        tableName: 'incident',
        sysId: g_form.getUniqueValue(),
        queryString: ''
    };

    var capabilityId = '8080d1dc2b4c2e1053a3f76dce91bf87';
    var request = {
        executionRequests: [{
            payload: inputsPayload,
            capabilityId: capabilityId,
            meta: {
                skillConfigId: '588099d02b8c2e1053a3f76dce91bf03'
            }
        }],
        mode: 'sync'
    };

    var ga = new GlideAjax("global.naskModalUtils");
    ga.addParam("sysparm_name", "execSkill");
    ga.addParam("naskRequest", JSON.stringify(request));
    var naskOutput = "";

    ga.getXMLAnswer(function(nowAssistResponse) {
        naskOutput = JSON.parse(nowAssistResponse).output;
        
        // This returns a Promise, so you can chain .then() to it
        g_modal.showFields({
            title: "Now Assist Skill Output",
            instruction: "NOTE: Please verify Now Assist Skill Output content before using it.",
            size: "lg",
            fields: [{
                type: "textarea",
                name: "nowAssistSkillOutput",
                label: getMessage("You can modify the text between " + '---' + " and " + "--- if an escalation can be recommended for your case"),
                mandatory: true,
                value: naskOutput
            }]
        }).then(function(fieldValues) {
            // var indexOfFirst = fieldValues.updatedFields[0].value.indexOf('---');
            // var indexOfLast = fieldValues.updatedFields[0].value.lastIndexOf('---');
            // var jsonStr = fieldValues.updatedFields[0].value.substring(indexOfFirst + 1, indexOfLast);
            g_form.setValue("work_notes", fieldValues.updatedFields[0].value);
			g_form.save();
        });
    });
}