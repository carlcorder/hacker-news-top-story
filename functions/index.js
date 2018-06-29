const { pushId, pushKey, secret, cluster } = require('./pusher.json');
const {previewUrl, previewKey} = require('./preview.json');
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
  key: pushKey,
  secret: secret,
  cluster: cluster,
  encrypted: true
});

// this app will not work in production:
// Billing account not configured.
// External network is not accessible and quotas are severely limited.
// Configure billing account to remove these restrictions

// triggerd during function initialization
firebaseDB.orderByChild('time').limitToLast(1).on('child_added',
	snapshot => pusher.trigger('top-story', 'update', snapshot.val()));

const app = express();
app.engine('hbs', engines.handlebars);
app.set('views', './views');
app.set('view engine', 'hbs');

let extractStory = (snapshot) => snapshot.val()[Object.keys(snapshot.val())[0]];

let initStory = () => {
	return firebaseDB.orderByChild('time').limitToLast(1).once('value')
			.then((snapshot) => extractStory(snapshot));
}

// api calls to firebase domains are allowed
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

let getPreview = (data) => {
	return fetch(`${previewUrl}/?key=${previewKey}&q=${data.url}`)
			.then(response => response.json()).then(json => json.image);
}

app.get('/', (request, response) => {
	response.set('Cache-Control', 'public, max-age=300, s-maxage=600');	
	initStory()
		.then(story => getPreview(story)
			.then(imageUrl => response.render('index', { story, imageUrl })))
		.catch(err => console.error(err));
});

// check for updates every 60 seconds
setInterval(update, 1000 * 60 );

exports.app = functions.https.onRequest(app);