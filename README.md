# NOW Utils

A collection of utility scripts for ServiceNow, focusing on Now Assist (NASK) integration and modal interactions.

## Overview

This repository contains utility scripts that enhance ServiceNow functionality, particularly around Now Assist skills and modal dialogs. These utilities make it easier to execute Now Assist skills and display their results in user-friendly modals.

## Contents

- **naskModalUtils.js**: A server-side script that provides an API for executing Now Assist skills and returning their output.
- **ExampleWorkspaceUiActionWithAjax.js**: An example UI action that demonstrates how to use the naskModalUtils to execute a Now Assist skill and display the results in a modal dialog.
- **genai.gif**: A pretty placeholder for modals

## Usage

### genai.gif
Upload to System UI -> Images
Replace the instance name in the UI action with your instance name

### naskModalUtils

This utility provides a server-side API for executing Now Assist skills:

```javascript
var ga = new GlideAjax("global.naskModalUtils");
ga.addParam("sysparm_name", "execSkill");
ga.addParam("naskRequest", JSON.stringify(request));
ga.getXMLAnswer(function(response) {
    // Process the response
});
```

### ExampleWorkspaceUiActionWithAjax

This example shows how to:
1. Display a modal with a loading indicator
2. Execute a Now Assist skill using naskModalUtils
3. Display the skill output in a modal dialog
4. Allow users to modify the output
5. Save the output to a form field

## Installation

1. Import the scripts into your ServiceNow instance
2. Add the naskModalUtils script to a global script include
3. Create a UI action using the example script as a template

## Customization

You can customize these utilities by:
- Modifying the modal appearance and behavior
- Changing how the Now Assist skill output is processed
- Adjusting the form fields that are updated with the output

## Requirements

- ServiceNow instance with Now Assist capabilities
- Appropriate permissions to execute Now Assist skills

# AbstractNowRecordUtils

A utility script include for ServiceNow that provides methods to retrieve record data across any table in ServiceNow.

## Overview

`AbstractNowRecordUtils` makes it easy to:

- Retrieve a complete record with all fields and their values
- Find related records that reference a specific record
- Get only populated fields (filter out empty values)
- Convert record data to JSON for API responses or integration
- Use either sys_id or record number (e.g., INC0010001) as identifiers for all operations

## Installation

1. In ServiceNow, navigate to **System Definition > Script Includes**
2. Click **New**
3. Set the following fields:
   - **Name**: AbstractNowRecordUtils
   - **API Name**: global.AbstractNowRecordUtils
   - **Client callable**: False (or True if needed for UI scripts)
   - **Description**: Utility class providing abstract functions for ServiceNow record operations
4. Paste the script include code
5. Click **Submit**

## Basic Usage

### Initialize the utility

```javascript
var utils = new AbstractNowRecordUtils();
```

### Get all fields from a record

```javascript
// Get record data with all fields using sys_id
var recordData = utils.getRecordAllFields('incident', '31bea9d1d7233100f2d224837e610375');

// Or use record number instead
var recordData = utils.getRecordAllFields('incident', 'INC0010042');

// Access field values
var priority = recordData.priority.value;           // Raw value
var priorityDisplay = recordData.priority.display_value;  // Display value

// Get as JSON (works with either sys_id or record number)
var jsonData = utils.getRecordAllFieldsAsJSON('incident', 'INC0010042');
```

### Get only populated fields (filter out empty values)

```javascript
// Get only populated fields (works with either sys_id or record number)
var populatedFields = utils.getPopulatedFields('incident', '31bea9d1d7233100f2d224837e610375');
// Or using record number
var populatedFields = utils.getPopulatedFields('incident', 'INC0010042');

// Get populated fields as JSON (convenience method)
var jsonData = utils.getPopulatedFieldsAsJSON('incident', 'INC0010042');
```

### Get short description for a record

```javascript
// Get the short description for a record using sys_id
var shortDesc = utils.getShortDescription('incident', '31bea9d1d7233100f2d224837e610375');

// Or use record number instead
var shortDesc = utils.getShortDescription('incident', 'INC0010042');

// Example usage in a script
if (shortDesc) {
    gs.info('Short description: ' + shortDesc);
} else {
    gs.info('Short description not found or record does not exist');
}
```

### Find related records

