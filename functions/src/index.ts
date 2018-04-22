import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as corsLib from 'cors';
import * as moment from 'moment';
const { WebhookClient } = require('dialogflow-fulfillment');

admin.initializeApp(functions.config().firebase);

const cors = corsLib({ origin: true });

export const ecolan = functions.https.onRequest((req, res) => {

  cors(req, res, async () => {

    const target = req.body.year + '/' + req.body.month + '/' + req.body.day + '/' + req.body.city;

    admin
      .database()
      .ref()
      .child('ecolan')
      .child(target)
      .once('value')
      .then((data) => {

        res.send(data.val());
      }).catch((error) => {
      res.sendStatus(503);
    });
  });
});

export const speechEcolan = functions.https.onRequest((req, res) => {

  console.log(JSON.stringify(req.body));
  const agent = new WebhookClient({request: req, response: res});
  const day = req.body.queryResult.parameters.day;
  let intentMap = new Map();
  let date = moment();

  if (day === 'tomorrow') {
    date = moment().add(1, 'day');
  }

  const target = date.format('YYYY') + '/' + date.format('M') + '/' + date.format('D') + '/lanciano';

  intentMap.set('garbage-collection', () => {

    return admin
      .database()
      .ref()
      .child('ecolan')
      .child(target)
      .once('value')
      .then((data) => {

        console.log(target, data, data.val());
        let array = [];

        for (let i = 0; i < data.val().garbageCollection.length; i++) {

          switch (data.val().garbageCollection[ i ]) {

            case 'o':
              array.push('organic');
              break;

            case 'i':
              array.push('undifferentiated');
              break;

            case 'p':
              array.push('plastic and metals');
              break;

            case 'c':
              array.push('paper');
              break;

            case 'v':
              array.push('glass');
              break;
          }

          const result = array.join(', ');
          const reply = day + ', you have to take away ' + result;

          return agent.add(reply);
        }
      });
  });

  agent.handleRequest(intentMap);
});