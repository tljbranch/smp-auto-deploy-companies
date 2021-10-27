const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-1'
});
//auto-deploy-test 20211027
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'TB_COMPANIES';
const companiesPath = '/companies';
const companyPath = '/company';

exports.handler = async function (event) {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === companyPath:
            response = await getCompany(event.queryStringParameters.EMAIL);
            break;
        case event.httpMethod === 'GET' && event.path === companiesPath:
            response = await getCompanies();
            break;
        case event.httpMethod === 'POST' && event.path === companyPath:
            response = await saveCompany(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === companyPath:
            response = await updateCompany(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === companyPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyCompany(requestBody.EMAIL);
            break;
        case event.httpMethod === 'DELETE' && event.path === companyPath:
            response = await deleteCompany(JSON.parse(event.body).EMAIL);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
}

async function getCompany(EMAIL) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getCompanies() {
    const params = {
        TableName: dynamodbTableName
    }
    const allCompanies = await scanDynamoRecords(params, []);
    const body = {
        companies: allCompanies
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function saveCompany(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Company has been successfully saved.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function updateCompany(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Company has been successfully updated.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function modifyCompany(EMAIL, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'MODIFY_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'MODIFY',
            Message: 'Company updated successfully.',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deleteCompany(EMAIL) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'Company has been successfully deleted.',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(body)
    }
}