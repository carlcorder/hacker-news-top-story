// Enable pusher logging - don't include this in production
Pusher.logToConsole = true;
let pusher = new Pusher('b4d15e255ae352129b3f', { cluster: 'us2', encrypted: true });
let channel = pusher.subscribe('top-story');

let fade = () => {
	document.getElementById('story-card').classList.toggle('fade');
}

let getPreview = (data) => {
	const base = 'http://api.linkpreview.net';
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

let transitionStory = (data, imageUrl) => {
	fade();
	setTimeout(() => {
		updateStory(data, imageUrl);
		fade();
	}, 1200);
}

let updatePage = (data) => getPreview(data)
							.then(imageUrl => transitionStory(data, imageUrl))
							.error(err => console.error(err));

channel.bind('update', (data) => updatePage(data));