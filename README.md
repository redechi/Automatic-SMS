# Automatic SMS Example App

This is a node.js app that allows you to set rules for sending SMS notifications about starting or finishing a trip with [Automatic](http://automatic.com). For example: text your significant other when you leave work on a weekday evening.

This app demonstrates the use of the [Automatic Webhook API](http://developer.automatic.com).

## Example

A demo version of this application is available at
http://automaticsms.herokuapp.com

![automatic-sms-screenshot](https://cloud.githubusercontent.com/assets/96217/7166730/6fb9e248-e364-11e4-8e03-701629d4e13e.png)


## Installation

### Install node and gulp

    brew install node

    npm install gulp -g

### Install required packages from NPM:

    npm install

### Configure your client id and client secret

Copy the file `config-sample.json` to `config.json` and add your configuration variables for Automatic and Twilio.  

The `GOOGLE_MAPS_CLIENT_ID` and `GOOGLE_MAPS_API_KEY` are optional if you'd like the app to work with Google Maps API for Work.  They provide the ability for ETAs to include traffic estimations.  If you don't include these in your config, ETAs will be based on normal drive times without traffic.

### Run the app locally, with debug logging

    DEBUG=automaticsms gulp develop

### View the app

Open `localhost:3000` in your browser.

### Testing locally, skipping OAuth

You can test locally as a logged in user, bypassing the OAuth login by including a `TOKEN` and `USER_ID` when running the app.

    TOKEN=<YOUR-AUTOMATIC-ACCESS-TOKEN> USER_ID=<YOUR-AUTOMATIC-USER-ID> DEBUG=automaticsms gulp develop

## Modifying

This app uses SASS and React which are compiled by gulp into the `public/dest` and `public/css` folders.

## Deploying

### Add ons

The app is can be deployed on Heroku with MongoLab and RedisCloud addons.

### Environment Variables

Add all the items in config-sample.json as heroku environment variables as well as a `NODE_ENV` variable set to `production`.

## Support

Please write to developer@automatic.com if you have any questions or need help.

## License

This project is licensed under the terms of the Apache 2.0 license.
