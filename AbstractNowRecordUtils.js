/**
 * Utility class providing abstract functions for ServiceNow record operations.
 * This script include offers reusable functions for retrieving complete record data
 * across any table in ServiceNow.
 * 
 * All methods support both sys_id and record number (e.g., INC0010001) as identifiers,
 * making it more flexible for different use cases.
 */
var AbstractNowRecordUtils = Class.create();
AbstractNowRecordUtils.prototype = {
    initialize: function() {
        this.logSource = 'AbstractNowRecordUtils';
    },

    /**
     * Retrieves all field values for a specific record identified by record identifier and table name.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} recordIdentifier - The sys_id or record number (e.g., INC0010001) of the record to retrieve.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object} - An object containing field values for the specified record.
     *                    Returns null if the record is not found or input is invalid.
     */
    getRecordAllFields: function(tableName, recordIdentifier, excludeEmpty) {
        // Input validation
        if (!this._validateInput(tableName, recordIdentifier)) {
            return null;
        }

        try {
            var gr = new GlideRecord(tableName);
            
            // Validate table exists and is accessible
            if (!gr.isValid()) {
                gs.warn(this.logSource + '.getRecordAllFields: Table "' + tableName + '" is not valid or accessible.');
                return null;
            }

            // Get the record using either sys_id or record number
            var recordFound = this._getRecord(gr, recordIdentifier);
            
            if (!recordFound) {
                gs.info(this.logSource + '.getRecordAllFields: Record with identifier ' + recordIdentifier + ' not found in table ' + tableName);
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
     * @param {string} recordIdentifier - The sys_id or record number of the record to retrieve.
     * @returns {object} - An object containing only populated field values for the specified record.
     *                   Returns null if the record is not found or input is invalid.
     */
    getPopulatedFields: function(tableName, recordIdentifier) {
        return this.getRecordAllFields(tableName, recordIdentifier, true);
    },

    /**
     * Finds all records in a specified table that reference a given record in another table.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetRecordIdentifier - The sys_id or record number of the target record being referenced.
     * @param {string} [targetTableName] - The table name of the target record (required when using record number).
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object[]} - An array of objects, each containing field values for each related record.
     *                      Returns an empty array if no records are found or input is invalid.
     */
    findRelatedRecords: function(tableName, referenceFieldName, targetRecordIdentifier, targetTableName, excludeEmpty) {
        var results = [];
        
        // Handle optional parameters
        if (typeof targetTableName === 'boolean') {
            excludeEmpty = targetTableName;
            targetTableName = null;
        }

        // Input validation
        if (!this._validateInput(tableName, targetRecordIdentifier) || !referenceFieldName) {
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

            // If we have a record number instead of sys_id, we need to resolve it first
            var targetSysId = targetRecordIdentifier;
            if (targetRecordIdentifier.length !== 32 && targetTableName) {
                var targetGr = new GlideRecord(targetTableName);
                if (targetGr.isValid() && targetGr.get('number', targetRecordIdentifier)) {
                    targetSysId = targetGr.getUniqueValue();
                } else {
                    gs.warn(this.logSource + '.findRelatedRecords: Could not resolve record number ' + 
                          targetRecordIdentifier + ' in table ' + targetTableName);
                    return results;
                }
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
     * @param {string} targetRecordIdentifier - The sys_id or record number of the target record being referenced.
     * @param {string} [targetTableName] - The table name of the target record (required when using record number).
     * @returns {object[]} - An array of objects, each containing only populated field values.
     *                     Returns an empty array if no records are found or input is invalid.
     */
    findPopulatedRelatedRecords: function(tableName, referenceFieldName, targetRecordIdentifier, targetTableName) {
        return this.findRelatedRecords(tableName, referenceFieldName, targetRecordIdentifier, targetTableName, true);
    },

    /**
     * Returns a JSON string representation of all fields for a specific record.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} recordIdentifier - The sys_id or record number of the record to retrieve.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {string} - A JSON string containing field values for the specified record.
     *                    Returns '{}' if the record is not found or input is invalid.
     */
    getRecordAllFieldsAsJSON: function(tableName, recordIdentifier, excludeEmpty) {
        var recordData = this.getRecordAllFields(tableName, recordIdentifier, excludeEmpty);
        
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
     * @param {string} recordIdentifier - The sys_id or record number of the record to retrieve.
     * @returns {string} - A JSON string containing only populated field values for the specified record.
     *                   Returns '{}' if the record is not found or input is invalid.
     */
    getPopulatedFieldsAsJSON: function(tableName, recordIdentifier) {
        return this.getRecordAllFieldsAsJSON(tableName, recordIdentifier, true);
    },

    /**
     * Returns a JSON string representation of all related records.
     *
     * @param {string} tableName - The table to search for related records.
     * @param {string} referenceFieldName - The field containing the reference to the target record.
     * @param {string} targetRecordIdentifier - The sys_id or record number of the target record being referenced.
     * @param {string|boolean} [targetTableName] - The table name of the target record (required when using record number),
     *                                           or boolean for excludeEmpty if targetTableName is not needed.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {string} - A JSON string containing an array of objects with field values for each related record.
     *                    Returns '[]' if no records are found or input is invalid.
     */
    findRelatedRecordsAsJSON: function(tableName, referenceFieldName, targetRecordIdentifier, targetTableName, excludeEmpty) {
        var results = this.findRelatedRecords(tableName, referenceFieldName, targetRecordIdentifier, targetTableName, excludeEmpty);
        
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
     * @param {string} targetRecordIdentifier - The sys_id or record number of the target record being referenced.
     * @param {string} [targetTableName] - The table name of the target record (required when using record number).
     * @returns {string} - A JSON string containing an array of objects with only populated field values.
     *                   Returns '[]' if no records are found or input is invalid.
     */
    findPopulatedRelatedRecordsAsJSON: function(tableName, referenceFieldName, targetRecordIdentifier, targetTableName) {
        return this.findRelatedRecordsAsJSON(tableName, referenceFieldName, targetRecordIdentifier, targetTableName, true);
    },

    /**
     * Finds all interaction records for a specified user.
     *
     * @param {string} userIdentifier - The sys_id or user_name of the user to find interactions for.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {object[]} - An array of objects, each containing field values for each interaction.
     *                      Returns an empty array if no records are found or input is invalid.
     */
    findUserInteractions: function(userIdentifier, excludeEmpty) {
        // This is a specific implementation of findRelatedRecords for interactions
        return this.findRelatedRecords('interaction', 'opened_for', userIdentifier, 'sys_user', excludeEmpty);
    },

    /**
     * Finds all interaction records for a specified user with only populated fields.
     * This is a convenience method that calls findUserInteractions with excludeEmpty set to true.
     *
     * @param {string} userIdentifier - The sys_id or user_name of the user to find interactions for.
     * @returns {object[]} - An array of objects, each containing only populated field values.
     *                     Returns an empty array if no records are found or input is invalid.
     */
    findPopulatedUserInteractions: function(userIdentifier) {
        return this.findUserInteractions(userIdentifier, true);
    },

    /**
     * Returns a JSON string representation of all interactions for a specified user.
     *
     * @param {string} userIdentifier - The sys_id or user_name of the user to find interactions for.
     * @param {boolean} [excludeEmpty=false] - If true, excludes fields with empty/null values.
     * @returns {string} - A JSON string containing an array of objects with field values for each interaction.
     *                    Returns '[]' if no records are found or input is invalid.
     */
    findUserInteractionsAsJSON: function(userIdentifier, excludeEmpty) {
        var results = this.findUserInteractions(userIdentifier, excludeEmpty);
        
        try {
            return JSON.stringify(results);
        } catch (e) {
            gs.error(this.logSource + '.findUserInteractionsAsJSON: Failed to stringify results: ' + e.message);
            return '[]';
        }
    },

    /**
     * Returns a JSON string representation of all interactions for a specified user with only populated fields.
     * This is a convenience method that calls findUserInteractionsAsJSON with excludeEmpty set to true.
     *
     * @param {string} userIdentifier - The sys_id or user_name of the user to find interactions for.
     * @returns {string} - A JSON string containing an array of objects with only populated field values.
     *                   Returns '[]' if no records are found or input is invalid.
     */
    findPopulatedUserInteractionsAsJSON: function(userIdentifier) {
        return this.findUserInteractionsAsJSON(userIdentifier, true);
    },

    /**
     * Retrieves the short description for a specific record.
     *
     * @param {string} tableName - The name of the table containing the record.
     * @param {string} recordIdentifier - The sys_id or record number of the record to retrieve.
     * @returns {string} - The short description of the record.
     *                    Returns null if the record is not found, input is invalid, or short_description field doesn't exist.
     */
    getShortDescription: function(tableName, recordIdentifier) {
        // Input validation
        if (!this._validateInput(tableName, recordIdentifier)) {
            return null;
        }

        try {
            var gr = new GlideRecord(tableName);
            
            // Validate table exists and is accessible
            if (!gr.isValid()) {
                gs.warn(this.logSource + '.getShortDescription: Table "' + tableName + '" is not valid or accessible.');
                return null;
            }

            // Validate short_description field exists on the table
            if (!gr.isValidField('short_description')) {
                gs.warn(this.logSource + '.getShortDescription: Field "short_description" does not exist on table "' + tableName + '".');
                return null;
            }

            // Get the record using either sys_id or record number
            var recordFound = this._getRecord(gr, recordIdentifier);
            
            if (!recordFound) {
                gs.info(this.logSource + '.getShortDescription: Record with identifier ' + recordIdentifier + ' not found in table ' + tableName);
                return null;
            }

            // Return the short description
            return gr.getValue('short_description');
        } catch (e) {
            gs.error(this.logSource + '.getShortDescription: Error retrieving short description: ' + e.message);
            return null;
        }
    },

    /**
     * Private method to validate common input parameters.
     *
     * @param {string} tableName - The name of a table.
     * @param {string} recordIdentifier - A sys_id or record number value.
     * @returns {boolean} - True if inputs are valid, false otherwise.
     */
    _validateInput: function(tableName, recordIdentifier) {
        if (!tableName || typeof tableName !== 'string') {
            gs.warn(this.logSource + ': Invalid or missing tableName provided.');
            return false;
        }

        if (!recordIdentifier || typeof recordIdentifier !== 'string') {
            gs.warn(this.logSource + ': Invalid or missing record identifier provided.');
            return false;
        }

        return true;
    },
    
    /**
     * Private method to get a record using either sys_id or record number.
     *
     * @param {GlideRecord} gr - A GlideRecord object for the table.
     * @param {string} recordIdentifier - The sys_id or record number of the record.
     * @returns {boolean} - True if record was found, false otherwise.
     */
    _getRecord: function(gr, recordIdentifier) {
        // If it's a sys_id (32 character string)
        if (recordIdentifier.length === 32) {
            return gr.get(recordIdentifier);
        } 
        // Otherwise, assume it's a record number
        else {
            return gr.get('number', recordIdentifier);
        }
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