```javascript
// Find all change requests related to a service using sys_id
var changeRequests = utils.findRelatedRecords(
    'sn_oper_res_change_request',  // Table to search
    'service',                      // Reference field 
    '27d32778c0a8000b00db970eeaa60f16'  // Service sys_id
);

// Or use record number (requires specifying the target table name)
var changeRequests = utils.findRelatedRecords(
    'sn_oper_res_change_request',  // Table to search
    'service',                      // Reference field 
    'SVC0010123',                   // Service record number
    'service_catalog'               // Target table name (required when using record number)
);

// Loop through related records
for (var i = 0; i < changeRequests.length; i++) {
    gs.info('Change request: ' + changeRequests[i].display_value);
    gs.info('  State: ' + changeRequests[i].state.display_value);
}

// Get related records as JSON
var jsonData = utils.findRelatedRecordsAsJSON(
    'sn_oper_res_change_request', 
    'service', 
    'SVC0010123',
    'service_catalog'
);
```

### Find related records with only populated fields

```javascript
// Find related records with only populated fields (using sys_id)
var populatedRelated = utils.findPopulatedRelatedRecords(
    'sn_oper_res_issue',
    'service',
    '27d32778c0a8000b00db970eeaa60f16'
);

// Or using record number
var populatedRelated = utils.findPopulatedRelatedRecords(
    'sn_oper_res_issue',
    'service',
    'SVC0010123',
    'service_catalog'
);

// Get as JSON (convenience method)
var jsonData = utils.findPopulatedRelatedRecordsAsJSON(
    'sn_oper_res_issue',
    'service',
    'SVC0010123',
    'service_catalog'
);
```

## Advanced Example: Find records across multiple tables

```javascript
function findRecordsForService(serviceIdentifier, serviceTableName, excludeEmptyFields) {
    var utils = new AbstractNowRecordUtils();
    var results = {};
    var referenceFieldName = 'service';
    
    // List of tables to query
    var tablesToQuery = [
        'sn_oper_res_issue',
        'sn_oper_res_change_request',
        'sn_oper_res_bcm_plan'
    ];
    
    // Query each table
    for (var i = 0; i < tablesToQuery.length; i++) {
        var tableName = tablesToQuery[i];
        results[tableName] = utils.findRelatedRecords(
            tableName, 
            referenceFieldName, 
            serviceIdentifier,
            serviceTableName,
            excludeEmptyFields
        );
    }
    
    return JSON.stringify(results);
}

// Usage with sys_id
var serviceRecords = findRecordsForService('27d32778c0a8000b00db970eeaa60f16', null, true);

// Usage with record number
var serviceRecords = findRecordsForService('SVC0010123', 'service_catalog', true);
```

## Using Record Numbers vs Sys IDs

The utility now supports both sys_ids and record numbers for all operations:

- **Sys ID**: A 32-character unique identifier (e.g., `27d32778c0a8000b00db970eeaa60f16`)
- **Record Number**: A human-readable identifier (e.g., `INC0010042`, `SVC0010123`)

When using record numbers:

1. For single-record operations (like `getRecordAllFields`), simply pass the record number instead of sys_id
2. For related record operations (like `findRelatedRecords`), you must also specify the target table name when using a record number

The utility automatically detects whether you're using a sys_id or record number based on the format of the identifier.

## Error Handling

All methods include comprehensive error handling:

- Invalid table names return `null` or empty arrays
- Non-existent records return `null` or empty arrays
- Invalid identifiers (sys_id or record number) return `null` or empty arrays
- When using record numbers that don't exist, appropriate warnings are logged
- Errors during processing are logged via `gs.error()`

## User Interaction Examples

The utility includes specialized methods for working with user interactions:

```javascript
// Find all interactions for a user using sys_id
var interactions = utils.findUserInteractions('681ccaf9c0a8016400b98a06818d57c7');

// Or using user_name instead of sys_id
var interactions = utils.findUserInteractions('admin');

// Get only populated fields
var populatedInteractions = utils.findPopulatedUserInteractions('admin');

// Get as JSON
var jsonData = utils.findUserInteractionsAsJSON('admin');
```

## Performance Considerations

- For large tables or complex relationships, consider using this utility in scheduled jobs rather than synchronous user interactions
- Filtering out empty fields can significantly reduce payload size
- Consider adding additional query conditions for tables with many records

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
