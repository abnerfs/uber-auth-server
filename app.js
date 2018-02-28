const express = require('express');
const querystring = require('querystring');
const fetch = require('node-fetch');
const Headers = fetch.Headers;
const cookieParser = require('cookie-parser');


const PORT = process.env.PORT || 8089;
const client_id = process.env.UBER_ID;
const client_secret = process.env.UBER_SECRET;
const baseURL = process.env.BASEURL || 'http://localhost';
const link = `${baseURL}:${PORT}/`;
const redirect_uri = link + 'callback';
const scope = "delivery history history_lite places profile";


const app = express();


/* Authentication flow: https://developer.uber.com/docs/drivers/guides/authentication */

/* Step 1: Login in Uber Site */
app.get('/login', (req, res) => {
    const linkAuthorize = `https://login.uber.com/oauth/v2/authorize?` +
        querystring.stringify({
            response_type: 'code',
            client_id,
            redirect_uri,
            scope
        })
    res.redirect(linkAuthorize);
});

/* Step 2: Exchange this authorization code for an access_token*/
app.get('/callback', (req, res) => {
    const { code } = req.query;

    /*
    curl -F 'client_secret=<CLIENT_SECRET>' \
     -F 'client_id=<CLIENT_ID>' \
     -F 'grant_type=authorization_code' \
     -F 'redirect_uri=<REDIRECT_URI>' \
     -F 'code=AUTHORIZATION_CODE_FROM_STEP_2' \
     https://login.uber.com/oauth/v2/token

    */

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const body = {
        client_secret,
        client_id,
        grant_type: 'authorization_code',
        redirect_uri,
        code,
        scope
    };

    fetch('https://login.uber.com/oauth/v2/token', {
        method: 'POST',
        body: querystring.stringify(body),
        headers
    }).then(response => response.json())
        .then(response => {
            const {
                access_token,
                token_type,
                scope,
                expires_in,
                refresh_token } = response;

            const meHeaders = new Headers();
            meHeaders.append('Authorization', ' Bearer ' + access_token );
            meHeaders.append('Content-Type', 'application/json');
            
            /* ME: https://developer.uber.com/docs/riders/references/api/v1.2/me-get */
            fetch('https://api.uber.com/v1.2/me', {
                method: 'GET',
                headers: meHeaders
            })
            .then(responseMe => responseMe.json())
            .then(responseMe => {
                res.send(Object.assign(response, responseMe));
            });
        })
        .catch(err => {
            console.log(err);
        });
});

app.listen(PORT, () => {
    console.log("SERVER STARTED PORT: ", PORT);
});
