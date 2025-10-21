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

    // Get user email
    let email = null;
    for (const answer of answers) {
        if (answer.type === 'email') {
            email = answer.email;
            break;
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
        'c99d2f8e-5430-49d8-a3a8-1fd520c5f0ca': {
            name: 'Chapter Roma',
            segmentId: '68f7b67fd2bad750bd2c0924'
        }
    };

    const result = outcomeMapping[winningOutcomeId];

    if (!result) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Unknown outcome ID: ${winningOutcomeId}` })
        };
    }

    // Get Flodesk API key
    const flodeskApiKey = process.env.FLODESK_API_KEY;

    // Create Basic Auth header
    const authString = Buffer.from(`${flodeskApiKey}:`).toString('base64');

    const headers = {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
    };

    try {
        // Step 1: Create/Update subscriber
        const subscriberResponse = await fetch('https://api.flodesk.com/v1/subscribers', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                email: email,
                custom_fields: {
                    quiz_result: result.name
                }
            })
        });

        if (!subscriberResponse.ok) {
            throw new Error(`Flodesk API error: ${subscriberResponse.status}`);
        }

        const subscriberData = await subscriberResponse.json();
        const subscriberId = subscriberData.id;

        // Step 2: Add subscriber to the appropriate segment
        const segmentResponse = await fetch(
            `https://api.flodesk.com/v1/subscribers/${subscriberId}/segments`,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    segment_ids: [result.segmentId]
                })
            }
        );

        if (!segmentResponse.ok) {
            throw new Error(`Flodesk segment API error: ${segmentResponse.status}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Success',
                email: email,
                result: result.name
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
