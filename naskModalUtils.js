var naskModalUtils = Class.create();
naskModalUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    execSkill: function() {
        var naskRequest = JSON.parse(this.getParameter('naskRequest'));

        var response = {
            output: ""
        };

        try {
            response.output = JSON.parse(sn_one_extend.OneExtendUtil.execute(naskRequest).capabilities[naskRequest.executionRequests[0].capabilityId].response).model_output;
        } catch (e) {
            response.output = 'Something went wrong while executing skill.';
        }
        
        return JSON.stringify(response);
    },
    type: 'naskModalUtils'
});