// Enable pusher logging - don't include this in production
// Pusher.logToConsole = true;
let pusher = new Pusher('b4d15e255ae352129b3f', { cluster: 'us2' });
let channel = pusher.subscribe('top-story');

let fade = () => {
	document.getElementById('story-card').classList.toggle('fade');
}

// return image preview
let getPreview = (data) => {
	const base = 'https://api.linkpreview.net';
	const key = '5b33ebcfdf0ff0d553edaa56fc099be6137ba7a909cc7';
	const preview = `${base}/?key=${key}&q=${data.url}`;
	return fetch(preview).then(response => response.json()).then(json => json.image);
}

let updateStory = (data, imageUrl) => {
	document.getElementById('story-title').innerHTML = data.title;
 	document.getElementById('story-url').innerHTML = data.url;
 	document.getElementById('story-link').href = data.url;
 	document.getElementById('story-image').src = imageUrl || 'hn.png';
}

let changeStory = (data, imageUrl) => {
	fade();
	setTimeout(() => {
		updateStory(data, imageUrl);
		fade();
	}, 1000);
}

let updatePage = (data) => {
	return getPreview(data)
				.then((imageUrl) => changeStory(data, imageUrl));
}

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
	return { 'title': story['title'], 'url': story['url'] };
}

let update = () => {
	return getTopStoryId()
				.then(id => getStory(id))
				.then(story => shorten(story))
				.then(story => updatePage(story));
}

// update page and check every 5 minutes
update();
setInterval(update, 1000 * 60 * 5 );

// ability to update page with push notifications
channel.bind('update', (data) => updatePage(data));
