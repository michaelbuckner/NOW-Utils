/**
 * Utility class providing abstract functions for ServiceNow record operations.
 * This script include offers reusable functions for retrieving complete record data
 * across any table in ServiceNow.
 */
var AbstractNowRecordUtils = Class.create();
AbstractNowRecordUtils.prototype = {
    initialize: function() {
        this.logSource = 'AbstractNowRecordUtils';
    },

    /**
     * Retrieves all field values for a specific record identified by sys_id and table name.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} sysId - The sys_id of the record to retrieve.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object} - An object containing field values for the specified record.
     *                    Returns null if the record is not found or input is invalid.
     */
    getRecordAllFields: function(tableName, sysId, excludeEmpty) {
        // Input validation
        if (!this._validateInput(tableName, sysId)) {
            return null;
        }

        try {
            var gr = new GlideRecord(tableName);
            
            // Validate table exists and is accessible
            if (!gr.isValid()) {
                gs.warn(this.logSource + '.getRecordAllFields: Table "' + tableName + '" is not valid or accessible.');
                return null;
            }

            // Get the record
            if (!gr.get(sysId)) {
                gs.info(this.logSource + '.getRecordAllFields: Record with sys_id ' + sysId + ' not found in table ' + tableName);
                return null;
            }

            // Record found, collect field values
            return this._collectRecordData(gr, excludeEmpty);
        } catch (e) {
            gs.error(this.logSource + '.getRecordAllFields: Error retrieving record: ' + e.message);
            return null;
        }
    },

    /**
     * Retrieves only populated field values for a specific record.
     * This is a convenience method that calls getRecordAllFields with excludeEmpty set to true.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} sysId - The sys_id of the record to retrieve.
     * @returns {object} - An object containing only populated field values for the specified record.
     *                   Returns null if the record is not found or input is invalid.
     */
    getPopulatedFields: function(tableName, sysId) {
        return this.getRecordAllFields(tableName, sysId, true);
    },

    /**
     * Finds all records in a specified table that reference a given record in another table.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetSysId - The sys_id of the target record being referenced.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object[]} - An array of objects, each containing field values for each related record.
     *                      Returns an empty array if no records are found or input is invalid.
     */
    findRelatedRecords: function(tableName, referenceFieldName, targetSysId, excludeEmpty) {
        var results = [];

        // Input validation
        if (!this._validateInput(tableName, targetSysId) || !referenceFieldName) {
            return results;
        }

        try {
            var gr = new GlideRecord(tableName);
            
            // Validate table exists and is accessible
            if (!gr.isValid()) {
                gs.warn(this.logSource + '.findRelatedRecords: Table "' + tableName + '" is not valid or accessible.');
                return results;
            }

            // Validate reference field exists on the table
            if (!gr.isValidField(referenceFieldName)) {
                gs.warn(this.logSource + '.findRelatedRecords: Field "' + referenceFieldName + 
                      '" does not exist on table "' + tableName + '".');
                return results;
            }

            // Query for related records
            gr.addQuery(referenceFieldName, targetSysId);
            gr.query();

            gs.debug(this.logSource + '.findRelatedRecords: Querying table ' + tableName + 
                   ' for records where ' + referenceFieldName + ' = ' + targetSysId + 
                   '. Found ' + gr.getRowCount() + ' records.');

            // Collect data for each related record
            while (gr.next()) {
                var recordData = this._collectRecordData(gr, excludeEmpty);
                results.push(recordData);
            }

            return results;
        } catch (e) {
            gs.error(this.logSource + '.findRelatedRecords: Error querying table: ' + e.message);
            return results;
        }
    },

    /**
     * Finds only populated field values in records that reference a given record.
     * This is a convenience method that calls findRelatedRecords with excludeEmpty set to true.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetSysId - The sys_id of the target record being referenced.
     * @returns {object[]} - An array of objects, each containing only populated field values.
     *                     Returns an empty array if no records are found or input is invalid.
     */
    findPopulatedRelatedRecords: function(tableName, referenceFieldName, targetSysId) {
        return this.findRelatedRecords(tableName, referenceFieldName, targetSysId, true);
    },

    /**
     * Returns a JSON string representation of all fields for a specific record.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} sysId - The sys_id of the record to retrieve.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {string} - A JSON string containing field values for the specified record.
     *                    Returns '{}' if the record is not found or input is invalid.
     */
    getRecordAllFieldsAsJSON: function(tableName, sysId, excludeEmpty) {
        var recordData = this.getRecordAllFields(tableName, sysId, excludeEmpty);
        
        if (!recordData) {
            return '{}';
        }
        
        try {
            return JSON.stringify(recordData);
        } catch (e) {
            gs.error(this.logSource + '.getRecordAllFieldsAsJSON: Failed to stringify object: ' + e.message);
            return '{"error": "Failed to generate JSON output."}';
        }
    },
    
    /**
     * Returns a JSON string representation of only populated fields for a specific record.
     * This is a convenience method that calls getRecordAllFieldsAsJSON with excludeEmpty set to true.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} sysId - The sys_id of the record to retrieve.
     * @returns {string} - A JSON string containing only populated field values for the specified record.
     *                   Returns '{}' if the record is not found or input is invalid.
     */
    getPopulatedFieldsAsJSON: function(tableName, sysId) {
        return this.getRecordAllFieldsAsJSON(tableName, sysId, true);
    },

    /**
     * Returns a JSON string representation of all related records.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetSysId - The sys_id of the target record being referenced.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {string} - A JSON string containing an array of objects with field values for each related record.
     *                    Returns '[]' if no records are found or input is invalid.
     */
    findRelatedRecordsAsJSON: function(tableName, referenceFieldName, targetSysId, excludeEmpty) {
        var results = this.findRelatedRecords(tableName, referenceFieldName, targetSysId, excludeEmpty);
        
        try {
            return JSON.stringify(results);
        } catch (e) {
            gs.error(this.logSource + '.findRelatedRecordsAsJSON: Failed to stringify results: ' + e.message);
            return '[]';
        }
    },
    
    /**
     * Returns a JSON string of related records with only populated fields.
     * This is a convenience method that calls findRelatedRecordsAsJSON with excludeEmpty set to true.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetSysId - The sys_id of the target record being referenced.
     * @returns {string} - A JSON string containing an array of objects with only populated field values.
     *                   Returns '[]' if no records are found or input is invalid.
     */
    findPopulatedRelatedRecordsAsJSON: function(tableName, referenceFieldName, targetSysId) {
        return this.findRelatedRecordsAsJSON(tableName, referenceFieldName, targetSysId, true);
    },

    /**
     * Private method to validate common input parameters.
     *
     * @param {string} tableName - The name of a table.
     * @param {string} sysId - A sys_id value.
     * @returns {boolean} - True if inputs are valid, false otherwise.
     */
    _validateInput: function(tableName, sysId) {
        if (!tableName || typeof tableName !== 'string') {
            gs.warn(this.logSource + ': Invalid or missing tableName provided.');
            return false;
        }

        if (!sysId || typeof sysId !== 'string' || sysId.length !== 32) {
            gs.warn(this.logSource + ': Invalid or missing sysId provided.');
            return false;
        }

        return true;
    },

    /**
     * Private method to collect all field data from a GlideRecord.
     *
     * @param {GlideRecord} gr - A GlideRecord object positioned to a valid record.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object} - An object containing field values from the record.
     */
    _collectRecordData: function(gr, excludeEmpty) {
        var recordData = {
            sys_id: gr.getUniqueValue(),
            display_value: gr.getDisplayValue()
        };

        // Get all fields for this record
        var tableFields = gr.getFields();
        
        // Add field values to the result object
        for (var j = 0; j < tableFields.size(); j++) {
            var glideElement = tableFields.get(j);
            var fieldName = glideElement.getName();
            
            // Skip sys_id as we already added it
            if (fieldName === 'sys_id') continue;
            
            // Get raw value to check if field is populated
            var value = gr.getValue(fieldName);
            
            // Skip empty fields if excludeEmpty is true
            if (excludeEmpty && (value === null || value === '')) {
                continue;
            }
            
            // Get both raw and display values for populated fields
            recordData[fieldName] = {
                value: value,
                display_value: gr.getDisplayValue(fieldName)
            };
        }

        return recordData;
    },

    type: 'AbstractNowRecordUtils'
};
