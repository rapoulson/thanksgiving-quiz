const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON' })
        };
    }

    const formResponse = body.form_response || {};
    const variables = formResponse.variables || [];
    const answers = formResponse.answers || [];

    // Get user email and name from Contact Info field
    let email = null;
    let firstName = null;
    let lastName = null;
    
    for (const answer of answers) {
        // Check for standalone email field
        if (answer.type === 'email') {
            email = answer.email;
        }
        // Check for contact info field (has email, first_name, last_name)
        else if (answer.type === 'contact_info') {
            email = answer.email;
            firstName = answer.first_name;
            lastName = answer.last_name;
        }
    }

    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No email found in form response' })
        };
    }

    // Get winning outcome ID
    let winningOutcomeId = null;
    for (const variable of variables) {
        if (variable.key === 'winning_outcome_id') {
            winningOutcomeId = variable.text;
            break;
        }
    }

    if (!winningOutcomeId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No winning outcome found' })
        };
    }

    // Map outcome IDs to hotel names and Flodesk segment IDs
    const outcomeMapping = {
