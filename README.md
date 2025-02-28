# NOW Utils

A collection of utility scripts for ServiceNow, focusing on Now Assist (NASK) integration and modal interactions.

## Overview

This repository contains utility scripts that enhance ServiceNow functionality, particularly around Now Assist skills and modal dialogs. These utilities make it easier to execute Now Assist skills and display their results in user-friendly modals.

## Contents

- **naskModalUtils.js**: A server-side script that provides an API for executing Now Assist skills and returning their output.
- **ExampleWorkspaceUiActionWithAjax.js**: An example UI action that demonstrates how to use the naskModalUtils to execute a Now Assist skill and display the results in a modal dialog.

## Usage

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
