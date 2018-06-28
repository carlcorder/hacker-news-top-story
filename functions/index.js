const { pushId, key, secret, cluster } = require('./pusher.json');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const engines = require('consolidate');
const fetch = require('node-fetch');
const Pusher = require('pusher');

const firebaseApp = admin.initializeApp(functions.config.firebase);
const firebaseDB = firebaseApp.database().ref();

let pusher = new Pusher({
  appId: pushId,
  key: key,
  secret: secret,
  cluster: cluster,
  encrypted: true
});

firebaseDB.orderByChild('time').limitToLast(1).on('child_added',
	snapshot => pusher.trigger('top-story', 'update', snapshot.val()));

const app = express();
app.engine('hbs', engines.handlebars);
app.set('views', './views');
app.set('view engine', 'hbs');

let getSnapshot = () => firebaseDB.once('value').then(snapshot => snapshot.val());

let getTopStoryId = () => {
	return fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
		.then(response => response.json())
		.then(stories => stories[0]);
}

let getStory = (id) => {
	return fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
		.then(response => response.json());
}

let shorten = (story) => {
	return {
		[story['id']]:
			{
				'title': story['title'],
				'url': story['url'],
				'time': Date.now()
			}
		};
}

let save = (story) => firebaseDB.update(story);

let update = () => {
	return getTopStoryId()
			.then(id => getStory(id))
			.then(story => shorten(story))
			.then(story => save(story));
}

app.get('/', (request, response) => {
	response.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	getSnapshot()
			.then(data => response.render('index', { data }))
			.catch(err => console.error(err));
});

// check for updates every 10 minutes
setInterval(update, 1000 * 60 * 10 );

exports.app = functions.https.onRequest(app);