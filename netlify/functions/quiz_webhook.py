pythonimport json
import os
import requests
import base64

def handler(event, context):
    # Parse the Typeform webhook payload
    try:
        body = json.loads(event['body'])
    except:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON'})
        }
    
    # Extract the data you need
    form_response = body.get('form_response', {})
    variables = form_response.get('variables', [])
    answers = form_response.get('answers', [])
    
    # Get user email
    email = None
    for answer in answers:
        if answer.get('type') == 'email':
            email = answer.get('email')
            break
    
    if not email:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No email found in form response'})
        }
    
    # Get winning outcome ID from variables
    winning_outcome_id = None
    for variable in variables:
        if variable.get('key') == 'winning_outcome_id':
            winning_outcome_id = variable.get('text')
            break
    
    if not winning_outcome_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No winning outcome found'})
        }
    
    # Map outcome IDs to hotel names and Flodesk segment IDs
    # YOU'LL NEED TO REPLACE THESE WITH YOUR ACTUAL FLODESK SEGMENT IDs
    outcome_mapping = {
        '9e0f74bb-1522-4413-bf38-3d71276708ff': {
            'name': 'Hotel Belleclaire',
            'segment_id': '68f7b60e338a9cff5f4e54b5'
        },
        '06a84dcb-3231-4999-bd9d-74137190705c': {
            'name': 'La Coralina Island House',
            'segment_id': '68f7b61f7119e3c1271fc92d'
        },
        '53dcda87-86e3-44d8-ba39-443a2c0f6d65': {
            'name': 'Montage Palmetto Bluff',
            'segment_id': '68f7b64e3681b4ba91ccbfdd'
        },
        '53092c01-ce8a-4ebe-a872-b64e8c255e4f': {
            'name': 'Hotel Jerome',
            'segment_id': '68f7b66cd2bad750bd2c0922'
        },
        'c99d2f8e-5430-49d8-a3a8-1fd520c5f0ca': {
            'name': 'Chapter Roma',
            'segment_id': '68f7b67fd2bad750bd2c0924'
        }
    }
    
    result = outcome_mapping.get(winning_outcome_id)
    
    if not result:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Unknown outcome ID: {winning_outcome_id}'})
        }
    
    # Get Flodesk API key
    flodesk_api_key = os.environ.get('FLODESK_API_KEY')
    
    # Create Basic Auth header
    auth_string = f"{flodesk_api_key}:"
    auth_bytes = auth_string.encode('ascii')
    base64_bytes = base64.b64encode(auth_bytes)
    base64_string = base64_bytes.decode('ascii')
    
    headers = {
        "Authorization": f"Basic {base64_string}",
        "Content-Type": "application/json"
    }
    
    try:
        # Step 1: Create/Update subscriber
        create_url = "https://api.flodesk.com/v1/subscribers"
        subscriber_payload = {
            "email": email,
            "custom_fields": {
                "quiz_result": result['name']
            }
        }
        
        subscriber_response = requests.post(
            create_url, 
            headers=headers, 
            json=subscriber_payload
        )
        subscriber_response.raise_for_status()
        subscriber_data = subscriber_response.json()
        subscriber_id = subscriber_data.get('id')
        
        # Step 2: Add subscriber to the appropriate segment
        segment_url = f"https://api.flodesk.com/v1/subscribers/{subscriber_id}/segments"
        segment_payload = {
            "segment_ids": [result['segment_id']]
        }
        
        segment_response = requests.post(
            segment_url,
            headers=headers,
            json=segment_payload
        )
        segment_response.raise_for_status()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Success',
                'email': email,
                'result': result['name']
            })
        }
    
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
