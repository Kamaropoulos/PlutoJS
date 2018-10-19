require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

var API_HOSTNAME = 'localhost';
var fs = require('fs');
if (fs.existsSync('/.dockerenv')) {
    API_HOSTNAME = 'directus';
}

const dConfig = require('./api_config.json');

function createTable(tableName, callback) {
    axios.post('http://' + API_HOSTNAME + ':8080/api/1.1/tables',
    {
        name: tableName
    })
    .then(response => {
        console.log("Created table " + tableName);
        callback(response);
    })
    .catch(error => {
        console.error(chalk.red("Could not create table " + tableName));
    });
}

function createColumn(tableName, columnName, ) {
    
}

function getToken(email, password, callback) {
    axios.post('http://' + API_HOSTNAME + ':8080/api/1.1/auth/request-token',
        {
            email,
            password
        })
        .then(response => {
            callback(response);
        })
        .catch(error => {

        });
}

function configDirectus() {
    console.log(Object.keys(dConfig));
}

// Try getting an API Token, first using the default email and password
// and if that doesn't work, use the email/password pair from the .env file
console.log("Authenticating...");

let defaultEmail = 'admin@admin.com';
let defaultPassword = 'admin';

getToken(defaultEmail, defaultPassword, function (response) {
    if (response.data.success) {

        console.log(chalk.green("Authentication was successful!"));


        // The email/password pair is the default one,
        // if they are different, change it with the one from .env
        var API_TOKEN = response.data.data.token;

        if ((defaultEmail !== process.env.DIRECTUS_EMAIL) ||
            (defaultPassword !== process.env.DIRECTUS_PASSWORD)) {
            // Update email and password
            console.log(chalk.yellow("Current email/password is different from .env, updating..."));
            let axios_config = {
                headers: { 'Authorization': "Bearer " + API_TOKEN }
            };
            axios.patch('http://' + API_HOSTNAME + ':8080/api/1.1/users/1',
                {
                    "email": process.env.DIRECTUS_EMAIL,
                    "password": process.env.DIRECTUS_PASSWORD
                }, axios_config)
                .then(response => {
                    console.log(chalk.green("Password updated succesfully!"));
                })
                .catch(error => {
                    console.error(error);
                });
        }


        // Running main configuration
        configDirectus();

    } else {
        // Default email/password pair failed, trying the one from .env
        getToken(process.env.DIRECTUS_EMAIL, process.env.DIRECTUS_PASSWORD, function (response) {
            if (response.data.success) {
                console.log(chalk.green("Authentication was successful!"));
                configDirectus();
            } else {
                console.log(chalk.red('Authentication failed...'));
            }
        });
    }
});
