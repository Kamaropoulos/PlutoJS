// SETUP //
require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const optionDefinitions = [
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'quiet', alias: 'q', type: Boolean },
    { name: 'src', type: String, multiple: true, defaultOption: true },
    { name: 'email', type: String, alias: 'm' },
    { name: 'password', type: String, alias: 'p' },
    { name: 'env', type: String, alias: 'e' },
    { name: 'upwd', type: Boolean, alias: 'u' }
]

const commandLineArgs = require('command-line-args')
const options = commandLineArgs(optionDefinitions)

var API_HOSTNAME = 'localhost';
var fs = require('fs');
if (fs.existsSync('/.dockerenv')) {
    API_HOSTNAME = 'directus';
}

const dConfig = require('./api_config.json');

// - Setup //

// Methods //

// Only executes callback if in verbose mode
function verbose(callback) {
    if (options.verbose) {
        callback();
    }
}

function createTable(tableName, API_TOKEN, callback) {
    let axios_config = {
        headers: { 'Authorization': "Bearer " + API_TOKEN }
    };
    axios.post('http://' + API_HOSTNAME + ':8080/api/1.1/tables',
        {
            name: tableName
        }, axios_config)
        .then(response => {
            if (response.data.success === false) {
                console.error(chalk.red("Could not create table ") +
                chalk.bgRed(tableName) + chalk.red(': ' +
                    response.data.error.message));
                // verbose(console.log(response.data));
                if (typeof callback !== "undefined") callback(false, response, response.data.error);
            } else {
                console.log(chalk.green("Created table ") + chalk.bgGreen(tableName));
                if (typeof callback !== "undefined") callback(false, response, null);
            }
        })
        .catch(error => {
            console.error(chalk.red("Could not create table ") + chalk.bgRed(tableName));
            if (typeof callback !== "undefined") callback(false, null, error);
        });
}

function createTables(config, API_TOKEN) {
    for (const tableName in config) {
        if (config.hasOwnProperty(tableName)) {
            const table = config[tableName];
            createTable(tableName, API_TOKEN, function (success, response, error) {
                // Create ID, Sort and Status fields
                // createColumn(tableName, 'id', 'int', 'primary', API_TOKEN, function () {
                let sortOpts = {
                    column_name: 'sort',
                    data_type: 'int',
                    char_length: 10,
                    ui: 'sort',
                    hidden_input: true,
                    sort: 1,
                    comment: ""
                }

                let statusOpts = {
                    column_name: 'status',
                    data_type: 'int',
                    char_length: 11,
                    ui: 'status',
                    default_value: 2,
                    hidden_input: true,
                    sort: 2,
                    comment: ""
                }
                createColumn(tableName, API_TOKEN, sortOpts, function () {
                    createColumn(tableName, API_TOKEN, statusOpts, null);
                    var i = 3;
                    for (const columnName in table) {

                        if (table.hasOwnProperty(columnName)) {
                            const column = table[columnName];
                            createColumn(tableName, API_TOKEN, 
                                {
                                    column_name: columnName,
                                    ...column,
                                    sort: i++
                                },
                                function () {

                                });
                        }
                    }
                });
                // }, 11);
            });
        }
    }
}

function createColumn(tableName, API_TOKEN, columnOptions, callback) { // columnName, type, ui, callback, length, comment, sort
    let axios_config = {
        headers: { 'Authorization': "Bearer " + API_TOKEN }
    };

    axios.post('http://' + API_HOSTNAME + ':8080/api/1.1/tables/' + tableName + '/columns',
        columnOptions, axios_config)
        .then(response => {
            if (response.data.success === false) {
                console.error(chalk.red("Could not create column ") +
                    chalk.bgRed(columnOptions.column_name) + chalk.red(' on table ') + chalk.bgRed(tableName) + chalk.red(': ' +
                    response.data.error));
                // verbose(console.log(response.data));
                if (callback) callback(false, response, response.data.error);
            } else {
                console.log(chalk.green("Created column ") + chalk.bgGreen(columnOptions.column_name) +
                chalk.green(" on table ") + chalk.bgGreen(tableName));
                if (callback) callback(true, response, null);
            }
        })
        .catch(error => {
            console.error(chalk.red("Could not create column ") +
            chalk.bgRed(columnOptions.column_name) + chalk.red(' on table ') + chalk.bgRed(tableName) + chalk.red(": " +
                error.response.data.error.message));
            // console.log(error);
            // verbose(console.log(error));
            if (callback) callback(false, null, error);
        });
}

function getToken(email, password, callback) {
    axios.post('http://' + API_HOSTNAME + ':8080/api/1.1/auth/request-token',
        {
            email,
            password
        })
        .then(response => {
            if (typeof callback !== "undefined") callback(response);
        })
        .catch(error => {
            console.log(chalk.red("Connection failed!"));
        });
}

function configDirectus(API_TOKEN) {
    console.log("Creating tables...");
    createTables(dConfig, API_TOKEN);
}

// - Methods //

// Main //

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
        configDirectus(API_TOKEN);

    } else {
        // Default email/password pair failed, trying the one from .env
        getToken(process.env.DIRECTUS_EMAIL, process.env.DIRECTUS_PASSWORD,
            function (response) {
                if (response.data.success) {
                    var API_TOKEN = response.data.data.token;
                    console.log(chalk.green("Authentication was successful!"));
                    configDirectus(API_TOKEN);
                } else {
                    console.log(chalk.red('Authentication failed...'));
                }
            });
    }
});

// - Main //