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

    // Get user email and name
    let email = null;
    let firstName = null;
    
    for (const answer of answers) {
        // Get email
        if (answer.type === 'email') {
            email = answer.email;
        }
        // Get first name from short_text field
        else if (answer.type === 'text' && answer.field && answer.field.title === 'First name') {
            firstName = answer.text;
        }
        // Also check for contact_info in case you switch later
        else if (answer.type === 'contact_info') {
            email = answer.email;
            firstName = answer.first_name;
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
        '9e0f74bb-1522-4413-bf38-3d71276708ff': {
            name: 'Hotel Belleclaire',
            segmentId: '68f7b60e338a9cff5f4e54b5'
        },
        '06a84dcb-3231-4999-bd9d-74137190705c': {
            name: 'La Coralina Island House',
            segmentId: '68f7b61f7119e3c1271fc92d'
        },
        '53dcda87-86e3-44d8-ba39-443a2c0f6d65': {
            name: 'Montage Palmetto Bluff',
            segmentId: '68f7b64e3681b4ba91ccbfdd'
        },
        '53092c01-ce8a-4ebe-a872-b64e8c255e4f': {
            name: 'Hotel Jerome',
            segmentId: '68f7b66cd2bad750bd2c0922'
        },
        'c99d2f8e-5430-49d8-a3
